import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import MeetingAssistant from './pages/MeetingAssistant'
import PostMeeting from './pages/PostMeeting'
import Dashboard from './pages/Dashboard'
import SessionsReports from './pages/SessionsReports'
import Settings from './pages/Settings'
import Appearance from './pages/Appearance'
import ExtensionSetup from './pages/ExtensionSetup'

const navItems = [
    { path: '/', icon: '📈', label: 'Dashboard' },
    { path: '/assistant', icon: '🎙️', label: 'Meeting Assistant' },
    { path: '/intelligence', icon: '🧠', label: 'Post-Meeting Summary' },
    { path: '/reports', icon: '🗂️', label: 'Sessions / Reports' },
    { path: '/setup', icon: '🔌', label: 'Extension Setup' },
    { path: '/appearance', icon: '🎨', label: 'Appearance' },
    { path: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function App() {
    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem('quickpoint_theme') || 'dark'
            document.documentElement.setAttribute('data-theme', savedTheme)
        } catch (e) {
            console.error("Failed to load theme from localStorage:", e)
            document.documentElement.setAttribute('data-theme', 'dark')
        }
    }, [])

    return (
        <BrowserRouter>
            <div className="app-shell">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="sidebar-logo">QuickPoint</div>
                    <div className="sidebar-tagline">Real-time Communication Enhancement</div>

                    <div className="status-chip">
                        <div className="status-dot" />
                        System Online
                    </div>

                    <div className="nav-section-label">Modules</div>
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}

                    <div className="sidebar-divider" />

                    <div className="sidebar-footer">
                        <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>AI-Powered Communication</div>
                        <div>QuickPoint v1.0</div>
                        <div style={{ marginTop: 4 }}>FastAPI · React · Whisper</div>
                        <div>HuggingFace · SQLite</div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/assistant" element={<MeetingAssistant />} />
                        <Route path="/intelligence" element={<PostMeeting />} />
                        <Route path="/reports" element={<SessionsReports />} />
                        <Route path="/setup" element={<ExtensionSetup />} />
                        <Route path="/appearance" element={<Appearance />} />
                        <Route path="/settings" element={<Settings />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    )
}
