// QuickPoint Live Subtitles - Content Script

(function() {
  'use strict';

  const OVERLAY_ID = 'quickpoint-overlay';
  const SUBTITLE_ID = 'quickpoint-subtitle';

  let overlay = null;
  let subtitleElement = null;
  let hideTimeout = null;

  function injectScript() {
    if (document.getElementById('quickpoint-script')) return;

    const script = document.createElement('script');
    script.id = 'quickpoint-script';
    script.src = chrome.runtime.getURL('injected.js');
    (document.head || document.documentElement).appendChild(script);
  }

  function createOverlay() {
    if (document.getElementById(OVERLAY_ID)) {
      overlay = document.getElementById(OVERLAY_ID);
      subtitleElement = document.getElementById(SUBTITLE_ID);
      return;
    }

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;

    // Header
    const header = document.createElement('div');
    header.id = 'quickpoint-overlay-header';

    const logo = document.createElement('span');
    logo.className = 'quickpoint-logo';
    logo.textContent = '⚡ QuickPoint Live';

    const statusGroup = document.createElement('div');
    statusGroup.className = 'quickpoint-status-group';

    const statusDot = document.createElement('span');
    statusDot.className = 'quickpoint-status-dot';

    const statusText = document.createElement('span');
    statusText.className = 'quickpoint-status-text';
    statusText.textContent = 'REC';

    statusGroup.appendChild(statusDot);
    statusGroup.appendChild(statusText);

    const closeBtn = document.createElement('button');
    closeBtn.id = 'quickpoint-overlay-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Minimize Subtitles';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.classList.remove('visible');
    });

    header.appendChild(logo);
    header.appendChild(statusGroup);
    header.appendChild(closeBtn);

    subtitleElement = document.createElement('div');
    subtitleElement.id = SUBTITLE_ID;

    overlay.appendChild(header);
    overlay.appendChild(subtitleElement);
    document.body.appendChild(overlay);
  }

  function saveSegmentToStorage(text, isCorrection = false) {
    const cleanText = text.trim();
    if (!cleanText || cleanText.startsWith('🎤') || cleanText === 'Listening...') return;

    chrome.storage.local.get(['meetingSegments'], (result) => {
      let segments = result.meetingSegments || [];
      if (isCorrection) {
        if (segments.length > 0) {
          segments[segments.length - 1] = cleanText;
        } else {
          segments.push(cleanText);
        }
      } else {
        // Only append if it's not a duplicate of the last segment (Web Speech API can sometimes repeat final results)
        if (segments.length === 0 || segments[segments.length - 1] !== cleanText) {
          segments.push(cleanText);
        }
      }
      chrome.storage.local.set({
        meetingSegments: segments,
        meetingTranscript: segments.join(' ')
      });
    });
  }

  function updateSubtitle(text, type) {
    if (!overlay || !subtitleElement) createOverlay();

    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    const cleanText = text.trim();
    if (!cleanText) {
      overlay.classList.remove('visible');
      return;
    }

    subtitleElement.classList.remove('interim', 'final', 'correction');

    switch (type) {
      case 'interim':
        subtitleElement.classList.add('interim');
        subtitleElement.textContent = cleanText;
        break;
      case 'final':
        subtitleElement.classList.add('final');
        subtitleElement.textContent = cleanText;
        saveSegmentToStorage(cleanText, false);
        break;
      case 'correction':
        subtitleElement.classList.add('correction');
        subtitleElement.textContent = '';
        const indicator = document.createElement('span');
        indicator.className = 'correction-indicator';
        indicator.textContent = '💡';
        subtitleElement.appendChild(indicator);
        subtitleElement.appendChild(document.createTextNode(' ' + cleanText));
        saveSegmentToStorage(cleanText, true);
        break;
      default:
        subtitleElement.textContent = cleanText;
    }

    overlay.classList.add('visible');

    if (type === 'final' || type === 'correction') {
      hideTimeout = setTimeout(() => {
        overlay.classList.remove('visible');
      }, 8000);
    }
  }

  function sendToInjected(type, data = {}) {
    window.postMessage({
      source: 'slang-clarifier-content',
      type: type,
      ...data
    }, '*');
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.source !== 'slang-clarifier-injected') return;

    const { type, text, displayType, error, status } = event.data;

    if (type === 'TRANSCRIPT') {
      updateSubtitle(text, displayType);
    } else if (type === 'ERROR') {
      updateSubtitle(`[Error: ${error}]`, 'interim');
    } else if (type === 'CAPTURE_STATUS') {
      chrome.storage.local.set({ captureStatus: status });
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'QUICKPOINT_PING':
        sendResponse({ ok: true, ready: true });
        break;

      case 'START_RECOGNITION':
        chrome.storage.local.set({
          meetingSegments: [],
          meetingTranscript: '',
          meetingSummary: '',
          meetingKeyPoints: [],
          meetingActionItems: [],
          isRecording: true
        }, () => {
          sendToInjected('START', { apiKey: message.apiKey, streamId: message.streamId });
          createOverlay();
          overlay?.classList.add('visible');
          sendResponse({ success: true });
        });
        break;

      case 'STOP_RECOGNITION':
        chrome.storage.local.set({ isRecording: false }, () => {
          sendToInjected('STOP');
          overlay?.classList.remove('visible');
          sendResponse({ success: true });
        });
        break;

      default:
        sendResponse({ success: false });
    }
    return true;
  });

  createOverlay();
  injectScript();
})();
