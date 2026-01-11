// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Define all IPC channels
export type Channels =
  | 'projection:update'
  | 'projection:blank'
  | 'projection:verseHidden'
  | 'projection:video'
  | 'projection:font'
  | 'projection:closed'
  | 'projection:ready'
  | 'projection:settings';

export type InvokeChannels =
  | 'projection:open'
  | 'projection:close'
  | 'projection:isOpen'
  | 'projection:setDisplayMode'
  | 'dialog:selectFolder'
  | 'dialog:saveFile'
  | 'dialog:openFile'
  | 'displays:getAll'
  | 'ocr:parseImage'
  | 'ocr:parseImages'
  | 'videos:getEmbedded'
  | 'fonts:getLyricsFont'
  | 'fonts:getAll'
  | 'fonts:add'
  | 'fonts:delete'
  | 'setlist:save'
  | 'setlist:load'
  | 'settings:getAll'
  | 'settings:hasApiKey'
  | 'settings:setApiKey'
  | 'settings:testApiKey'
  | 'settings:getLanguage'
  | 'settings:setLanguage'
  | 'settings:getTheme'
  | 'settings:setTheme'
  | 'settings:getProjection'
  | 'settings:setProjection'
  | 'settings:factoryReset'
  | 'library:getAll'
  | 'library:getById'
  | 'library:search'
  | 'library:findByTitle'
  | 'library:add'
  | 'library:update'
  | 'library:delete'
  | 'library:deleteMany'
  | 'library:getCategories'
  | 'library:getTags'
  | 'library:getCount'
  | 'session:getAll'
  | 'session:getById'
  | 'session:create'
  | 'session:update'
  | 'session:delete'
  | 'session:addSong'
  | 'session:removeSong'
  | 'session:reorderSongs'
  | 'session:getCount';

