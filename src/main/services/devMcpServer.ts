/**
 * Dev MCP Server for OpenWorship
 *
 * Plain HTTP server that speaks MCP's JSON-RPC protocol directly.
 * No SDK transport, no sessions — every request is independent.
 *
 * Gives Claude Code direct access to Electron APIs: screenshots, console logs,
 * JS execution, IPC interception, database queries, and more.
 *
 * Started conditionally in main.ts when NODE_ENV === 'development'.
 */
import {
  createServer,
  get as httpGet,
  IncomingMessage,
  ServerResponse,
} from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import path from 'path';
import { app, BrowserWindow, screen, ipcMain } from 'electron';
import log from 'electron-log';
import { z } from 'zod';
import { getDb } from './database';
import {
  getControlWindow,
  getProjectionWindow,
} from '../windows/WindowManager';

const MCP_PORT = 9333;

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------
type ToolResult = {
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; data: string; mimeType: string }
  >;
  isError?: boolean;
};

interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (args: any) => Promise<ToolResult>;
}

const tools = new Map<string, ToolDef>();

function registerTool(
  name: string,
  config: { title: string; description: string; inputSchema: z.ZodType },
  handler: (args: any) => Promise<ToolResult>,
) {
  tools.set(name, { name, ...config, handler });
}

// ---------------------------------------------------------------------------
// Console log buffer (per window)
// ---------------------------------------------------------------------------
interface ConsoleLogEntry {
  level: string;
  message: string;
  source: string;
  line: number;
  timestamp: string;
}

const consoleLogs: Record<string, ConsoleLogEntry[]> = {
  control: [],
  projection: [],
};
const MAX_CONSOLE_LOGS = 500;

function attachConsoleLogCapture(
  webContents: Electron.WebContents,
  windowName: string,
) {
  webContents.on(
    'console-message',
    (_event, level, message, line, sourceId) => {
      const levels = ['verbose', 'info', 'warning', 'error'];
      const buf = consoleLogs[windowName] ?? [];
      buf.push({
        level: levels[level] ?? 'info',
        message,
        source: sourceId,
        line,
        timestamp: new Date().toISOString(),
      });
      if (buf.length > MAX_CONSOLE_LOGS) buf.shift();
      consoleLogs[windowName] = buf;
    },
  );
}

// ---------------------------------------------------------------------------
// IPC interception
// ---------------------------------------------------------------------------
interface IpcLogEntry {
  channel: string;
  args: unknown[];
  response?: unknown;
  duration: number;
  timestamp: string;
}

const ipcLog: IpcLogEntry[] = [];
const MAX_IPC_LOG = 200;

function patchIpcMain() {
  const originalHandle = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (channel: string, listener: (...args: any[]) => any) => {
    return originalHandle(channel, async (event, ...args) => {
      const start = performance.now();
      let response: unknown;
      try {
        response = await listener(event, ...args);
      } catch (err) {
        response = { error: String(err) };
        throw err;
      } finally {
        ipcLog.push({
          channel,
          args,
          response,
          duration: Math.round(performance.now() - start),
          timestamp: new Date().toISOString(),
        });
        if (ipcLog.length > MAX_IPC_LOG) ipcLog.shift();
      }
      return response;
    });
  };

  const originalOn = ipcMain.on.bind(ipcMain);
  (ipcMain as any).on = (
    channel: string,
    listener: (...args: any[]) => void,
  ) => {
    return originalOn(channel, (event: any, ...args: any[]) => {
      ipcLog.push({
        channel,
        args,
        duration: 0,
        timestamp: new Date().toISOString(),
      });
      if (ipcLog.length > MAX_IPC_LOG) ipcLog.shift();
      listener(event, ...args);
    });
  };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function getWindow(name: string): BrowserWindow | null {
  return name === 'projection' ? getProjectionWindow() : getControlWindow();
}

// ---------------------------------------------------------------------------
// JSON-RPC helpers
// ---------------------------------------------------------------------------
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function sendResult(res: ServerResponse, id: unknown, result: unknown) {
  const body = JSON.stringify({ jsonrpc: '2.0', result, id });
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  });
  res.end(`event: message\ndata: ${body}\n\n`);
}

