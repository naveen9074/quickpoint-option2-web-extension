import { useState, useEffect } from 'react'
import { summarizeTranscript, saveIntelligence } from '../api/isertApi'

function SentimentBadge({ label, score }) {
    const cls = label?.toLowerCase() === 'positive'
        ? 'sentiment-positive'
        : label?.toLowerCase() === 'negative'
            ? 'sentiment-negative'
            : 'sentiment-neutral'
    const icon = label?.toLowerCase() === 'positive' ? '😊' : label?.toLowerCase() === 'negative' ? '😟' : '😐'
    return (
        <div>
            <div className={`sentiment-badge ${cls}`}>
                {icon} {label}  ({(score * 100).toFixed(1)}% confidence)
            </div>
        </div>
    )
}

function CheckItem({ text }) {
    const [checked, setChecked] = useState(false)
    return (
        <li className="action-item" onClick={() => setChecked(c => !c)} style={{ cursor: 'pointer' }}>
            <div className={`action-item-check ${checked ? 'checked' : ''}`}>
                {checked && <span style={{ color: '#fff', fontSize: '10px' }}>✓</span>}
            </div>
            <span style={{ textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.5 : 1 }}>{text}</span>
        </li>
    )
}

export default function PostMeeting() {
    const [transcript, setTranscript] = useState('')
    const [sessionName, setSessionName] = useState('')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [toast, setToast] = useState(null)

    // Preload latest transcript from local storage
    const loadLatestTranscript = () => {
        const saved = localStorage.getItem('quickpoint_latest_transcript')
        if (saved) {
            setTranscript(saved)
            showToast('✅ Loaded latest transcript from Meeting Assistant!')
        } else {
            showToast('❌ No transcript found. Please record or upload audio first.', 'error')
        }
    }

    useEffect(() => {
        const saved = localStorage.getItem('quickpoint_latest_transcript')
        if (saved) {
            setTranscript(saved)
        }
    }, [])

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const handleAnalyze = async () => {
        if (!transcript.trim()) return
        setLoading(true); setError(null); setResult(null)
        try {
            const { data } = await summarizeTranscript(transcript, sessionName || 'Untitled Session')
            setResult(data)
        } catch (e) {
            setError(e.response?.data?.detail || 'Analysis failed. Is the backend running?')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!result) return
        setSaving(true)
        try {
            // We pass the full metadata to make sure it saves with summary and everything
            const payload = {
                transcript: transcript,
                session_name: sessionName || 'Post-Meeting Session',
                summary: result.summary,
                action_items: result.action_items,
                key_topics: result.key_topics || [],
                sentiment: result.sentiment?.label || 'NEUTRAL',
                score: 80.0, // default communication score for plain text imports
                filler_count: 0,
                filler_words: {},
                pace_wpm: 130.0, // default WPM pace
                audio_duration_sec: 0.0,
                language: 'en'
            }
            await saveIntelligence(payload)
            showToast('✅ Session saved to dashboard!')
        } catch {
            showToast('❌ Save failed — check backend connection', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleShare = async () => {
        if (!result) return
        const shareText = `QuickPoint Report: ${sessionName || 'Untitled Session'}\n\nSummary:\n${result.summary}\n\nKey Topics:\n${(result.key_topics || []).join(', ')}`
        if (navigator.share) {
            try {
                await navigator.share({
                    title: sessionName || 'QuickPoint Report',
                    text: shareText
                })
                showToast('📋 Report shared successfully!')
            } catch (e) {
                // Ignore abort
            }
        } else {
            navigator.clipboard.writeText(shareText)
            showToast('📋 Report copied to clipboard!')
        }
    }

    const handleExportPDF = () => {
        if (!result) return
        const printWindow = window.open('', '_blank')
        if (!printWindow) {
            showToast('❌ Popup blocker prevented downloading report.', 'error')
            return
        }

        const title = sessionName || 'QuickPoint Session'
        const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        
        const summaryText = result.summary || 'No summary available.'
        const keyPoints = result.key_topics || []
        const actionItems = result.action_items || []

        // 2. Meeting Objective
        let objective = "This meeting focused on the main discussion points extracted from the transcript."
        if (summaryText && summaryText.trim().length > 10 && summaryText !== 'No summary available.') {
            const sentences = summaryText.split(/[.!?]/)
            if (sentences.length > 0 && sentences[0].trim().length > 15) {
                objective = sentences[0].trim() + "."
            }
        }

        // 3. Agenda
        let agendaHTML = ""
        if (keyPoints && keyPoints.length >= 2) {
            const agendaItems = keyPoints.slice(0, 5).map(kp => `Discussion on: ${kp}`)
            if (agendaItems.length < 4) {
                agendaItems.push("Open Q&A and next steps")
            }
            agendaHTML = `<ol class="agenda-list">${agendaItems.map(item => `<li>${item}</li>`).join('')}</ol>`
        } else {
            agendaHTML = `
                <ol class="agenda-list">
                    <li>Introduction and discussion context.</li>
                    <li>Main topics discussed.</li>
                    <li>Issues or clarifications.</li>
                    <li>Decisions and outcomes.</li>
                    <li>Next steps and follow-up.</li>
                </ol>
            `
        }

        // 4. Key Discussion Points
        const keyPointsHTML = keyPoints.length > 0 
            ? `<ul>${keyPoints.map(p => `<li>${p}</li>`).join('')}</ul>`
            : `<p style="font-style: italic; color: #64748b;">No key discussion points identified.</p>`

        // 5. Decisions Made
        let decisions = []
        const sentences = (transcript || "").split(/[.!?]/)
        sentences.forEach(s => {
            const clean = s.trim().toLowerCase()
            if (clean.includes("decided") || clean.includes("we agreed") || clean.includes("resolved to") || clean.includes("approved")) {
                if (s.trim().length > 10 && decisions.length < 5) {
                    decisions.push(s.trim())
                }
            }
        })
        const decisionsHTML = decisions.length > 0
            ? `<ul>${decisions.map(d => `<li>${d}</li>`).join('')}</ul>`
            : `<p style="font-style: italic; color: #64748b;">No major decisions were clearly identified.</p>`

        // 6. Action Items
        let actionItemsHTML = ""
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
                            let owner = "Not specified"
                            let deadline = "Not specified"
                            let task = item

                            // Parse deadline
                            const byMatch = item.match(/\bby\s+([A-Za-z0-9\/\s\-]+)(?:\b|$)/i)
                            if (byMatch) {
                                deadline = byMatch[1].trim()
                                task = task.replace(byMatch[0], "").trim()
                            }

                            // Parse owner
                            const assignMatch = item.match(/\b(?:assigned to|for)\s+([A-Z][a-z]+)/i)
                            if (assignMatch) {
                                owner = assignMatch[1].trim()
                                task = task.replace(assignMatch[0], "").trim()
                            } else {
                                const colonMatch = item.match(/^([A-Z][a-zA-Z]+):\s+(.*)$/)
                                if (colonMatch) {
                                    owner = colonMatch[1].trim()
                                    task = colonMatch[2].trim()
                                }
                            }

                            task = task.replace(/^-\s*/, "").replace(/[.,;]$/, "").trim()

                            return `
                                <tr>
                                    <td>${task}</td>
                                    <td>${owner}</td>
                                    <td>${deadline}</td>
                                </tr>
                            `
                        }).join('')}
                    </tbody>
                </table>
            `
        } else {
            actionItemsHTML = `<p style="font-style: italic; color: #64748b;">No action items identified.</p>`
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
                  display: block;
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
                  <div class="meta-item"><span class="meta-label">Location / Platform:</span> <span class="meta-val">Virtual / Browser Web Dashboard</span></div>
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
                <p>${summaryText}</p>

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
                      text: 'QuickPoint Meeting Minutes: ${title.replace(/'/g, "\\'")}\\n\\nSummary: ${summaryText.replace(/\n/g, '\\n').replace(/'/g, "\\'")}',
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
        `)
        printWindow.document.close()
    }

    return (
        <div>
            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

            <div className="page-header">
                <div className="page-badge">🧠 QuickPoint AI</div>
                <h1 className="page-title">Post-Meeting <span>Summary</span></h1>
                <p className="page-subtitle">
                    Paste meeting transcript text or load from the Meeting Assistant to generate structured summary notes, extract action items, and detect discussion topics.
                </p>
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
                {/* Input Panel */}
                <div className="card">
                    <div className="card-title">📋 Transcript Input</div>
                    <div className="card-subtitle">Provide meeting transcript text — min 20 words required</div>

                    {!transcript.trim() ? (
                        <div className="alert alert-info" style={{ marginBottom: 12 }}>
                            ⚠️ <strong>No transcript available.</strong> Please record/upload audio in the <strong>Meeting Assistant</strong> first, or paste your meeting text below.
                        </div>
                    ) : (
                        <div className="alert alert-success" style={{ marginBottom: 12, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--accent3-light)' }}>
                            ✨ <strong>Transcript preloaded successfully!</strong> Ready to generate AI summary.
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ flex: 1, fontSize: '0.8rem', padding: '6px 12px' }}
                            onClick={loadLatestTranscript}
                        >
                            🔄 Load Assistant Transcript
                        </button>
                        {transcript.trim() && (
                            <button
                                type="button"
                                className="btn btn-danger"
                                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                onClick={() => setTranscript('')}
                            >
                                🗑️ Clear
                            </button>
                        )}
                    </div>

                    <input
                        type="text"
                        placeholder="Session name (optional)"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        style={{
                            width: '100%', background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--border)', borderRadius: 8,
                            padding: '10px 14px', color: 'var(--text-primary)',
                            fontSize: '0.85rem', fontFamily: 'inherit',
                            marginBottom: 12, outline: 'none',
                        }}
                    />

                    <textarea
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        placeholder="Paste your meeting transcript here…
&#10;Example: 'Today we discussed the Q2 roadmap. John will handle the API integration by Friday. We should schedule a follow-up next week…'"
                        style={{
                            width: '100%', minHeight: 260,
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--border)',
                            borderRadius: 10, padding: '14px',
                            color: 'var(--text-secondary)', fontSize: '0.85rem',
                            fontFamily: 'inherit', resize: 'vertical',
                            outline: 'none', lineHeight: 1.7,
                        }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                        {transcript.split(/\s+/).filter(Boolean).length} words
                    </div>

                    {loading && (
                        <div className="loading-state">
                            <div className="spinner" />
                            <div>🧠 AI is generating insights…</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Takes 10–30s on first run (model loading)</div>
                        </div>
                    )}

                    {error && <div className="alert alert-error" style={{ marginTop: 12 }}>⚠️ {error}</div>}

                    <button
                        className="btn btn-primary"
                        style={{ marginTop: 8, width: '100%' }}
                        onClick={handleAnalyze}
                        disabled={!transcript.trim() || loading}
                    >
                        {loading ? '⏳ Analyzing…' : '🧠 Generate Summary & Insights'}
                    </button>
                </div>

                {/* Results Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {!result && (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-icon">🧠</div>
                                <div>Intelligence report will appear here</div>
                            </div>
                        </div>
                    )}

                    {result && (
                        <>
                            {/* Summary */}
                            <div className="card-glow">
                                <div className="card-title" style={{ marginBottom: 10 }}>📄 AI Summary</div>
                                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                                    {result.summary}
                                </p>
                            </div>

                            {/* Sentiment */}
                            <div className="card">
                                <div className="card-title" style={{ marginBottom: 10 }}>🎭 Sentiment</div>
                                <SentimentBadge label={result.sentiment?.label} score={result.sentiment?.score} />
                            </div>

                            {/* Key Topics */}
                            {result.key_topics?.length > 0 && (
                                <div className="card">
                                    <div className="card-title" style={{ marginBottom: 10 }}>🏷️ Key Topics</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {result.key_topics.map((t, i) => (
                                            <div key={i} className="topic-tag">#{t}</div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Items */}
                            {result.action_items?.length > 0 && (
                                <div className="card">
                                    <div className="card-title" style={{ marginBottom: 12 }}>
                                        ✅ Action Items
                                        <span className="chip chip-blue" style={{ marginLeft: 8 }}>{result.action_items.length}</span>
                                    </div>
                                    <ul className="action-list">
                                        {result.action_items.map((item, i) => (
                                            <CheckItem key={i} text={item} />
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.action_items?.length === 0 && (
                                <div className="card">
                                    <div className="card-title" style={{ marginBottom: 8 }}>✅ Action Items</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        No specific action items detected in this transcript.
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 10, width: '100%', marginBottom: 10 }}>
                                <button
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                    onClick={handleExportPDF}
                                >
                                    📥 Download PDF
                                </button>
                                <button
                                    className="btn btn-ghost"
                                    style={{ flex: 1 }}
                                    onClick={handleShare}
                                >
                                    🔗 Share Report
                                </button>
                            </div>

                            <button
                                className="btn btn-success"
                                style={{ width: '100%' }}
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? '⏳ Saving…' : '💾 Save to Dashboard'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
