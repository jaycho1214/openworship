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

IPC handlers in `src/main/ipc/`:
- `projectionHandlers.ts` - projection window control
- `dialogHandlers.ts` - file dialogs
- `libraryHandlers.ts` - song library CRUD
- `sessionHandlers.ts` - session management
- `sessionItemHandlers.ts` - unified setlist items (songs, bible, announcements)
- `settingsHandlers.ts` - app settings
- `fontHandlers.ts`, `videoHandlers.ts`, `imageHandlers.ts` - media assets
- `bibleHandlers.ts` - bible translations and verses
- `frameHandlers.ts` - custom frames/borders
- `advertisementHandlers.ts` - advertisement management
- `exportHandlers.ts` - import/export functionality
- `ocrHandlers.ts` - OCR lyrics extraction

Services in `src/main/services/`:
- `database.ts` - SQLite operations (better-sqlite3)
- `settings.ts` - Persistent settings (electron-store)
- `BibleService.ts` - Bible translation management
- `ExportService.ts` - Import/export .oworship files
- `AdvertisementService.ts` - Advertisement scheduling
- `FontService.ts`, `VideoService.ts`, `ImageService.ts` - Media management
- `openaiService.ts` - GPT Vision API for OCR

### Shared Types (`src/shared/types/`)

All types used by both main and renderer. Key files:
- `index.ts` - Re-exports all types (always import from here)
- `song.ts` - Song, Slide, Setlist
- `settings.ts` - ProjectionSettings, AppSettings
- `setlistItem.ts` - Unified SetlistItem (songs, bible, announcements)
- `bible.ts` - Bible translations, verses, references
- `frame.ts` - Custom frames/borders
- `ipc.ts` - IPC channel definitions

### Renderer Context Architecture

The control window uses a **multi-context architecture** with strict dependency ordering. All providers are composed in `src/renderer/control/context/index.tsx`:

```
SessionProvider      → Session management (no deps)
BibleProvider        → Bible translations/verses (no deps)
FrameProvider        → Custom frames (no deps)
SetlistProvider      → Setlist items (depends on Session)
PresentationProvider → Current slide state (depends on Setlist)
MediaProvider        → Fonts, videos, images (depends on Presentation)
ProjectionProvider   → Projection window control (depends on Presentation, Media, Frame)
AdvertisementProvider → Ads overlay (no deps)
```

**Use the hooks from `src/renderer/control/context/index.tsx`:**
```tsx
import { useSession, useSetlist, usePresentation, useProjection, useMedia, useBible, useFrame, useAdvertisement } from '@/control/context';
```

### Setlist Item System

The app uses a **unified setlist item system** that supports multiple content types:
- **Song items** - Traditional lyrics with slides
- **Bible items** - Bible verses with book/chapter/verse references
- **Announcement items** - Custom text slides

All items implement `SetlistItem` interface with type guards: `isSongItem()`, `isBibleItem()`, `isAnnouncementItem()`

## Tech Stack

- **Electron 35** + **React 19** + **TypeScript 5.8**
- **Webpack 5** (via Electron React Boilerplate in `.erb/`)
- **Tailwind CSS 4** + **shadcn/ui** (Radix UI components)
- **better-sqlite3** - Local database at `~/.config/OpenWorship/songs.db`
- **electron-store** - Settings persistence
- **OpenAI API** - GPT Vision for OCR lyrics extraction

## Key Files

| File | Purpose |
| ---- | ------- |
| `src/main/preload.ts` | IPC channel definitions, context bridge |
| `src/shared/types/index.ts` | All shared type definitions |
| `src/renderer/control/context/index.tsx` | Context providers and hooks |
| `src/renderer/shared/utils/lyricsParser.ts` | Lyrics text to slides conversion |

## CRITICAL RULES

### Always Use `/frontend-design` Skill for Frontend Work

**MANDATORY**: When designing, building, or modifying ANY frontend interface, ALWAYS use the `/frontend-design` skill first. This applies to:
- Creating new components
- Modifying existing UI
- Adding new features with UI elements
- Styling changes
- Layout adjustments

### Always Verify Frontend Accessibility for New Features

**MANDATORY**: When implementing ANY new feature (backend service, IPC handler, database change), ALWAYS verify that:
1. The feature is accessible from the frontend (UI exists to trigger it)
2. The IPC channel is exposed in `preload.ts`
3. A context hook or component can call the feature
4. The user has a way to interact with the feature

A feature is NOT complete until users can access it through the UI.

## UI Development Rules

1. **Always use shadcn/ui components** from `src/renderer/components/ui/` - prefer shadcn over custom components whenever possible
2. **Always read the shadcn component first** before using it to understand its props, variants, and API
3. **Never edit shadcn components directly** - they are managed by the shadcn CLI
4. **Always use `/frontend-design` skill** when designing or building frontend interfaces

## Configuration

- **TypeScript**: ES2022 target, strict mode enabled, path alias `@/*` → `src/renderer/*`
- **Database**: SQLite with tables for songs, sessions, setlist_items, bible_translations, bible_verses, frames, advertisements
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

## Error Handling

Use the standardized IPC response format from `src/shared/types/ipc.ts`:

```typescript
import { successResponse, errorResponse, getErrorMessage } from '../../shared/types';

// In IPC handlers:
return successResponse(result);
return errorResponse(getErrorMessage(error));
```

## Adding New IPC Handlers

1. Add channel to `InvokeChannels` or `SendChannels` in `src/shared/types/ipc.ts`
2. Add handler definition in `src/main/preload.ts`
3. Create handler in appropriate file in `src/main/ipc/`
4. Register in `src/main/ipc/index.ts`

## Adding New Content Types

To add a new setlist item type (like Bible or Announcement):
1. Add type definition in `src/shared/types/setlistItem.ts`
2. Add type guard function (e.g., `isNewItemType()`)
3. Update `getItemLabel()` and `getItemSlides()` utilities
4. Create service in `src/main/services/`
5. Create IPC handlers in `src/main/ipc/`
6. **Expose IPC channels in `src/main/preload.ts`**
7. Create context provider in `src/renderer/control/context/`
8. Add provider to composition order in `context/index.tsx`
9. **Create UI components to access the feature (use `/frontend-design`)**
10. **Verify users can access the feature through the UI**

## Versioning & Releases

- **Two package.json files** must stay in sync: root `package.json` and `release/app/package.json`
- electron-builder reads version from `release/app/package.json` (the `directories.app` path), NOT root `package.json`
- When bumping versions, update **both** files
- CI workflow (`.github/workflows/publish.yml`) syncs version from git tag at build time via `npm version --prefix release/app`

## Feature Implementation Checklist

Before considering ANY feature complete, verify:

- [ ] Backend service/logic implemented
- [ ] IPC handlers created and registered
- [ ] IPC channels exposed in `preload.ts`
- [ ] Types defined in `src/shared/types/`
- [ ] Context/hooks created for frontend access
- [ ] **UI component exists to trigger the feature**
- [ ] **User can access and use the feature from the control window**
- [ ] Translations added for any new UI text
