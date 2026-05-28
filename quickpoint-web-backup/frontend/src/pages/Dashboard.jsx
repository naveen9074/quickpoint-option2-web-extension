import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSessions, getStats, deleteSession } from '../api/isertApi'

function ScoreBadge({ score }) {
    const numericScore = (score !== null && score !== undefined) ? Number(score) : NaN;
    const hasScore = !isNaN(numericScore);
    const color = hasScore
        ? (numericScore >= 85 ? '#34d399' : numericScore >= 70 ? '#a78bfa' : numericScore >= 55 ? '#38bdf8' : numericScore >= 40 ? '#f59e0b' : '#ef4444')
        : '#64748b'; // Gray for N/A
    return (
        <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 99,
            fontSize: '0.75rem', fontWeight: 700, background: `${color}18`,
            color, border: `1px solid ${color}40`
        }}>
            {hasScore ? numericScore : 'N/A'}
        </span>
    )
}

function SentimentBadge({ label }) {
    const cleanLabel = (label || "NEUTRAL").toUpperCase();
    const map = {
        POSITIVE: { cls: 'chip-green', icon: '😊' },
        NEGATIVE: { cls: 'chip-red', icon: '😟' },
        NEUTRAL: { cls: 'chip-amber', icon: '😐' },
    }
    const { cls, icon } = map[cleanLabel] || { cls: 'chip-amber', icon: '😐' }
    return <span className={`chip ${cls}`}>{icon} {label || 'NEUTRAL'}</span>
}

