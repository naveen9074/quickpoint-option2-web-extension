import React from 'react'

export default function ExtensionSetup() {
    return (
        <div>
            <div className="page-header">
                <div className="page-badge">🔌 Chrome Extension</div>
                <h1 className="page-title">Extension <span>Setup Guide</span></h1>
                <p className="page-subtitle">
                    Follow this step-by-step developer guide to load and configure the QuickPoint Live Subtitles Chrome Extension.
                </p>
            </div>

            <div className="grid-2" style={{ alignItems: 'start', gap: 24 }}>
                {/* Installation Steps */}
                <div className="card">
                    <div className="card-title" style={{ fontSize: '1.15rem', marginBottom: 6 }}>⚙️ Installation Instructions</div>
                    <div className="card-subtitle" style={{ marginBottom: 18 }}>How to load the unpacked extension in developer mode</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>1</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Open Google Chrome and navigate to <strong style={{ color: 'var(--text-primary)' }}>chrome://extensions</strong>.
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>2</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Toggle on <strong style={{ color: 'var(--text-primary)' }}>Developer Mode</strong> in the top-right corner.
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>3</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Click the <strong style={{ color: 'var(--text-primary)' }}>Load unpacked</strong> button in the top-left.
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>4</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Select the extension folder: <br />
                                <code style={{ display: 'inline-block', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', marginTop: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--accent-light)' }}>
                                    accent-subtitle-extension
                                </code>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>5</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Click the extension icon in the toolbar, paste your <strong style={{ color: 'var(--text-primary)' }}>Groq API Key</strong>, and click Save.
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>6</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Navigate to any website (e.g. YouTube, Google Meet, or Zoom Web), open the popup, and click <strong style={{ color: 'var(--text-primary)' }}>Start</strong>.
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>7</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                The overlay subtitle card will appear. Speak into your mic or play web audio. When finished, click <strong style={{ color: 'var(--text-primary)' }}>Stop</strong> to review, generate summaries, or export reports.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status and Capability overview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card-glow" style={{ borderLeft: '4px solid var(--accent)' }}>
                        <div className="card-title" style={{ fontSize: '1.1rem', marginBottom: 12 }}>⚡ System Capability</div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--accent3-light)' }}>✓</span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Mic Live Subtitle Translation</span>
                                <span className="chip chip-green" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>Active</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--accent3-light)' }}>✓</span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Groq AI Summary Generation</span>
                                <span className="chip chip-green" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>Active</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--accent3-light)' }}>✓</span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Formal A4 PDF Report Export</span>
                                <span className="chip chip-green" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>Active</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--accent-light)' }}>ℹ️</span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Audio Mixing & Capturing (Web Audio)</span>
                                <span className="chip chip-blue" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>Mixed</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                                <span style={{ color: 'var(--accent4)' }}>ℹ️</span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Meeting Participant Tab Capture</span>
                                <span className="chip chip-amber" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>Experimental</span>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ background: 'rgba(14, 165, 233, 0.04)', borderColor: 'rgba(14, 165, 233, 0.2)' }}>
                        <div className="card-title" style={{ fontSize: '0.9rem', marginBottom: 6, color: 'var(--accent2-light)' }}>💡 Presentation Tip</div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Keep the extension popup open while presenting. Speak clearly into the microphone to display the live subtitle cards, showcasing real-time accent translation in action on top of standard browser applications!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
