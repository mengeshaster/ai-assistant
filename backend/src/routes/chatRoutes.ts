import { LambdaEvent } from '../types';
import { ChatController } from '../controllers/chatController';

const chatController = new ChatController();

// Non-streaming chat endpoint
export const invoke = async (event: LambdaEvent) => {
    return await chatController.invoke(event);
};

// Streaming chat endpoint using Server-Sent Events (SSE)
export const stream = async (event: LambdaEvent) => {
    try {
        const streamGenerator = chatController.streamGenerator(event);

        // SSE requires specific headers and format
        let sseData = '';

        for await (const chunk of streamGenerator) {
            // Format as SSE event
            sseData += `data: ${chunk}\n\n`;
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            body: sseData
        };
    } catch (error) {
        console.error('SSE Stream handler error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'text/event-stream',
                'Access-Control-Allow-Origin': '*'
            },
            body: `data: ${JSON.stringify({
                type: 'error',
                data: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`
        };
    }
};

// Get user conversations
export const getConversations = async (event: LambdaEvent) => {
    return await chatController.getConversations(event);
};

// Get specific conversation with messages
export const getConversation = async (event: LambdaEvent) => {
    return await chatController.getConversation(event);
};
