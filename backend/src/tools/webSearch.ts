import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { ConfigService } from '../config';

export interface WebSearchResult {
    title: string;
    url: string;
    snippet: string;
}

export interface WebSearchResponse {
    results: WebSearchResult[];
    query: string;
}

export class WebSearchTool {
    private config = ConfigService.getInstance();
    private secretsClient: SecretsManagerClient;

    constructor() {
        this.secretsClient = new SecretsManagerClient({
            region: this.config.getAws().region
        });
    }

    async search(query: string): Promise<WebSearchResponse> {
        try {
            // Get Bing API key from Secrets Manager
            const apiKey = await this.getBingApiKey();
            
            // Make request to Bing Search API
            const searchUrl = new URL(this.config.getWebSearch().bingEndpoint);
            searchUrl.searchParams.set('q', query);
            searchUrl.searchParams.set('count', '5');
            searchUrl.searchParams.set('offset', '0');
            searchUrl.searchParams.set('mkt', 'en-US');
            searchUrl.searchParams.set('safeSearch', 'Moderate');

            const response = await fetch(searchUrl.toString(), {
                method: 'GET',
                headers: {
                    'Ocp-Apim-Subscription-Key': apiKey,
                    'User-Agent': 'AI-Assistant/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`Bing API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Extract top 5 results
            const results: WebSearchResult[] = (data.webPages?.value || [])
                .slice(0, 5)
                .map((item: any) => ({
                    title: item.name || 'No title',
                    url: item.url || '',
                    snippet: item.snippet || 'No description available'
                }));

            return {
                query,
                results
            };

        } catch (error) {
            console.error('WebSearch error:', error);
            // Return empty results on error rather than throwing
            return {
                query,
                results: []
            };
        }
    }

    private async getBingApiKey(): Promise<string> {
        try {
            const command = new GetSecretValueCommand({
                SecretId: this.config.getWebSearch().bingSecretName
            });
            
            const response = await this.secretsClient.send(command);
            
            if (!response.SecretString) {
                throw new Error('Secret value is empty');
            }
            
            // Secret might be JSON or plain string
            try {
                const secretObj = JSON.parse(response.SecretString);
                return secretObj.apiKey || secretObj.key || response.SecretString;
            } catch {
                // Assume it's a plain string
                return response.SecretString;
            }
            
        } catch (error) {
            console.error('Failed to retrieve Bing API key from Secrets Manager:', error);
            throw new Error('Unable to retrieve search API credentials');
        }
    }
}

// Export singleton instance
export const webSearch = new WebSearchTool();
