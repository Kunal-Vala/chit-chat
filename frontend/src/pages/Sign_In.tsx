import { useState } from "react";
import { AxiosError } from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";


export default function Sign_In() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        email: "",
        password: "",

    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [remember, setRemember] = useState<boolean>(true)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }))
    }


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setLoading(true)
            setError(null)
            await login(formData.email, formData.password, remember)
            navigate('/create', { replace: true })
        } catch (err) {
            if (err instanceof AxiosError) {
                const apiMessage = err.response?.data?.details
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ? err.response?.data?.details.map((detail: any) => detail.message).join(', ')
                    : err.response?.data?.message || err.response?.data?.error || 'Login failed'
                setError(apiMessage || 'Login failed')
            } else {
                const msg = err && typeof err === 'object' && 'message' in (err as any) ? (err as any).message : 'Login failed'
                setError(msg)
            }
            console.error('Error Logging In:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-md mx-auto mt-8 p-6 app-card">
            <h2 className="text-2xl font-bold text-center mb-2 font-display">Sign In</h2>
            <p className="text-center text-sm app-muted mb-6">Welcome back. Pick up the conversation.</p>
            {error && <div className="border border-red-400 text-red-700 px-4 py-3 rounded mb-4 bg-red-100">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="app-label">
                        Email *
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email"
                        required
                        className="app-input"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="app-label">
                        Password *
                    </label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        required
                        className="app-input"
                    />
                </div>

                <div className="flex items-center gap-2 text-sm app-muted">
                    <input
                        id="remember"
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="h-4 w-4"
                    />
                    <label htmlFor="remember">Remember me</label>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full app-primary-button disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? 'Signing In...' : 'Sign In'}
                </button>
            </form>
        </div>
    )
}