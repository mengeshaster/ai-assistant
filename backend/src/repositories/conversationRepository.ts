import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { IConversationRepository, Conversation } from '../types';
import { ConfigService } from '../config';

export class ConversationRepository implements IConversationRepository {
    private client: DynamoDBClient;
    private tableName: string;

    constructor() {
        const config = ConfigService.getInstance();
        this.client = new DynamoDBClient({
            region: config.getAws().region
        });
        this.tableName = config.getDynamoDB().tableName;
    }

    async getConversation(userId: string, conversationId: string): Promise<Conversation | null> {
        try {
            const response = await this.client.send(new GetItemCommand({
                TableName: this.tableName,
                Key: marshall({
                    pk: `user#${userId}`,
                    sk: `conversation#${conversationId}`
                })
            }));

            if (!response.Item) {
                return null;
            }

            return unmarshall(response.Item) as Conversation;
        } catch (error) {
            console.error('Error getting conversation:', error);
            throw error;
        }
    }

    async createConversation(conversation: Conversation): Promise<void> {
        try {
            await this.client.send(new PutItemCommand({
                TableName: this.tableName,
                Item: marshall(conversation),
                ConditionExpression: 'attribute_not_exists(pk)'
            }));
        } catch (error) {
            console.error('Error creating conversation:', error);
            throw error;
        }
    }

    async updateConversation(conversation: Conversation): Promise<void> {
        try {
            await this.client.send(new PutItemCommand({
                TableName: this.tableName,
                Item: marshall(conversation)
            }));
        } catch (error) {
            console.error('Error updating conversation:', error);
            throw error;
        }
    }

    async getUserConversations(userId: string): Promise<Conversation[]> {
        try {
            const response = await this.client.send(new QueryCommand({
                TableName: this.tableName,
                KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
                ExpressionAttributeValues: marshall({
                    ':pk': `user#${userId}`,
                    ':sk': 'conversation#'
                }),
                ScanIndexForward: false // Latest conversations first
            }));

            if (!response.Items) {
                return [];
            }

            return response.Items.map(item => unmarshall(item) as Conversation);
        } catch (error) {
            console.error('Error getting user conversations:', error);
            throw error;
        }
    }
}
