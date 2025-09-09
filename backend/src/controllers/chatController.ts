import { LambdaEvent, ChatRequest, ChatResponse, LLMMessage, User } from '../types';
import { ChatService } from '../services/chatService';
import { MiddlewarePipeline, AuthMiddleware, ValidationMiddleware, LoggingMiddleware, ErrorHandlingMiddleware } from '../middleware';

export class ChatController {
    private chatService: ChatService;
    private middleware: MiddlewarePipeline;

    constructor() {
        this.chatService = new ChatService();
        this.middleware = new MiddlewarePipeline();
        this.setupMiddleware();
    }

    private setupMiddleware(): void {
        this.middleware.add(new LoggingMiddleware());
        this.middleware.add(new AuthMiddleware());
        this.middleware.add(new ValidationMiddleware(['prompt']));
    }

    private getUserFromEvent(event: LambdaEvent): User {
        const claims = event.requestContext.authorizer.jwt.claims;
        return {
            id: claims.sub,
            email: claims.email,
            username: claims['cognito:username'] || claims.sub
        };
    }

    async invoke(event: LambdaEvent) {
        try {
            await this.middleware.execute(event);

            const user = this.getUserFromEvent(event);
            const request: ChatRequest = JSON.parse(event.body);

            const response = await this.chatService.processMessage(
                user,
                request.prompt,
                request.conversationId
            );

            return ErrorHandlingMiddleware.createSuccessResponse(response);
        } catch (error) {
            return ErrorHandlingMiddleware.handleError(error);
        }
    }

    async stream(event: LambdaEvent) {
        try {
            await this.middleware.execute(event);

            const user = this.getUserFromEvent(event);
            const request: ChatRequest = JSON.parse(event.body);

            // For streaming, we return the initial response and handle streaming in the generator
            return ErrorHandlingMiddleware.createStreamingResponse();
        } catch (error) {
            return ErrorHandlingMiddleware.handleError(error);
        }
    }

    async *streamGenerator(event: LambdaEvent) {
        try {
            await this.middleware.execute(event);

            const user = this.getUserFromEvent(event);
            const request: ChatRequest = JSON.parse(event.body);

            yield* this.chatService.processMessageStream(
                user,
                request.prompt,
                request.conversationId
            );
        } catch (error) {
            console.error('Streaming error:', error);
            yield JSON.stringify({
                type: 'error',
                data: error instanceof Error ? error.message : 'Unknown error'
            }) + '\n';
        }
    }

    async getConversations(event: LambdaEvent) {
        try {
            const pipeline = new MiddlewarePipeline();
            pipeline.add(new LoggingMiddleware());
            pipeline.add(new AuthMiddleware());
            await pipeline.execute(event);

            const user = this.getUserFromEvent(event);
            const conversations = await this.chatService.getUserConversations(user.id);

            return ErrorHandlingMiddleware.createSuccessResponse({ conversations });
        } catch (error) {
            return ErrorHandlingMiddleware.handleError(error);
        }
    }

    async getConversation(event: LambdaEvent) {
        try {
            const pipeline = new MiddlewarePipeline();
            pipeline.add(new LoggingMiddleware());
            pipeline.add(new AuthMiddleware());
            await pipeline.execute(event);

            const user = this.getUserFromEvent(event);
            const conversationId = event.pathParameters?.conversationId;

            if (!conversationId) {
                throw new Error('Conversation ID is required');
            }

            const conversation = await this.chatService.getConversationWithMessages(
                user.id,
                conversationId
            );

            return ErrorHandlingMiddleware.createSuccessResponse(conversation);
        } catch (error) {
            return ErrorHandlingMiddleware.handleError(error);
        }
    }
}
