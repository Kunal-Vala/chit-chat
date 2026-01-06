import { useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import { TOKEN_STORAGE_KEY, setStoredToken } from "./api/axiosConfig";

function App() {
    const [token, setToken] = useState(() => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_STORAGE_KEY)))
    const storedUser = typeof window === 'undefined' ? null : localStorage.getItem('user')
    const [user, setUser] = useState(storedUser ? JSON.parse(storedUser) : null)

    const handleLogout = () => {
        console.log('User logging out');
        setStoredToken(null)
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
    }


    return (
        <BrowserRouter>
            <div className="min-h-screen bg-gray-100">
                <nav className="bg-white shadow-md">
                    <ul className="max-w-7xl mx-auto px-4 py-4 flex gap-6 items-center">
                        {token ? (
                            <>
                                <li><Link to="/create" className="text-blue-600 hover:text-blue-800">Create Post</Link></li>
                                <li className="ml-auto text-gray-700 font-medium">{user?.username}</li>
                                <li><button onClick={handleLogout} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Logout</button></li>
                            </>
                        ) : (
                            <>
                                <li><Link to="/login" className="text-blue-600 hover:text-blue-800">Login</Link></li>
                                <li><Link to="/register" className="text-blue-600 hover:text-blue-800">Register</Link></li>
                            </>
                        )}
                    </ul>
                </nav>

                <main className="max-w-7xl mx-auto px-4 py-8">
                    <Routes>
                        <Route path="/" element={<Navigate to={token ? "/create" : "/login"} replace />} />
                        <Route path="/register" element={token ? <Navigate to="/create" replace /> : <Register />} />
                        <Route path="/login" element={token ? <Navigate to="/create" replace /> : <div>Login Page - Coming Soon</div>} />
                        <Route path="/create" element={token ? <div>Create Post Page - Coming Soon</div> : <Navigate to="/login" replace />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    )
}






export default App
