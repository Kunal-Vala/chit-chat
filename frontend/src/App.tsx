import { BrowserRouter, Routes, Route, Link, Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Search, Users, UserCircle, LogOut, Moon, Sun, Sparkles, Menu } from "lucide-react";
import Register from "./pages/Register";
import Sign_In from "./pages/Sign_In";
import Profile from "./pages/Profile";
import SearchUsers from "./pages/SearchUsers";
import FriendsManager from "./pages/FriendsManager";
import Chat from "./pages/Chat";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AppShell() {
    const { user, isAuthenticated, logout } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const isChatPage = location.pathname.startsWith('/chat')
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register'
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window === 'undefined') return 'light'
        const stored = localStorage.getItem('theme')
        return stored === 'dark' ? 'dark' : 'light'
    })
    const [isRailCollapsed, setIsRailCollapsed] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false
        return localStorage.getItem('rail_collapsed') === 'true'
    })
    const [headerQuery, setHeaderQuery] = useState('')

    useEffect(() => {
        document.documentElement.dataset.theme = theme
        localStorage.setItem('theme', theme)
    }, [theme])

    useEffect(() => {
        localStorage.setItem('rail_collapsed', String(isRailCollapsed))
    }, [isRailCollapsed])

    useEffect(() => {
        const params = new URLSearchParams(location.search)
        setHeaderQuery(params.get('q') ?? '')
    }, [location.pathname, location.search])

    const navItems = useMemo(() => ([
        { to: '/chat', label: 'Chat', icon: MessageCircle },
        { to: '/search', label: 'Search', icon: Search },
        { to: '/friends', label: 'Friends', icon: Users },
        { to: `/user/${user?.userId ?? ''}`, label: 'Profile', icon: UserCircle, disabled: !user?.userId },
    ]), [user?.userId])

    const handleToggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
    const handleToggleRail = () => setIsRailCollapsed((prev) => !prev)
    const handleHeaderSearchChange = (value: string) => {
        setHeaderQuery(value)
        if (!isAuthenticated || isAuthPage) return
        if (isChatPage) {
            const params = new URLSearchParams(location.search)
            if (value.trim()) {
                params.set('q', value)
            } else {
                params.delete('q')
            }
            navigate({ pathname: '/chat', search: params.toString() }, { replace: true })
            return
        }
        const params = new URLSearchParams()
        if (value.trim()) params.set('q', value)
        navigate({ pathname: '/search', search: params.toString() }, { replace: true })
    }

    return (
        <div className="min-h-screen">
            <div className="app-ambient" aria-hidden="true" />
            <div className="relative z-10 flex min-h-screen">
                {isAuthenticated && !isAuthPage && !isRailCollapsed ? (
                    <aside className="app-rail hidden lg:flex">
                        <div className="p-5 border-b app-border">
                            <div className="flex items-center gap-3">
                                <div className="app-logo">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold">Chit Chat</div>
                                    <div className="text-xs app-muted">Studio Edition</div>
                                </div>
                            </div>
                        </div>
                        <nav className="flex-1 p-4 space-y-2">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <NavLink
                                        key={item.label}
                                        to={item.disabled ? '#' : item.to}
                                        className={({ isActive }) => `app-nav-link ${isActive ? 'is-active' : ''} ${item.disabled ? 'is-disabled' : ''}`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span>{item.label}</span>
                                    </NavLink>
                                )
                            })}
                        </nav>
                        <div className="p-4 border-t app-border">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="app-avatar">
                                    {user?.username?.charAt(0).toUpperCase() ?? 'U'}
                                </div>
                                <div>
                                    <div className="text-sm font-semibold">{user?.username ?? 'User'}</div>
                                    <div className="text-xs app-muted">Online</div>
                                </div>
                            </div>
                            <button onClick={logout} className="app-ghost-button w-full">
                                <LogOut className="h-4 w-4" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </aside>
                ) : null}

                <div className="flex min-h-screen flex-1 flex-col">
                    <header className="app-header h-16">
                        <div className="app-header-inner">
                            <div className="flex items-center gap-3">
                                {isAuthenticated && !isAuthPage ? (
                                    <button
                                        type="button"
                                        onClick={handleToggleRail}
                                        className="app-icon-button"
                                        aria-label="Toggle sidebar"
                                        title="Toggle sidebar"
                                    >
                                        <Menu className="h-4 w-4" />
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="app-logo">
                                            <Sparkles className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold">Chit Chat</div>
                                            <div className="text-xs app-muted">Messaging Studio</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {isAuthenticated && !isAuthPage ? (
                                <div className="hidden md:flex items-center gap-2 app-search">
                                    <Search className="h-4 w-4" />
                                    <input
                                        type="text"
                                        placeholder="Search chats, friends, or messages"
                                        className="app-search-input"
                                        value={headerQuery}
                                        onChange={(event) => handleHeaderSearchChange(event.target.value)}
                                    />
                                </div>
                            ) : (
                                <div className="app-muted text-sm hidden sm:block">Find your people. Keep the flow alive.</div>
                            )}

                            <div className="flex items-center gap-2">
                                {isAuthenticated && !isAuthPage ? (
                                    <nav className="flex items-center gap-1 lg:hidden">
                                        {navItems.map((item) => {
                                            const Icon = item.icon
                                            return (
                                                <NavLink
                                                    key={item.label}
                                                    to={item.disabled ? '#' : item.to}
                                                    className={({ isActive }) => `app-nav-icon ${isActive ? 'is-active' : ''} ${item.disabled ? 'is-disabled' : ''}`}
                                                    title={item.label}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                </NavLink>
                                            )
                                        })}
                                    </nav>
                                ) : (
                                    <nav className="flex items-center gap-2 text-sm">
                                        <Link to="/login" className="app-link">Login</Link>
                                        <Link to="/register" className="app-link">Register</Link>
                                    </nav>
                                )}
                                <button
                                    type="button"
                                    onClick={handleToggleTheme}
                                    className="app-icon-button"
                                    aria-label="Toggle theme"
                                >
                                    {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </header>

                    <main className={isChatPage ? "flex-1" : "flex-1 px-4 py-8 sm:px-6"}>
                        <Routes>
                            <Route path="/" element={<Navigate to={isAuthenticated ? "/search" : "/login"} replace />} />
                            <Route path="/register" element={isAuthenticated ? <Navigate to="/search" replace /> : <Register />} />
                            <Route path="/login" element={isAuthenticated ? <Navigate to="/search" replace /> : <Sign_In/>} />
                            <Route element={<ProtectedRoute />}> 
                                <Route path="/search" element={<SearchUsers />} />
                                <Route path="/friends" element={<FriendsManager />} />
                                <Route path="/chat" element={<Chat />} />
                                <Route path="/user/:userId" element={<Profile />} />
                                <Route path="/users/:userId" element={<Profile />} />
                            </Route>
                        </Routes>
                    </main>
                </div>
            </div>
        </div>
    )
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppShell />
            </AuthProvider>
        </BrowserRouter>
    )
}






export default App
