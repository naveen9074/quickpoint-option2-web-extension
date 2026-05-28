import { useState, useRef } from 'react'
import { analyzeAudio, analyzeText } from '../api/isertApi'

// SVG Score Ring component
function ScoreRing({ score }) {
    const r = 54
    const circ = 2 * Math.PI * r
    const dash = (score / 100) * circ
    const color = score >= 85 ? '#34d399' : score >= 70 ? '#a78bfa' : score >= 55 ? '#38bdf8' : score >= 40 ? '#f59e0b' : '#ef4444'

    return (
        <div className="score-ring-wrap">
            <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                <circle
                    cx="70" cy="70" r={r} fill="none"
                    stroke={color} strokeWidth="10"
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    transform="rotate(-90 70 70)"
                    style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                />
                <text x="70" y="65" textAnchor="middle" fill={color} fontSize="22" fontWeight="800" fontFamily="Inter">
                    {score}
                </text>
                <text x="70" y="82" textAnchor="middle" fill="rgba(160,160,192,0.7)" fontSize="10">of 100</text>
            </svg>
            <div className="score-ring-label">Communication Score</div>
        </div>
    )
}

function FillerBars({ distribution }) {
    const items = Object.entries(distribution).sort((a, b) => b[1] - a[1]).slice(0, 6)
    if (!items.length) return <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No filler words detected 🎉</div>
    const max = items[0][1]
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(([word, count]) => (
                <div key={word} className="filler-bar-item">
                    <div className="filler-bar-label">"{word}"</div>
                    <div className="filler-bar-track">
                        <div className="filler-bar-fill" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                    <div className="filler-bar-count">×{count}</div>
                </div>
            ))}
        </div>
    )
}

function GradeBadge({ grade }) {
    const letter = grade?.charAt(0) || '?'
    const colors = { A: '#34d399', B: '#a78bfa', C: '#38bdf8', D: '#f59e0b', F: '#ef4444' }
    const color = colors[letter] || '#a0a0c0'
    return (
        <div className="grade-badge" style={{ color, borderColor: color, background: `${color}18` }}>
            {letter}
        </div>
    )
}

