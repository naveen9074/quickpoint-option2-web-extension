# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Manifest V3 Constraints

**READ THIS FIRST before making any changes:**

1. **`background.js` is a Service Worker, NOT a background page**
   - NO access to DOM or `window` object
   - CANNOT run `webkitSpeechRecognition` or `getUserMedia`

2. **Content scripts run in ISOLATED world**
   - Cannot use page's microphone permission directly

3. **Solution: MAIN World Injection**
   - `injected.js` is injected into page's MAIN world via `<script>` tag
   - Shares the page's context and permissions
   - Meet/Zoom already have microphone permission granted

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────────┐
│   POPUP     │────>│   BACKGROUND    │────>│   CONTENT SCRIPT     │
│ (Settings)  │     │ (Service Worker)│     │  (Isolated World)    │
└─────────────┘     └─────────────────┘     └──────────┬───────────┘
                                                       │ injects
                                                       ▼
                                            ┌──────────────────────┐
                                            │    INJECTED.JS       │
                                            │  (Page MAIN World)   │
                                            │ - getUserMedia       │
                                            │ - SpeechRecognition  │
                                            │ - Groq API calls     │
                                            └──────────────────────┘
```

## File Structure

| File | Purpose |
|------|---------|
| `manifest.json` | Extension configuration (MV3) |
| `background.js` | Service worker - routes messages only |
| `content.js` | Injects script, renders subtitle UI, bridges messages |
| `injected.js` | Runs in page context - speech recognition + Groq API |
| `popup.html/js/css` | Settings UI - API key, Start/Stop controls |
| `content.css` | Subtitle overlay styling |

## Message Flow

1. User clicks **Start** → popup sends `START_CAPTURE` → background
2. Background sends `START_RECOGNITION` → content script
3. Content posts message → injected.js (via `postMessage`)
4. Injected.js requests mic via `getUserMedia`, starts `SpeechRecognition`
5. Results flow back: injected.js → content script → UI update
6. Final results trigger Groq API for slang clarification

## Visual States

- **interim** (grey): Real-time partial transcription
- **final** (white): Complete phrase
- **correction** (gold + 💡): AI-clarified text

## Development

### Load Extension
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select this directory

### Test
1. Open Google Meet or Zoom
2. Enable microphone in the meeting
3. Click extension → enter Groq API key → Save
4. Click Start Capture
5. Speak → subtitles appear

## API

**Groq API**: `llama-3.3-70b-versatile` model
**Key format**: `gsk_...` (stored in `chrome.storage.local`)
