import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Sign_In from "./pages/Sign_In";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AppShell() {
    const { user, isAuthenticated, logout } = useAuth()

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-md">
                <ul className="max-w-7xl mx-auto px-4 py-4 flex gap-6 items-center">
                    {isAuthenticated ? (
                        <>
                            <li><Link to="/create" className="text-blue-600 hover:text-blue-800">Create Post</Link></li>
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

            <main className="max-w-7xl mx-auto px-4 py-8">
                <Routes>
                    <Route path="/" element={<Navigate to={isAuthenticated ? "/create" : "/login"} replace />} />
                    <Route path="/register" element={isAuthenticated ? <Navigate to="/create" replace /> : <Register />} />
                    <Route path="/login" element={isAuthenticated ? <Navigate to="/create" replace /> : <Sign_In/>} />
                    <Route element={<ProtectedRoute />}> 
                        <Route path="/create" element={<div>Create Post Page - Coming Soon</div>} />
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
