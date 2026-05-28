import { useState, useEffect } from 'react'

export default function Appearance() {
    const [theme, setTheme] = useState('dark')
    const [toast, setToast] = useState(null)

    useEffect(() => {
        const savedTheme = localStorage.getItem('quickpoint_theme') || 'dark'
        setTheme(savedTheme)
    }, [])

    const showToast = (msg) => {
        setToast(msg)
        setTimeout(() => setToast(null), 3000)
    }

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme)
        localStorage.setItem('quickpoint_theme', newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
        showToast(`🎨 Theme switched to ${newTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}!`)
    }

    return (
        <div>
            {toast && <div className="toast toast-success">{toast}</div>}

            <div className="page-header">
                <div className="page-badge">✨ Customization</div>
                <h1 className="page-title">QuickPoint <span>Appearance</span></h1>
                <p className="page-subtitle">
                    Personalize the appearance and layout theme of your QuickPoint AI Meeting Assistant.
                </p>
            </div>

            <div className="card" style={{ maxWidth: 800 }}>
                <div className="card-title" style={{ marginBottom: 8, fontSize: '1.2rem' }}>Theme Mode</div>
                <div className="card-subtitle" style={{ marginBottom: 24 }}>Select your preferred interface styling</div>

                <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>
                    {/* Dark Theme Selection Card */}
                    <div 
                        className={`card-glow`} 
                        onClick={() => handleThemeChange('dark')}
                        style={{ 
                            cursor: 'pointer',
                            borderWidth: theme === 'dark' ? '2px' : '1px',
                            borderColor: theme === 'dark' ? 'var(--accent)' : 'var(--border)',
                            transform: theme === 'dark' ? 'translateY(-4px)' : 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            background: theme === 'dark' ? 'rgba(124, 58, 237, 0.06)' : 'rgba(255, 255, 255, 0.02)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <span style={{ fontSize: '1.4rem' }}>🌙</span>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Dark Mode</div>
                            {theme === 'dark' && <span style={{ marginLeft: 'auto', background: 'var(--accent)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>Active</span>}
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                            Premium dark glassmorphic interface with purple neon highlights and soft neon glows.
                        </p>
                        {/* Dark Mini Preview */}
                        <div style={{ background: '#09090f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ width: '40%', height: 6, background: '#a78bfa', borderRadius: 3 }} />
                            <div style={{ width: '80%', height: 4, background: '#60607a', borderRadius: 2 }} />
                            <div style={{ width: '60%', height: 4, background: '#60607a', borderRadius: 2 }} />
                            <div style={{ alignSelf: 'flex-end', width: 24, height: 10, background: '#7c3aed', borderRadius: 4 }} />
                        </div>
                    </div>

                    {/* Light Theme Selection Card */}
                    <div 
                        className={`card`} 
                        onClick={() => handleThemeChange('light')}
                        style={{ 
                            cursor: 'pointer',
                            borderWidth: theme === 'light' ? '2px' : '1px',
                            borderColor: theme === 'light' ? 'var(--accent)' : 'var(--border)',
                            transform: theme === 'light' ? 'translateY(-4px)' : 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            background: theme === 'light' ? 'rgba(124, 58, 237, 0.06)' : 'rgba(255, 255, 255, 0.02)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <span style={{ fontSize: '1.4rem' }}>☀️</span>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Light Mode</div>
                            {theme === 'light' && <span style={{ marginLeft: 'auto', background: 'var(--accent)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>Active</span>}
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                            Clean, light interface with dark purple typography, soft shadows, and clean violet accents.
                        </p>
                        {/* Light Mini Preview */}
                        <div style={{ background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ width: '40%', height: 6, background: '#7c3aed', borderRadius: 3 }} />
                            <div style={{ width: '80%', height: 4, background: '#8888a0', borderRadius: 2 }} />
                            <div style={{ width: '60%', height: 4, background: '#8888a0', borderRadius: 2 }} />
                            <div style={{ alignSelf: 'flex-end', width: 24, height: 10, background: '#6d28d9', borderRadius: 4 }} />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.15)' }}>
                    <span style={{ fontSize: '1.3rem' }}>💡</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-light)', lineHeight: 1.4 }}>
                        Themes are saved locally and will automatically persist across browser refreshes and page routing.
                    </span>
                </div>
            </div>
        </div>
    )
}