export default function Dashboard() {
    const navigate = useNavigate()
    const [sessions, setSessions] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [deleting, setDeleting] = useState(null)
    const [toast, setToast] = useState(null)
    const [activeTab, setActiveTab] = useState('transcription')

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const load = async () => {
        setLoading(true); setError(null)
        try {
            const [sRes, stRes] = await Promise.all([getSessions(0, 50), getStats()])
            const sessionsData = sRes?.data?.sessions || (Array.isArray(sRes?.data) ? sRes.data : [])
            setSessions(Array.isArray(sessionsData) ? sessionsData : [])
            setStats(stRes?.data || null)
        } catch (e) {
            console.error("Dashboard load failed:", e)
            setError('Could not load data. Make sure the backend is running.')
            setSessions([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const handleDelete = async (id) => {
        setDeleting(id)
        try {
            await deleteSession(id)
            setSessions(s => s.filter(x => x.id !== id))
            showToast('🗑️ Session deleted successfully!')
        } catch {
            showToast('❌ Delete failed', 'error')
        } finally {
            setDeleting(null)
        }
    }

    const formatDate = (d) => {
        const dateObj = d ? new Date(d) : new Date()
        const finalDate = isNaN(dateObj.getTime()) ? new Date() : dateObj
        return finalDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    }

    const transcriptsCount = Array.isArray(sessions) ? sessions.filter(s => (s?.transcript || s?.transcript_preview)?.trim()).length : 0
    const summariesCount = Array.isArray(sessions) ? sessions.filter(s => s?.summary?.trim()).length : 0
    const exportedCount = Array.isArray(sessions) ? sessions.length : 0 // All saved reports are exported as reports

    const modulesData = {
        transcription: {
            title: '🎙️ Speech Transcription',
            status: 'Working & Integrated',
            badgeClass: 'chip-green',
            description: 'Converts uploaded or live-recorded meeting audio into highly accurate text transcripts. Leverages OpenAI Whisper with custom filler-word detection (highlighting "um", "like", "you know") to help track communication clarity.'
        },
        summary: {
            title: '🧠 AI Summary Generation',
            status: 'Working & Integrated',
            badgeClass: 'chip-green',
            description: 'Automatically distills long transcripts into concise meeting minutes. Powered by HuggingFace BART transformers, it summarizes discussions, captures themes, and formats structured notes.'
        },
        keypoints: {
            title: '🏷️ Key Point Extraction',
            status: 'Working & Integrated',
            badgeClass: 'chip-green',
            description: 'Extracts the core meeting topics, subjects, and key milestones dynamically from the context of the transcribed session without manual tagging.'
        },
        actionitems: {
            title: '✅ Action Items',
            status: 'Working & Integrated',
            badgeClass: 'chip-green',
            description: 'Captures and isolates task checklists, deliverables, and owners directly from the conversation transcripts, allowing team members to quickly follow up.'
        },
        pdf: {
            title: '📄 PDF Report Export',
            status: 'Working & Integrated',
            badgeClass: 'chip-green',
            description: 'Generates formal, print-ready A4 meeting report PDFs. Uses a professional meeting minutes format including objectives, agendas, action items, decisions made, and transcripts.'
        },
        enhancement: {
            title: '🔊 Audio Enhancement Pipeline',
            status: 'Working & Integrated',
            badgeClass: 'chip-green',
            description: 'Applies automated pre-processing steps including spectral gating noise reduction and speed normalization in the backend using librosa and noisereduce.'
        },
        extension: {
            title: '⚡ Live Subtitle Extension',
            status: 'Experimental Prototype',
            badgeClass: 'chip-blue',
            description: 'Captures active tab and microphone audio to inject live subtitle overlays inside Google Meet, Zoom, Teams, or YouTube tabs, enabling instant translation overlays.'
        },
        capture: {
            title: '👥 Future Meeting Audio Capture',
            status: 'Future Enhancement',
            badgeClass: 'chip-amber',
            description: 'Planned system loopback audio driver support to isolate participant voice feeds and automatically diarize individual speaker transcripts.'
        }
    }

    return (
        <div style={{ position: 'relative' }}>
            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

            {/* Anti-gravity dots bg animation */}
            <div className="antigravity-dots">
                {[...Array(12)].map((_, i) => (
                    <div 
                        key={i} 
                        className="dot-particle" 
                        style={{ 
                            left: `${Math.random() * 95}%`, 
                            animationDelay: `${Math.random() * 15}s`,
                            animationDuration: `${15 + Math.random() * 15}s`
                        }} 
                    />
                ))}
            </div>

            {/* Premium Gradient Hero Banner */}
            <div className="card animate-gradient" style={{ padding: '36px 40px', borderRadius: 'var(--radius-xl)', border: 'none', marginBottom: 28, color: '#fff', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <div className="page-badge" style={{ background: 'rgba(255, 255, 255, 0.15)', borderColor: 'rgba(255, 255, 255, 0.3)', color: '#fff', marginBottom: 12 }}>🚀 QuickPoint Hub</div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.8px', lineHeight: 1.2 }}>QuickPoint AI Meeting Assistant</h1>
                    <p style={{ fontSize: '0.92rem', color: 'rgba(255, 255, 255, 0.85)', maxWidth: 620, margin: '0 0 24px 0', lineHeight: 1.6 }}>
                        Real-time AI-based communication enhancement, transcription, and meeting minutes generation system.
                    </p>
                    
                    {/* Main Action Buttons Grid */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button className="btn" style={{ background: '#fff', color: '#7c3aed', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} onClick={() => navigate('/assistant')}>
                            🎙️ Open Meeting Assistant
                        </button>
                        <button className="btn" style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.25)' }} onClick={() => navigate('/intelligence')}>
                            🧠 Open Post-Meeting Summary
                        </button>
                        <button className="btn" style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.25)' }} onClick={() => navigate('/reports')}>
                            🗂️ View Sessions / Reports
                        </button>
                        <button className="btn" style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.25)' }} onClick={() => navigate('/setup')}>
                            🔌 Extension Setup Guide
                        </button>
                    </div>
                </div>
                {/* Visual Glassmorphic Orb behind */}
                <div style={{ position: 'absolute', width: 280, height: 280, background: 'rgba(255, 255, 255, 0.08)', borderRadius: '50%', right: '-40px', top: '-40px', backdropFilter: 'blur(10px)', pointerEvents: 'none' }} />
            </div>

            {/* Refactored Analytics Cards */}
            <div className="grid-4" style={{ marginBottom: 28 }}>
                <div className="stat-card">
                    <span className="stat-icon">📂</span>
                    <div className="stat-value">{sessions.length}</div>
                    <div className="stat-label">Total Sessions</div>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">🎙️</span>
                    <div className="stat-value">{transcriptsCount}</div>
                    <div className="stat-label">Transcripts Generated</div>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">🧠</span>
                    <div className="stat-value">{summariesCount}</div>
                    <div className="stat-label">Summaries Created</div>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">📄</span>
                    <div className="stat-value">{exportedCount}</div>
                    <div className="stat-label">Reports Exported</div>
                </div>
            </div>

            <div className="grid-2" style={{ gridTemplateColumns: '1.05fr 0.95fr', alignItems: 'start', gap: 24 }}>
                {/* Interactive Modules Showcase */}
                <div className="card">
                    <div className="card-title" style={{ fontSize: '1.2rem', marginBottom: 4 }}>⚡ QuickPoint Modules</div>
                    <div className="card-subtitle" style={{ marginBottom: 20 }}>Select a module to view its integration status and details</div>

                    <div style={{ display: 'flex', gap: 20, alignItems: 'start' }}>
                        {/* Tab List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '42%', flexShrink: 0 }}>
                            <button className={`tab-btn ${activeTab === 'transcription' ? 'active' : ''}`} onClick={() => setActiveTab('transcription')} style={{ textAlign: 'left', fontSize: '0.8rem' }}>
                                🎙️ Transcription
                            </button>
                            <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')} style={{ textAlign: 'left', fontSize: '0.8rem' }}>
                                🧠 AI Summary
                            </button>
                            <button className={`tab-btn ${activeTab === 'keypoints' ? 'active' : ''}`} onClick={() => setActiveTab('keypoints')} style={{ textAlign: 'left', fontSize: '0.8rem' }}>
                                🏷️ Key Points
                            </button>
                            <button className={`tab-btn ${activeTab === 'actionitems' ? 'active' : ''}`} onClick={() => setActiveTab('actionitems')} style={{ textAlign: 'left', fontSize: '0.8rem' }}>
                                ✅ Action Items
                            </button>
                            <button className={`tab-btn ${activeTab === 'pdf' ? 'active' : ''}`} onClick={() => setActiveTab('pdf')} style={{ textAlign: 'left', fontSize: '0.8rem' }}>
                                📄 PDF Export
                            </button>
                            <button className={`tab-btn ${activeTab === 'enhancement' ? 'active' : ''}`} onClick={() => setActiveTab('enhancement')} style={{ textAlign: 'left', fontSize: '0.8rem' }}>
                                🔊 Audio Enhancement
                            </button>
                            <button className={`tab-btn ${activeTab === 'extension' ? 'active' : ''}`} onClick={() => setActiveTab('extension')} style={{ textAlign: 'left', fontSize: '0.8rem' }}>
                                🔌 Subtitle Extension
                            </button>
                            <button className={`tab-btn ${activeTab === 'capture' ? 'active' : ''}`} onClick={() => setActiveTab('capture')} style={{ textAlign: 'left', fontSize: '0.8rem' }}>
                                👥 Audio Capture
                            </button>
                        </div>

                        {/* Tab Content Display Card */}
                        <div className="card-glow" style={{ flex: 1, padding: 18, background: 'rgba(0,0,0,0.15)', minHeight: 240, borderLeft: '3px solid var(--accent)' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                                    {modulesData[activeTab].title}
                                </div>
                                <span className={`chip ${modulesData[activeTab].badgeClass}`} style={{ fontSize: '0.66rem', marginLeft: 'auto' }}>
                                    {modulesData[activeTab].status}
                                </span>
                            </div>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                {modulesData[activeTab].description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Simplified Session History Table */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div className="card-title" style={{ fontSize: '1.2rem' }}>🗂️ Session History</div>
                        <button className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '6px 12px' }} onClick={load}>
                            🔄 Refresh
                        </button>
                    </div>

                    {loading && (
                        <div className="loading-state">
                            <div className="spinner" />
                            <div>Loading sessions…</div>
                        </div>
                    )}

                    {error && <div className="alert alert-error">{error}</div>}

                    {!loading && !error && sessions.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon">📂</div>
                            <div>No sessions saved yet</div>
                            <p style={{ marginTop: 8, fontSize: '0.75rem' }}>
                                Go to the Meeting Assistant to record or upload audio and save it to the dashboard.
                            </p>
                        </div>
                    )}

                    {!loading && sessions.length > 0 && (
                        <div style={{ overflowX: 'auto', maxHeight: 310, overflowY: 'auto' }}>
                            <table className="session-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', paddingBottom: 10, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Name</th>
                                        <th style={{ textAlign: 'left', paddingBottom: 10, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Date</th>
                                        <th style={{ textAlign: 'right', paddingBottom: 10, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.slice(0, 5).map((s) => (
                                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '10px 0', fontWeight: 600, fontSize: '0.85rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {s.session_name || 'Untitled Session'}
                                            </td>
                                            <td style={{ padding: '10px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {formatDate(s.created_at)}
                                            </td>
                                            <td style={{ padding: '10px 0', textAlign: 'right' }}>
                                                <button
                                                    className="btn btn-danger"
                                                    style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                                    onClick={() => handleDelete(s.id)}
                                                    disabled={deleting === s.id}
                                                >
                                                    {deleting === s.id ? '…' : '🗑️'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {sessions.length > 5 && (
                                <div style={{ textAlign: 'center', marginTop: 14 }}>
                                    <button className="btn btn-ghost" style={{ fontSize: '0.76rem', padding: '5px 12px' }} onClick={() => navigate('/reports')}>
                                        View All Sessions →
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
