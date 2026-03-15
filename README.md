<p align="center">
  <img src="assets/icons/logo.png" alt="OpenWorship" width="80">
</p>

<h1 align="center">OpenWorship</h1>

<p align="center">
  <strong>Free, open-source worship presentation software for churches</strong>
</p>

<p align="center">
  <a href="https://github.com/jaycho1214/openworship/releases/"><img src="https://img.shields.io/github/v/release/jaycho1214/openworship?style=flat-square&color=4a90a4" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-4a90a4?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20·%20Windows%20·%20Linux-4a90a4?style=flat-square" alt="Platform">
</p>

<p align="center">
  <a href="./README.ko.md">한국어</a>
</p>

<br>

> **Support this project** — OpenWorship is free and open-source. If it has blessed your ministry, consider supporting continued development.
>
> <a href="https://github.com/sponsors/jaycho1214"><img src="https://img.shields.io/badge/GitHub%20Sponsors-ea4aaa?style=for-the-badge&logo=githubsponsors&logoColor=white" alt="GitHub Sponsors"></a>&nbsp;<a href="https://buymeacoffee.com/jaycho1214"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black" alt="Buy Me a Coffee"></a>

<br>

<p align="center">
  <img src="assets/preview.png" alt="OpenWorship Preview" width="100%">
</p>

<p align="center">
  <a href="https://github.com/jaycho1214/openworship/releases/">
    <img src="https://img.shields.io/badge/Download-Latest%20Release-4a90a4?style=for-the-badge" alt="Download">
  </a>
</p>

<br>

## Features

|                            |                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Dual-Window System**     | Control from your laptop while displaying on the projector. Real-time preview shows exactly what your congregation sees. |
| **Songs & Smart Library**  | Build your permanent song collection. Search, organize, and drag songs into any session instantly.                       |
| **Bible Verses**           | Display Scripture with built-in translations (KJV, ASV, and more). Search by book, chapter, and verse.                  |
| **Notes & Announcements**  | Add custom text slides or overlay banners for announcements, liturgy, or any freeform content.                          |
| **OCR Import**             | Extract lyrics from images and PDFs automatically using AI. No more manual typing from song sheets.                     |
| **Video & Image Backgrounds** | Beautiful motion backgrounds and custom images. Adjustable dimming for readability.                                  |
| **Custom Frames**          | Add decorative borders to your slides — image-based (9-slice) or CSS-styled with radius, shadow, and color.             |
| **Advertisements**         | Display text or image ads as fullscreen slides or banner overlays with auto-rotation.                                   |
| **Import / Export**        | Share songs, sessions, or your entire library as `.oworship` files with smart conflict resolution.                      |
| **Custom Typography**      | Import any font. Fine-tune size, color, shadow, outline, and per-content-type styling.                                  |
| **Slide Animations**       | Smooth transitions between slides — fade, slide up, or slide left.                                                     |
| **Keyboard Shortcuts**     | Full keyboard control — navigate slides, jump sections, blank screen, undo/redo, and more.                              |
| **Multilingual**           | English and Korean interface with full i18n support.                                                                    |

<br>

## Quick Start

```
1. Create a Session    →  Your setlist for the service
2. Add Content         →  Songs, Bible verses, or announcements
3. Open Projection     →  Display on your projector/screen
4. Use arrow keys      →  Navigate through slides
```

<br>

## Installation

| Platform | File        |
| -------- | ----------- |
| macOS    | `.dmg`      |
| Windows  | `.exe`      |
| Linux    | `.AppImage` |

<p>
  <a href="https://github.com/jaycho1214/openworship/releases/">
    <img src="https://img.shields.io/badge/Download-Latest%20Release-4a90a4?style=for-the-badge" alt="Download">
  </a>
</p>

<details>
<summary>Build from source</summary>

<br>

```bash
git clone https://github.com/jaycho1214/openworship.git
cd openworship
npm install
npm start
```

</details>

<br>

## User Guide

### Sessions

A **session** is your worship setlist. Create one for each service.

| Action         | How                               |
| -------------- | --------------------------------- |
| Create session | Click **"New Session"** in header |
| Switch session | Use dropdown in header            |
| Rename session | Right-click session name          |
| Delete session | Right-click → Delete              |

Sessions save automatically.

### Adding Content

Click **"+ Add"** to insert content into your session. Three content types are supported:

**Songs**

1. Enter title and lyrics (or search the library)
2. Separate slides with blank lines:

```
First verse line one
First verse line two

Second verse line one
Second verse line two
```

3. Use section markers like `[Verse]`, `[Chorus]`, `[Bridge]` for quick navigation

**Bible Verses**

