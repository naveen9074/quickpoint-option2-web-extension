// QuickPoint Live Subtitles - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const toggleVisibilityBtn = document.getElementById('toggleVisibility');
  const eyeIcon = document.getElementById('eyeIcon');
  const saveKeyBtn = document.getElementById('saveKey');
  const keyStatus = document.getElementById('keyStatus');
  const sessionTitleInput = document.getElementById('sessionTitle');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const transcriptPreview = document.getElementById('transcriptPreview');
  const wordCountBadge = document.getElementById('wordCount');
  
  const editTranscriptBtn = document.getElementById('editTranscriptBtn');
  const clearTranscriptBtn = document.getElementById('clearTranscriptBtn');
  const restartSessionBtn = document.getElementById('restartSessionBtn');
  const transcriptEditArea = document.getElementById('transcriptEditArea');
  
  const aiSection = document.getElementById('aiSection');
  const generateSummaryBtn = document.getElementById('generateSummaryBtn');
  const exportReportBtn = document.getElementById('exportReportBtn');
  const sendDashboardBtn = document.getElementById('sendDashboardBtn');
  const aiSpinner = document.getElementById('aiSpinner');
  const aiOutputs = document.getElementById('aiOutputs');
  
  const summaryText = document.getElementById('summaryText');
  const keyPointsList = document.getElementById('keyPointsList');
  const actionItemsList = document.getElementById('actionItemsList');

  let isRecording = false;
  let isEditingTranscript = false;

  // 1. Load settings on open
  async function loadSettings() {
    const data = await chrome.storage.local.get([
      'groqApiKey',
      'meetingTitle',
      'meetingTranscript',
      'meetingSummary',
      'meetingKeyPoints',
      'meetingActionItems',
      'isRecording'
    ]);

    if (data.groqApiKey) {
      apiKeyInput.value = data.groqApiKey;
      showKeyStatus('API key loaded', 'success');
    }

    if (data.meetingTitle) {
      sessionTitleInput.value = data.meetingTitle;
    } else {
      const now = new Date();
      sessionTitleInput.value = `QuickPoint Session - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }

    if (data.meetingTranscript) {
      updateTranscriptUI(data.meetingTranscript);
    }

    if (data.meetingSummary) {
      renderAIOutputs(data.meetingSummary, data.meetingKeyPoints || [], data.meetingActionItems || []);
    }

    // Double check status with service worker
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    updateUI(response.isCapturing);
  }

  // Key storage helpers
  async function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showKeyStatus('Please enter an API key', 'error');
      return;
    }
    if (!apiKey.startsWith('gsk_')) {
      showKeyStatus('Invalid key (should start with gsk_)', 'error');
      return;
    }
    await chrome.storage.local.set({ groqApiKey: apiKey });
    showKeyStatus('API key saved!', 'success');
  }

  function showKeyStatus(message, type) {
    keyStatus.textContent = message;
    keyStatus.className = `status-text ${type}`;
    setTimeout(() => {
      keyStatus.textContent = '';
      keyStatus.className = 'status-text';
    }, 3000);
  }

  function toggleKeyVisibility() {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      eyeIcon.textContent = '🙈';
    } else {
      apiKeyInput.type = 'password';
      eyeIcon.textContent = '👁️';
    }
  }

  // UI state switcher
  function updateCaptureStatusUI(status, capturing) {
    if (!capturing) {
      statusDot.className = 'status-dot';
      statusText.textContent = 'Ready';
      statusDot.style.backgroundColor = '';
      return;
    }

    statusDot.className = 'status-dot active';
    switch (status) {
      case 'mic-tab-active':
        statusText.textContent = 'Mic + Meeting audio active';
        statusDot.style.backgroundColor = '#10b981'; // Green for full capture
        break;
      case 'mic-active':
        statusText.textContent = 'Mic active';
        statusDot.style.backgroundColor = '#a78bfa'; // Purple for mic only
        break;
      case 'tab-unavailable':
        statusText.textContent = 'Tab audio unavailable';
        statusDot.style.backgroundColor = '#f59e0b'; // Amber
        break;
      case 'unsupported-page':
        statusText.textContent = 'Unsupported page';
        statusDot.style.backgroundColor = '#ef4444'; // Red
        break;
      case 'mic-denied':
        statusText.textContent = 'Mic denied';
        statusDot.style.backgroundColor = '#ef4444'; // Red
        break;
      default:
        statusText.textContent = 'Listening...';
        statusDot.style.backgroundColor = '#7c3aed';
    }
  }

  function updateUI(capturing) {
    isRecording = capturing;
    if (capturing) {
      statusDot.classList.add('active');
      chrome.storage.local.get('captureStatus', (data) => {
        updateCaptureStatusUI(data.captureStatus, true);
      });
      startBtn.disabled = true;
      stopBtn.disabled = false;
      sessionTitleInput.disabled = true;
    } else {
      statusDot.classList.remove('active');
      updateCaptureStatusUI(null, false);
      startBtn.disabled = false;
      stopBtn.disabled = true;
      sessionTitleInput.disabled = false;
    }
  }

  // Helper to sleep/wait
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  // Verify and ensure content script is loaded on the tab
  async function ensureContentScriptReady(tab) {
    if (!tab || !tab.url) {
      showKeyStatus('No active tab URL found', 'error');
      return false;
    }

    const url = tab.url.toLowerCase();
    
    // Check if the URL is unsupported (e.g. system page)
    const isUnsupported = 
      url.startsWith('chrome://') || 
      url.startsWith('edge://') || 
      url.startsWith('chrome-extension://') || 
      url.startsWith('about:') ||
      url.includes('chrome.google.com/webstore') ||
      url.includes('chromewebstore.google.com');

    if (isUnsupported) {
      showKeyStatus('This page does not allow extension overlay. Open a normal website or meeting page.', 'error');
      return false;
    }

    // Ping helper
    const ping = async () => {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'QUICKPOINT_PING' });
        return response && response.ready;
      } catch (err) {
        return false;
      }
    };

    // Try initial ping
    let isReady = await ping();
    if (isReady) {
      return true;
    }

    // If initial ping failed, attempt script and style injection
    showKeyStatus('QuickPoint overlay was not ready. Re-injecting extension…', 'success');
    
    try {
      // Inject content CSS
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content.css']
      });
      // Inject content JS
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      // Wait for content script to register its listeners
      await delay(500);
      
      // Retry ping
      isReady = await ping();
      if (isReady) {
        return true;
      }
    } catch (err) {
      console.error("[POPUP] Programmatic injection failed:", err);
    }

    showKeyStatus('Could not start on this page. Refresh the page and try again.', 'error');
    return false;
  }

  // Capture triggers
  async function startCapture() {
    const { groqApiKey } = await chrome.storage.local.get('groqApiKey');
    if (!groqApiKey) {
      showKeyStatus('Please save your API key first', 'error');
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showKeyStatus('No active tab found', 'error');
      return;
    }

    // Ensure content script is ready before proceeding
    const isReady = await ensureContentScriptReady(tab);
    if (!isReady) {
      return;
    }

    // Save session title
    const title = sessionTitleInput.value.trim() || 'QuickPoint Meeting';
    await chrome.storage.local.set({ meetingTitle: title });

    // Clear transcript UI
    transcriptPreview.innerHTML = '<span class="placeholder-text">Listening started...</span>';
    wordCountBadge.textContent = '0 words';
    hideAIOutputs();

    statusText.textContent = 'Starting...';
    startBtn.disabled = true;

    const response = await chrome.runtime.sendMessage({
      type: 'START_CAPTURE',
      tabId: tab.id
    });

    if (response.success) {
      updateUI(true);
    } else {
      showKeyStatus(response.error || 'Failed to start', 'error');
      updateUI(false);
    }
  }

  async function stopCapture() {
    statusText.textContent = 'Stopping...';
    stopBtn.disabled = true;

    const response = await chrome.runtime.sendMessage({
      type: 'STOP_CAPTURE'
    });

    if (response.success) {
      updateUI(false);
    } else {
      showKeyStatus(response.error || 'Failed to stop', 'error');
    }
  }

  // Update transcript view
  function updateTranscriptUI(text) {
    if (isEditingTranscript) {
      transcriptPreview.textContent = text;
      const words = text.split(/\s+/).filter(w => w.length > 0).length;
      wordCountBadge.textContent = `${words} words`;
      return;
    }

    if (!text.trim()) {
      transcriptPreview.innerHTML = '<span class="placeholder-text">Subtitles will appear here in real-time...</span>';
      transcriptEditArea.value = '';
      wordCountBadge.textContent = '0 words';
      generateSummaryBtn.disabled = true;
      return;
    }

    transcriptPreview.textContent = text;
    transcriptEditArea.value = text;
    transcriptPreview.scrollTop = transcriptPreview.scrollHeight;

    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    wordCountBadge.textContent = `${words} words`;

    // Enable summary generation if we have speech segments
    generateSummaryBtn.disabled = words < 5;
  }

  // AI Output Renderers
  function renderAIOutputs(summary, keyPoints, actionItems) {
    summaryText.textContent = summary;
    
    keyPointsList.innerHTML = '';
    keyPoints.forEach(p => {
      const li = document.createElement('li');
      li.textContent = p;
      keyPointsList.appendChild(li);
    });

    actionItemsList.innerHTML = '';
    actionItems.forEach(i => {
      const li = document.createElement('li');
      li.textContent = i;
      actionItemsList.appendChild(li);
    });

    aiOutputs.classList.remove('hidden');
    exportReportBtn.disabled = false;
    sendDashboardBtn.disabled = false;
  }

  function hideAIOutputs() {
    aiOutputs.classList.add('hidden');
    exportReportBtn.disabled = true;
    sendDashboardBtn.disabled = true;
    summaryText.textContent = '';
    keyPointsList.innerHTML = '';
    actionItemsList.innerHTML = '';
  }

  // Generate Summary using Groq API
  async function generateAISummary() {
    const { groqApiKey, meetingTranscript } = await chrome.storage.local.get(['groqApiKey', 'meetingTranscript']);
    
    if (!groqApiKey) {
      showKeyStatus('Groq API Key not found', 'error');
      return;
    }
    if (!meetingTranscript || !meetingTranscript.trim()) {
      showKeyStatus('Transcript is empty', 'error');
      return;
    }

    aiSpinner.classList.remove('hidden');
    generateSummaryBtn.disabled = true;

    const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    const GROQ_MODEL = 'llama-3.3-70b-versatile';
    
    const SYSTEM_PROMPT_SUMMARY = `You are a meeting analysis assistant. Analyze the meeting transcript provided by the user.
Return ONLY a valid JSON object matching this structure:
{
  "summary": "A concise paragraph summarizing the meeting discussions.",
  "key_points": ["Key point 1", "Key point 2", "Key point 3"],
  "action_items": ["Action item 1 (assigned to name if mentioned)", "Action item 2"]
}
Do not return any other text, markdown blocks, or commentary.`;

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
            { role: 'system', content: SYSTEM_PROMPT_SUMMARY },
            { role: 'user', content: meetingTranscript }
          ],
          temperature: 0.2,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq');
      }

      // Parse JSON from code blocks or raw response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON response from assistant');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      const summary = result.summary || 'No summary generated.';
      const keyPoints = result.key_points || [];
      const actionItems = result.action_items || [];

      // Save to storage
      await chrome.storage.local.set({
        meetingSummary: summary,
        meetingKeyPoints: keyPoints,
        meetingActionItems: actionItems
      });

      renderAIOutputs(summary, keyPoints, actionItems);
      showKeyStatus('AI Analysis complete!', 'success');

    } catch (err) {
      console.error(err);
      showKeyStatus(err.message || 'AI Generation failed', 'error');
    } finally {
      aiSpinner.classList.add('hidden');
      generateSummaryBtn.disabled = false;
    }
  }

  // Export clean HTML print page
  async function exportReport() {
    const data = await chrome.storage.local.get([
      'meetingTitle',
      'meetingTranscript',
      'meetingSummary',
      'meetingKeyPoints',
      'meetingActionItems'
    ]);

    const title = data.meetingTitle || 'QuickPoint Meeting Session';
    const transcript = data.meetingTranscript || 'No transcript recorded.';
    const summary = data.meetingSummary || 'No summary available.';
    const keyPoints = data.meetingKeyPoints || [];
    const actionItems = data.meetingActionItems || [];

    // Calculate details
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // 2. Meeting Objective
    let objective = "This meeting focused on the main discussion points extracted from the transcript.";
    if (summary && summary.trim().length > 10 && summary !== 'No summary available.') {
      const sentences = summary.split(/[.!?]/);
      if (sentences.length > 0 && sentences[0].trim().length > 15) {
        objective = sentences[0].trim() + ".";
      }
    }

    // 3. Agenda
    let agendaHTML = "";
    if (keyPoints && keyPoints.length >= 2) {
      const agendaItems = keyPoints.slice(0, 5).map(kp => `Discussion on: ${kp}`);
      if (agendaItems.length < 4) {
        agendaItems.push("Open Q&A and next steps");
      }
      agendaHTML = `<ol class="agenda-list">${agendaItems.map(item => `<li>${item}</li>`).join('')}</ol>`;
    } else {
      agendaHTML = `
        <ol class="agenda-list">
          <li>Introduction and discussion context.</li>
          <li>Main topics discussed.</li>
          <li>Issues or clarifications.</li>
          <li>Decisions and outcomes.</li>
          <li>Next steps and follow-up.</li>
        </ol>
      `;
    }

    // 4. Key Discussion Points
    const keyPointsHTML = keyPoints.length > 0 
      ? `<ul>${keyPoints.map(p => `<li>${p}</li>`).join('')}</ul>`
      : `<p style="font-style: italic; color: #64748b;">No key discussion points identified.</p>`;

    // 5. Decisions Made
    let decisions = [];
    const sentences = transcript.split(/[.!?]/);
    sentences.forEach(s => {
      const clean = s.trim().toLowerCase();
      if (clean.includes("decided") || clean.includes("we agreed") || clean.includes("resolved to") || clean.includes("approved")) {
        if (s.trim().length > 10 && decisions.length < 5) {
          decisions.push(s.trim());
        }
      }
    });
    const decisionsHTML = decisions.length > 0
      ? `<ul>${decisions.map(d => `<li>${d}</li>`).join('')}</ul>`
      : `<p style="font-style: italic; color: #64748b;">No major decisions were clearly identified.</p>`;

    // 6. Action Items
    let actionItemsHTML = "";
    if (actionItems && actionItems.length > 0) {
      actionItemsHTML = `
        <table class="action-item-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Owner</th>
              <th>Deadline</th>
            </tr>
          </thead>
          <tbody>
            ${actionItems.map(item => {
              let owner = "Not specified";
              let deadline = "Not specified";
              let task = item;

              // Parse deadline
              const byMatch = item.match(/\bby\s+([A-Za-z0-9\/\s\-]+)(?:\b|$)/i);
              if (byMatch) {
                deadline = byMatch[1].trim();
                task = task.replace(byMatch[0], "").trim();
              }

              // Parse owner
              const assignMatch = item.match(/\b(?:assigned to|for)\s+([A-Z][a-z]+)/i);
              if (assignMatch) {
                owner = assignMatch[1].trim();
                task = task.replace(assignMatch[0], "").trim();
              } else {
                const colonMatch = item.match(/^([A-Z][a-zA-Z]+):\s+(.*)$/);
                if (colonMatch) {
                  owner = colonMatch[1].trim();
                  task = colonMatch[2].trim();
                }
              }

              task = task.replace(/^-\s*/, "").replace(/[.,;]$/, "").trim();

              return `
                <tr>
                  <td>${task}</td>
                  <td>${owner}</td>
                  <td>${deadline}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } else {
      actionItemsHTML = `<p style="font-style: italic; color: #64748b;">No action items identified.</p>`;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showKeyStatus('Popup blocker prevented report opening', 'error');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - QuickPoint Minutes</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: 'Inter', system-ui, sans-serif;
              background-color: #ffffff;
              color: #1e293b;
              padding: 0;
              margin: 0;
              line-height: 1.6;
              font-size: 11pt;
            }
            .no-print {
              margin-bottom: 30px;
              display: flex;
              gap: 12px;
              background: #f8fafc;
              padding: 12px 20px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            .btn {
              padding: 8px 16px;
              border-radius: 6px;
              font-weight: 600;
              cursor: pointer;
              font-size: 13px;
              border: none;
              font-family: inherit;
              transition: background 0.2s;
            }
            .btn-print {
              background: #7c3aed;
              color: white;
            }
            .btn-print:hover {
              background: #6d28d9;
            }
            .btn-share {
              background: #10b981;
              color: white;
            }
            .btn-share:hover {
              background: #059669;
            }
            .btn-close {
              background: #f1f5f9;
              color: #475569;
              border: 1px solid #e2e8f0;
            }
            .btn-close:hover {
              background: #e2e8f0;
            }
            .report-container {
              max-width: 800px;
              margin: 0 auto;
              background: #fff;
            }
            .header-container {
              border-bottom: 3px double #0f172a;
              padding-bottom: 12px;
              margin-bottom: 24px;
              text-align: center;
            }
            .report-title {
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
              margin: 0 0 6px 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .report-subtitle {
              font-size: 13px;
              font-style: italic;
              color: #475569;
              margin: 0;
            }
            h2 {
              font-size: 12pt;
              font-weight: 700;
              color: #0f172a;
              border-bottom: 1px solid #0f172a;
              padding-bottom: 4px;
              margin-top: 24px;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              page-break-after: avoid;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 12px;
              border-radius: 6px;
              margin-bottom: 20px;
              font-size: 9.5pt;
            }
            .meta-item {
              display: flex;
            }
            .meta-label {
              font-weight: 700;
              color: #0f172a;
              width: 140px;
              flex-shrink: 0;
            }
            .meta-val {
              color: #334155;
            }
            p, li {
              font-size: 10.5pt;
              color: #334155;
              margin-bottom: 8px;
            }
            ol, ul {
              margin: 10px 0 10px 20px;
            }
            li {
              margin-bottom: 6px;
            }
            .agenda-list {
              list-style-type: decimal;
            }
            .action-item-table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0;
            }
            .action-item-table th, .action-item-table td {
              border: 1px solid #e2e8f0;
              padding: 8px 10px;
              font-size: 10pt;
              text-align: left;
            }
            .action-item-table th {
              background-color: #f8fafc;
              font-weight: 700;
              color: #0f172a;
            }
            .transcript-box {
              white-space: pre-wrap;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 16px;
              border-radius: 8px;
              font-size: 9.5pt;
              color: #475569;
              max-height: 350px;
              overflow-y: auto;
              line-height: 1.5;
            }
            .footer {
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
              margin-top: 40px;
              font-size: 9pt;
              text-align: center;
              color: #64748b;
            }
            @media print {
              .no-print {
                display: none;
              }
              body {
                background: white;
                color: black;
              }
              .transcript-box {
                max-height: none;
                overflow: visible;
                background: none;
                border: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="btn btn-print" onclick="window.print()">Print / Save as PDF</button>
            <button class="btn btn-share" onclick="shareReport()">Share Report</button>
            <button class="btn btn-close" onclick="window.close()">Close Report</button>
          </div>
          <div class="report-container">
            <div class="header-container">
              <h1 class="report-title">QuickPoint Report</h1>
              <p class="report-subtitle">Official Meeting Minutes &amp; AI Intelligence Analysis</p>
            </div>

            <h2>1. Meeting Details</h2>
            <div class="meta-grid">
              <div class="meta-item"><span class="meta-label">Date:</span> <span class="meta-val">${dateStr}</span></div>
              <div class="meta-item"><span class="meta-label">Time:</span> <span class="meta-val">${timeStr}</span></div>
              <div class="meta-item"><span class="meta-label">Meeting Title:</span> <span class="meta-val">${title}</span></div>
              <div class="meta-item"><span class="meta-label">Location / Platform:</span> <span class="meta-val">Virtual / Chrome Extension</span></div>
              <div class="meta-item"><span class="meta-label">Facilitator:</span> <span class="meta-val">Meeting Host</span></div>
              <div class="meta-item"><span class="meta-label">Note Taker:</span> <span class="meta-val">QuickPoint AI</span></div>
              <div class="meta-item"><span class="meta-label">Attendees:</span> <span class="meta-val">Project Team</span></div>
            </div>

            <h2>2. Meeting Objective</h2>
            <p>${objective}</p>

            <h2>3. Agenda</h2>
            ${agendaHTML}

            <h2>4. Key Discussion Points</h2>
            ${keyPointsHTML}

            <h2>5. Decisions Made</h2>
            ${decisionsHTML}

            <h2>6. Action Items</h2>
            ${actionItemsHTML}

            <h2>7. AI Summary</h2>
            <p>${summary}</p>

            <h2>8. Full Transcript</h2>
            <div class="transcript-box">${transcript}</div>

            <div class="footer">
              Generated by QuickPoint AI Meeting Assistant &copy; 2026
            </div>
          </div>

          <script>
            function shareReport() {
              if (navigator.share) {
                navigator.share({
                  title: '${title.replace(/'/g, "\\'")}',
                  text: 'QuickPoint Meeting Minutes: ${title.replace(/'/g, "\\'")}\\n\\nSummary: ${summary.replace(/\n/g, '\\n').replace(/'/g, "\\'")}',
                  url: window.location.href
                }).catch(err => console.log(err));
              } else {
                copyReport();
              }
            }

            function copyReport() {
              const text = document.querySelector('.report-container').innerText;
              navigator.clipboard.writeText(text).then(() => {
                alert("Report text copied to clipboard successfully!");
              }).catch(err => {
                alert("Failed to copy report text: " + err);
              });
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Sync to QuickPoint Web Dashboard
  async function syncWithDashboard() {
    const data = await chrome.storage.local.get([
      'meetingTitle',
      'meetingTranscript',
      'meetingSummary',
      'meetingKeyPoints',
      'meetingActionItems'
    ]);

    const payload = {
      session_name: data.meetingTitle || 'QuickPoint Live Session',
      transcript: data.meetingTranscript || '',
      summary: data.meetingSummary || '',
      action_items: data.meetingActionItems || [],
      key_topics: data.meetingKeyPoints || [],
      sentiment: "NEUTRAL",
      score: 80.0,
      filler_count: 0,
      filler_words: {},
      pace_wpm: 0.0,
      audio_duration_sec: 0.0,
      language: "en"
    };

    if (!payload.transcript) {
      showKeyStatus('No transcript to sync', 'error');
      return;
    }

    sendDashboardBtn.disabled = true;
    const oldText = sendDashboardBtn.innerHTML;
    sendDashboardBtn.innerHTML = 'Syncing...';

    try {
      const response = await fetch('http://localhost:8000/api/intelligence/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Backend failed to save');
      }

      const resData = await response.json();
      showKeyStatus(`Synced! Session ID: ${resData.session_id || 'OK'}`, 'success');
    } catch (e) {
      console.error(e);
      showKeyStatus('Dashboard offline (Port 8000)', 'error');
    } finally {
      sendDashboardBtn.disabled = false;
      sendDashboardBtn.innerHTML = oldText;
    }
  }

  // Storage listener for live updates
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.meetingTranscript) {
        updateTranscriptUI(changes.meetingTranscript.newValue || '');
      }
      if (changes.isRecording) {
        updateUI(changes.isRecording.newValue);
      }
      if (changes.captureStatus) {
        chrome.storage.local.get('isRecording', (data) => {
          updateCaptureStatusUI(changes.captureStatus.newValue, data.isRecording);
        });
      }
    }
  });

  // Event Listeners
  saveKeyBtn.addEventListener('click', saveApiKey);
  toggleVisibilityBtn.addEventListener('click', toggleKeyVisibility);
  startBtn.addEventListener('click', startCapture);
  stopBtn.addEventListener('click', stopCapture);
  
  sessionTitleInput.addEventListener('change', async () => {
    await chrome.storage.local.set({ meetingTitle: sessionTitleInput.value.trim() });
  });

  editTranscriptBtn.addEventListener('click', async () => {
    if (!isEditingTranscript) {
      // Enter edit mode
      isEditingTranscript = true;
      const data = await chrome.storage.local.get('meetingTranscript');
      transcriptEditArea.value = data.meetingTranscript || '';
      transcriptPreview.style.display = 'none';
      transcriptEditArea.style.display = 'block';
      editTranscriptBtn.textContent = '💾 Save Transcript';
      editTranscriptBtn.style.backgroundColor = '#10b981'; // Green accent for save
      transcriptEditArea.focus();
    } else {
      // Save edits
      isEditingTranscript = false;
      const newText = transcriptEditArea.value;
      await chrome.storage.local.set({ meetingTranscript: newText });
      
      transcriptPreview.textContent = newText || 'Subtitles will appear here in real-time...';
      transcriptPreview.style.display = 'block';
      transcriptEditArea.style.display = 'none';
      editTranscriptBtn.textContent = '✏️ Edit Transcript';
      editTranscriptBtn.style.backgroundColor = ''; // Restore default
      
      updateTranscriptUI(newText);
      showKeyStatus('Transcript saved!', 'success');
    }
  });

  clearTranscriptBtn.addEventListener('click', async () => {
    const confirmClear = confirm("Are you sure you want to clear this session transcript?");
    if (confirmClear) {
      await chrome.storage.local.set({
        meetingTranscript: '',
        meetingSummary: '',
        meetingKeyPoints: [],
        meetingActionItems: []
      });
      if (isEditingTranscript) {
        isEditingTranscript = false;
        transcriptPreview.style.display = 'block';
        transcriptEditArea.style.display = 'none';
        editTranscriptBtn.textContent = '✏️ Edit Transcript';
        editTranscriptBtn.style.backgroundColor = '';
      }
      updateTranscriptUI('');
      hideAIOutputs();
      showKeyStatus('Session transcript cleared', 'success');
    }
  });

  restartSessionBtn.addEventListener('click', async () => {
    const confirmRestart = confirm("Are you sure you want to restart the session? This will stop any active recording and clear the current transcript/analysis.");
    if (!confirmRestart) return;

    const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    if (response.isCapturing || isRecording) {
      await chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' });
    }

    const currentTitle = sessionTitleInput.value.trim() || 'QuickPoint Session';
    const newTitle = prompt("Enter a new meeting title (leave blank to keep current title):", currentTitle);
    const finalTitle = newTitle !== null ? (newTitle.trim() || currentTitle) : currentTitle;
    sessionTitleInput.value = finalTitle;

    await chrome.storage.local.set({
      meetingTitle: finalTitle,
      meetingTranscript: '',
      meetingSummary: '',
      meetingKeyPoints: [],
      meetingActionItems: []
    });

    if (isEditingTranscript) {
      isEditingTranscript = false;
      transcriptPreview.style.display = 'block';
      transcriptEditArea.style.display = 'none';
      editTranscriptBtn.textContent = '✏️ Edit Transcript';
      editTranscriptBtn.style.backgroundColor = '';
    }

    updateUI(false);
    updateTranscriptUI('');
    hideAIOutputs();
    showKeyStatus('Session restarted and ready!', 'success');
  });

  generateSummaryBtn.addEventListener('click', generateAISummary);
  exportReportBtn.addEventListener('click', exportReport);
  sendDashboardBtn.addEventListener('click', syncWithDashboard);

  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveApiKey();
  });

  // Init
  await loadSettings();
});
