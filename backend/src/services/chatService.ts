import {
    User,
    Conversation,
    Message,
    LLMMessage,
    ChatResponse,
    StreamChunk,
    AppError,
    NotFoundError
} from '../types';
import { LLMService } from './llmService';
import { ConversationRepository } from '../repositories/conversationRepository';
import { MessageRepository } from '../repositories/messageRepository';
import { RouteService } from './routeService';
import { v4 as uuidv4 } from 'uuid';

export class ChatService {
    private llmService: LLMService;
    private conversationRepo: ConversationRepository;
    private messageRepo: MessageRepository;
    private routeService: RouteService;

    constructor() {
        this.llmService = new LLMService();
        this.conversationRepo = new ConversationRepository();
        this.messageRepo = new MessageRepository();
        this.routeService = new RouteService();
    }

    async processMessage(
        user: User,
        prompt: string,
        conversationId?: string
    ): Promise<ChatResponse> {
        try {
            // Get or create conversation
            let conversation: Conversation;
            if (conversationId) {
                const existing = await this.conversationRepo.getConversation(user.id, conversationId);
                if (!existing) {
                    throw new NotFoundError('Conversation not found');
                }
                conversation = existing;
            } else {
                conversation = await this.createNewConversation(user.id, prompt);
            }

            // Save user message
            const userMessage: Message = {
                pk: conversation.pk,
                sk: `message#${Date.now()}#${uuidv4()}`,
                role: 'user',
                content: prompt,
                timestamp: new Date().toISOString()
            };
            await this.messageRepo.addMessage(userMessage);

            // Get conversation history
            const messages = await this.messageRepo.getMessages(conversation.pk);

            // Convert to LLM format
            const llmMessages = this.convertToLLMMessages(messages);

            // Route the message and get response
            const response = await this.routeService.routeMessage(llmMessages);

            // Save assistant message
            const assistantMessage: Message = {
                pk: conversation.pk,
                sk: `message#${Date.now()}#${uuidv4()}`,
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString()
            };
            await this.messageRepo.addMessage(assistantMessage);

            // Update conversation timestamp
            conversation.updatedAt = new Date().toISOString();
            await this.conversationRepo.updateConversation(conversation);

            return {
                response,
                conversationId: conversation.sk.replace('conversation#', '')
            };
        } catch (error) {
            console.error('Error processing message:', error);
            throw error;
        }
    }

    async *processMessageStream(
        user: User,
        prompt: string,
        conversationId?: string
    ): AsyncGenerator<string> {
        try {
            // Get or create conversation
            let conversation: Conversation;
            if (conversationId) {
                const existing = await this.conversationRepo.getConversation(user.id, conversationId);
                if (!existing) {
                    throw new NotFoundError('Conversation not found');
                }
                conversation = existing;
            } else {
                conversation = await this.createNewConversation(user.id, prompt);
            }

            // Save user message
            const userMessage: Message = {
                pk: conversation.pk,
                sk: `message#${Date.now()}#${uuidv4()}`,
                role: 'user',
                content: prompt,
                timestamp: new Date().toISOString()
            };
            await this.messageRepo.addMessage(userMessage);

            // Get conversation history
            const messages = await this.messageRepo.getMessages(conversation.pk);

            // Convert to LLM format
            const llmMessages = this.convertToLLMMessages(messages);

            // Stream the response
            let fullResponse = '';
            for await (const chunk of this.routeService.routeMessageStream(llmMessages)) {
                fullResponse += chunk;
                yield JSON.stringify({
                    type: 'token',
                    data: chunk
                }) + '\n';
            }

            // Save assistant message
            const assistantMessage: Message = {
                pk: conversation.pk,
                sk: `message#${Date.now()}#${uuidv4()}`,
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date().toISOString()
            };
            await this.messageRepo.addMessage(assistantMessage);

            // Update conversation timestamp
            conversation.updatedAt = new Date().toISOString();
            await this.conversationRepo.updateConversation(conversation);

            // Send final chunk
            yield JSON.stringify({
                type: 'final',
                data: '',
                metadata: {
                    conversationId: conversation.sk.replace('conversation#', '')
                }
            }) + '\n';
        } catch (error) {
            console.error('Error streaming message:', error);
            yield JSON.stringify({
                type: 'error',
                data: error instanceof Error ? error.message : 'Unknown error'
            }) + '\n';
        }
    }

    async getUserConversations(userId: string): Promise<Conversation[]> {
        return await this.conversationRepo.getUserConversations(userId);
    }

    async getConversationWithMessages(userId: string, conversationId: string) {
        const conversation = await this.conversationRepo.getConversation(userId, conversationId);
        if (!conversation) {
            throw new NotFoundError('Conversation not found');
        }

        const messages = await this.messageRepo.getMessages(conversation.pk);

        return {
            conversation,
            messages: messages.map((msg: Message) => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp
            }))
        };
    }

    private async createNewConversation(userId: string, firstMessage: string): Promise<Conversation> {
        const timestamp = new Date().toISOString();
        const conversationId = uuidv4();

        const conversation: Conversation = {
            pk: `user#${userId}`,
            sk: `conversation#${conversationId}`,
            title: this.generateConversationTitle(firstMessage),
            createdAt: timestamp,
            updatedAt: timestamp
        };

        await this.conversationRepo.createConversation(conversation);
        return conversation;
    }

    private generateConversationTitle(firstMessage: string): string {
        // Generate a title from the first message (truncate if too long)
        const title = firstMessage.length > 50
            ? firstMessage.substring(0, 50) + '...'
            : firstMessage;

        return title || 'New Conversation';
    }

    private convertToLLMMessages(messages: Message[]): LLMMessage[] {
        console.log('ChatService: Converting messages, count:', messages.length);
        console.log('ChatService: Raw messages:', messages.map(m => ({ role: m.role, content: m.content, sk: m.sk })));

        const converted = messages
            .sort((a, b) => a.sk.localeCompare(b.sk))
            .map(msg => ({
                role: msg.role,
                content: msg.content
            }));

        console.log('ChatService: Converted LLM messages:', converted);
        return converted;
    }
}
