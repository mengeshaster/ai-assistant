import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { ConfigService } from '../config';

export interface CodeExecutionRequest {
    language: 'python' | 'node';
    code: string;
    stdin?: string;
}

export interface CodeExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
}

export class CodeInterpreterTool {
    private config = ConfigService.getInstance();
    private lambdaClient: LambdaClient;

    constructor() {
        this.lambdaClient = new LambdaClient({
            region: this.config.getAws().region
        });
    }

    async execute(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
        try {
            const payload = {
                language: request.language,
                code: request.code,
                stdin: request.stdin || ''
            };

            const command = new InvokeCommand({
                FunctionName: this.config.getLambda().codeExecFunction,
                Payload: JSON.stringify(payload),
                InvocationType: 'RequestResponse'
            });

            const response = await this.lambdaClient.send(command);
            
            if (!response.Payload) {
                throw new Error('No response payload from CodeExec Lambda');
            }

            // Parse the response
            const responsePayload = JSON.parse(Buffer.from(response.Payload).toString());
            
            // Handle Lambda errors
            if (response.FunctionError) {
                console.error('CodeExec Lambda error:', responsePayload);
                return {
                    stdout: '',
                    stderr: `Lambda execution error: ${responsePayload.errorMessage || 'Unknown error'}`,
                    exitCode: 1,
                    durationMs: 0
                };
            }

            // Return the execution result
            return {
                stdout: responsePayload.stdout || '',
                stderr: responsePayload.stderr || '',
                exitCode: responsePayload.exitCode || 0,
                durationMs: responsePayload.durationMs || 0
            };

        } catch (error) {
            console.error('CodeInterpreter error:', error);
            return {
                stdout: '',
                stderr: `CodeInterpreter error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                exitCode: 1,
                durationMs: 0
            };
        }
    }

    /**
     * Extract code blocks from text (looking for fenced code blocks)
     */
    extractCodeBlocks(text: string): { language: 'python' | 'node'; code: string }[] {
        const codeBlocks: { language: 'python' | 'node'; code: string }[] = [];
        
        // Regex to match fenced code blocks with language specification
        const fencedRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;

        while ((match = fencedRegex.exec(text)) !== null) {
            const lang = match[1]?.toLowerCase();
            const code = match[2].trim();

            if (code) {
                // Map language variants to our supported types
                if (lang === 'python' || lang === 'py') {
                    codeBlocks.push({ language: 'python', code });
                } else if (lang === 'javascript' || lang === 'js' || lang === 'node' || lang === 'nodejs') {
                    codeBlocks.push({ language: 'node', code });
                } else if (!lang) {
                    // Default to python if no language specified
                    codeBlocks.push({ language: 'python', code });
                }
            }
        }

        return codeBlocks;
    }
}

// Export singleton instance
export const codeInterpreter = new CodeInterpreterTool();
