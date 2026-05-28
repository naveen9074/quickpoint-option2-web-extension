import { useState, useRef, useEffect } from 'react'
import { transcribeAudio, summarizeTranscript, saveIntelligence } from '../api/isertApi'

const FILLER_WORDS = [
    'um', 'uh', 'er', 'ah', 'hmm', 'like', 'you know', 'basically',
    'literally', 'actually', 'sort of', 'kind of', 'right', 'okay so', 'i mean'
]

function highlightFillers(text) {
    const pattern = new RegExp(`\\b(${FILLER_WORDS.map(w => w.replace(/\s+/g, '\\s+')).join('|')})\\b`, 'gi')
    const parts = text.split(pattern)
    return parts.map((part, i) =>
        FILLER_WORDS.includes(part.toLowerCase())
            ? <mark key={i} className="filler-highlight">{part}</mark>
            : part
    )
}

function CheckItem({ text }) {
    const [checked, setChecked] = useState(false)
    return (
        <li className="action-item" onClick={() => setChecked(c => !c)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
            <div className={`action-item-check ${checked ? 'checked' : ''}`} style={{
                width: 16, height: 16, borderRadius: 4, border: '1px solid var(--border-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: checked ? 'var(--accent)' : 'transparent'
            }}>
                {checked && <span style={{ color: '#fff', fontSize: '10px' }}>✓</span>}
            </div>
            <span style={{ textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.5 : 1, fontSize: '0.85rem' }}>{text}</span>
        </li>
    )
}

export default function MeetingAssistant() {
    const [file, setFile] = useState(null)
    const [dragging, setDragging] = useState(false)
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [showHighlight, setShowHighlight] = useState(true)
    const [recording, setRecording] = useState(false)
    const [recordSec, setRecordSec] = useState(0)
    const [summaryResult, setSummaryResult] = useState(null)
    const [summaryLoading, setSummaryLoading] = useState(false)
    const [summaryError, setSummaryError] = useState(null)
    
    // Saving and naming session
    const [sessionName, setSessionName] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [toast, setToast] = useState(null)

    const inputRef = useRef()
    const mediaRef = useRef(null)
    const chunksRef = useRef([])
    const timerRef = useRef(null)

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const handleFile = (f) => {
        setFile(f)
        setResult(null)
        setError(null)
        setSummaryResult(null)
        setSummaryError(null)
        setSaved(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) handleFile(f)
    }

    // ── Mic Recording ────────────────────────────────────────────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mr = new MediaRecorder(stream)
            chunksRef.current = []
            mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
            mr.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                const f = new File([blob], 'mic_recording.webm', { type: 'audio/webm' })
                handleFile(f)
                stream.getTracks().forEach(t => t.stop())
            }
            mr.start()
            mediaRef.current = mr
            setRecording(true)
            setRecordSec(0)
            timerRef.current = setInterval(() => setRecordSec(s => s + 1), 1000)
        } catch {
            setError('Microphone access denied. Please allow microphone access in your browser.')
        }
    }

    const stopRecording = () => {
        if (mediaRef.current) mediaRef.current.stop()
        clearInterval(timerRef.current)
        setRecording(false)
    }

    const handleSubmit = async () => {
        if (!file) return
        setLoading(true); setError(null); setResult(null); setProgress(0); setSummaryResult(null); setSummaryError(null); setSaved(false)
        const fd = new FormData()
        fd.append('file', file)
        try {
            const { data } = await transcribeAudio(fd, (e) => {
                if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
            })
            setResult(data)
            localStorage.setItem('quickpoint_latest_transcript', data.text)
        } catch (e) {
            setError(e.response?.data?.detail || 'Transcription failed. Is the backend running?')
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateSummary = async () => {
        if (!result?.text) return
        setSummaryLoading(true); setSummaryError(null); setSummaryResult(null)
        try {
            const { data } = await summarizeTranscript(result.text, sessionName || 'QuickPoint Session')
            setSummaryResult(data)
        } catch (e) {
            setSummaryError(e.response?.data?.detail || 'Summary generation failed. Is the backend running?')
        } finally {
            setSummaryLoading(false)
        }
    }

    // Helper functions for scoring and metrics
    const countFillers = (text) => {
        const counts = {}
        let total = 0
        if (!text) return { counts, total }
        const words = text.toLowerCase().split(/\s+/)
        words.forEach(w => {
            const clean = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
            if (FILLER_WORDS.includes(clean)) {
                counts[clean] = (counts[clean] || 0) + 1
                total++
            }
        })
        return { counts, total }
    }

    const calculateScore = (wpm, fillerRate) => {
        let score = 100
        if (wpm > 160) score -= Math.min(25, (wpm - 160) * 0.5)
        else if (wpm < 100) score -= Math.min(25, (100 - wpm) * 0.5)
        score -= Math.min(40, fillerRate * 5)
        return Math.max(10, Math.round(score))
    }

    const handleSaveSession = async () => {
        if (!result) return
        setSaving(true)
        try {
            const { counts, total } = countFillers(result.text)
            const duration = result.duration_sec || 1
            const wpm = Math.round((result.word_count / duration) * 60)
            const fillerRate = (total / (result.word_count || 1)) * 100
            const score = calculateScore(wpm, fillerRate)

            const payload = {
                transcript: result.text,
                session_name: sessionName || 'QuickPoint Session',
                summary: summaryResult?.summary || '',
                action_items: summaryResult?.action_items || [],
                key_topics: summaryResult?.key_topics || [],
                sentiment: summaryResult?.sentiment?.label || 'NEUTRAL',
                score: score,
                filler_count: total,
                filler_words: counts,
                pace_wpm: wpm,
                audio_duration_sec: result.duration_sec,
                language: result.language || 'en'
            }

            await saveIntelligence(payload)
            setSaved(true)
            showToast('✅ Session saved to dashboard successfully!')
        } catch (e) {
            showToast('❌ Save failed — check backend connection', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleExportReport = () => {
        if (!result) return
        const { counts, total } = countFillers(result.text)
        const duration = result.duration_sec || 1
        const wpm = Math.round((result.word_count / duration) * 60)
        const fillerRate = (total / (result.word_count || 1)) * 100
        const score = calculateScore(wpm, fillerRate)

        const payload = {
            session_name: sessionName || 'QuickPoint Session',
            transcript: result.text,
            language: result.language,
            duration_sec: result.duration_sec,
            word_count: result.word_count,
            pace_wpm: wpm,
            filler_count: total,
            filler_distribution: counts,
            communication_score: score,
            summary: summaryResult?.summary || '',
            key_topics: summaryResult?.key_topics || [],
            action_items: summaryResult?.action_items || [],
            sentiment: summaryResult?.sentiment || { label: 'NEUTRAL', score: 1.0 },
            generated_at: new Date().toISOString(),
        }
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${(sessionName || 'quickpoint_report').toLowerCase().replace(/\s+/g, '_')}_report.json`
        a.click()
        showToast('📥 Report exported as JSON')
    }

    const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

    return (
        <div>
            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

            <div className="page-header">
                <div className="page-badge">🎙️ QuickPoint AI</div>
                <h1 className="page-title">AI Meeting <span>Assistant</span></h1>
                <p className="page-subtitle">
                    Record live meetings or upload audio. Apply automatic noise reduction, generate real-time transcriptions, and extract meeting summaries.
                </p>
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
                {/* Upload / Record Panel */}
                <div className="card">
                    <div className="card-title">🎵 Audio Source</div>
                    <div className="card-subtitle">Upload a meeting recording or capture live speech</div>

                    {/* Mic Controls */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                        {!recording ? (
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={startRecording}>
                                🎙️ Start Recording
                            </button>
                        ) : (
                            <button className={`btn mic-btn-recording`} style={{ flex: 1 }} onClick={stopRecording}>
                                <div className="waveform-anim">
                                    {[...Array(7)].map((_, i) => <div key={i} className="wave-bar" />)}
                                </div>
                                ⏹ Stop — {formatTime(recordSec)}
                            </button>
                        )}
                    </div>

                    <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>— or —</div>

                    <div
                        className={`upload-zone${dragging ? ' dragging' : ''}`}
                        onClick={() => inputRef.current.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                    >
                        <div className="upload-icon">🎙️</div>
                        <div className="upload-label">Click or drag audio file here</div>
                        <div className="upload-hint">MP3 · WAV · M4A · OGG · WebM — max 50 MB</div>
                        {file && <div className="file-chosen">✅ {file.name}</div>}
                    </div>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="audio/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFile(e.target.files[0])}
                    />

                    {/* Enhancement Pipeline status indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '8px 12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <span style={{ fontSize: '1rem' }}>🔊</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent3-light)' }}>
                            <strong>Audio Enhancement:</strong> Enabled (noise reduction will be applied before transcription).
                        </div>
                    </div>

                    {loading && (
                        <div className="loading-state" style={{ marginTop: 20 }}>
                            <div className="spinner" />
                            <div>{progress > 0 && progress < 100 ? `Uploading… ${progress}%` : '🤖 Whisper AI is transcribing…'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>This may take 20–90s on CPU</div>
                        </div>
                    )}

                    {error && <div className="alert alert-error" style={{ marginTop: 16 }}>⚠️ {error}</div>}

                    <button
                        className="btn btn-primary"
                        style={{ marginTop: 20, width: '100%' }}
                        onClick={handleSubmit}
                        disabled={!file || loading || recording}
                    >
                        {loading ? '⏳ Transcribing…' : '🚀 Transcribe Audio'}
                    </button>
                </div>

                {/* Transcript Panel */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div className="card-title">📜 Transcript</div>
                        {result && (
                            <button
                                className="btn btn-ghost"
                                style={{ padding: '5px 12px', fontSize: '0.76rem' }}
                                onClick={() => setShowHighlight(h => !h)}
                            >
                                {showHighlight ? '🔍 Highlights ON' : '💬 Plain Text'}
                            </button>
                        )}
                    </div>

                    {!result && !loading && (
                        <div className="empty-state">
                            <div className="empty-icon">📝</div>
                            <div>Transcript will appear here</div>
                            <div style={{ marginTop: 8, fontSize: '0.75rem' }}>
                                Tip: <span style={{ color: 'var(--accent-light)' }}>filler words</span> like "um", "like", "you know" are highlighted in yellow
                            </div>
                        </div>
                    )}

                    {result && (
                        <>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                                <span className="chip chip-blue">🌐 {result.language?.toUpperCase()}</span>
                                <span className="chip">⏱ {result.duration_sec}s</span>
                                <span className="chip chip-accent">📝 {result.word_count} words</span>
                            </div>

                            <div className="transcript-box">
                                {showHighlight ? highlightFillers(result.text) : result.text}
                            </div>

                            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                                <button
                                    className="btn btn-ghost"
                                    style={{ flex: 1 }}
                                    onClick={() => navigator.clipboard.writeText(result.text)}
                                >
                                    📋 Copy
                                </button>
                                <button
                                    className="btn btn-ghost"
                                    style={{ flex: 1 }}
                                    onClick={() => {
                                        const a = document.createElement('a')
                                        a.href = URL.createObjectURL(new Blob([result.text], { type: 'text/plain' }))
                                        a.download = 'transcript.txt'
                                        a.click()
                                    }}
                                >
                                    💾 Download .txt
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* AI Summary and Action Items section */}
            {result && (
                <div style={{ marginTop: 24 }}>
                    {!summaryResult && !summaryLoading && (
                        <div className="card" style={{ textAlign: 'center', padding: '30px 20px' }}>
                            <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>🧠</div>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>Generate Meeting Summary & Action Items</div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                                Let QuickPoint's NLP engine extract core discussion points, sentiment, and checklists.
                            </p>
                            {summaryError && <div className="alert alert-error" style={{ maxWidth: 400, margin: '0 auto 12px' }}>⚠️ {summaryError}</div>}
                            <button className="btn btn-primary" onClick={handleGenerateSummary}>
                                ✨ Generate AI Summary
                            </button>
                        </div>
                    )}

                    {summaryLoading && (
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40 }}>
                            <div className="spinner" style={{ marginBottom: 12 }} />
                            <div>Generating meeting intelligence report...</div>
                        </div>
                    )}

                    {summaryResult && !summaryLoading && (
                        <div className="card-glow" style={{ borderTop: '4px solid var(--accent)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                                    🧠 QuickPoint Meeting Intelligence
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span className="chip chip-green">🎭 Sentiment: {summaryResult.sentiment?.label || 'NEUTRAL'}</span>
                                </div>
                            </div>

                            {/* Session naming */}
                            <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Session Name:
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter session name..."
                                    value={sessionName}
                                    onChange={(e) => setSessionName(e.target.value)}
                                    style={{
                                        background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                                        borderRadius: 8, padding: '6px 12px', color: 'var(--text-primary)',
                                        fontSize: '0.82rem', width: 260, outline: 'none'
                                    }}
                                />
                            </div>

                            <div className="grid-2" style={{ alignItems: 'start', marginBottom: 20 }}>
                                {/* Summary */}
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent-light)', marginBottom: 8 }}>
                                        📄 AI Summary
                                    </div>
                                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.7, background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 10, border: '1px solid var(--border)' }}>
                                        {summaryResult.summary}
                                    </p>

                                    {/* Key Topics */}
                                    {summaryResult.key_topics?.length > 0 && (
                                        <div style={{ marginTop: 16 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8 }}>
                                                🏷️ Key Topics
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {summaryResult.key_topics.map((t, i) => (
                                                    <span key={i} className="chip">#{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Items */}
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent2-light)', marginBottom: 8 }}>
                                        ✅ Action Items
                                    </div>
                                    {summaryResult.action_items?.length > 0 ? (
                                        <ul style={{ listStyle: 'none', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                                            {summaryResult.action_items.map((item, i) => (
                                                <CheckItem key={i} text={item} />
                                            ))}
                                        </ul>
                                    ) : (
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: 8 }}>
                                            No clear action items detected in transcript.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                <button
                                    className="btn btn-ghost"
                                    onClick={handleExportReport}
                                >
                                    📥 Export JSON Report
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSaveSession}
                                    disabled={saving || saved}
                                >
                                    {saving ? '⏳ Saving...' : saved ? '✅ Saved' : '💾 Save Session to Dashboard'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
