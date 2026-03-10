// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import {
  contextBridge,
  ipcRenderer,
  IpcRendererEvent,
  webUtils,
} from 'electron';

// Import shared types instead of redeclaring them
import type {
  LibrarySong,
  LibrarySongInput,
  DbSession,
  DbSessionWithSongs,
  ProjectionSettings,
  Setlist,
  ImportPreview,
  ImportOptions,
  ImportResult,
  ContentTypeTextSettings,
  TextStyleSettings,
  BibleReferenceStyle,
} from '../shared/types';
import type {
  Advertisement,
  AdvertisementCreateInput,
  AdvertisementUpdateInput,
  AdvertisementDisplaySettings,
  ProjectionAdvertisementMessage,
} from '../shared/types/advertisement';
import type {
  BibleTranslation,
  BibleBook,
  BibleVerse,
  BibleDownloadInfo,
  BibleDisplayMode,
} from '../shared/types/bible';
import type { Slide } from '../shared/types/song';
import type { Frame, FrameSettings } from '../shared/types/frame';
import type {
  SetlistItemType,
  SetlistItemInput,
  SetlistItem,
} from '../shared/types/setlistItem';
import type { RecentItem } from './services/settings';

// Define all IPC channels
export type Channels =
  | 'projection:update'
  | 'projection:blank'
  | 'projection:verseHidden'
  | 'projection:video'
  | 'projection:image'
  | 'projection:backgroundColor'
  | 'projection:font'
  | 'projection:closed'
  | 'projection:ready'
  | 'projection:settings'
  | 'projection:advertisement'
  | 'projection:frame'
  | 'projection:contentTypeText'
  | 'projection:overlayNote'
  | 'file:open'
  | 'bible:importProgress';

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
  | 'images:getAll'
  | 'images:add'
  | 'images:delete'
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
  | 'settings:getRecentItems'
  | 'settings:addRecentItem'
  | 'settings:clearRecentItems'
  | 'settings:getContentTypeText'
  | 'settings:setContentTypeText'
  | 'settings:setBibleReferenceStyle'
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
  | 'session:getCount'
  | 'export:song'
  | 'export:session'
  | 'export:library'
  | 'import:preview'
  | 'import:previewPath'
  | 'import:execute'
  | 'ad:getAll'
  | 'ad:getById'
  | 'ad:add'
  | 'ad:update'
  | 'ad:delete'
  | 'ad:reorder'
  | 'ad:getDisplaySettings'
  | 'ad:setDisplaySettings'
  // Bible channels
  | 'bible:getTranslations'
  | 'bible:getTranslation'
  | 'bible:getBooks'
  | 'bible:getVerses'
  | 'bible:getVersesRange'
  | 'bible:getVerseCount'
  | 'bible:searchVerses'
  | 'bible:versesToSlides'
  | 'bible:importFromFile'
  | 'bible:downloadAndImport'
  | 'bible:deleteTranslation'
  | 'bible:getAvailableBibles'
  // Frame channels
  | 'frame:getAll'
  | 'frame:getById'
  | 'frame:add'
  | 'frame:update'
  | 'frame:delete'
  | 'frame:importImage'
  | 'frame:getSettings'
  | 'frame:setSettings'
  // Session item channels (unified setlist)
  | 'sessionItem:getAll'
  | 'sessionItem:add'
  | 'sessionItem:update'
  | 'sessionItem:delete'
  | 'sessionItem:reorder';

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
    update: (data: {
      lines: string[];
      fontSize?: number;
      overrides?: {
        fontSize?: number;
        textAlign?: {
          horizontal?: 'left' | 'center' | 'right';
          vertical?: 'top' | 'middle' | 'bottom';
        };
        padding?: {
          top?: number;
          bottom?: number;
          left?: number;
          right?: number;
        };
      };
      contentType?: 'song' | 'bible' | 'announcement';
      lineRoles?: ('body' | 'reference')[];
    }) => ipcRenderer.send('projection:update', data),
    setBlank: (isBlank: boolean) =>
      ipcRenderer.send('projection:blank', isBlank),
    setVerseHidden: (isVerseHidden: boolean) =>
      ipcRenderer.send('projection:verseHidden', isVerseHidden),
    setVideo: (videoPath: string) =>
      ipcRenderer.send('projection:video', videoPath),
    setImage: (imagePath: string) =>
      ipcRenderer.send('projection:image', imagePath),
    setBackgroundColor: (color: string) =>
      ipcRenderer.send('projection:backgroundColor', color),
    setFont: (fontFamily: string) =>
      ipcRenderer.send('projection:font', fontFamily),
    onClosed: (callback: () => void) => {
      const subscription = () => callback();
      ipcRenderer.on('projection:closed', subscription);
      return () =>
        ipcRenderer.removeListener('projection:closed', subscription);
    },
    // Overlay notes
    sendOverlayNote: (data: {
      action: 'show' | 'hide';
      content?: string;
      contentType?: 'text' | 'image';
      imagePath?: string;
      position?: 'top' | 'bottom';
    }) => ipcRenderer.send('projection:overlayNote', data),
    onOverlayNote: (
      callback: (data: {
        action: 'show' | 'hide';
        content?: string;
        contentType?: 'text' | 'image';
        imagePath?: string;
        position?: 'top' | 'bottom';
      }) => void,
    ) => {
      const subscription = (
        _event: IpcRendererEvent,
        data: {
          action: 'show' | 'hide';
          content?: string;
          contentType?: 'text' | 'image';
          imagePath?: string;
          position?: 'top' | 'bottom';
        },
      ) => callback(data);
      ipcRenderer.on('projection:overlayNote', subscription);
      return () =>
        ipcRenderer.removeListener('projection:overlayNote', subscription);
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
    onUpdate: (
      callback: (data: {
        lines: string[];
        fontSize?: number;
        overrides?: {
          fontSize?: number;
          textAlign?: {
            horizontal?: 'left' | 'center' | 'right';
            vertical?: 'top' | 'middle' | 'bottom';
          };
          padding?: {
            top?: number;
            bottom?: number;
            left?: number;
            right?: number;
          };
        };
        contentType?: 'song' | 'bible' | 'announcement';
        lineRoles?: ('body' | 'reference')[];
      }) => void,
    ) => {
      const subscription = (
        _event: IpcRendererEvent,
        data: {
          lines: string[];
          fontSize?: number;
          overrides?: {
            fontSize?: number;
            textAlign?: {
              horizontal?: 'left' | 'center' | 'right';
              vertical?: 'top' | 'middle' | 'bottom';
            };
            padding?: {
              top?: number;
              bottom?: number;
              left?: number;
              right?: number;
            };
          };
          contentType?: 'song' | 'bible' | 'announcement';
          lineRoles?: ('body' | 'reference')[];
        },
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
    onImage: (callback: (imagePath: string) => void) => {
      const subscription = (_event: IpcRendererEvent, imagePath: string) =>
        callback(imagePath);
      ipcRenderer.on('projection:image', subscription);
      return () => ipcRenderer.removeListener('projection:image', subscription);
    },
    onBackgroundColor: (callback: (color: string) => void) => {
      const subscription = (_event: IpcRendererEvent, color: string) =>
        callback(color);
      ipcRenderer.on('projection:backgroundColor', subscription);
      return () =>
        ipcRenderer.removeListener('projection:backgroundColor', subscription);
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
      filename?: string,
    ): Promise<{
      success: boolean;
      data?: { title: string; lyrics: string };
      error?: string;
    }> => ipcRenderer.invoke('ocr:parseImage', imageBase64, mimeType, filename),
    parseImages: (
      images: Array<{
        base64: string;
        mimeType: string;
        filename?: string;
      }>,
    ): Promise<{
      success: boolean;
      data?: Array<{
        index: number;
        pageNumber?: number;
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

  // Background images
  images: {
    getAll: (): Promise<string[]> => ipcRenderer.invoke('images:getAll'),
    add: (imageData: {
      fileName: string;
      base64: string;
    }): Promise<{
      success: boolean;
      data?: string;
      error?: string;
    }> => ipcRenderer.invoke('images:add', imageData),
    delete: (
      filePath: string,
    ): Promise<{
      success: boolean;
      error?: string;
    }> => ipcRenderer.invoke('images:delete', filePath),
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
      setlist: Setlist,
      filePath?: string,
    ): Promise<{
      success: boolean;
      data?: string;
      error?: string;
      canceled?: boolean;
    }> => ipcRenderer.invoke('setlist:save', setlist, filePath),
    load: (): Promise<{
      success: boolean;
      data?: Setlist;
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
      backgroundType?: 'video' | 'image' | 'color';
      backgroundColor?: string;
      backgroundImagePath?: string;
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
        backgroundType: 'video' | 'image' | 'color';
        backgroundColor: string;
        backgroundImagePath: string;
      }>,
    ): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('settings:setProjection', settings),
    onProjectionSettings: (
      callback: (settings: ProjectionSettings) => void,
    ) => {
      const subscription = (
        _event: IpcRendererEvent,
        settings: ProjectionSettings,
      ) => callback(settings);
      ipcRenderer.on('projection:settings', subscription);
      return () =>
        ipcRenderer.removeListener('projection:settings', subscription);
    },
    factoryReset: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('settings:factoryReset'),
    // Content-type text settings
    getContentTypeText: (): Promise<{
      success: boolean;
      data?: ContentTypeTextSettings;
      error?: string;
    }> => ipcRenderer.invoke('settings:getContentTypeText'),
    setContentTypeText: (
      type: 'song' | 'bible' | 'announcement',
      updates: Partial<TextStyleSettings>,
    ): Promise<{
      success: boolean;
      data?: ContentTypeTextSettings;
      error?: string;
    }> => ipcRenderer.invoke('settings:setContentTypeText', type, updates),
    setBibleReferenceStyle: (
      updates: Partial<BibleReferenceStyle>,
    ): Promise<{
      success: boolean;
      data?: ContentTypeTextSettings;
      error?: string;
    }> => ipcRenderer.invoke('settings:setBibleReferenceStyle', updates),
    onContentTypeText: (
      callback: (settings: ContentTypeTextSettings) => void,
    ) => {
      const subscription = (
        _event: IpcRendererEvent,
        settings: ContentTypeTextSettings,
      ) => callback(settings);
      ipcRenderer.on('projection:contentTypeText', subscription);
      return () =>
        ipcRenderer.removeListener('projection:contentTypeText', subscription);
    },
    // Recent items
    getRecentItems: (): Promise<{
      success: boolean;
      data?: RecentItem[];
      error?: string;
    }> => ipcRenderer.invoke('settings:getRecentItems'),
    addRecentItem: (
      item: Omit<RecentItem, 'addedAt'>,
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('settings:addRecentItem', item),
    clearRecentItems: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('settings:clearRecentItems'),
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

  // Export/Import
  export: {
    song: (
      songId: string,
    ): Promise<{
      success: boolean;
      filePath?: string;
      error?: string;
      canceled?: boolean;
    }> => ipcRenderer.invoke('export:song', songId),
    session: (
      sessionId: string,
    ): Promise<{
      success: boolean;
      filePath?: string;
      error?: string;
      canceled?: boolean;
    }> => ipcRenderer.invoke('export:session', sessionId),
    library: (): Promise<{
      success: boolean;
      filePath?: string;
      error?: string;
      canceled?: boolean;
    }> => ipcRenderer.invoke('export:library'),
  },
  import: {
    preview: (): Promise<{
      success: boolean;
      data?: ImportPreview;
      error?: string;
      canceled?: boolean;
    }> => ipcRenderer.invoke('import:preview'),
    previewPath: (
      filePath: string,
    ): Promise<{
      success: boolean;
      data?: ImportPreview;
      error?: string;
    }> => ipcRenderer.invoke('import:previewPath', filePath),
    execute: (
      preview: ImportPreview,
      options: ImportOptions,
    ): Promise<{
      success: boolean;
      data?: ImportResult;
      error?: string;
    }> => ipcRenderer.invoke('import:execute', preview, options),
  },

  // File association handling
  onFileOpen: (callback: (filePath: string) => void) => {
    const subscription = (_event: IpcRendererEvent, filePath: string) =>
      callback(filePath);
    ipcRenderer.on('file:open', subscription);
    return () => ipcRenderer.removeListener('file:open', subscription);
  },

  // Advertisements
  advertisement: {
    getAll: (): Promise<{
      success: boolean;
      data?: Advertisement[];
      error?: string;
    }> => ipcRenderer.invoke('ad:getAll'),
    getById: (
      id: string,
    ): Promise<{
      success: boolean;
      data?: Advertisement;
      error?: string;
    }> => ipcRenderer.invoke('ad:getById', id),
    add: (
      input: AdvertisementCreateInput,
    ): Promise<{
      success: boolean;
      data?: Advertisement;
      error?: string;
    }> => ipcRenderer.invoke('ad:add', input),
    update: (
      id: string,
      updates: AdvertisementUpdateInput,
    ): Promise<{
      success: boolean;
      data?: Advertisement;
      error?: string;
    }> => ipcRenderer.invoke('ad:update', id, updates),
    delete: (
      id: string,
    ): Promise<{
      success: boolean;
      error?: string;
    }> => ipcRenderer.invoke('ad:delete', id),
    reorder: (
      ids: string[],
    ): Promise<{
      success: boolean;
      error?: string;
    }> => ipcRenderer.invoke('ad:reorder', ids),
    getDisplaySettings: (): Promise<{
      success: boolean;
      data?: AdvertisementDisplaySettings;
      error?: string;
    }> => ipcRenderer.invoke('ad:getDisplaySettings'),
    setDisplaySettings: (
      settings: Partial<AdvertisementDisplaySettings>,
    ): Promise<{
      success: boolean;
      data?: AdvertisementDisplaySettings;
      error?: string;
    }> => ipcRenderer.invoke('ad:setDisplaySettings', settings),
    // Send advertisement to projection window
    show: (ad: Advertisement, displaySettings: AdvertisementDisplaySettings) =>
      ipcRenderer.send('projection:advertisement', {
        action: 'show',
        advertisement: ad,
        displaySettings,
      }),
    hide: () =>
      ipcRenderer.send('projection:advertisement', { action: 'hide' }),
    // For projection window to receive advertisement updates
    onAdvertisement: (
      callback: (message: ProjectionAdvertisementMessage) => void,
    ) => {
      const subscription = (
        _event: IpcRendererEvent,
        message: ProjectionAdvertisementMessage,
      ) => callback(message);
      ipcRenderer.on('projection:advertisement', subscription);
      return () =>
        ipcRenderer.removeListener('projection:advertisement', subscription);
    },
  },
};

// Add Bible, Frame, and SessionItem handlers to electronHandler
const extendedElectronHandler = {
  ...electronHandler,

  // Bible operations
  bible: {
    getTranslations: (): Promise<{
      success: boolean;
      data?: BibleTranslation[];
      error?: string;
    }> => ipcRenderer.invoke('bible:getTranslations'),

    getTranslation: (
      id: string,
    ): Promise<{
      success: boolean;
      data?: BibleTranslation | null;
      error?: string;
    }> => ipcRenderer.invoke('bible:getTranslation', id),

    getBooks: (
      translationId: string,
    ): Promise<{
      success: boolean;
      data?: BibleBook[];
      error?: string;
    }> => ipcRenderer.invoke('bible:getBooks', translationId),

    getVerses: (
      bookId: string,
      chapter: number,
    ): Promise<{
      success: boolean;
      data?: BibleVerse[];
      error?: string;
    }> => ipcRenderer.invoke('bible:getVerses', bookId, chapter),

    getVersesRange: (
      bookId: string,
      chapter: number,
      startVerse: number,
      endVerse: number,
    ): Promise<{
      success: boolean;
      data?: BibleVerse[];
      error?: string;
    }> =>
      ipcRenderer.invoke(
        'bible:getVersesRange',
        bookId,
        chapter,
        startVerse,
        endVerse,
      ),

    getVerseCount: (
      bookId: string,
      chapter: number,
    ): Promise<{
      success: boolean;
      data?: number;
      error?: string;
    }> => ipcRenderer.invoke('bible:getVerseCount', bookId, chapter),

    searchVerses: (
      translationId: string,
      query: string,
      limit?: number,
    ): Promise<{
      success: boolean;
      data?: BibleVerse[];
      error?: string;
    }> => ipcRenderer.invoke('bible:searchVerses', translationId, query, limit),

    versesToSlides: (
      bookId: string,
      bookName: string,
      chapter: number,
      startVerse: number,
      endVerse: number,
      displayMode: BibleDisplayMode,
    ): Promise<{
      success: boolean;
      data?: Slide[];
      error?: string;
    }> =>
      ipcRenderer.invoke(
        'bible:versesToSlides',
        bookId,
        bookName,
        chapter,
        startVerse,
        endVerse,
        displayMode,
      ),

    importFromFile: (): Promise<{
      success: boolean;
      data?: BibleTranslation;
      error?: string;
      canceled?: boolean;
    }> => ipcRenderer.invoke('bible:importFromFile'),

    downloadAndImport: (
      bibleId: string,
    ): Promise<{
      success: boolean;
      data?: BibleTranslation;
      error?: string;
    }> => ipcRenderer.invoke('bible:downloadAndImport', bibleId),

    deleteTranslation: (
      id: string,
    ): Promise<{
      success: boolean;
      data?: boolean;
      error?: string;
    }> => ipcRenderer.invoke('bible:deleteTranslation', id),

    getAvailableBibles: (): Promise<{
      success: boolean;
      data?: BibleDownloadInfo[];
      error?: string;
    }> => ipcRenderer.invoke('bible:getAvailableBibles'),

    onImportProgress: (
      callback: (data: { progress: number; message: string }) => void,
    ) => {
      const subscription = (
        _event: IpcRendererEvent,
        data: { progress: number; message: string },
      ) => callback(data);
      ipcRenderer.on('bible:importProgress', subscription);
      return () =>
        ipcRenderer.removeListener('bible:importProgress', subscription);
    },
  },

  // Frame operations
  frame: {
    getAll: (): Promise<{
      success: boolean;
      data?: Frame[];
      error?: string;
    }> => ipcRenderer.invoke('frame:getAll'),

    getById: (
      id: string,
    ): Promise<{
      success: boolean;
      data?: Frame | null;
      error?: string;
    }> => ipcRenderer.invoke('frame:getById', id),

    add: (input: {
      type: 'image' | 'css';
      name: string;
      imagePath?: string;
      sliceSize?: number;
      borderWidth?: number;
      borderColor?: string;
      borderRadius?: number;
      backgroundColor?: string;
      boxShadow?: string;
      padding?: { top: number; right: number; bottom: number; left: number };
    }): Promise<{
      success: boolean;
      data?: Frame;
      error?: string;
    }> => ipcRenderer.invoke('frame:add', input),

    update: (
      id: string,
      updates: {
        name?: string;
        sliceSize?: number;
        borderWidth?: number;
        borderColor?: string;
        borderRadius?: number;
        backgroundColor?: string;
        boxShadow?: string;
        padding?: { top: number; right: number; bottom: number; left: number };
      },
    ): Promise<{
      success: boolean;
      data?: Frame | null;
      error?: string;
    }> => ipcRenderer.invoke('frame:update', id, updates),

    delete: (
      id: string,
    ): Promise<{
      success: boolean;
      data?: boolean;
      error?: string;
    }> => ipcRenderer.invoke('frame:delete', id),

    importImage: (): Promise<{
      success: boolean;
      data?: string;
      error?: string;
      canceled?: boolean;
    }> => ipcRenderer.invoke('frame:importImage'),

    getSettings: (): Promise<{
      success: boolean;
      data?: FrameSettings;
      error?: string;
    }> => ipcRenderer.invoke('frame:getSettings'),

    setSettings: (
      settings: Partial<FrameSettings>,
    ): Promise<{
      success: boolean;
      data?: FrameSettings;
      error?: string;
    }> => ipcRenderer.invoke('frame:setSettings', settings),

    // Send frame update to projection window
    sendToProjection: (frame: Frame | null, itemType: SetlistItemType) =>
      ipcRenderer.send('projection:frame', { frame, itemType }),

    // Projection window receives frame updates
    onFrame: (
      callback: (data: {
        frame: Frame | null;
        itemType: SetlistItemType;
      }) => void,
    ) => {
      const subscription = (
        _event: IpcRendererEvent,
        data: { frame: Frame | null; itemType: SetlistItemType },
      ) => callback(data);
      ipcRenderer.on('projection:frame', subscription);
      return () => ipcRenderer.removeListener('projection:frame', subscription);
    },
  },

  // Session items operations (unified setlist)
  sessionItem: {
    getAll: (
      sessionId: string,
    ): Promise<{
      success: boolean;
      data?: SetlistItem[];
      error?: string;
    }> => ipcRenderer.invoke('sessionItem:getAll', sessionId),

    add: (
      sessionId: string,
      input: SetlistItemInput,
    ): Promise<{
      success: boolean;
      data?: SetlistItem;
      error?: string;
    }> => ipcRenderer.invoke('sessionItem:add', sessionId, input),

    update: (
      id: string,
      updates: {
        title?: string;
        content?: string;
        startVerse?: number;
        endVerse?: number;
        displayMode?: string;
        noteDisplayMode?: string;
        noteContentType?: string;
        imagePath?: string;
        overlayPosition?: string;
      },
    ): Promise<{
      success: boolean;
      data?: SetlistItem;
      error?: string;
    }> => ipcRenderer.invoke('sessionItem:update', id, updates),

    delete: (
      id: string,
    ): Promise<{
      success: boolean;
      data?: boolean;
      error?: string;
    }> => ipcRenderer.invoke('sessionItem:delete', id),

    reorder: (
      sessionId: string,
      itemIds: string[],
    ): Promise<{
      success: boolean;
      data?: boolean;
      error?: string;
    }> => ipcRenderer.invoke('sessionItem:reorder', sessionId, itemIds),
  },

  // Utilities
  utils: {
    getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  },
};

contextBridge.exposeInMainWorld('electron', extendedElectronHandler);

export type ElectronHandler = typeof extendedElectronHandler;
