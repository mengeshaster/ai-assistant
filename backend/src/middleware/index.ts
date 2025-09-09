import { LambdaEvent, LambdaResponse, AppError, AuthenticationError } from '../types';

export interface IMiddleware {
    execute(event: LambdaEvent): Promise<void>;
}

// Authentication middleware
export class AuthMiddleware implements IMiddleware {
    async execute(event: LambdaEvent): Promise<void> {
        if (!event.requestContext?.authorizer?.jwt?.claims?.sub) {
            throw new AuthenticationError('User not authenticated');
        }
    }
}

// Request validation middleware
export class ValidationMiddleware implements IMiddleware {
    private requiredFields: string[];

    constructor(requiredFields: string[] = []) {
        this.requiredFields = requiredFields;
    }

    async execute(event: LambdaEvent): Promise<void> {
        if (!event.body) {
            throw new AppError('Request body is required', 400);
        }

        let body: any;
        try {
            body = JSON.parse(event.body);
        } catch (error) {
            throw new AppError('Invalid JSON in request body', 400);
        }

        for (const field of this.requiredFields) {
            if (!body[field]) {
                throw new AppError(`Required field '${field}' is missing`, 400);
            }
        }
    }
}

// CORS middleware
export class CorsMiddleware implements IMiddleware {
    async execute(event: LambdaEvent): Promise<void> {
        // CORS headers will be added in the response handler
        // This middleware can be used for preflight handling if needed
    }
}

// Logging middleware
export class LoggingMiddleware implements IMiddleware {
    async execute(event: LambdaEvent): Promise<void> {
        console.log('Request received:', {
            path: event.pathParameters,
            headers: Object.keys(event.headers || {}),
            userId: event.requestContext?.authorizer?.jwt?.claims?.sub,
            timestamp: new Date().toISOString()
        });
    }
}

// Error handling middleware
export class ErrorHandlingMiddleware {
    static handleError(error: any): LambdaResponse {
        console.error('Error occurred:', error);

        if (error instanceof AppError) {
            return {
                statusCode: error.statusCode,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                body: JSON.stringify({
                    error: error.name,
                    message: error.message,
                    code: error.code
                })
            };
        }

        // Unknown error
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            body: JSON.stringify({
                error: 'Internal Server Error',
                message: 'An unexpected error occurred'
            })
        };
    }

    static createSuccessResponse(data: any, statusCode: number = 200): LambdaResponse {
        return {
            statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            body: JSON.stringify(data)
        };
    }

    static createStreamingResponse(): LambdaResponse {
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            },
            body: '',
            isBase64Encoded: false
        };
    }
}

// Middleware pipeline runner
export class MiddlewarePipeline {
    private middlewares: IMiddleware[] = [];

    add(middleware: IMiddleware): void {
        this.middlewares.push(middleware);
    }

    async execute(event: LambdaEvent): Promise<void> {
        for (const middleware of this.middlewares) {
            await middleware.execute(event);
        }
    }
}
