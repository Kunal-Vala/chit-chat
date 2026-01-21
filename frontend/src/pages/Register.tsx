import { useState } from "react";
// import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Register() {
    const { register } = useAuth()
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match')
            return
        }

        try {
            setLoading(true)
            await register(formData.username, formData.email, formData.password, true)
            navigate('/create', { replace: true })
        } catch (err) {
            if (err instanceof AxiosError) {
                const apiMessage = err.response?.data?.details
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ? err.response?.data?.details.map((detail: any) => detail.message).join(', ')
                    : err.response?.data?.message || err.response?.data?.error || 'Registration failed'
                setError(apiMessage || 'Registration failed')
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const msg = err && typeof err === 'object' && 'message' in (err as any) ? (err as any).message : 'Registration failed'
                setError(msg)
            }
            console.error('Error registering:', err)
        } finally {
            setLoading(false)
        }
    }


    return (
        <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-center mb-6">Sign Up</h2>
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
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                        Username *
                    </label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Choose a username"
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
                        placeholder="Create a strong password"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password *
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Re-enter your password"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? 'Registering...' : 'Register'}
                </button>
            </form>
        </div>
    )
}