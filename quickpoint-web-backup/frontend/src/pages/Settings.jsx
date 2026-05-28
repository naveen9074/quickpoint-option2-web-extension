import { useState, useEffect } from 'react'

export default function Settings() {
    const [modelSize, setModelSize] = useState('base')
    const [language, setLanguage] = useState('en')
    const [enhancementEnabled, setEnhancementEnabled] = useState(true)
    const [toast, setToast] = useState(null)

    useEffect(() => {
        const savedModel = localStorage.getItem('quickpoint_settings_model_size')
        const savedLang = localStorage.getItem('quickpoint_settings_language')
        const savedEnhance = localStorage.getItem('quickpoint_settings_enhancement')

        if (savedModel) setModelSize(savedModel)
        if (savedLang) setLanguage(savedLang)
        if (savedEnhance !== null) setEnhancementEnabled(savedEnhance === 'true')
    }, [])

    const showToast = (msg) => {
        setToast(msg)
        setTimeout(() => setToast(null), 3000)
    }

    const handleSave = () => {
        localStorage.setItem('quickpoint_settings_model_size', modelSize)
        localStorage.setItem('quickpoint_settings_language', language)
        localStorage.setItem('quickpoint_settings_enhancement', enhancementEnabled.toString())
        showToast('⚙️ Settings saved successfully!')
    }

    return (
        <div>
            {toast && <div className="toast toast-success">{toast}</div>}

            <div className="page-header">
                <div className="page-badge">⚙️ Configuration</div>
                <h1 className="page-title">QuickPoint <span>Settings</span></h1>
                <p className="page-subtitle">
                    Configure your transcription pipeline preferences, speech processing models, and preview future features.
                </p>
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
                {/* Configuration Card */}
                <div className="card">
                    <div className="card-title">🎙️ Audio & Transcription Settings</div>
                    <div className="card-subtitle">Tune the AI models and preprocessing pipeline</div>

                    {/* Whisper Model Size */}
                    <div style={{ marginBottom: 18 }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                            Whisper Model Size
                        </label>
                        <select
                            value={modelSize}
                            onChange={(e) => setModelSize(e.target.value)}
                            style={{
                                width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                                borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)',
                                outline: 'none', fontSize: '0.85rem'
                            }}
                        >
                            <option value="tiny">Tiny (Fastest, ~75MB)</option>
                            <option value="base">Base (Balanced, ~140MB - Default)</option>
                            <option value="small">Small (More Accurate, ~460MB)</option>
                            <option value="medium">Medium (High Precision, ~1.5GB)</option>
                            <option value="large">Large (State-of-the-Art, ~3GB)</option>
                        </select>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            * Note: Larger models provide better accuracy but take longer to process on CPU.
                        </p>
                    </div>

                    {/* Speech Language */}
                    <div style={{ marginBottom: 18 }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                            Default Language
                        </label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            style={{
                                width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                                borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)',
                                outline: 'none', fontSize: '0.85rem'
                            }}
                        >
                            <option value="en">English (US/UK)</option>
                            <option value="auto">Auto-Detect Language</option>
                            <option value="hi">Hindi (हिन्दी)</option>
                            <option value="es">Spanish (Español)</option>
                            <option value="fr">French (Français)</option>
                            <option value="de">German (Deutsch)</option>
                        </select>
                    </div>

                    {/* Audio Enhancement Toggle */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                            Audio Pre-Processing
                        </label>
                        <div className="toggle-wrap" onClick={() => setEnhancementEnabled(!enhancementEnabled)}>
                            <div className="toggle">
                                <input type="checkbox" checked={enhancementEnabled} readOnly />
                                <span className="toggle-slider" />
                            </div>
                            <span className="toggle-label">
                                {enhancementEnabled ? "Denoising & spectral gating active" : "Raw audio (faster, no enhancement)"}
                            </span>
                        </div>
                    </div>

                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSave}>
                        💾 Save Configuration
                    </button>
                </div>

                {/* Future Extension Card */}
                <div className="card-glow" style={{ borderLeft: '3px solid var(--accent)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: '1.5rem' }}>⚡</span>
                        <div className="card-title" style={{ margin: 0 }}>Future Live Subtitle Extension</div>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, backgroundColor: 'rgba(124, 58, 237, 0.2)', color: 'var(--accent-light)', fontWeight: 700 }}>
                            UPCOMING
                        </span>
                    </div>
                    <div className="card-subtitle" style={{ marginBottom: 16 }}>Google Meet / Zoom / Teams Integration</div>

                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: 14, borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
                        <p style={{ marginBottom: 10 }}>
                            The <strong>QuickPoint Live Subtitle Extension</strong> is a browser plugin planned for Google Chrome, Microsoft Edge, and Firefox. It will hook into active browser audio streams to:
                        </p>
                        <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6, margin: '10px 0' }}>
                            <li>🎙️ Capture sound directly from remote meetings (Zoom, Meet, Teams).</li>
                            <li>🔊 Apply real-time voice enhancement and background noise cancellation.</li>
                            <li>💬 Generate live caption overlays with translation options.</li>
                            <li>📥 Instantly push complete meeting logs into your QuickPoint dashboard.</li>
                        </ul>
                        <p style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Currently in prototype development. Accent recognition models are being trained.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                        <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                        <span style={{ fontSize: '0.76rem', color: 'var(--accent2-light)', fontWeight: 500 }}>
                            Live Subtitle Extension will be available in v1.5 release.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
