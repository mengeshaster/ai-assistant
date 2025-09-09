import { useState } from 'react';
import {
    ComputerDesktopIcon,
    InformationCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

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
        <div style={{ 
            minHeight: '100vh', 
            backgroundColor: '#f9fafb', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '1rem' 
        }}>
            <div style={{ 
                width: '100%', 
                maxWidth: '24rem', 
                margin: '0 auto' 
            }}>
                <div style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '0.5rem', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
                    border: '1px solid #e5e7eb', 
                    padding: '1.5rem' 
                }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ 
                            width: '2rem', 
                            height: '2rem', 
                            backgroundColor: '#2563eb', 
                            borderRadius: '0.5rem', 
                            margin: '0 auto 1rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                        }}>
                            <ComputerDesktopIcon style={{ 
                                width: '1rem', 
                                height: '1rem', 
                                color: 'white' 
                            }} />
                        </div>
                        <h1 style={{ 
                            fontSize: '1.125rem', 
                            fontWeight: 'bold', 
                            color: '#111827', 
                            marginBottom: '0.5rem' 
                        }}>Welcome Back</h1>
                        <p style={{ 
                            color: '#6b7280', 
                            fontSize: '0.875rem' 
                        }}>Sign in to your AI Assistant</p>
                    </div>

                    {/* Test Credentials Info */}
                    <div style={{ 
                        marginBottom: '1rem', 
                        padding: '0.75rem', 
                        backgroundColor: '#eff6ff', 
                        border: '1px solid #dbeafe', 
                        borderRadius: '0.5rem' 
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            marginBottom: '0.5rem' 
                        }}>
                            <InformationCircleIcon style={{ 
                                width: '1rem', 
                                height: '1rem', 
                                color: '#2563eb', 
                                marginRight: '0.5rem' 
                            }} />
                            <h3 style={{ 
                                color: '#1e3a8a', 
                                fontWeight: '600', 
                                fontSize: '0.875rem' 
                            }}>Test Credentials</h3>
                        </div>
                        <div style={{ fontSize: '0.875rem' }}>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                backgroundColor: 'white', 
                                borderRadius: '0.25rem', 
                                padding: '0.5rem',
                                marginBottom: '0.25rem'
                            }}>
                                <span style={{ 
                                    color: '#1e40af', 
                                    fontWeight: '500' 
                                }}>Username:</span>
                                <code style={{ 
                                    backgroundColor: '#dbeafe', 
                                    color: '#1e3a8a', 
                                    padding: '0.25rem 0.5rem', 
                                    borderRadius: '0.25rem', 
                                    fontSize: '0.75rem' 
                                }}>testuser</code>
                            </div>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                backgroundColor: 'white', 
                                borderRadius: '0.25rem', 
                                padding: '0.5rem' 
                            }}>
                                <span style={{ 
                                    color: '#1e40af', 
                                    fontWeight: '500' 
                                }}>Password:</span>
                                <code style={{ 
                                    backgroundColor: '#dbeafe', 
                                    color: '#1e3a8a', 
                                    padding: '0.25rem 0.5rem', 
                                    borderRadius: '0.25rem', 
                                    fontSize: '0.75rem' 
                                }}>Password123!</code>
                            </div>
                            <p style={{ 
                                color: '#2563eb', 
                                fontSize: '0.75rem', 
                                marginTop: '0.5rem', 
                                display: 'flex', 
                                alignItems: 'center' 
                            }}>
                                <InformationCircleIcon style={{ 
                                    width: '0.75rem', 
                                    height: '0.75rem', 
                                    marginRight: '0.25rem' 
                                }} />
                                Use username, not email
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ 
                                color: '#374151', 
                                fontSize: '0.875rem', 
                                fontWeight: '500', 
                                marginBottom: '0.5rem', 
                                display: 'block' 
                            }}>Username</label>
                            <input
                                type="text"
                                placeholder="Enter your username"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                style={{
                                    width: '100%',
                                    backgroundColor: '#f9fafb',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    padding: '0.625rem 0.75rem',
                                    color: '#111827',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ 
                                color: '#374151', 
                                fontSize: '0.875rem', 
                                fontWeight: '500', 
                                marginBottom: '0.5rem', 
                                display: 'block' 
                            }}>Password</label>
                            <input
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                style={{
                                    width: '100%',
                                    backgroundColor: '#f9fafb',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    padding: '0.625rem 0.75rem',
                                    color: '#111827',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                required
                            />
                        </div>

                        {error && (
                            <div style={{ 
                                backgroundColor: '#fef2f2', 
                                border: '1px solid #fecaca', 
                                borderRadius: '0.5rem', 
                                padding: '0.75rem' 
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <ExclamationTriangleIcon style={{ 
                                        width: '1rem', 
                                        height: '1rem', 
                                        color: '#dc2626', 
                                        marginRight: '0.5rem' 
                                    }} />
                                    <span style={{ 
                                        color: '#b91c1c', 
                                        fontSize: '0.875rem' 
                                    }}>{error}</span>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.625rem 1rem',
                                borderRadius: '0.5rem',
                                fontWeight: '600',
                                fontSize: '0.875rem',
                                border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                backgroundColor: loading ? '#e5e7eb' : '#2563eb',
                                color: loading ? '#9ca3af' : 'white',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            {loading ? (
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center' 
                                }}>
                                    <div style={{ 
                                        width: '1rem', 
                                        height: '1rem', 
                                        border: '2px solid #d1d5db', 
                                        borderTop: '2px solid #2563eb', 
                                        borderRadius: '50%', 
                                        animation: 'spin 1s linear infinite', 
                                        marginRight: '0.5rem' 
                                    }}></div>
                                    Signing in...
                                </div>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div style={{ 
                        marginTop: '1.5rem', 
                        textAlign: 'center' 
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '0.5rem', 
                            color: '#6b7280', 
                            fontSize: '0.75rem' 
                        }}>
                            <ComputerDesktopIcon style={{ 
                                width: '0.75rem', 
                                height: '0.75rem' 
                            }} />
                            <span>Multi-Agent AI</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
