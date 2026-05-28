import { useState, useRef } from 'react'
import { enhanceAudio } from '../api/isertApi'

export default function AudioEnhancer() {
    const [file, setFile] = useState(null)
    const [dragging, setDragging] = useState(false)
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [speed, setSpeed] = useState(1.0)
    const [denoise, setDenoise] = useState(true)
    const [error, setError] = useState(null)
    const [downloadUrl, setDownloadUrl] = useState(null)
    const [downloadName, setDownloadName] = useState('')
    const inputRef = useRef()

    const handleFile = (f) => { setFile(f); setDownloadUrl(null); setError(null) }

    const handleDrop = (e) => {
        e.preventDefault(); setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) handleFile(f)
    }

    const handleEnhance = async () => {
        if (!file) return
        setLoading(true); setError(null); setDownloadUrl(null); setProgress(0)
        const fd = new FormData()
        fd.append('file', file)
        fd.append('speed', speed)
        fd.append('denoise', denoise)
        try {
            const res = await enhanceAudio(fd, (e) => {
                if (e.total) setProgress(Math.round(e.loaded / e.total * 100))
            })
            // Response is a binary blob (audio/wav)
            const blob = new Blob([res.data], { type: 'audio/wav' })
            const url = URL.createObjectURL(blob)
            const base = file.name.replace(/\.[^/.]+$/, '')
            setDownloadUrl(url)
            setDownloadName(`${base}_enhanced.wav`)
        } catch (e) {
            setError(e.response?.data?.detail || 'Enhancement failed. Is the backend running?')
        } finally {
            setLoading(false)
        }
    }

    const speedLabel = () => {
        if (speed < 0.8) return { text: 'Slower', color: '#38bdf8' }
        if (speed > 1.2) return { text: 'Faster', color: '#f59e0b' }
        return { text: 'Normal', color: '#34d399' }
    }

    const sl = speedLabel()

    return (
        <div>
            <div className="page-header">
                <div className="page-badge">🔊 Module 0</div>
                <h1 className="page-title">Audio <span>Enhancer</span></h1>
                <p className="page-subtitle">
                    Remove background noise and adjust playback speed — pre-process audio before transcription for best accuracy.
                </p>
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
                {/* Controls */}
                <div className="card">
                    <div className="card-title">🎵 Audio Upload</div>
                    <div className="card-subtitle">Supports MP3, WAV, M4A, OGG, WebM — max 50 MB</div>

                    <div
                        className={`upload-zone${dragging ? ' dragging' : ''}`}
                        onClick={() => inputRef.current.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                    >
                        <div className="upload-icon">🎧</div>
                        <div className="upload-label">Click or drag audio file here</div>
                        <div className="upload-hint">MP3 · WAV · M4A · OGG · WebM</div>
                        {file && <div className="file-chosen">✅ {file.name}</div>}
                    </div>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="audio/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFile(e.target.files[0])}
                    />

                    {/* Noise Cancel Toggle */}
                    <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <label className="toggle-wrap" onClick={() => setDenoise(d => !d)}>
                            <div className="toggle">
                                <input type="checkbox" checked={denoise} readOnly />
                                <div className="toggle-slider" />
                            </div>
                            <span className="toggle-label">
                                🎙️ Noise Cancellation {denoise ? '— ON' : '— OFF'}
                            </span>
                        </label>

                        {/* Speed Slider */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span className="toggle-label">⚡ Playback Speed</span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: sl.color }}>
                                    {speed.toFixed(1)}× — {sl.text}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0.5" max="2.0" step="0.1"
                                value={speed}
                                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                <span>0.5× Slower</span>
                                <span>1.0× Normal</span>
                                <span>2.0× Faster</span>
                            </div>
                        </div>
                    </div>

                    {loading && (
                        <div className="loading-state" style={{ marginTop: 20 }}>
                            <div className="spinner" />
                            <div>{progress > 0 && progress < 100 ? `Uploading… ${progress}%` : '🔧 Enhancing audio…'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Applying noise reduction {denoise ? '+ ' : ''}{speed !== 1.0 ? 'speed adjustment' : ''}
                            </div>
                        </div>
                    )}

                    {error && <div className="alert alert-error" style={{ marginTop: 16 }}>⚠️ {error}</div>}

                    <button
                        className="btn btn-primary"
                        style={{ marginTop: 20, width: '100%' }}
                        onClick={handleEnhance}
                        disabled={!file || loading}
                    >
                        {loading ? '⏳ Processing…' : '🚀 Enhance Audio'}
                    </button>
                </div>

                {/* Result Panel */}
                <div className="card">
                    <div className="card-title">📤 Enhanced Audio</div>
                    <div className="card-subtitle">Download the processed audio file below</div>

                    {!downloadUrl && !loading && (
                        <div className="empty-state">
                            <div className="empty-icon">🎛️</div>
                            <div>Enhanced audio will appear here</div>
                            <div style={{ marginTop: 8, fontSize: '0.75rem' }}>Upload an audio file, configure settings, then click Enhance</div>
                        </div>
                    )}

                    {downloadUrl && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="alert alert-success">✅ Enhancement complete! Your audio is ready.</div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                <span className={`chip ${denoise ? 'chip-green' : ''}`}>
                                    {denoise ? '✅ Noise Cancelled' : '⏭️ No Denoising'}
                                </span>
                                <span className="chip chip-blue">⚡ {speed.toFixed(1)}× Speed</span>
                                <span className="chip chip-accent">🎵 WAV Output</span>
                            </div>

                            {/* Audio Player */}
                            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
                                    PREVIEW ENHANCED AUDIO
                                </div>
                                <audio
                                    controls
                                    src={downloadUrl}
                                    style={{ width: '100%', borderRadius: 8, accentColor: 'var(--accent)' }}
                                />
                            </div>

                            <a
                                href={downloadUrl}
                                download={downloadName}
                                className="btn btn-success"
                                style={{ width: '100%', textDecoration: 'none' }}
                            >
                                💾 Download Enhanced Audio
                            </a>
                        </div>
                    )}

                    {/* Info box */}
                    <div style={{ marginTop: downloadUrl ? 20 : 40, padding: 16, background: 'rgba(124,58,237,0.06)', borderRadius: 10, border: '1px solid rgba(124,58,237,0.15)' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--accent-light)', fontWeight: 600, marginBottom: 8 }}>
                            💡 How it works
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                            <b style={{ color: 'var(--text-secondary)' }}>Noise Cancellation</b> uses spectral gating to identify stationary background noise and reduce it by up to 85%, making speech clearer.<br /><br />
                            <b style={{ color: 'var(--text-secondary)' }}>Speed Control</b> time-stretches audio without changing pitch, so accents remain natural at any speed.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
