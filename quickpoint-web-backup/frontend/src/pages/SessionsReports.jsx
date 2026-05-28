import { useState, useEffect } from 'react'
import { getSessions, deleteSession, getSession } from '../api/isertApi'

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

function CheckItem({ text }) {
    const [checked, setChecked] = useState(false)
    return (
        <li className="action-item" onClick={() => setChecked(c => !c)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
            <div className={`action-item-check ${checked ? 'checked' : ''}`} style={{
                width: 16, height: 16, borderRadius: 4, border: '1px solid var(--border-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: checked ? 'var(--accent)' : 'transparent'
            }}>
                {checked && <span style={{ color: '#fff', fontSize: '10px' }}>✓</span>}
            </div>
            <span style={{ textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.5 : 1, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{text}</span>
        </li>
    )
}

export default function SessionsReports() {
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedSession, setSelectedSession] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [deleting, setDeleting] = useState(null)
    const [toast, setToast] = useState(null)

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const loadSessions = async () => {
        setLoading(true); setError(null)
        try {
            const { data } = await getSessions(0, 100)
            const sessionsData = data?.sessions || (Array.isArray(data) ? data : [])
            setSessions(Array.isArray(sessionsData) ? sessionsData : [])
        } catch (e) {
            console.error("Sessions Reports load failed:", e)
            setError('Could not load sessions. Make sure the backend is running.')
            setSessions([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadSessions() }, [])

    const handleSelectSession = async (id) => {
        setDetailLoading(true)
        setSelectedSession(null)
        try {
            const { data } = await getSession(id)
            setSelectedSession(data)
        } catch {
            showToast('❌ Failed to load session details', 'error')
        } finally {
            setDetailLoading(false)
        }
    }

    const handleDelete = async (e, id) => {
        e.stopPropagation()
        if (!confirm('Are you sure you want to delete this session?')) return
        setDeleting(id)
        try {
            await deleteSession(id)
            setSessions(s => s.filter(x => x.id !== id))
            showToast('🗑️ Session deleted successfully')
            if (selectedSession?.id === id) {
                setSelectedSession(null)
            }
        } catch {
            showToast('❌ Delete failed', 'error')
        } finally {
            setDeleting(null)
        }
    }

    const formatDate = (d) => {
        const dateObj = d ? new Date(d) : new Date()
        const finalDate = isNaN(dateObj.getTime()) ? new Date() : dateObj
        return finalDate.toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    }

    return (
        <div>
            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

            <div className="page-header">
                <div className="page-badge">🗂️ Archive</div>
                <h1 className="page-title">Sessions & <span>Reports</span></h1>
                <p className="page-subtitle">
                    Explore past meeting transcripts, structured summaries, extracted action items, and voice clarity analytics.
                </p>
            </div>

            <div className="grid-2" style={{ alignItems: 'start', gridTemplateColumns: selectedSession ? '1.1fr 0.9fr' : '1fr' }}>
                {/* List Card */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div className="card-title">🗂️ Saved Sessions</div>
                        <button className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '6px 12px' }} onClick={loadSessions}>
                            🔄 Refresh List
                        </button>
                    </div>

                    {loading && (
                        <div className="loading-state">
                            <div className="spinner" />
                            <div>Loading archive…</div>
                        </div>
                    )}

                    {error && <div className="alert alert-error">{error}</div>}

                    {!loading && !error && sessions.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon">📂</div>
                            <div>No sessions found in the archive</div>
                            <p style={{ marginTop: 8, fontSize: '0.75rem' }}>
                                Go to the <strong style={{ color: 'var(--accent-light)' }}>Meeting Assistant</strong> to record/upload a meeting and save it.
                            </p>
                        </div>
                    )}

                    {!loading && sessions.length > 0 && (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="session-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Score</th>
                                        <th>Sentiment</th>
                                        <th>Date</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((s) => (
                                        <tr
                                            key={s.id}
                                            onClick={() => handleSelectSession(s.id)}
                                            style={{
                                                cursor: 'pointer',
                                                background: selectedSession?.id === s.id ? 'rgba(124, 58, 237, 0.08)' : 'transparent'
                                            }}
                                        >
                                            <td style={{ fontWeight: 600 }}>
                                                {s.session_name || `Session #${s.id}`}
                                            </td>
                                            <td><ScoreBadge score={s.score} /></td>
                                            <td><SentimentBadge label={s.sentiment} /></td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{formatDate(s.created_at)}</td>
                                            <td>
                                                <button
                                                    className="btn btn-danger"
                                                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                                    onClick={(e) => handleDelete(e, s.id)}
                                                    disabled={deleting === s.id}
                                                >
                                                    {deleting === s.id ? '…' : '🗑️'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Detail View */}
                {(selectedSession || detailLoading) && (
                    <div className="card-glow" style={{ position: 'sticky', top: 32 }}>
                        {detailLoading && (
                            <div className="loading-state" style={{ padding: '80px 0' }}>
                                <div className="spinner" />
                                <div>Fetching session details…</div>
                            </div>
                        )}

                        {selectedSession && !detailLoading && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                                    <div>
                                        <h2 className="card-title" style={{ fontSize: '1.2rem' }}>{selectedSession.session_name || 'Untitled Session'}</h2>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            📅 {formatDate(selectedSession.created_at)}
                                        </span>
                                    </div>
                                    <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setSelectedSession(null)}>
                                        ✕ Close
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
                                    <ScoreBadge score={selectedSession.score} />
                                    <SentimentBadge label={selectedSession.sentiment} />
                                    <span className="chip">⏱ {selectedSession.audio_duration_sec ?? 0}s</span>
                                    <span className="chip chip-blue">⚡ {selectedSession.pace_wpm ?? 0} WPM</span>
                                    <span className="chip chip-accent">🚫 {selectedSession.filler_count ?? 0} Fillers</span>
                                </div>

                                {/* AI Summary */}
                                <div style={{ marginBottom: 18 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent-light)', marginBottom: 8 }}>
                                        📄 AI Summary
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7, background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                                        {selectedSession.summary || 'No summary available.'}
                                    </p>
                                </div>

                                {/* Action Items */}
                                <div style={{ marginBottom: 18 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent2-light)', marginBottom: 8 }}>
                                        ✅ Action Items
                                    </div>
                                    {selectedSession.action_items?.length > 0 ? (
                                        <ul style={{ listStyle: 'none', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                                            {selectedSession.action_items.map((item, idx) => (
                                                <CheckItem key={idx} text={item} />
                                            ))}
                                        </ul>
                                    ) : (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: 8 }}>
                                            No action items detected.
                                        </div>
                                    )}
                                </div>

                                {/* Transcript */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-primary)' }}>
                                            📜 Full Transcript
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => navigator.clipboard.writeText(selectedSession.transcript)}>
                                                📋 Copy
                                            </button>
                                        </div>
                                    </div>
                                    <div className="transcript-box" style={{ fontSize: '0.82rem', maxHeight: 200 }}>
                                        {selectedSession.transcript || 'No transcript text.'}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
