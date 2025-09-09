import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { postRequest, postStream } from '../lib/api';
import { Transition } from '@headlessui/react';
import {
    PaperAirplaneIcon,
    ArrowRightOnRectangleIcon,
    ChatBubbleLeftRightIcon,
    CodeBracketIcon,
    CurrencyDollarIcon,
    UserIcon,
    ComputerDesktopIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'assistant';
    timestamp: Date;
    isStreaming?: boolean;
}

interface StreamChunk {
    type: 'typing' | 'token' | 'final' | 'error';
    data?: string;
    metadata?: {
        conversationId?: string;
    };
}

export default function Chat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Auto scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Check authentication
    useEffect(() => {
        const token = localStorage.getItem('idToken');
        if (!token) {
            router.push('/login');
            return;
        }

        // Try to decode token to get user email
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUserEmail(payload.email || 'User');
        } catch (e) {
            setUserEmail('User');
        }
    }, [router]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        // Clear any previous errors
        setError(null);

        const userMessage: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: '',
                sender: 'assistant',
                timestamp: new Date(),
                isStreaming: true
            };

            setMessages(prev => [...prev, assistantMessage]);

            let fullResponse = '';
            for await (const chunk of postStream('/dev2/chat/stream', {
                userMessage: userMessage.text,
                sessionId: conversationId || undefined
            }) as AsyncGenerator<StreamChunk>) {
                console.log('Received chunk:', chunk);

                if (chunk.type === 'typing') {
                    setIsTyping(true);
                    continue;
                }

                if (chunk.type === 'token') {
                    setIsTyping(false);
                    fullResponse += chunk.data || '';
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === assistantMessage.id
                                ? { ...msg, text: fullResponse }
                                : msg
                        )
                    );
                } else if (chunk.type === 'final') {
                    setIsTyping(false);
                    if (chunk.metadata?.conversationId) {
                        setConversationId(chunk.metadata.conversationId);
                    }
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === assistantMessage.id
                                ? { ...msg, isStreaming: false }
                                : msg
                        )
                    );
                } else if (chunk.type === 'error') {
                    setIsTyping(false);
                    setError(chunk.data || 'Unknown error occurred');
                    // Remove the streaming message on error
                    setMessages(prev => prev.filter(msg => msg.id !== assistantMessage.id));
                }
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            setIsTyping(false);

            // Check if it's an authentication error
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                localStorage.removeItem('idToken');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                router.push('/login');
                return;
            }

            // Set error state instead of adding error message
            setError(error instanceof Error ? error.message : 'Unknown error occurred');
            
            // Remove the streaming message on error
            setMessages(prev => prev.filter(msg => !msg.isStreaming));
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const logout = () => {
        localStorage.removeItem('idToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
    };

    const handleExampleClick = (text: string) => {
        setInput(text);
    };

    const resetChat = () => {
        setMessages([]);
        setConversationId(null);
        setError(null);
        setInput('');
        setIsLoading(false);
        setIsTyping(false);
    };

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            backgroundColor: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
            {/* Main Chat Area */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    flexShrink: 0
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#111827',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ComputerDesktopIcon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                        </div>
                        <h1 style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#111827',
                            margin: 0
                        }}>AI Assistant</h1>
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <button
                            onClick={resetChat}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#e5e7eb';
                                e.currentTarget.style.borderColor = '#9ca3af';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                                e.currentTarget.style.borderColor = '#d1d5db';
                            }}
                        >
                            <ChatBubbleLeftRightIcon style={{ width: '14px', height: '14px' }} />
                            New Chat
                        </button>
                        <span style={{
                            fontSize: '14px',
                            color: '#6b7280'
                        }}>{userEmail}</span>
                        <button
                            onClick={logout}
                            style={{
                                color: '#6b7280',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                                transition: 'color 0.2s'
                            }}
                            title="Logout"
                            onMouseOver={(e) => e.currentTarget.style.color = '#374151'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#6b7280'}
                        >
                            <ArrowRightOnRectangleIcon style={{ width: '20px', height: '20px' }} />
                        </button>
                    </div>
                </div>

                {/* Error Notification */}
                {error && (
                    <div style={{
                        backgroundColor: '#fef2f2',
                        borderBottom: '1px solid #fecaca',
                        padding: '12px 24px'
                    }}>
                        <div style={{
                            maxWidth: '768px',
                            margin: '0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: '#dc2626',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <ExclamationTriangleIcon style={{ width: '18px', height: '18px', color: '#ffffff' }} />
                                </div>
                                <div>
                                    <div style={{
                                        fontWeight: '600',
                                        color: '#dc2626',
                                        fontSize: '14px',
                                        marginBottom: '2px'
                                    }}>Error: {error}</div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#7f1d1d'
                                    }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <button
                                    onClick={resetChat}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        backgroundColor: '#dc2626',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                >
                                    <ArrowPathIcon style={{ width: '14px', height: '14px' }} />
                                    Reset Chat
                                </button>
                                <button
                                    onClick={() => setError(null)}
                                    style={{
                                        padding: '4px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#7f1d1d',
                                        borderRadius: '4px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <XMarkIcon style={{ width: '16px', height: '16px' }} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Messages Container */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    backgroundColor: '#ffffff'
                }}>
                    {messages.length === 0 ? (
                        /* Welcome Screen */
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            padding: '0 32px',
                            maxWidth: '1024px',
                            margin: '0 auto'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '32px'
                            }}>
                                <ComputerDesktopIcon style={{ width: '32px', height: '32px', color: '#6b7280' }} />
                            </div>
                            <h2 style={{
                                fontSize: '32px',
                                fontWeight: '500',
                                color: '#111827',
                                marginBottom: '16px',
                                textAlign: 'center',
                                margin: '0 0 16px 0'
                            }}>How can I help you today?</h2>
                            
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '16px',
                                maxWidth: '640px',
                                width: '100%',
                                marginTop: '32px'
                            }}>
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                onClick={() => handleExampleClick('Create a content calendar for a TikTok account')}
                                >
                                    <h3 style={{
                                        fontWeight: '500',
                                        color: '#111827',
                                        marginBottom: '8px',
                                        margin: '0 0 8px 0'
                                    }}>Create a content calendar</h3>
                                    <p style={{
                                        fontSize: '14px',
                                        color: '#6b7280',
                                        margin: 0
                                    }}>for a TikTok account</p>
                                </div>
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                onClick={() => handleExampleClick('Help me debug a Python script')}
                                >
                                    <h3 style={{
                                        fontWeight: '500',
                                        color: '#111827',
                                        marginBottom: '8px',
                                        margin: '0 0 8px 0'
                                    }}>Help me debug</h3>
                                    <p style={{
                                        fontSize: '14px',
                                        color: '#6b7280',
                                        margin: 0
                                    }}>a Python script</p>
                                </div>
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                onClick={() => handleExampleClick('Explain something like I\'m 5 years old')}
                                >
                                    <h3 style={{
                                        fontWeight: '500',
                                        color: '#111827',
                                        marginBottom: '8px',
                                        margin: '0 0 8px 0'
                                    }}>Explain something</h3>
                                    <p style={{
                                        fontSize: '14px',
                                        color: '#6b7280',
                                        margin: 0
                                    }}>like I'm 5 years old</p>
                                </div>
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                onClick={() => handleExampleClick('Write a thank you note to my neighbor')}
                                >
                                    <h3 style={{
                                        fontWeight: '500',
                                        color: '#111827',
                                        marginBottom: '8px',
                                        margin: '0 0 8px 0'
                                    }}>Write a thank you note</h3>
                                    <p style={{
                                        fontSize: '14px',
                                        color: '#6b7280',
                                        margin: 0
                                    }}>to my neighbor</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Chat Messages */
                        <div style={{
                            maxWidth: '768px',
                            margin: '0 auto',
                            padding: '32px 24px'
                        }}>
                            {messages.map((message) => (
                                <div key={message.id} style={{
                                    marginBottom: '32px',
                                    backgroundColor: message.sender === 'assistant' ? '#f9fafb' : 'transparent'
                                }}>
                                    <div style={{
                                        padding: message.sender === 'assistant' ? '24px' : '0',
                                        margin: message.sender === 'assistant' ? '0 -24px' : '0'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '16px'
                                        }}>
                                            {/* Avatar */}
                                            <div style={{
                                                flexShrink: 0,
                                                paddingTop: '4px'
                                            }}>
                                                {message.sender === 'user' ? (
                                                    <div style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        backgroundColor: '#2563eb',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <UserIcon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        backgroundColor: '#059669',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <ComputerDesktopIcon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Message Content */}
                                            <div style={{
                                                flex: 1,
                                                minWidth: 0
                                            }}>
                                                <div style={{
                                                    fontWeight: '600',
                                                    color: '#111827',
                                                    marginBottom: '8px',
                                                    fontSize: '14px'
                                                }}>
                                                    {message.sender === 'user' ? 'You' : 'AI Assistant'}
                                                </div>
                                                <div style={{
                                                    color: '#1f2937',
                                                    lineHeight: '1.75',
                                                    whiteSpace: 'pre-wrap'
                                                }}>
                                                    {message.text}
                                                    {message.isStreaming && (
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '12px',
                                                            height: '20px',
                                                            backgroundColor: '#111827',
                                                            marginLeft: '4px',
                                                            animation: 'pulse 1s infinite'
                                                        }}></span>
                                                    )}
                                                </div>
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: '#6b7280',
                                                    marginTop: '12px'
                                                }}>
                                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {isTyping && (
                                <div style={{
                                    marginBottom: '32px',
                                    backgroundColor: '#f9fafb',
                                    padding: '24px',
                                    margin: '0 -24px 32px -24px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '16px'
                                    }}>
                                        <div style={{
                                            flexShrink: 0,
                                            paddingTop: '4px'
                                        }}>
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                backgroundColor: '#059669',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <ComputerDesktopIcon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                                            </div>
                                        </div>
                                        <div style={{
                                            flex: 1,
                                            minWidth: 0
                                        }}>
                                            <div style={{
                                                fontWeight: '600',
                                                color: '#111827',
                                                marginBottom: '8px',
                                                fontSize: '14px'
                                            }}>AI Assistant</div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    backgroundColor: '#6b7280',
                                                    borderRadius: '50%',
                                                    animation: 'bounce 1s infinite'
                                                }}></div>
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    backgroundColor: '#6b7280',
                                                    borderRadius: '50%',
                                                    animation: 'bounce 1s infinite 0.1s'
                                                }}></div>
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    backgroundColor: '#6b7280',
                                                    borderRadius: '50%',
                                                    animation: 'bounce 1s infinite 0.2s'
                                                }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div style={{
                    borderTop: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    padding: '24px',
                    flexShrink: 0
                }}>
                    <div style={{
                        maxWidth: '768px',
                        margin: '0 auto'
                    }}>
                        <div style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'flex-end'
                        }}>
                            <div style={{
                                flex: 1,
                                position: 'relative'
                            }}>
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Message AI Assistant..."
                                    disabled={isLoading}
                                    rows={Math.min(input.split('\n').length, 6)}
                                    maxLength={2000}
                                    style={{
                                        width: '100%',
                                        resize: 'none',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '12px',
                                        padding: '12px 48px 12px 16px',
                                        color: '#111827',
                                        backgroundColor: '#ffffff',
                                        fontSize: '16px',
                                        lineHeight: '1.5',
                                        minHeight: '56px',
                                        outline: 'none',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#3b82f6';
                                        e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#d1d5db';
                                        e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        bottom: '12px',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                                        backgroundColor: input.trim() && !isLoading ? '#111827' : '#e5e7eb',
                                        color: input.trim() && !isLoading ? '#ffffff' : '#9ca3af',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    onMouseOver={(e) => {
                                        if (input.trim() && !isLoading) {
                                            e.currentTarget.style.backgroundColor = '#374151';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (input.trim() && !isLoading) {
                                            e.currentTarget.style.backgroundColor = '#111827';
                                        }
                                    }}
                                >
                                    {isLoading ? (
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            border: '2px solid #e5e7eb',
                                            borderTop: '2px solid #111827',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }}></div>
                                    ) : (
                                        <PaperAirplaneIcon style={{ width: '16px', height: '16px' }} />
                                    )}
                                </button>
                            </div>
                        </div>
                        <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            marginTop: '12px',
                            textAlign: 'center'
                        }}>
                            AI Assistant can make mistakes. Consider checking important information.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