function sendError(
  res: ServerResponse,
  id: unknown,
  code: number,
  message: string,
) {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    error: { code, message },
    id,
  });
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  });
  res.end(`event: message\ndata: ${body}\n\n`);
}

// ---------------------------------------------------------------------------
// Register all tools
// ---------------------------------------------------------------------------
function registerAllTools() {
  registerTool(
    'screenshot',
    {
      title: 'Screenshot Window',
      description:
        'Capture a PNG screenshot of the control or projection window',
      inputSchema: z.object({
        window: z
          .enum(['control', 'projection'])
          .default('control')
          .describe('Which window to capture'),
      }),
    },
    async ({ window: windowName }) => {
      const win = getWindow(windowName);
      if (!win || win.isDestroyed()) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Window "${windowName}" is not open`,
            },
          ],
          isError: true,
        };
      }
      const image = await win.webContents.capturePage();
      const base64 = image.toPNG().toString('base64');
      return {
        content: [
          { type: 'image' as const, data: base64, mimeType: 'image/png' },
        ],
      };
    },
  );

  registerTool(
    'get_logs',
    {
      title: 'Get Console Logs',
      description:
        'Get buffered console.log output from a renderer window (last 500 entries)',
      inputSchema: z.object({
        window: z
          .enum(['control', 'projection'])
          .default('control')
          .describe('Which window'),
        level: z
          .enum(['all', 'verbose', 'info', 'warning', 'error'])
          .default('all')
          .describe('Filter by log level'),
        last: z.number().default(50).describe('Number of recent entries'),
      }),
    },
    async ({ window: windowName, level, last }) => {
      let entries = consoleLogs[windowName] ?? [];
      if (level !== 'all') entries = entries.filter((e) => e.level === level);
      entries = entries.slice(-last);
      const text = entries.length
        ? entries
            .map(
              (e) =>
                `[${e.timestamp}] [${e.level}] ${e.message}${e.source ? ` (${e.source}:${e.line})` : ''}`,
            )
            .join('\n')
        : '(no logs)';
      return { content: [{ type: 'text' as const, text }] };
    },
  );

  registerTool(
    'click',
    {
      title: 'Click Element',
      description: 'Click a DOM element by CSS selector in a renderer window',
      inputSchema: z.object({
        window: z
          .enum(['control', 'projection'])
          .default('control')
          .describe('Which window'),
        selector: z.string().describe('CSS selector of the element to click'),
      }),
    },
    async ({ window: windowName, selector }) => {
      const win = getWindow(windowName);
      if (!win || win.isDestroyed()) {
        return {
          content: [
            { type: 'text' as const, text: `Window "${windowName}" not open` },
          ],
          isError: true,
        };
      }
      try {
        const result = await win.webContents.executeJavaScript(`
          (() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return { error: 'Element not found: ${selector}' };
            el.click();
            return { clicked: true, tag: el.tagName, text: el.textContent?.slice(0, 100) };
          })()
        `);
        if (result.error) {
          return {
            content: [{ type: 'text' as const, text: result.error }],
            isError: true,
          };
        }
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Click failed: ${err}` }],
          isError: true,
        };
      }
    },
  );

  registerTool(
    'execute_js',
    {
      title: 'Execute JavaScript',
      description:
        'Run arbitrary JavaScript in a renderer window and return the result',
      inputSchema: z.object({
        window: z
          .enum(['control', 'projection'])
          .default('control')
          .describe('Which window'),
        code: z.string().describe('JavaScript code to execute'),
      }),
    },
    async ({ window: windowName, code }) => {
      const win = getWindow(windowName);
      if (!win || win.isDestroyed()) {
        return {
          content: [
            { type: 'text' as const, text: `Window "${windowName}" not open` },
          ],
          isError: true,
        };
      }
      try {
        const result = await win.webContents.executeJavaScript(code);
        const text =
          typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        return {
          content: [{ type: 'text' as const, text: text ?? 'undefined' }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Execution error: ${err}` }],
          isError: true,
        };
      }
    },
  );

  registerTool(
    'inspect_element',
    {
      title: 'Inspect Element',
      description:
        'Get bounding box, text content, and computed styles of a DOM element',
      inputSchema: z.object({
        window: z
          .enum(['control', 'projection'])
          .default('control')
          .describe('Which window'),
        selector: z.string().describe('CSS selector of the element'),
        styles: z
          .array(z.string())
          .default([
            'color',
            'backgroundColor',
            'fontSize',
            'display',
            'visibility',
            'opacity',
          ])
          .describe('CSS properties to read'),
      }),
    },
    async ({ window: windowName, selector, styles }) => {
      const win = getWindow(windowName);
      if (!win || win.isDestroyed()) {
        return {
          content: [
            { type: 'text' as const, text: `Window "${windowName}" not open` },
          ],
          isError: true,
        };
      }
      try {
        const result = await win.webContents.executeJavaScript(`
          (() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return { error: 'Element not found' };
            const rect = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            const styleProps = ${JSON.stringify(styles)};
            const computedStyles = {};
            styleProps.forEach(p => { computedStyles[p] = cs.getPropertyValue(p) || cs[p]; });
            return {
              tag: el.tagName,
              id: el.id,
              className: el.className,
              textContent: el.textContent?.slice(0, 200),
              innerHTML: el.innerHTML?.slice(0, 500),
              bbox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              computedStyles,
              childCount: el.children.length,
              attributes: Object.fromEntries([...el.attributes].map(a => [a.name, a.value])),
            };
          })()
        `);
        if (result.error) {
          return {
            content: [{ type: 'text' as const, text: result.error }],
            isError: true,
          };
        }
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Inspect failed: ${err}` }],
          isError: true,
        };
      }
    },
  );

  registerTool(
    'get_electron_logs',
    {
      title: 'Get Electron Logs',
      description:
        'Read main process log files from electron-log (~/Library/Logs/OpenWorship/)',
      inputSchema: z.object({
        lines: z.number().default(100).describe('Number of recent lines'),
      }),
    },
    async ({ lines }) => {
      try {
        const logDir = app.getPath('logs');
        const files = await readdir(logDir);
        const logFiles = files
          .filter((f) => f.endsWith('.log'))
          .sort()
          .reverse();
        if (logFiles.length === 0) {
          return {
            content: [
              { type: 'text' as const, text: `No log files in ${logDir}` },
            ],
          };
        }
        const latestLog = path.join(logDir, logFiles[0]);
        const content = await readFile(latestLog, 'utf-8');
        const tail = content.split('\n').slice(-lines).join('\n');
        return {
          content: [
            {
              type: 'text' as const,
              text: `--- ${latestLog} (last ${lines} lines) ---\n${tail}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            { type: 'text' as const, text: `Failed to read logs: ${err}` },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(
    'query_db',
    {
      title: 'Query Database',
      description:
        'Run a SQL query against the SQLite database (read or write)',
      inputSchema: z.object({
        sql: z.string().describe('SQL query to execute'),
        params: z
          .array(z.union([z.string(), z.number(), z.null()]))
          .default([])
          .describe('Query parameters for prepared statement'),
      }),
    },
    async ({ sql, params }) => {
      const db = getDb();
      if (!db) {
        return {
          content: [
            { type: 'text' as const, text: 'Database not initialized' },
          ],
          isError: true,
        };
      }
      try {
        const trimmed = sql.trim().toUpperCase();
        const isRead =
          trimmed.startsWith('SELECT') ||
          trimmed.startsWith('PRAGMA') ||
          trimmed.startsWith('EXPLAIN');
        if (isRead) {
          const rows = db.prepare(sql).all(...params);
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify(rows, null, 2) },
            ],
          };
        }
        const result = db.prepare(sql).run(...params);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  changes: result.changes,
                  lastInsertRowid: result.lastInsertRowid,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `SQL error: ${err}` }],
          isError: true,
        };
      }
    },
  );

  registerTool(
    'fetch_dev_server',
    {
      title: 'Fetch Dev Server',
      description: 'Fetch a path from the webpack dev server (localhost:1212)',
      inputSchema: z.object({
        path: z
          .string()
          .default('/')
          .describe('URL path to fetch, e.g. / or /control.html'),
      }),
    },
    async ({ path: urlPath }) => {
      return new Promise<ToolResult>((resolve) => {
        httpGet(`http://localhost:1212${urlPath}`, (res) => {
          let body = '';
          res.on('data', (chunk: Buffer) => {
            body += chunk.toString();
          });
          res.on('end', () => {
            resolve({
              content: [
                {
                  type: 'text' as const,
                  text: `HTTP ${res.statusCode}\n\n${body.slice(0, 10000)}`,
                },
              ],
            });
          });
        }).on('error', (err) => {
          resolve({
            content: [
              { type: 'text' as const, text: `Fetch error: ${err.message}` },
            ],
            isError: true,
          });
        });
      });
    },
  );

  registerTool(
    'get_ipc_log',
    {
      title: 'Get IPC Log',
      description:
        'Get recent IPC messages with channel, args, response, and timing (last 200)',
      inputSchema: z.object({
        channel: z
          .string()
          .optional()
          .describe('Filter by channel name (substring match)'),
        last: z.number().default(30).describe('Number of recent entries'),
      }),
    },
    async ({ channel, last }) => {
      let entries = [...ipcLog];
      if (channel) entries = entries.filter((e) => e.channel.includes(channel));
      entries = entries.slice(-last);
      const text = entries.length
        ? JSON.stringify(entries, null, 2)
        : '(no IPC messages logged)';
      return { content: [{ type: 'text' as const, text }] };
    },
  );

  registerTool(
    'reload_window',
    {
      title: 'Reload Window',
      description: 'Force reload a renderer window',
      inputSchema: z.object({
        window: z
          .enum(['control', 'projection'])
          .default('control')
          .describe('Which window to reload'),
      }),
    },
    async ({ window: windowName }) => {
      const win = getWindow(windowName);
      if (!win || win.isDestroyed()) {
        return {
          content: [
            { type: 'text' as const, text: `Window "${windowName}" not open` },
          ],
          isError: true,
        };
      }
      win.webContents.reload();
      return {
        content: [
          { type: 'text' as const, text: `Reloaded ${windowName} window` },
        ],
      };
    },
  );

  registerTool(
    'get_app_state',
    {
      title: 'Get App State',
      description:
        'Get current application state: window bounds, displays, focus, and projection status',
      inputSchema: z.object({}),
    },
    async () => {
      const controlWin = getControlWindow();
      const projectionWin = getProjectionWindow();
      const displays = screen.getAllDisplays();
      const primary = screen.getPrimaryDisplay();

      const windowInfo = (win: BrowserWindow | null, name: string) => {
        if (!win || win.isDestroyed()) return { name, open: false };
        return {
          name,
          open: true,
          bounds: win.getBounds(),
          visible: win.isVisible(),
          focused: win.isFocused(),
          fullscreen: win.isFullScreen(),
          minimized: win.isMinimized(),
          url: win.webContents.getURL(),
        };
      };

      const state = {
        windows: [
          windowInfo(controlWin, 'control'),
          windowInfo(projectionWin, 'projection'),
        ],
        displays: displays.map((d) => ({
          id: d.id,
          bounds: d.bounds,
          workArea: d.workArea,
          scaleFactor: d.scaleFactor,
          isPrimary: d.id === primary.id,
        })),
        app: {
          version: app.getVersion(),
          name: app.getName(),
          locale: app.getLocale(),
          userData: app.getPath('userData'),
        },
      };
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(state, null, 2) },
        ],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// MCP JSON-RPC request handler
