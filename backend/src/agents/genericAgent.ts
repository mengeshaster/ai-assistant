import { LLMMessage } from '../types';
import { LLMService } from '../services/llmService';

export class GenericAgent {
    private llmService: LLMService;

    constructor() {
        this.llmService = new LLMService();
    }

    /**
     * Process messages with plain Bedrock chat stream
     */
    async *processStream(messages: LLMMessage[]): AsyncGenerator<string> {
        console.log('GenericAgent: Processing general conversation');

        // Simply stream from LLM service - no tools involved
        yield* this.llmService.invokeStreaming(messages);
    }

    /**
     * Process messages with non-streaming response
     */
    async process(messages: LLMMessage[]): Promise<string> {
        console.log('GenericAgent: Processing general conversation (non-streaming)');

        return await this.llmService.invokeNonStreaming(messages);
    }
}

// Export singleton instance
export const genericAgent = new GenericAgent();
