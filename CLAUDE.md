# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenWorship is an Electron desktop application for church worship presentations. It uses a dual-window architecture: a **control window** for managing songs/slides and a **projection window** for displaying lyrics on screens.

## Common Commands

```bash
# Development
npm start                 # Start app in dev mode (main + renderer)
npm run start:main        # Watch main process only
npm run start:renderer    # Start webpack dev server for renderer

# Building
npm run build            # Build main + renderer for production
npm run build:main       # Build main process only
npm run build:renderer   # Build renderer process only
npm run package          # Package app for distribution (.dmg, .exe, etc.)

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix linting issues
npm test                 # Run Jest tests

# Maintenance
npm run rebuild          # Rebuild native dependencies (electron-rebuild)
npm run build:dll        # Build DLL for dev performance
```

## Architecture

### Dual Window System

- **Control Window** (`src/renderer/control/`) - Editor UI for managing songs, slides, sessions
- **Projection Window** (`src/renderer/projection/`) - Full-screen display for lyrics output
- Windows communicate via Electron IPC through the preload bridge

### Main Process (`src/main/`)

The main process is organized into modular components:

```
src/main/
├── main.ts                    # App lifecycle only (~85 lines)
├── preload.ts                 # Security bridge, IPC channel definitions
├── windows/
│   └── WindowManager.ts       # Window creation and management
├── ipc/
│   ├── index.ts               # Register all handlers
│   ├── projectionHandlers.ts  # projection:* handlers
│   ├── dialogHandlers.ts      # dialog:* handlers
│   ├── libraryHandlers.ts     # library:* handlers
│   ├── sessionHandlers.ts     # session:* handlers
│   ├── settingsHandlers.ts    # settings:* handlers
│   ├── fontHandlers.ts        # fonts:* handlers
│   ├── videoHandlers.ts       # videos:* handlers
│   ├── setlistHandlers.ts     # setlist:* handlers
│   └── ocrHandlers.ts         # ocr:* handlers
├── services/
│   ├── database.ts            # SQLite operations (better-sqlite3)
│   ├── settings.ts            # Persistent settings (electron-store)
│   ├── openaiService.ts       # GPT Vision API for OCR
│   ├── FontService.ts         # Font management
│   └── VideoService.ts        # Video management
└── utils/
    ├── ipcUtils.ts            # IPC response helpers
    └── fontUtils.ts           # Font file utilities
```

### Shared Types (`src/shared/types/`)

Centralized type definitions used by both main and renderer:

```
src/shared/types/
├── index.ts        # Re-exports all types
├── song.ts         # Song, Slide, Setlist, PresentationState
├── settings.ts     # ProjectionSettings, AppSettings
├── library.ts      # LibrarySong, DbSession
├── ipc.ts          # IPC channels, response types
└── errors.ts       # Error codes and utilities
```

### Renderer Processes (`src/renderer/`)

```
src/renderer/
├── control/                    # Control window
│   ├── App.tsx
│   ├── context/AppContext.tsx  # Central state management
│   ├── components/             # UI components
│   └── hooks/                  # Custom hooks
├── projection/                 # Projection window
│   ├── App.tsx
│   └── components/
├── shared/
│   ├── types/song.ts           # Legacy types (use src/shared/types instead)
│   ├── utils/lyricsParser.ts   # Lyrics to slides conversion
│   └── i18n/                   # Internationalization
├── components/ui/              # shadcn/ui components
├── lib/utils.ts                # Utility functions
└── styles/                     # Global CSS
```

### IPC Communication

Channels are defined in `preload.ts` and typed in `src/shared/types/ipc.ts`:

**Fire-and-forget (send):**

- `projection:update`, `projection:blank`, `projection:verseHidden`
- `projection:video`, `projection:font`, `projection:ready`

**Request-response (invoke):**

- Projection: `projection:open`, `projection:close`, `projection:isOpen`
- Dialog: `dialog:selectFolder`, `dialog:saveFile`, `dialog:openFile`
- Library: `library:getAll`, `library:search`, `library:add`, `library:update`
- Session: `session:create`, `session:getById`, `session:delete`
- Settings: `settings:getAll`, `settings:setApiKey`, `settings:getProjection`
- Media: `fonts:getAll`, `fonts:add`, `videos:getEmbedded`, `videos:add`
- OCR: `ocr:parseImage`, `ocr:parseImages`

### Data Flow

1. User edits lyrics in SongEditor
2. LyricsParser converts to Slide[] (blank lines = slide separators)
3. AppContext updates state
4. IPC sends update to projection window
5. SQLite persists songs/sessions

## Tech Stack

- **Electron 35** + **React 19** + **TypeScript 5.8**
- **Webpack 5** (via Electron React Boilerplate in `.erb/`)
- **Tailwind CSS 4** + **shadcn/ui** (Radix UI components)
- **better-sqlite3** - Local database at `~/.config/OpenWorship/songs.db`
- **electron-store** - Settings persistence
- **OpenAI API** - GPT Vision for OCR lyrics extraction

## Key Files

| File                                          | Purpose                                 |
| --------------------------------------------- | --------------------------------------- |
| `src/main/main.ts`                            | App lifecycle and initialization        |
| `src/main/windows/WindowManager.ts`           | Window creation and management          |
| `src/main/ipc/index.ts`                       | IPC handler registration                |
| `src/main/preload.ts`                         | IPC channel definitions, context bridge |
| `src/shared/types/index.ts`                   | Shared type definitions                 |
| `src/renderer/control/context/AppContext.tsx` | Global state for control window         |
| `src/renderer/shared/utils/lyricsParser.ts`   | Lyrics text to slides conversion        |
| `.erb/configs/webpack.config.*.ts`            | Webpack configs for main/renderer       |

## UI Development Rules

1. **Always use shadcn/ui components** from `src/renderer/components/ui/`
2. **Never edit shadcn components directly** - they are managed by the shadcn CLI
3. **Read the shadcn component first** before using it to understand its props and variants
4. **Always use `/frontend-design` skill** when designing or building frontend interfaces

## Configuration

- **TypeScript**: ES2022 target, strict mode enabled, path alias `@/*` → `src/renderer/*`
- **Database**: SQLite with tables `songs`, `sessions`, `session_songs`
- **Build**: Type checking enabled in webpack (transpileOnly: false)

## Internationalization

Translations in `src/renderer/shared/i18n/`:

- `en.ts` - English
- `ko.ts` - Korean

**Always use `useTranslation` hook** instead of hardcoded text:

```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
// Use: t('key.path')
// Not: "hardcoded string" or ko.key.path
```

Language preference persists via settings service.

## Error Handling

Use the standardized IPC response format from `src/shared/types/ipc.ts`:

```typescript
import { IpcResponse, getErrorMessage } from '../../shared/types';

// In IPC handlers:
return { success: true, data: result };
return { success: false, error: getErrorMessage(error) };
```

## Adding New IPC Handlers

1. Add channel to `InvokeChannels` or `SendChannels` in `src/shared/types/ipc.ts`
2. Add handler definition in `src/main/preload.ts`
3. Create handler in appropriate file in `src/main/ipc/`
4. Register in `src/main/ipc/index.ts`
