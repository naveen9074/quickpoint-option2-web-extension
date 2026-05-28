// Slang Clarifier - Injected Script (runs in page's MAIN world)

(function() {
  'use strict';

  if (window.__slangClarifierInjected) return;
  window.__slangClarifierInjected = true;

  let recognition = null;
  let isRecognizing = false;
  let groqApiKey = null;

  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const GROQ_MODEL = 'llama-3.3-70b-versatile';

  const SYSTEM_PROMPT = `You are a slang translator. Analyze the input text and return ONLY a valid JSON object:
{"needs_correction": boolean, "corrected_text": string}

Rules:
- If standard English with no slang/idioms, set needs_correction to false.
- If it has slang (e.g., 'servo', 'arvo', 'brekkie'), set needs_correction to true and provide standard English.
- Return ONLY the JSON object.`;

  function sendToContentScript(type, data) {
    window.postMessage({
      source: 'slang-clarifier-injected',
      type: type,
      ...data
    }, '*');
  }

  function initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      sendToContentScript('ERROR', { error: 'Speech recognition not supported' });
      return null;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      isRecognizing = true;
      sendToContentScript('TRANSCRIPT', { text: '🎤 Listening...', displayType: 'interim' });
    };

    rec.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        sendToContentScript('TRANSCRIPT', { text: interim, displayType: 'interim' });
      }

      if (final) {
        sendToContentScript('TRANSCRIPT', { text: final, displayType: 'final' });
        clarifyWithGroq(final);
      }
    };

    rec.onerror = (event) => {
      if (event.error === 'not-allowed') {
        sendToContentScript('ERROR', { error: 'Microphone denied' });
        isRecognizing = false;
        return;
      }
      if (event.error === 'no-speech') return;

      if (isRecognizing && (event.error === 'network' || event.error === 'aborted')) {
        setTimeout(() => {
          if (isRecognizing && recognition) {
            try { recognition.start(); } catch(e) {}
          }
        }, 1000);
      }
    };

    rec.onend = () => {
      if (isRecognizing) {
        setTimeout(() => {
          if (isRecognizing && recognition) {
            try { recognition.start(); } catch(e) { isRecognizing = false; }
          }
        }, 100);
      }
    };

    return rec;
  }

  async function startRecognition(apiKey, streamId) {
    if (isRecognizing) return;

    groqApiKey = apiKey;
    let micStream = null;
    let tabStream = null;
    let captureStatus = 'mic-active'; // Default status

    // 1. Capture Direct Microphone Speech
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      window.__slangClarifierMicStream = micStream;
    } catch (e) {
      console.error("[INJECTED] Microphone access denied:", e);
      sendToContentScript('ERROR', { error: 'Mic access denied' });
      sendToContentScript('CAPTURE_STATUS', { status: 'mic-denied' });
      return;
    }

    // 2. Capture Browser Tab Audio if streamId was provided
    if (streamId) {
      try {
        tabStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: 'tab',
              chromeMediaSourceId: streamId
            }
          },
          video: false
        });
        window.__slangClarifierTabStream = tabStream;
        console.log("[INJECTED] Tab audio stream acquired successfully.");
      } catch (err) {
        console.warn("[INJECTED] Tab audio capture failed or user denied permission:", err);
      }
    }

    // 3. Combine Streams via Web Audio API
    if (micStream) {
      if (tabStream) {
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const micSource = audioCtx.createMediaStreamSource(micStream);
          const tabSource = audioCtx.createMediaStreamSource(tabStream);
          const mixerDestination = audioCtx.createMediaStreamDestination();

          // Mix mic and tab audio streams together
          micSource.connect(mixerDestination);
          tabSource.connect(mixerDestination);

          // IMPORTANT: Route tab audio to destination speakers so user can hear the video/meeting
          tabSource.connect(audioCtx.destination);

          window.__slangClarifierAudioCtx = audioCtx;
          window.__slangClarifierMixedStream = mixerDestination.stream;
          captureStatus = 'mic-tab-active';
          console.log("[INJECTED] Mic and Tab streams combined via Web Audio API mixer successfully.");
        } catch (mixErr) {
          console.error("[INJECTED] Web Audio API mixing error:", mixErr);
          captureStatus = 'tab-unavailable';
        }
      } else {
        // Tab stream capture not attempted or failed
        captureStatus = streamId ? 'tab-unavailable' : 'unsupported-page';
      }
    }

    // Report capture status back to content script
    sendToContentScript('CAPTURE_STATUS', { status: captureStatus });

    // 4. Initialize webkitSpeechRecognition
    // Note: webkitSpeechRecognition in Google Chrome automatically captures from the default system microphone.
    // Since the browser API doesn't accept a custom MediaStream source, we mixed the audio stream
    // for future compatibility with streaming APIs (e.g. custom Whisper socket endpoint), but
    // rely on Web Speech API capturing the user's voice in this client-only offline prototype.
    recognition = initRecognition();
    if (!recognition) return;

    try {
      recognition.start();
    } catch (e) {
      sendToContentScript('ERROR', { error: 'Failed to start recognition' });
    }
  }

  function stopRecognition() {
    isRecognizing = false;
    if (recognition) {
      try { recognition.stop(); } catch(e) {}
      recognition = null;
    }
    
    // Stop all audio tracks and clean up context
    if (window.__slangClarifierMicStream) {
      window.__slangClarifierMicStream.getTracks().forEach(t => t.stop());
      window.__slangClarifierMicStream = null;
    }
    if (window.__slangClarifierTabStream) {
      window.__slangClarifierTabStream.getTracks().forEach(t => t.stop());
      window.__slangClarifierTabStream = null;
    }
    if (window.__slangClarifierMixedStream) {
      window.__slangClarifierMixedStream.getTracks().forEach(t => t.stop());
      window.__slangClarifierMixedStream = null;
    }
    if (window.__slangClarifierAudioCtx) {
      try {
        window.__slangClarifierAudioCtx.close();
      } catch (e) {}
      window.__slangClarifierAudioCtx = null;
    }
  }

  async function clarifyWithGroq(text) {
    if (!groqApiKey || !text.trim()) return;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: text }
          ],
          temperature: 0.1,
          max_tokens: 200
        })
      });

      if (!response.ok) return;

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      if (!content) return;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;

      const result = JSON.parse(jsonMatch[0]);

      if (result.needs_correction && result.corrected_text) {
        sendToContentScript('TRANSCRIPT', {
          text: result.corrected_text,
          displayType: 'correction'
        });
      }
    } catch (e) {}
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== 'slang-clarifier-content') return;

    const { type, apiKey, streamId } = event.data;

    if (type === 'START') {
      startRecognition(apiKey, streamId);
    } else if (type === 'STOP') {
      stopRecognition();
    }
  });
})();
