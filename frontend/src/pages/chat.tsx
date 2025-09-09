import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { postStream, postRequest } from '../lib/api';

export default function Chat() {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [streaming, setStreaming] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const router = useRouter();

    useEffect(() => {
        // Check authentication
        const idToken = localStorage.getItem('idToken');
        if (!idToken) {
            router.replace('/login');
            return;
        }

        // Try to decode token to get user email (simple base64 decode of JWT payload)
        try {
            const payload = JSON.parse(atob(idToken.split('.')[1]));
            setUserEmail(payload.email || 'User');
        } catch (e) {
            setUserEmail('User');
        }
    }, [router]);

    function handleLogout() {
        localStorage.removeItem('idToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.replace('/login');
    }

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        if (!prompt.trim()) return;
        setStreaming(true);
        const currentPrompt = prompt;
        setPrompt('');
        setMessages(msgs => [...msgs, { role: 'user', content: currentPrompt }]);

        let assistantMessage = '';
        setMessages(msgs => [...msgs, { role: 'assistant', content: '', streaming: true }]);

        try {
            for await (const chunk of postStream('/chat/stream', { prompt: currentPrompt })) {
                if (chunk.type === 'token') {
                    assistantMessage += chunk.data;
                    setMessages(msgs => {
                        const newMsgs = [...msgs];
                        const lastMsg = newMsgs[newMsgs.length - 1];
                        if (lastMsg.role === 'assistant') {
                            lastMsg.content = assistantMessage;
                        }
                        return newMsgs;
                    });
                }
                if (chunk.type === 'tool') {
                    setMessages(msgs => [...msgs, { role: 'tool', content: `🔧 Tool: ${JSON.stringify(chunk.data, null, 2)}` }]);
                }
                if (chunk.type === 'final') {
                    setMessages(msgs => {
                        const newMsgs = [...msgs];
                        const lastMsg = newMsgs[newMsgs.length - 1];
                        if (lastMsg.role === 'assistant') {
                            lastMsg.streaming = false;
                        }
                        return newMsgs;
                    });
                }
            }
        } catch (err: any) {
            console.error('Chat error:', err);

            // Check if it's an authentication error
            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                setMessages(msgs => [...msgs, {
                    role: 'error',
                    content: `Authentication error: Please login again. ${err.message}`
                }]);
                // Clear tokens and redirect to login
                localStorage.removeItem('idToken');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                setTimeout(() => router.replace('/login'), 3000);
            } else {
                setMessages(msgs => [...msgs, {
                    role: 'error',
                    content: `Error: ${err.message}. Please check the browser console for more details.`
                }]);
            }
        } finally {
            setStreaming(false);
            textareaRef.current?.focus();
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-gray-800">AI Assistant</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">Welcome, {userEmail}</span>
                        <button
                            onClick={handleLogout}
                            className="text-sm text-gray-500 hover:text-gray-700 underline"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
                {/* Messages */}
                <div className="bg-white rounded-lg shadow p-6 mb-4 max-h-96 overflow-y-auto">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            <p className="text-lg mb-2">👋 Hello! I'm your AI assistant.</p>
                            <p className="text-sm">I can help you with coding, web search, data analysis, and more!</p>
                            <p className="text-sm mt-2">Try asking me to write code, search for information, or solve problems.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : msg.role === 'assistant'
                                            ? 'bg-gray-100 text-gray-800'
                                            : msg.role === 'tool'
                                                ? 'bg-purple-100 text-purple-800 text-xs'
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                        <div className="whitespace-pre-wrap">
                                            {msg.content}
                                            {msg.streaming && <span className="animate-pulse">▊</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Input Form */}
                <div className="bg-white rounded-lg shadow p-4">
                    <form onSubmit={handleSend} className="flex space-x-3">
                        <textarea
                            ref={textareaRef}
                            className="flex-1 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={3}
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            disabled={streaming}
                            placeholder="Ask me anything... (Try: 'Write a Python function to calculate fibonacci' or 'Search for latest AI news')"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={streaming || !prompt.trim()}
                        >
                            {streaming ? 'Sending...' : 'Send'}
                        </button>
                    </form>
                    <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
                </div>
            </div>
        </div>
    );
}
