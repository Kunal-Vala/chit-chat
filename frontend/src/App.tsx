import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
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
    const isChatPage = location.pathname === '/chat'

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-md">
                <ul className="max-w-7xl mx-auto px-4 py-4 flex gap-6 items-center">
                    {isAuthenticated ? (
                        <>
                            <li><Link to="/search" className="text-blue-600 hover:text-blue-800">Search Users</Link></li>
                            <li><Link to="/friends" className="text-blue-600 hover:text-blue-800">Friends</Link></li>
                            <li><Link to="/chat" className="text-blue-600 hover:text-blue-800">Chat</Link></li>
                            <li><Link to={`/user/${user?.userId}`} className="text-blue-600 hover:text-blue-800">Profile</Link></li>
                            <li className="ml-auto text-gray-700 font-medium">{user?.username}</li>
                            <li><button onClick={logout} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Logout</button></li>
                        </>
                    ) : (
                        <>
                            <li><Link to="/login" className="text-blue-600 hover:text-blue-800">Login</Link></li>
                            <li><Link to="/register" className="text-blue-600 hover:text-blue-800">Register</Link></li>
                        </>
                    )}
                </ul>
            </nav>

            <main className={isChatPage ? "" : "max-w-7xl mx-auto px-4 py-8"}>
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
