// Configuration management
export interface Config {
    aws: {
        region: string;
        bedrockRegion: string;
        bedrockModelId: string;
    };
    cognito: {
        userPoolId: string;
        clientId: string;
        clientSecret: string;
    };
    dynamodb: {
        tableName: string;
    };
    webSearch: {
        bingEndpoint: string;
        bingSecretName: string;
    };
    lambda: {
        codeExecFunction: string;
    };
}

class ConfigService {
    private static instance: ConfigService;
    private config: Config;

    private constructor() {
        this.validateEnvironment();
        this.config = this.loadConfig();
    }

    public static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    private validateEnvironment(): void {
        const required = [
            'BEDROCK_REGION',
            'BEDROCK_MODEL_ID',
            'COGNITO_USER_POOL_ID',
            'COGNITO_APP_CLIENT_ID',
            'COGNITO_APP_CLIENT_SECRET',
            'TABLE_NAME'
        ];

        const missing = required.filter(key => !process.env[key]);
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    private loadConfig(): Config {
        return {
            aws: {
                region: process.env.AWS_REGION || 'eu-north-1', // Default to Lambda region
                bedrockRegion: process.env.BEDROCK_REGION!,
                bedrockModelId: process.env.BEDROCK_MODEL_ID!,
            },
            cognito: {
                userPoolId: process.env.COGNITO_USER_POOL_ID!,
                clientId: process.env.COGNITO_APP_CLIENT_ID!,
                clientSecret: process.env.COGNITO_APP_CLIENT_SECRET!,
            },
            dynamodb: {
                tableName: process.env.TABLE_NAME!,
            },
            webSearch: {
                bingEndpoint: process.env.WEBSEARCH_BING_ENDPOINT!,
                bingSecretName: process.env.WEBSEARCH_BING_SECRET_NAME!,
            },
            lambda: {
                codeExecFunction: process.env.CODE_EXEC_FUNCTION!,
            },
        };
    }

    public get(): Config {
        return this.config;
    }

    public getAws() {
        return this.config.aws;
    }

    public getCognito() {
        return this.config.cognito;
    }

    public getDynamoDB() {
        return this.config.dynamodb;
    }

    public getWebSearch() {
        return this.config.webSearch;
    }

    public getLambda() {
        return this.config.lambda;
    }
}

export const config = ConfigService.getInstance();
export { ConfigService };
