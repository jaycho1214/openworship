<p align="center">
  <img src="assets/icons/logo.png" alt="OpenWorship" width="100">
</p>

<h1 align="center">OpenWorship</h1>

<p align="center">
  <strong>Free, open-source worship presentation software for churches</strong>
</p>

<p align="center">
  <a href="https://github.com/jaycho1214/openworship/releases/"><img src="https://img.shields.io/github/v/release/jaycho1214/openworship?style=flat-square&color=4a90a4" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-4a90a4?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%E2%80%A2%20Windows%20%E2%80%A2%20Linux-4a90a4?style=flat-square" alt="Platform">
</p>

<p align="center">
  <a href="./README.ko.md">한국어</a>
</p>

<br>

<p align="center">
  <img src="assets/preview.png" alt="OpenWorship Preview" width="800">
</p>

<br>

<h2 align="center">
  <a href="https://github.com/jaycho1214/openworship/releases/">
    Download for macOS, Windows, or Linux
  </a>
</h2>

---

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

<br>

---

<br>

## Installation

Download the latest release:

| Platform    | File        |
| ----------- | ----------- |
| **macOS**   | `.dmg`      |
| **Windows** | `.exe`      |
| **Linux**   | `.AppImage` |

<p>
  <a href="https://github.com/jaycho1214/openworship/releases/">
    <img src="https://img.shields.io/badge/Download-Latest%20Release-4a90a4?style=for-the-badge" alt="Download">
  </a>
</p>

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

| Action         | How                               |
| -------------- | --------------------------------- |
| Create session | Click **"New Session"** in header |
| Switch session | Use dropdown in header            |
| Rename session | Right-click session name          |
| Delete session | Right-click → Delete              |

Sessions save automatically.

<br>

### Adding Songs

**Manual Entry**

1. Click **"+ Add"**
2. Type title and lyrics
3. Save

Format your lyrics with blank lines to create new slides:

```
First verse line one
First verse line two

Second verse line one
Second verse line two
```

**From Library**

- Open library sidebar (left edge)
- Search for songs
- Drag into your session

**OCR Import**

1. Click **"+ Add"** → **"Image Import"**
2. Drop files or click to select
3. AI extracts the lyrics
4. Review, edit, save

> Requires OpenAI API key in Settings → API

<br>

### Keyboard Controls

| Key                   | Action                 |
| --------------------- | ---------------------- |
| `←` `→`               | Previous / Next slide  |
| `↑` `↓`               | Previous / Next slide  |
| `Page Up` `Page Down` | Previous / Next song   |
| `Home` `End`          | First / Last slide     |
| `B`                   | Blank screen           |
| `V`                   | Toggle verse indicator |
| `Esc`                 | Close projection       |

<br>

### Customization

**Fonts** — Settings → Appearance. Supports `.ttf` `.otf` `.woff` `.woff2`

**Video Backgrounds** — Settings → Display. Supports `.mp4` `.webm` `.mov`

**Text Styling** — Adjust font size, weight, shadow, position, and line height.

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

| Command           | Description      |
| ----------------- | ---------------- |
| `npm start`       | Development mode |
| `npm run build`   | Production build |
| `npm run package` | Create installer |
| `npm run lint`    | Lint code        |

### Architecture

```
src/
├── main/              # Electron main process
├── renderer/          # React UI (control + projection windows)
└── shared/            # Shared types
```

### Tech Stack

Electron 35 · React 19 · TypeScript 5.8 · Tailwind CSS 4 · shadcn/ui · better-sqlite3 · OpenAI API

<br>

---

<br>

## Contributing

Contributions welcome! Fork, create a feature branch, and submit a Pull Request.

<br>

---

<br>

## Support

OpenWorship is free and open-source. If it has blessed your ministry, consider supporting continued development.

<p>
  <a href="https://github.com/sponsors/jaycho1214">
    <img src="https://img.shields.io/badge/GitHub%20Sponsors-Support-ea4aaa?style=for-the-badge&logo=githubsponsors&logoColor=white" alt="GitHub Sponsors">
  </a>
  &nbsp;
  <a href="https://buymeacoffee.com/jaycho1214">
    <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Support-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black" alt="Buy Me a Coffee">
  </a>
</p>

<br>

---

<br>

## License

MIT License — free to use for your church or ministry.

<br>

---

<br>

<p align="center">
  <em>"Let everything that has breath praise the Lord."</em><br>
  <strong>Psalm 150:6</strong>
</p>

<p align="center">
  <sub>Made with faith for churches worldwide</sub>
</p>