1. Select a translation (KJV, ASV, BBE, and more available to download)
2. Pick book, chapter, and verse range
3. Choose display mode — one verse per slide or full range on one slide

**Notes / Announcements**

1. Enter custom text for announcements, liturgy, or readings
2. Choose to display as full slides or as an overlay banner (top or bottom)

**From Library**

- Open library sidebar (left edge)
- Search for songs
- Drag into your session

**OCR Import**

1. Click **"+ Add"** → **"Image Import"**
2. Drop images or PDFs — AI extracts the lyrics
3. Review, edit, save

> Requires OpenAI API key in Settings → API

**Import from File**

1. Click **"+ Add"** → **"Import"**
2. Select a `.oworship` file
3. Preview contents and choose how to handle duplicates (skip, overwrite, or create copy)

### Keyboard Controls

| Key                    | Action                      |
| ---------------------- | --------------------------- |
| `Space` or `→`         | Next slide                  |
| `←`                    | Previous slide              |
| `↓`                    | Next song / item            |
| `↑`                    | Previous song / item        |
| `Tab`                  | Next section                |
| `Shift+Tab`            | Previous section            |
| `Home`                 | First slide                 |
| `End`                  | Last slide                  |
| `1` – `9`              | Jump to section (or slide)  |
| `B`                    | Toggle blank screen         |
| `V`                    | Toggle verse indicator      |
| `.` or `Esc`           | Toggle blank                |
| `Cmd/Ctrl+Z`           | Undo                        |
| `Cmd/Ctrl+Shift+Z`     | Redo                        |

### Customization

**Fonts** — Settings → Appearance. Supports `.ttf` `.otf` `.woff` `.woff2`

**Video & Image Backgrounds** — Settings → Display. Videos (`.mp4` `.webm` `.mov`) and images (`.png` `.jpg` `.gif` `.webp`). Adjustable background dimming.

**Text Styling** — Per-content-type settings for font size, color, shadow, outline, alignment, padding, and line gap. Bible verses have separate reference text styling.

**Frames** — Settings → Frames. Add decorative borders using 9-slice images or CSS styles (border, radius, shadow, background). Assign different frames per content type.

**Slide Animations** — Settings → Display. Choose from none, fade, slide up, or slide left transitions.

**Theme** — Settings → Appearance. Light, dark, or system theme.

<br>

## Tips

<details>
<summary>Preparing for Sunday</summary>

<br>

1. Create session early in the week
2. Add songs, Bible readings, and announcements in order
3. Review slide breaks
4. Test on actual display
5. Ready before service starts

</details>

<details>
<summary>Optimal Slides</summary>

<br>

- 2-4 lines per slide
- Match natural song phrases
- Avoid single-line slides (too fast)
- Avoid 6+ lines (too crowded)
- Use section markers (`[Verse]`, `[Chorus]`) for quick navigation during worship

</details>

<details>
<summary>Multi-Monitor Setup</summary>

<br>

1. Connect projector as extended display
2. Open OpenWorship on main monitor
3. Click "Open Projection"
4. Projection goes to secondary display
5. Control from main, display on projector

</details>

<details>
<summary>Sharing Content</summary>

<br>

- Export individual songs, entire sessions, or your full library as `.oworship` files
- Share with other worship teams or back up your collection
- Import with conflict resolution — skip, overwrite, or create copies

</details>

<br>

## Development

| Command           | Description      |
| ----------------- | ---------------- |
| `npm start`       | Development mode |
| `npm run build`   | Production build |
| `npm run package` | Create installer |
| `npm run lint`    | Lint code        |
| `npm test`        | Run tests        |

<details>
<summary>Architecture</summary>

<br>

```
src/
├── main/              # Electron main process
│   ├── ipc/           # IPC handlers (songs, sessions, bible, frames, etc.)
│   └── services/      # Database, media, export, bible, advertisements
├── renderer/
│   ├── control/       # Control window (editor, library, settings)
│   ├── projection/    # Projection window (fullscreen lyrics display)
│   └── shared/        # i18n, utilities, shared components
└── shared/            # TypeScript types shared across processes
```

**Tech Stack** — Electron 35 · React 19 · TypeScript 5.8 · Tailwind CSS 4 · shadcn/ui · better-sqlite3 · OpenAI API

</details>

<br>

## Contributing

Contributions welcome! Fork, create a feature branch, and submit a Pull Request.

## License

MIT License — free to use for your church or ministry.

<br>

---

<p align="center">
  <em>"Let everything that has breath praise the Lord."</em><br>
  <strong>Psalm 150:6</strong>
</p>

<p align="center">
  <sub>Made with faith for churches worldwide</sub>
</p>
