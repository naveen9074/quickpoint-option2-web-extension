# QuickPoint Live Subtitles Extension

A premium Chrome extension that provides real-time subtitle overlays, live session transcription, and AI-powered meeting intelligence (summaries, key points, and action items) for the **QuickPoint AI Meeting Assistant**.

---

## Features

- **Global Subtitles**: Works on any web page including Google Meet, Zoom web, Microsoft Teams web, YouTube, and normal browser pages.
- **Fast Live Transcription**: Employs the browser's native Web Speech API for near-zero delay transcription overlay.
- **AI Slang & Idiom Translation**: Translates local slang (e.g., Australian slang) to standard English in real-time using Groq Llama 3.3.
- **AI Meeting Summaries**: Generates meeting summaries, key discussion points, and action items with one click.
- **Local PDF Report Export**: Generates a beautifully formatted report layout that can be printed or saved directly as a PDF.
- **Dashboard Synchronization**: Sends sessions directly to the local QuickPoint Web Dashboard database.

---

## Installation & Setup

### 1. Load the Extension in Chrome/Edge
1. Open Google Chrome or Microsoft Edge and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left.
4. Select the `accent-subtitle-extension` folder inside this project directory.
5. The **QuickPoint Live Subtitles** extension will appear in your toolbar.

### 2. Configure your Groq API Key
1. Get a free API key from the [Groq Console](https://console.groq.com/keys).
2. Click the QuickPoint Live Subtitles icon in your browser toolbar.
3. Paste your key in the **Groq API Key** field (starts with `gsk_`) and click **Save Key**.

---

## Usage Guide

1. **Start Recording**:
   - Open any meeting page (e.g., Google Meet) or any web page.
   - Click the extension icon, enter a custom **Meeting Title**, and click **Start**.
   - Grant microphone permission when prompted by the browser.
   - Subtitles will appear in a sleek glassmorphic overlay at the bottom of the webpage.
   
2. **AI slang clarification**:
   - Any slang recognized will be highlighted in yellow with a 💡 lightbulb indicator showing the corrected translation.

3. **Generate Summary & Action Items**:
   - After speaking, click **Stop** to conclude the session.
   - Click **Generate AI Summary** in the extension popup.
   - Groq AI will parse the running transcript and display a meeting summary, key topics, and action items directly in the popup.

4. **Export and Sync**:
   - Click **Export PDF** to open a beautiful printable report tab. Select "Save as PDF" in the print dialog.
   - Run the QuickPoint backend server (`http://localhost:8000`) and click **Dashboard Sync** to instantly push the transcript and summary into your main web dashboard.

---

## Folder Structure

```
quickpoint-extension
├── manifest.json   <- Ext. definitions & global permissions
├── background.js   <- Service worker managing message passing
├── content.js      <- Handles page injection & local storage accumulation
├── content.css     <- Premium glassmorphic style for live subtitle overlay
├── injected.js     <- Web Speech API interface & Groq slang processing
├── popup.html      <- User interface for control & AI summaries
├── popup.js        <- Handles local API, print exports & backend syncing
├── popup.css       <- Glassmorphic dark styling for the popup
└── icons           <- Application icon resources
```