export default function SkillAnalyzer() {
    const [mode, setMode] = useState('file')   // 'file' | 'text'
    const [file, setFile] = useState(null)
    const [textInput, setTextInput] = useState('')
    const [duration, setDuration] = useState(60)
    const [dragging, setDragging] = useState(false)
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const inputRef = useRef()

    const handleFile = (f) => { setFile(f); setResult(null); setError(null) }

    const handleSubmit = async () => {
        setLoading(true); setError(null); setResult(null)
        try {
            if (mode === 'file' && file) {
                const fd = new FormData()
                fd.append('file', file)
                const { data } = await analyzeAudio(fd, (e) => {
                    if (e.total) setProgress(Math.round(e.loaded / e.total * 100))
                })
                setResult(data)
            } else {
                const { data } = await analyzeText(textInput, duration)
                setResult(data)
            }
        } catch (e) {
            setError(e.response?.data?.detail || 'Analysis failed. Is the backend running?')
        } finally {
            setLoading(false)
        }
    }

    const paceColor = (label) => ({
        'ideal': '#34d399', 'slow': '#38bdf8', 'fast': '#f59e0b',
        'too slow': '#a78bfa', 'too fast': '#ef4444',
    }[label] || 'var(--text-secondary)')

    return (
        <div>
            <div className="page-header">
                <div className="page-badge">📊 Module 3</div>
                <h1 className="page-title">Communication <span>Skill Analyzer</span></h1>
                <p className="page-subtitle">
                    Upload audio or paste text to analyze speech pace, filler words, and get an overall communication score.
                </p>
            </div>

            {/* Mode Selector */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button
                    className={`btn ${mode === 'file' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setMode('file')}
                >
                    🎵 Audio File
                </button>
                <button
                    className={`btn ${mode === 'text' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setMode('text')}
                >
                    📝 Paste Text
                </button>
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
                {/* Input Panel */}
                <div className="card">
                    {mode === 'file' ? (
                        <>
                            <div className="card-title">🎵 Audio Upload</div>
                            <div className="card-subtitle">Upload audio to measure actual WPM and detect filler words</div>
                            <div
                                className={`upload-zone${dragging ? ' dragging' : ''}`}
                                onClick={() => inputRef.current.click()}
                                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                            >
                                <div className="upload-icon">📊</div>
                                <div className="upload-label">Click or drag audio file here</div>
                                <div className="upload-hint">MP3 · WAV · M4A · OGG · WebM</div>
                                {file && <div className="file-chosen">✅ {file.name}</div>}
                            </div>
                            <input ref={inputRef} type="file" accept="audio/*" style={{ display: 'none' }}
                                onChange={(e) => handleFile(e.target.files[0])} />
                        </>
                    ) : (
                        <>
                            <div className="card-title">📝 Text Input</div>
                            <div className="card-subtitle">Paste transcript text and provide speaking duration</div>
                            <textarea
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder="Paste speech or transcript text here…"
                                style={{
                                    width: '100%', minHeight: 180,
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                                    borderRadius: 10, padding: 14, color: 'var(--text-secondary)',
                                    fontSize: '0.85rem', fontFamily: 'inherit',
                                    resize: 'vertical', outline: 'none', lineHeight: 1.7,
                                }}
                            />
                            <div style={{ marginTop: 14 }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    Speaking Duration (seconds): {duration}s
                                </label>
                                <input
                                    type="range" min="10" max="3600" step="10"
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value))}
                                    style={{ marginTop: 8 }}
                                />
                            </div>
                        </>
                    )}

                    {loading && (
                        <div className="loading-state" style={{ marginTop: 20 }}>
                            <div className="spinner" />
                            <div>{progress > 0 && progress < 100 ? `Uploading… ${progress}%` : '📊 Analyzing communication…'}</div>
                        </div>
                    )}

                    {error && <div className="alert alert-error" style={{ marginTop: 16 }}>⚠️ {error}</div>}

                    <button
                        className="btn btn-primary"
                        style={{ marginTop: 20, width: '100%' }}
                        onClick={handleSubmit}
                        disabled={loading || (mode === 'file' ? !file : !textInput.trim())}
                    >
                        {loading ? '⏳ Analyzing…' : '📊 Analyze Skills'}
                    </button>
                </div>

                {/* Results */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {!result && (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-icon">📊</div>
                                <div>Analysis report will appear here</div>
                            </div>
                        </div>
                    )}

                    {result && (
                        <>
                            {/* Score + Grade Hero */}
                            <div className="card-glow" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                <ScoreRing score={result.score} />
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8, fontWeight: 600 }}>Grade</div>
                                    <GradeBadge grade={result.grade} />
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 10 }}>{result.grade}</div>
                                    <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        <span className="chip">{result.word_count} words</span>
                                        <span className="chip">{result.duration_sec}s</span>
                                    </div>
                                </div>
                            </div>

                            {/* Pace */}
                            <div className="card">
                                <div className="card-title" style={{ marginBottom: 10 }}>⚡ Speech Pace</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                                    <span style={{ fontSize: '2rem', fontWeight: 800, color: paceColor(result.pace?.label) }}>
                                        {result.pace?.wpm}
                                    </span>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Words per Minute</div>
                                        <span className={`chip ${result.pace?.label === 'ideal' ? 'chip-green' : result.pace?.label?.includes('fast') ? 'chip-amber' : 'chip-blue'}`} style={{ marginTop: 4 }}>
                                            {result.pace?.label?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, borderLeft: '2px solid var(--accent)', paddingLeft: 12 }}>
                                    {result.pace?.feedback}
                                </div>
                            </div>

                            {/* Filler Words */}
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                    <div className="card-title">🗣️ Filler Words</div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <span className="chip chip-amber">{result.filler?.count} total</span>
                                        <span className="chip">{result.filler?.rate_per_100_words}/100 words</span>
                                    </div>
                                </div>
                                <FillerBars distribution={result.filler?.distribution || {}} />
                            </div>

                            {/* Sentiment */}
                            {result.sentiment && (
                                <div className="card">
                                    <div className="card-title" style={{ marginBottom: 10 }}>🎭 Tone / Sentiment</div>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <span className={`sentiment-badge ${result.sentiment.label?.toLowerCase() === 'positive' ? 'sentiment-positive' : result.sentiment.label?.toLowerCase() === 'negative' ? 'sentiment-negative' : 'sentiment-neutral'}`}>
                                            {result.sentiment.label}
                                        </span>
                                        <div className="progress-bar-wrap" style={{ flex: 1 }}>
                                            <div className="progress-bar-fill" style={{ width: `${result.sentiment.score * 100}%` }} />
                                        </div>
                                        <span style={{ fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                                            {(result.sentiment.score * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
