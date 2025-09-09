import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { ConfigService } from '../config';
import { ILLMService, LLMMessage } from '../types';

export class LLMService implements ILLMService {
    private client: BedrockRuntimeClient;
    private config = ConfigService.getInstance();

    constructor() {
        this.client = new BedrockRuntimeClient({
            region: this.config.getAws().bedrockRegion,
            maxAttempts: 3
        });
    }

    async invokeNonStreaming(messages: LLMMessage[]): Promise<string> {
        try {
            console.log('LLM Service: Invoking non-streaming with messages:', messages.length);
            console.log('LLM Service: Input messages:', JSON.stringify(messages, null, 2));

            const formattedMessages = this.formatMessages(messages);
            console.log('LLM Service: Formatted messages for Bedrock:', JSON.stringify(formattedMessages, null, 2));

            const body = JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 1000,
                messages: formattedMessages
            });

            console.log('LLM Service: Final request body:', body);

            const response = await this.client.send(new InvokeModelCommand({
                modelId: this.config.getAws().bedrockModelId,
                body,
                contentType: 'application/json'
            }));

            if (!response.body) {
                throw new Error('No response body from Bedrock');
            }

            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            console.log('LLM Service: Response body:', responseBody);

            if (responseBody.content && responseBody.content[0]?.text) {
                return responseBody.content[0].text;
            }

            throw new Error('Invalid response format from Bedrock');
        } catch (error) {
            console.error('LLM Service: Error in non-streaming invoke:', error);
            throw error;
        }
    }

    async *invokeStreaming(messages: LLMMessage[]): AsyncGenerator<string> {
        try {
            console.log('LLM Service: Starting streaming invoke with messages:', messages.length);

            const body = JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 1000,
                messages: this.formatMessages(messages)
            });

            console.log('LLM Service: Streaming request body:', body);

            const response = await this.client.send(new InvokeModelWithResponseStreamCommand({
                modelId: this.config.getAws().bedrockModelId,
                body,
                contentType: 'application/json'
            }));

            if (!response.body) {
                throw new Error('No response stream from Bedrock');
            }

            for await (const chunk of response.body) {
                if (chunk.chunk?.bytes) {
                    const chunkData = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes));

                    if (chunkData.type === 'content_block_delta' && chunkData.delta?.text) {
                        yield chunkData.delta.text;
                    } else if (chunkData.type === 'message_stop') {
                        console.log('LLM Service: Streaming completed');
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('LLM Service: Error in streaming invoke:', error);
            throw error;
        }
    }

    private formatMessages(messages: LLMMessage[]): any[] {
        return messages.map(msg => ({
            role: msg.role === 'system' ? 'user' : msg.role, // Claude doesn't support system role directly
            content: Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }]
        }));
    }
}
