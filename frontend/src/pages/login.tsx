import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bhrw5dk8h8.execute-api.eu-north-1.amazonaws.com';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');
            localStorage.setItem('idToken', data.idToken);
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            window.location.href = '/chat';
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded shadow w-96">
                <h2 className="text-2xl mb-6 font-bold text-center text-gray-800">AI Assistant Login</h2>

                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                    <p className="text-blue-700"><strong>Test User:</strong></p>
                    <p className="text-blue-600">Username: testuser</p>
                    <p className="text-blue-600">Password: Password123!</p>
                    <p className="text-blue-600 text-xs mt-1">Note: Use username, not email</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Username (enter: testuser)"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full mb-3 p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full mb-4 p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    {error && <div className="text-red-500 mb-3 text-sm">{error}</div>}
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}
