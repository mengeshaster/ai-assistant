// Type definitions for the application
export interface User {
    id: string;
    email?: string;
    username: string;
}

export interface Conversation {
    pk: string;
    sk: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

export interface Message {
    pk: string;
    sk: string;
    role: 'user' | 'assistant' | 'system';
    content: string | MessageContent[];
    timestamp?: string;
}

export interface MessageContent {
    type: 'text' | 'image';
    text?: string;
    source?: {
        type: string;
        media_type?: string;
        data?: string;
    };
}

export interface LLMMessage {
    role: 'user' | 'assistant' | 'system';
    content: string | MessageContent[];
}

export interface StreamChunk {
    type: 'token' | 'final' | 'error';
    data: string;
    metadata?: any;
}

export interface ChatRequest {
    prompt: string;
    conversationId?: string;
}

export interface ChatResponse {
    response: string;
    conversationId?: string;
}

// Lambda event types
export interface LambdaEvent {
    body: string;
    requestContext: {
        authorizer: {
            jwt: {
                claims: {
                    sub: string;
                    email?: string;
                    'cognito:username'?: string;
                };
            };
        };
    };
    headers: Record<string, string>;
    pathParameters?: Record<string, string>;
    queryStringParameters?: Record<string, string>;
}

export interface LambdaResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    isBase64Encoded?: boolean;
}

// Service interfaces
export interface ILLMService {
    invokeNonStreaming(messages: LLMMessage[]): Promise<string>;
    invokeStreaming(messages: LLMMessage[]): AsyncGenerator<string>;
}

export interface IConversationRepository {
    getConversation(userId: string, conversationId: string): Promise<Conversation | null>;
    createConversation(conversation: Conversation): Promise<void>;
    updateConversation(conversation: Conversation): Promise<void>;
    getUserConversations(userId: string): Promise<Conversation[]>;
}

export interface IMessageRepository {
    getMessages(conversationId: string): Promise<Message[]>;
    addMessage(message: Message): Promise<void>;
    updateMessage(message: Message): Promise<void>;
}

// Error types
export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 500,
        public code?: string
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
    }
}