// ---------------------------------------------------------------------------
async function handleJsonRpc(
  msg: { jsonrpc: string; method: string; params?: any; id?: unknown },
  res: ServerResponse,
) {
  const { method, params, id } = msg;

  // Notifications (no id) — acknowledge with 202
  if (id === undefined || id === null) {
    res.writeHead(202).end();
    return;
  }

  switch (method) {
    case 'initialize':
      sendResult(res, id, {
        protocolVersion: '2025-03-26',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'openworship-dev', version: '1.0.0' },
      });
      return;

    case 'tools/list': {
      const toolList = [...tools.values()].map((t) => ({
        name: t.name,
        title: t.title,
        description: t.description,
        inputSchema: z.toJSONSchema(t.inputSchema),
      }));
      sendResult(res, id, { tools: toolList });
      return;
    }

    case 'tools/call': {
      const toolName = params?.name;
      const tool = tools.get(toolName);
      if (!tool) {
        sendError(res, id, -32602, `Unknown tool: ${toolName}`);
        return;
      }
      try {
        const parsed = tool.inputSchema.parse(params?.arguments ?? {});
        const result = await tool.handler(parsed);
        sendResult(res, id, result);
      } catch (err) {
        sendError(res, id, -32603, `Tool error: ${err}`);
      }
      return;
    }

    default:
      sendError(res, id, -32601, `Method not found: ${method}`);
  }
}

