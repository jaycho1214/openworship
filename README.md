<p align="center">
  <img src="assets/icons/logo.png" alt="OpenWorship" width="120">
</p>

<h1 align="center">OpenWorship</h1>

<p align="center">
  <strong>Free, open-source worship presentation software for churches</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg" alt="Platform">
  <a href="https://electronjs.org"><img src="https://img.shields.io/badge/Electron-35-47848F.svg?logo=electron&logoColor=white" alt="Electron"></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=white" alt="React"></a>
</p>

<p align="center">
  <em>Project your song lyrics beautifully during worship services.</em><br>
  <em>Simple. Powerful. Made for churches.</em>
</p>

<p align="center">
  <a href="./README.ko.md">한국어 문서 보기</a>
</p>

<br>

---

<br>

## Support the Project

OpenWorship is free and open-source, built with love for churches worldwide. If this software has blessed your ministry, consider supporting its continued development.

<p>
  <a href="https://github.com/sponsors/jaycho1214">
    <img src="https://img.shields.io/badge/GitHub%20Sponsors-Support-ea4aaa?style=for-the-badge&logo=githubsponsors&logoColor=white" alt="GitHub Sponsors">
  </a>
  &nbsp;
  <a href="https://buymeacoffee.com/jaycho1214">
    <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Support-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black" alt="Buy Me a Coffee">
  </a>
</p>

Your support helps with:
- Continued development and new features
- Bug fixes and maintenance
- Supporting more languages and platforms

<br>

---

<br>

## Features

<table>
<tr>
<td width="50%">

**Dual-Window System**

Control from your laptop while displaying on the projector. Real-time preview shows exactly what your congregation sees.

</td>
<td width="50%">

**Smart Library**

Build your permanent song collection. Search, organize, and drag songs into any session instantly.

</td>
</tr>
<tr>
<td width="50%">

**OCR Import**

Extract lyrics from images and PDFs automatically using AI. No more manual typing from song sheets.

</td>
<td width="50%">

**Video Backgrounds**

Beautiful motion backgrounds included. Add your own videos for a professional worship atmosphere.

</td>
</tr>
<tr>
<td width="50%">

**Custom Typography**

Import any font. Fine-tune size, weight, shadow, and positioning to match your church's style.

</td>
<td width="50%">

**Keyboard Shortcuts**

Navigate with arrow keys, blank with B, and control everything without touching the mouse.

</td>
</tr>
</table>

<br>

---

<br>

## Quick Start

```
1. Create a Session    →  Your setlist for the service
2. Add Songs           →  From library, manual entry, or OCR import
3. Open Projection     →  Display on your projector/screen
4. Use arrow keys      →  Navigate through slides
```

That's it. You're presenting.

<br>

---

<br>

## Installation

Download the latest release for your platform:

| Platform | Download |
|----------|----------|
| macOS | [OpenWorship.dmg](#) |
| Windows | [OpenWorship-Setup.exe](#) |
| Linux | [OpenWorship.AppImage](#) |

Or build from source:

```bash
git clone https://github.com/jaycho1214/openworship.git
cd openworship
npm install
npm start
```

<br>

---

<br>

## User Guide

### Sessions

A **session** is your worship setlist. Create one for each service.

| Action | How |
|--------|-----|
| Create session | Click **"New Session"** in header |
| Switch session | Use dropdown in header |
| Rename session | Right-click session name |
| Delete session | Right-click → Delete |

Sessions save automatically.

<br>

### Adding Songs

#### Manual Entry

1. Click **"+ Add"**
2. Type title and lyrics
3. Save

**Format your lyrics:**
```
First verse line one
First verse line two

Second verse line one
Second verse line two
```

> Blank lines create new slides

<br>

#### From Library

The library stores your permanent song collection.

- Open library sidebar (left edge)
- Search for songs
- **Drag** into your session
- Or right-click → "Add to Session"

<br>

#### OCR Import (Images/PDF)

Extract lyrics from photos or documents automatically.

1. Click **"+ Add"** → **"Image Import"**
2. Drop files or click to select
3. AI extracts the lyrics
4. Review, edit, save

> **Setup required:** Add your OpenAI API key in Settings → API

<br>

### Presenting

#### Keyboard Controls

| Key | Action |
|-----|--------|
| `←` `→` | Previous / Next slide |
| `↑` `↓` | Previous / Next slide |
| `Page Up` | Previous song |
| `Page Down` | Next song |
| `Home` | First slide |
| `End` | Last slide |
| `B` | Blank screen |
| `V` | Toggle verse indicator |
| `Esc` | Close projection |

<br>

#### Live Preview

The preview panel shows exactly what's on screen. Click any slide to jump to it.

<br>

### Customization

#### Fonts

1. Settings → Appearance
2. **"Add Font"** to import custom fonts
3. Select from dropdown
4. Adjust size, weight

Supported formats: `.ttf` `.otf` `.woff` `.woff2`

<br>

#### Video Backgrounds

1. Settings → Display
2. **"Add Video"** or use built-in backgrounds
3. Select video
4. Enable shuffle for variety

Supported formats: `.mp4` `.webm` `.mov`

<br>

#### Text Styling

In Settings → Display:

- **Font Size** — 24px to 200px
- **Font Weight** — Thin to Black
- **Text Shadow** — Shadow intensity
- **Position** — Vertical placement
- **Line Height** — Line spacing

<br>

---

<br>

## Tips

<details>
<summary><strong>Preparing for Sunday</strong></summary>
<br>

1. Create session early in the week
2. Add songs in worship order
3. Review slide breaks
4. Test on actual display
5. Ready before service starts

</details>

<details>
<summary><strong>Optimal Slides</strong></summary>
<br>

- 2-4 lines per slide
- Match natural song phrases
- Avoid single-line slides (too fast)
- Avoid 6+ lines (too crowded)

</details>

<details>
<summary><strong>Multi-Monitor Setup</strong></summary>
<br>

1. Connect projector as extended display
2. Open OpenWorship on main monitor
3. Click "Open Projection"
4. Projection goes to secondary display
5. Control from main, display on projector

</details>

<br>

---

<br>

## Development

### Commands

| Command | Description |
|---------|-------------|
| `npm start` | Development mode |
| `npm run build` | Production build |
| `npm run package` | Create installer |
| `npm run lint` | Lint code |

### Architecture

```
src/
├── main/              # Electron main process
│   ├── main.ts        # App lifecycle
│   ├── windows/       # Window management
│   ├── ipc/           # IPC handlers
│   └── services/      # Database, settings, etc.
├── renderer/          # React UI
│   ├── control/       # Control window
│   ├── projection/    # Projection window
│   └── components/    # Shared UI
└── shared/            # Shared types
```

### Tech Stack

| Technology | Version |
|------------|---------|
| Electron | 35 |
| React | 19 |
| TypeScript | 5.8 |
| Tailwind CSS | 4 |
| shadcn/ui | latest |
| better-sqlite3 | latest |
| OpenAI API | GPT-5.2 |

### Data Location

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/OpenWorship/` |
| Windows | `%APPDATA%/OpenWorship/` |
| Linux | `~/.config/OpenWorship/` |

<br>

---

<br>

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

<br>

---

<br>

## License

MIT License — feel free to use this software for your church or ministry.

<br>

---

<br>

<p align="center">
  <em>"Let everything that has breath praise the Lord. Praise the Lord!"</em><br>
  <strong>— Psalm 150:6</strong>
</p>

<br>

<p align="center">
  <sub>Made with faith for churches worldwide</sub>
</p>
