# ElevenMusic

A local-first music player with live audio visualizers. Import your own folder or files; the audio never leaves your browser.

**Live demo:** https://local-music-player-sable.vercel.app

## Features

- Local folder and file import using `webkitRelativePath`.
- Play/pause, seek, next/previous, shuffle, repeat, volume, and mute.
- Favorites, search, and play-count statistics.
- Library persistence in IndexedDB through `idb`, with `.elevenmusic.json` import/export.
- Five theme-aware visualizers: orb, waveform, circular, frequency-ring, and particles.
- Toast feedback, theater mode, a mobile drawer, and a keyboard shortcut reference page.
- ElevenLabs speech and scribe UI components.

## Stack

- Next.js 16.1.6, React 19.2.3, TypeScript
- Three.js 0.182 with `@react-three/fiber` 9.5 and `drei` 10.7 for visualizers
- ElevenLabs SDKs (`elevenlabs-js`, `@elevenlabs/react`)
- `idb` for IndexedDB, `motion` for animation, Radix, Tailwind CSS 4, ESLint 9
- npm with `package-lock.json`

## Requirements

- Node.js 18 or newer
- npm
- A local folder of audio files

## Run locally

```bash
npm install
npm run dev
# http://localhost:3000
```

No environment variables or `.env.example` are required. Audio files stay in your browser.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

There is no test script yet.

## Usage

Open the app, choose a folder or individual files, and playback starts locally. Press `?` for the shortcut list or visit `/shortcuts`.

| Key | Action |
| --- | --- |
| `Space` | Play or pause |
| `←` / `→` | Seek backward or forward |
| `↑` / `↓` | Volume up or down |
| `M` | Mute |
| `S` | Shuffle |
| `R` | Repeat |
| `L` | Favorites |
| `Ctrl/⌘ + F` | Search |
| `Esc` | Close overlay |
| `?` | Shortcut reference |

## Status and contributions

There is no license file. A GitHub workflow allows `/oc` or `/opencode` comments on issues and pull requests to run an agent, but there is no CONTRIBUTING guide. The npm package name is `elevenmusic` while the repository is `music-player`; keep them distinct on purpose or rename one for consistency. Add a `LICENSE` and contribution notes before inviting outside help.