// ---------------------------------------------------------------------------
// Start the MCP server
// ---------------------------------------------------------------------------
export function startDevMcpServer() {
  patchIpcMain();
  registerAllTools();

  const httpServer = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? '/', `http://localhost:${MCP_PORT}`);
      if (url.pathname !== '/mcp') {
        res.writeHead(404);
        res.end('Not found. MCP endpoint is at /mcp');
        return;
      }

      if (req.method !== 'POST') {
        res.writeHead(405, { Allow: 'POST' });
        res.end();
        return;
      }

      try {
        const body = await readBody(req);
        const parsed = JSON.parse(body);

        // Handle batch requests (array of JSON-RPC messages)
        if (Array.isArray(parsed)) {
          const results: string[] = [];
          for (const msg of parsed) {
            if (msg.id === undefined || msg.id === null) continue; // skip notifications
            // Capture response by creating a mock res
            const result = await new Promise<string>((resolve) => {
              const mockRes = {
                writeHead: () => mockRes,
                end: (data: string) => resolve(data),
              } as any;
              handleJsonRpc(msg, mockRes);
            });
            results.push(result);
          }
          // Send batch response
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          });
          res.end(results.join(''));
          return;
        }

        await handleJsonRpc(parsed, res);
      } catch (err) {
        log.error('[DevMCP] Request error:', err);
        if (!res.headersSent) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32700, message: 'Parse error' },
              id: null,
            }),
          );
        }
      }
    },
  );

  httpServer.listen(MCP_PORT, () => {
    log.info(
      `[DevMCP] MCP server listening on http://localhost:${MCP_PORT}/mcp`,
    );
  });

  // Attach console log capture when windows become available
  const attachLogCaptureWhenReady = () => {
    const controlWin = getControlWindow();
    if (controlWin && !controlWin.isDestroyed()) {
      attachConsoleLogCapture(controlWin.webContents, 'control');
    }

    setInterval(() => {
      const projWin = getProjectionWindow();
      if (
        projWin &&
        !projWin.isDestroyed() &&
        // eslint-disable-next-line no-underscore-dangle
        !(projWin.webContents as any).__mcpLogAttached
      ) {
        attachConsoleLogCapture(projWin.webContents, 'projection');
        // eslint-disable-next-line no-underscore-dangle
        (projWin.webContents as any).__mcpLogAttached = true;
      }
    }, 2000);
  };

  setTimeout(attachLogCaptureWhenReady, 1000);
}
