import { LLMMessage } from '../types';
import { LLMService } from '../services/llmService';
import { codeInterpreter, CodeExecutionResult } from '../tools';

export class CodingAgent {
    private llmService: LLMService;

    constructor() {
        this.llmService = new LLMService();
    }

    /**
     * Process coding requests with code generation and execution
     * Flow: Bedrock generates code -> extract fenced blocks -> execute -> stream results
     */
    async *processStream(messages: LLMMessage[]): AsyncGenerator<string> {
        console.log('CodingAgent: Processing coding request with execution');

        // Step 1: Generate code using Bedrock
        let generatedResponse = '';

        // Stream the LLM response first
        for await (const chunk of this.llmService.invokeStreaming(messages)) {
            generatedResponse += chunk;
            yield chunk;
        }

        // Step 2: Extract and execute code blocks
        const codeBlocks = codeInterpreter.extractCodeBlocks(generatedResponse);

        if (codeBlocks.length > 0) {
            yield '\n\n**🔧 Executing generated code:**\n\n';

            for (const [index, block] of codeBlocks.entries()) {
                yield `**Execution ${index + 1}** (${block.language}):\n`;
                yield '```\n';

                try {
                    const result: CodeExecutionResult = await codeInterpreter.execute({
                        language: block.language,
                        code: block.code
                    });

                    // Stream execution results
                    if (result.stdout) {
                        yield `stdout:\n${result.stdout}\n`;
                    }

                    if (result.stderr) {
                        yield `stderr:\n${result.stderr}\n`;
                    }

                    yield `exit_code: ${result.exitCode}\n`;
                    yield `duration: ${result.durationMs}ms\n`;

                } catch (error) {
                    yield `execution_error: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
                }

                yield '```\n\n';
            }
        } else {
            yield '\n\n*No executable code blocks found in the response.*\n';
        }
    }

    /**
     * Non-streaming version
     */
    async process(messages: LLMMessage[]): Promise<string> {
        console.log('CodingAgent: Processing coding request (non-streaming)');

        // Generate code
        const response = await this.llmService.invokeNonStreaming(messages);

        // Extract and execute code blocks
        const codeBlocks = codeInterpreter.extractCodeBlocks(response);

        if (codeBlocks.length === 0) {
            return response + '\n\n*No executable code blocks found in the response.*';
        }

        let executionResults = '\n\n**🔧 Code Execution Results:**\n\n';

        for (const [index, block] of codeBlocks.entries()) {
            executionResults += `**Execution ${index + 1}** (${block.language}):\n`;

            try {
                const result = await codeInterpreter.execute({
                    language: block.language,
                    code: block.code
                });

                executionResults += '```\n';
                if (result.stdout) executionResults += `stdout:\n${result.stdout}\n`;
                if (result.stderr) executionResults += `stderr:\n${result.stderr}\n`;
                executionResults += `exit_code: ${result.exitCode}\n`;
                executionResults += `duration: ${result.durationMs}ms\n`;
                executionResults += '```\n\n';

            } catch (error) {
                executionResults += `execution_error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
            }
        }

        return response + executionResults;
    }
}

// Export singleton instance
export const codingAgent = new CodingAgent();
