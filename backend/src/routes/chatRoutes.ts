import { LambdaEvent } from '../types';
import { ChatController } from '../controllers/chatController';

const chatController = new ChatController();

// Non-streaming chat endpoint
export const invoke = async (event: LambdaEvent) => {
    return await chatController.invoke(event);
};

// Streaming chat endpoint 
export const stream = async (event: LambdaEvent) => {
    // For streaming, we need to handle the response differently
    // This will need to be adapted based on your Lambda streaming setup
    try {
        const streamGenerator = chatController.streamGenerator(event);

        // Collect all chunks (for now - this can be optimized for true streaming)
        let response = '';
        for await (const chunk of streamGenerator) {
            response += chunk;
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            body: response
        };
    } catch (error) {
        console.error('Stream handler error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
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
