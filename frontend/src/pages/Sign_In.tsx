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
        <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                    </label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter Your password"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex items-center">
                    <input
                        id="remember"
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="mr-2"
                    />
                    <label htmlFor="remember" className="text-sm text-gray-700">Remember me</label>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? 'Signing In...' : 'Sign In'}
                </button>
            </form>
        </div>
    )
}