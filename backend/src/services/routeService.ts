import { LLMMessage } from '../types';
import { LLMService } from './llmService';
import { genericAgent, codingAgent, financialAgent } from '../agents';

export class RouteService {
    private llmService: LLMService;

    constructor() {
        this.llmService = new LLMService();
    }

    async routeMessage(messages: LLMMessage[]): Promise<string> {
        // For now, we'll route all messages to the generic LLM service
        // In the future, this can be expanded to include intent classification
        // and routing to specific agents (web search, code execution, etc.)

        console.log('RouteService: Received messages for routing, count:', messages.length);
        console.log('RouteService: Messages:', messages);

        const intent = await this.classifyIntent(messages);
        console.log('Classified intent:', intent);

        switch (intent) {
            case 'web_search':
                return await financialAgent.process(messages);
            case 'code_execution':
                return await codingAgent.process(messages);
            case 'general':
            default:
                return await genericAgent.process(messages);
        }
    }

    async *routeMessageStream(messages: LLMMessage[]): AsyncGenerator<string> {
        // For streaming, we'll start with generic LLM streaming
        // Intent classification for streaming can be optimized later

        const intent = await this.classifyIntent(messages);
        console.log('Classified intent for streaming:', intent);

        switch (intent) {
            case 'web_search':
                yield* financialAgent.processStream(messages);
                break;
            case 'code_execution':
                yield* codingAgent.processStream(messages);
                break;
            case 'general':
            default:
                yield* genericAgent.processStream(messages);
                break;
        }
    }

    private async classifyIntent(messages: LLMMessage[]): Promise<string> {
        if (messages.length === 0) return 'general';

        // Get the last user message
        const lastMessage = messages[messages.length - 1];
        let prompt = '';

        if (typeof lastMessage.content === 'string') {
            prompt = lastMessage.content;
        } else if (Array.isArray(lastMessage.content)) {
            // Extract text from message content array
            const textContent = lastMessage.content.find(c => c.type === 'text');
            prompt = textContent?.text || '';
        }

        const lowerPrompt = prompt.toLowerCase();

        // Enhanced intent classification based on keywords

        // Web search / financial keywords
        if (lowerPrompt.includes('search') ||
            lowerPrompt.includes('find') ||
            lowerPrompt.includes('look up') ||
            lowerPrompt.includes('stock') ||
            lowerPrompt.includes('price') ||
            lowerPrompt.includes('market') ||
            lowerPrompt.includes('financial') ||
            lowerPrompt.includes('crypto') ||
            lowerPrompt.includes('bitcoin') ||
            lowerPrompt.includes('news') ||
            lowerPrompt.includes('current') ||
            lowerPrompt.includes('latest')) {
            return 'web_search';
        }

        // Code execution keywords
        if (lowerPrompt.includes('code') ||
            lowerPrompt.includes('execute') ||
            lowerPrompt.includes('run') ||
            lowerPrompt.includes('python') ||
            lowerPrompt.includes('javascript') ||
            lowerPrompt.includes('script') ||
            lowerPrompt.includes('program') ||
            lowerPrompt.includes('calculate') ||
            lowerPrompt.includes('compute')) {
            return 'code_execution';
        }

        return 'general';
    }
}
