import { LLMMessage } from '../types';
import { LLMService } from '../services/llmService';
import { webSearch, WebSearchResponse } from '../tools';

export class FinancialAgent {
    private llmService: LLMService;

    constructor() {
        this.llmService = new LLMService();
    }

    /**
     * Process financial/search requests with web search and AI analysis
     * Flow: webSearch for fresh data -> provide context to Bedrock -> add disclaimer
     */
    async *processStream(messages: LLMMessage[]): AsyncGenerator<string> {
        console.log('FinancialAgent: Processing financial/search request');

        // Step 1: Extract search query from the last user message
        const searchQuery = this.extractSearchQuery(messages);

        // Step 2: Perform web search first to get fresh data
        yield '🔍 Searching for current information...\n\n';

        const searchResults: WebSearchResponse = await webSearch.search(searchQuery);

        if (searchResults.results.length === 0) {
            yield '❌ No search results found. Falling back to general knowledge.\n\n';
            // Fall back to general LLM without search context
            yield* this.llmService.invokeStreaming(messages);
            return;
        }

        // Step 3: Build enhanced prompt with search context
        const enhancedMessages = this.buildMessagesWithSearchContext(messages, searchResults);

        // Step 4: Add disclaimer at the beginning
        yield '📊 **Financial Information Disclaimer**: The following information is based on recent web search results and AI analysis. This should not be considered as financial advice. Always consult with qualified financial professionals before making investment decisions.\n\n';

        // Step 5: Display search sources
        yield '**Sources:**\n';
        for (const [index, result] of searchResults.results.entries()) {
            yield `${index + 1}. [${result.title}](${result.url})\n`;
        }
        yield '\n**Analysis:**\n\n';

        // Step 6: Stream AI analysis with search context
        yield* this.llmService.invokeStreaming(enhancedMessages);
    }

    /**
     * Non-streaming version
     */
    async process(messages: LLMMessage[]): Promise<string> {
        console.log('FinancialAgent: Processing financial/search request (non-streaming)');

        const searchQuery = this.extractSearchQuery(messages);
        const searchResults = await webSearch.search(searchQuery);

        if (searchResults.results.length === 0) {
            return '❌ No search results found. Falling back to general knowledge.\n\n' +
                await this.llmService.invokeNonStreaming(messages);
        }

        const enhancedMessages = this.buildMessagesWithSearchContext(messages, searchResults);

        const disclaimer = '📊 **Financial Information Disclaimer**: The following information is based on recent web search results and AI analysis. This should not be considered as financial advice. Always consult with qualified financial professionals before making investment decisions.\n\n';

        let sources = '**Sources:**\n';
        for (const [index, result] of searchResults.results.entries()) {
            sources += `${index + 1}. ${result.title} - ${result.url}\n`;
        }
        sources += '\n**Analysis:**\n\n';

        const analysis = await this.llmService.invokeNonStreaming(enhancedMessages);

        return disclaimer + sources + analysis;
    }

    /**
     * Extract search query from user messages
     */
    private extractSearchQuery(messages: LLMMessage[]): string {
        if (messages.length === 0) return '';

        const lastMessage = messages[messages.length - 1];
        let prompt = '';

        if (typeof lastMessage.content === 'string') {
            prompt = lastMessage.content;
        } else if (Array.isArray(lastMessage.content)) {
            const textContent = lastMessage.content.find(c => c.type === 'text');
            prompt = textContent?.text || '';
        }

        // Clean up the prompt for search - remove conversational elements
        return prompt
            .replace(/please|can you|could you|help me|i want to|search for/gi, '')
            .trim();
    }

    /**
     * Build enhanced messages with search context
     */
    private buildMessagesWithSearchContext(messages: LLMMessage[], searchResults: WebSearchResponse): LLMMessage[] {
        // Build search context
        let searchContext = `\n\nCurrent search results for "${searchResults.query}":\n\n`;

        for (const [index, result] of searchResults.results.entries()) {
            searchContext += `${index + 1}. **${result.title}**\n`;
            searchContext += `   URL: ${result.url}\n`;
            searchContext += `   Summary: ${result.snippet}\n\n`;
        }

        searchContext += 'Based on this current information, please provide a comprehensive analysis. Include relevant details from the search results and cite specific sources when possible.\n';

        // Clone messages and enhance the last user message with search context
        const enhancedMessages = [...messages];
        const lastMessageIndex = enhancedMessages.length - 1;

        if (lastMessageIndex >= 0) {
            const lastMessage = enhancedMessages[lastMessageIndex];

            if (typeof lastMessage.content === 'string') {
                enhancedMessages[lastMessageIndex] = {
                    ...lastMessage,
                    content: lastMessage.content + searchContext
                };
            } else if (Array.isArray(lastMessage.content)) {
                const textContent = lastMessage.content.find(c => c.type === 'text');
                if (textContent) {
                    enhancedMessages[lastMessageIndex] = {
                        ...lastMessage,
                        content: lastMessage.content.map(c =>
                            c.type === 'text'
                                ? { ...c, text: c.text + searchContext }
                                : c
                        )
                    };
                }
            }
        }

        return enhancedMessages;
    }
}

// Export singleton instance
export const financialAgent = new FinancialAgent();
