// Slang Clarifier - Background Service Worker

let isCapturing = false;
let activeTabId = null;

async function startCapture(tabId) {
  try {
    const { groqApiKey } = await chrome.storage.local.get('groqApiKey');
    if (!groqApiKey) {
      throw new Error('API key not set');
    }

    // Try to get tab media stream ID for the active tab
    let streamId = null;
    try {
      streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
      console.log("[BG] Successfully acquired tab capture streamId:", streamId);
    } catch (err) {
      console.warn("[BG] Tab capture stream ID acquisition failed (unsupported page or permission denied):", err);
    }

    await chrome.tabs.sendMessage(tabId, {
      type: 'START_RECOGNITION',
      apiKey: groqApiKey,
      streamId: streamId
    });

    isCapturing = true;
    activeTabId = tabId;

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function stopCapture() {
  try {
    if (activeTabId) {
      await chrome.tabs.sendMessage(activeTabId, {
        type: 'STOP_RECOGNITION'
      });
    }

    isCapturing = false;
    activeTabId = null;

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_CAPTURE':
      startCapture(message.tabId).then(sendResponse);
      return true;

    case 'STOP_CAPTURE':
      stopCapture().then(sendResponse);
      return true;

    case 'GET_STATUS':
      sendResponse({ isCapturing, activeTabId });
      return false;

    default:
      return false;
  }
});