const electronHandler = {
  ipcRenderer: {
    // Send messages (fire and forget)
    send(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },

    // Invoke and wait for response
    invoke<T = unknown>(
      channel: InvokeChannels,
      ...args: unknown[]
    ): Promise<T> {
      return ipcRenderer.invoke(channel, ...args);
    },

    // Subscribe to messages
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },

    // One-time subscription
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },

    // Remove all listeners for a channel
    removeAllListeners(channel: Channels) {
      ipcRenderer.removeAllListeners(channel);
    },
  },

  // Projection window control
  projection: {
    open: () => ipcRenderer.invoke('projection:open'),
    close: () => ipcRenderer.invoke('projection:close'),
    isOpen: () => ipcRenderer.invoke('projection:isOpen'),
    setDisplayMode: (mode: 'fullscreen' | 'windowed') =>
      ipcRenderer.invoke('projection:setDisplayMode', mode),
    update: (data: { lines: string[] }) =>
      ipcRenderer.send('projection:update', data),
    setBlank: (isBlank: boolean) =>
      ipcRenderer.send('projection:blank', isBlank),
    setVerseHidden: (isVerseHidden: boolean) =>
      ipcRenderer.send('projection:verseHidden', isVerseHidden),
    setVideo: (videoPath: string) =>
      ipcRenderer.send('projection:video', videoPath),
    setFont: (fontFamily: string) =>
      ipcRenderer.send('projection:font', fontFamily),
    onClosed: (callback: () => void) => {
      const subscription = () => callback();
      ipcRenderer.on('projection:closed', subscription);
      return () =>
        ipcRenderer.removeListener('projection:closed', subscription);
    },
    // Signal that projection window is ready to receive messages
    sendReady: () => ipcRenderer.send('projection:ready'),
    // Control window listens for projection ready signal
    onReady: (callback: () => void) => {
      const subscription = () => callback();
      ipcRenderer.on('projection:ready', subscription);
      return () => ipcRenderer.removeListener('projection:ready', subscription);
    },
    // For projection window to receive updates
    onUpdate: (callback: (data: { lines: string[] }) => void) => {
      const subscription = (
        _event: IpcRendererEvent,
        data: { lines: string[] },
      ) => callback(data);
      ipcRenderer.on('projection:update', subscription);
      return () =>
        ipcRenderer.removeListener('projection:update', subscription);
    },
    onBlank: (callback: (isBlank: boolean) => void) => {
      const subscription = (_event: IpcRendererEvent, isBlank: boolean) =>
        callback(isBlank);
      ipcRenderer.on('projection:blank', subscription);
      return () => ipcRenderer.removeListener('projection:blank', subscription);
    },
    onVerseHidden: (callback: (isVerseHidden: boolean) => void) => {
      const subscription = (_event: IpcRendererEvent, isVerseHidden: boolean) =>
        callback(isVerseHidden);
      ipcRenderer.on('projection:verseHidden', subscription);
      return () =>
        ipcRenderer.removeListener('projection:verseHidden', subscription);
    },
    onVideo: (callback: (videoPath: string) => void) => {
      const subscription = (_event: IpcRendererEvent, videoPath: string) =>
        callback(videoPath);
      ipcRenderer.on('projection:video', subscription);
      return () => ipcRenderer.removeListener('projection:video', subscription);
    },
    onFont: (callback: (fontFamily: string) => void) => {
      const subscription = (_event: IpcRendererEvent, fontFamily: string) =>
        callback(fontFamily);
      ipcRenderer.on('projection:font', subscription);
      return () => ipcRenderer.removeListener('projection:font', subscription);
    },
  },

  // File dialogs
  dialog: {
    selectFolder: (title: string) =>
      ipcRenderer.invoke('dialog:selectFolder', title),
    saveFile: (options: {
      title: string;
      defaultPath?: string;
      filters?: { name: string; extensions: string[] }[];
    }) => ipcRenderer.invoke('dialog:saveFile', options),
    openFile: (options: {
      title: string;
      filters?: { name: string; extensions: string[] }[];
    }) => ipcRenderer.invoke('dialog:openFile', options),
  },

  // Display info
  displays: {
    getAll: () => ipcRenderer.invoke('displays:getAll'),
  },

  // OCR service
  ocr: {
    parseImage: (
      imageBase64: string,
      mimeType: string,
    ): Promise<{
      success: boolean;
      data?: { title: string; lyrics: string };
      error?: string;
    }> => ipcRenderer.invoke('ocr:parseImage', imageBase64, mimeType),
    parseImages: (
      images: Array<{ base64: string; mimeType: string }>,
    ): Promise<{
      success: boolean;
      data?: Array<{
        index: number;
        success: boolean;
        data?: { title: string; lyrics: string };
        error?: string;
        imagePreview?: string;
      }>;
      error?: string;
    }> => ipcRenderer.invoke('ocr:parseImages', images),
  },

  // Embedded videos
  videos: {
    getEmbedded: (): Promise<string[]> =>
      ipcRenderer.invoke('videos:getEmbedded'),
    add: (videoData: {
      fileName: string;
      base64: string;
    }): Promise<{
      success: boolean;
      path?: string;
      error?: string;
    }> => ipcRenderer.invoke('videos:add', videoData),
    delete: (
      filePath: string,
    ): Promise<{
      success: boolean;
      error?: string;
    }> => ipcRenderer.invoke('videos:delete', filePath),
  },

  // Fonts
  fonts: {
    getLyricsFont: (): Promise<string | null> =>
      ipcRenderer.invoke('fonts:getLyricsFont'),
    getAll: (): Promise<
      {
        name: string;
        fileName: string;
        filePath: string;
        format: 'truetype' | 'woff' | 'woff2';
        dataUrl: string;
        isUserFont?: boolean;
      }[]
    > => ipcRenderer.invoke('fonts:getAll'),
    add: (fontData: {
      fileName: string;
      base64: string;
    }): Promise<{
      success: boolean;
      font?: {
        name: string;
        fileName: string;
        filePath: string;
        format: 'truetype' | 'woff' | 'woff2';
        dataUrl: string;
        isUserFont?: boolean;
      };
      error?: string;
    }> => ipcRenderer.invoke('fonts:add', fontData),
    delete: (fileName: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('fonts:delete', fileName),
  },

  // Setlist persistence
  setlist: {
    save: (
      setlist: any,
      filePath?: string,
    ): Promise<{
      success: boolean;
      filePath?: string;
      error?: string;
      canceled?: boolean;
    }> => ipcRenderer.invoke('setlist:save', setlist, filePath),
    load: (): Promise<{
      success: boolean;
      data?: any;
      filePath?: string;
      error?: string;
      canceled?: boolean;
    }> => ipcRenderer.invoke('setlist:load'),
  },

  // Settings
  settings: {
    getAll: (): Promise<{
      hasApiKey: boolean;
      language: 'en' | 'ko';
      theme: 'light' | 'dark' | 'system';
      projection: {
        fontSize: number;
        textColor: string;
        textShadow: {
          enabled: boolean;
          offsetX: number;
          offsetY: number;
          blur: number;
          color: string;
        };
        textOutline: { enabled: boolean; width: number; color: string };
        backgroundDim: number;
        animation: 'none' | 'fade' | 'slide-up' | 'slide-left';
        displayMode: 'fullscreen' | 'windowed';
        textAlign: {
          horizontal: 'left' | 'center' | 'right';
          vertical: 'top' | 'middle' | 'bottom';
        };
      };
      assetsMigrated: boolean;
    }> => ipcRenderer.invoke('settings:getAll'),
    hasApiKey: (): Promise<boolean> => ipcRenderer.invoke('settings:hasApiKey'),
    setApiKey: (
      apiKey: string,
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('settings:setApiKey', apiKey),
    testApiKey: (
      apiKey: string,
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('settings:testApiKey', apiKey),
    getLanguage: (): Promise<'en' | 'ko'> =>
      ipcRenderer.invoke('settings:getLanguage'),
    setLanguage: (language: 'en' | 'ko'): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('settings:setLanguage', language),
    getTheme: (): Promise<'light' | 'dark' | 'system'> =>
      ipcRenderer.invoke('settings:getTheme'),
    setTheme: (
      theme: 'light' | 'dark' | 'system',
    ): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('settings:setTheme', theme),
    getProjection: (): Promise<{
      fontSize: number;
      textColor: string;
      textShadow: {
        enabled: boolean;
        offsetX: number;
        offsetY: number;
        blur: number;
        color: string;
      };
      textOutline: { enabled: boolean; width: number; color: string };
      backgroundDim: number;
      animation: 'none' | 'fade' | 'slide-up' | 'slide-left';
      displayMode: 'fullscreen' | 'windowed';
      textAlign: {
        horizontal: 'left' | 'center' | 'right';
        vertical: 'top' | 'middle' | 'bottom';
      };
      padding: { top: number; bottom: number; left: number; right: number };
    }> => ipcRenderer.invoke('settings:getProjection'),
    setProjection: (
      settings: Partial<{
        fontSize: number;
        textColor: string;
        textShadow: {
          enabled: boolean;
          offsetX: number;
          offsetY: number;
          blur: number;
          color: string;
        };
        textOutline: { enabled: boolean; width: number; color: string };
        backgroundDim: number;
        animation: 'none' | 'fade' | 'slide-up' | 'slide-left';
        displayMode: 'fullscreen' | 'windowed';
        textAlign: {
          horizontal: 'left' | 'center' | 'right';
          vertical: 'top' | 'middle' | 'bottom';
        };
        padding: { top: number; bottom: number; left: number; right: number };
      }>,
    ): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('settings:setProjection', settings),
    onProjectionSettings: (callback: (settings: any) => void) => {
      const subscription = (_event: IpcRendererEvent, settings: any) =>
        callback(settings);
      ipcRenderer.on('projection:settings', subscription);
      return () =>
        ipcRenderer.removeListener('projection:settings', subscription);
    },
    factoryReset: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('settings:factoryReset'),
  },

  // Song Library
  library: {
    getAll: (): Promise<{
      success: boolean;
      data?: LibrarySong[];
      error?: string;
    }> => ipcRenderer.invoke('library:getAll'),
    getById: (
      id: string,
    ): Promise<{ success: boolean; data?: LibrarySong; error?: string }> =>
      ipcRenderer.invoke('library:getById', id),
    search: (
      query: string,
    ): Promise<{ success: boolean; data?: LibrarySong[]; error?: string }> =>
      ipcRenderer.invoke('library:search', query),
    findByTitle: (
      title: string,
    ): Promise<{
      success: boolean;
      data?: LibrarySong | null;
      error?: string;
    }> => ipcRenderer.invoke('library:findByTitle', title),
    add: (
      song: LibrarySongInput,
    ): Promise<{ success: boolean; data?: LibrarySong; error?: string }> =>
      ipcRenderer.invoke('library:add', song),
    update: (
      id: string,
      updates: Partial<LibrarySongInput>,
    ): Promise<{ success: boolean; data?: LibrarySong; error?: string }> =>
      ipcRenderer.invoke('library:update', id, updates),
    delete: (id: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('library:delete', id),
    deleteMany: (
      ids: string[],
    ): Promise<{
      success: boolean;
      data?: { count: number };
      error?: string;
    }> => ipcRenderer.invoke('library:deleteMany', ids),
    getCategories: (): Promise<{
      success: boolean;
      data?: string[];
      error?: string;
    }> => ipcRenderer.invoke('library:getCategories'),
    getTags: (): Promise<{
      success: boolean;
      data?: string[];
      error?: string;
    }> => ipcRenderer.invoke('library:getTags'),
    getCount: (): Promise<{
      success: boolean;
      data?: number;
      error?: string;
    }> => ipcRenderer.invoke('library:getCount'),
  },

  // Sessions
  session: {
    getAll: (): Promise<{
      success: boolean;
      data?: DbSession[];
      error?: string;
    }> => ipcRenderer.invoke('session:getAll'),
    getById: (
      id: string,
    ): Promise<{
      success: boolean;
      data?: DbSessionWithSongs;
      error?: string;
    }> => ipcRenderer.invoke('session:getById', id),
    create: (
      name: string,
    ): Promise<{ success: boolean; data?: DbSession; error?: string }> =>
      ipcRenderer.invoke('session:create', name),
    update: (
      id: string,
      updates: { name?: string },
    ): Promise<{ success: boolean; data?: DbSession; error?: string }> =>
      ipcRenderer.invoke('session:update', id, updates),
    delete: (id: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('session:delete', id),
    addSong: (
      sessionId: string,
      songId: string,
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('session:addSong', sessionId, songId),
    removeSong: (
      sessionId: string,
      songId: string,
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('session:removeSong', sessionId, songId),
    reorderSongs: (
      sessionId: string,
      songIds: string[],
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('session:reorderSongs', sessionId, songIds),
    getCount: (): Promise<{
      success: boolean;
      data?: number;
      error?: string;
    }> => ipcRenderer.invoke('session:getCount'),
  },
};

// Types for library
interface LibrarySong {
  id: string;
  title: string;
  lyrics: string;
  categories: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface LibrarySongInput {
  title: string;
  lyrics: string;
  categories?: string[];
  tags?: string[];
}

// Types for sessions
interface DbSession {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface DbSessionWithSongs extends DbSession {
  songs: LibrarySong[];
}

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
