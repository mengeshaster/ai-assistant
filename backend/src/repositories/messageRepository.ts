import { DynamoDBClient, PutItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { IMessageRepository, Message } from '../types';
import { ConfigService } from '../config';

export class MessageRepository implements IMessageRepository {
    private client: DynamoDBClient;
    private tableName: string;

    constructor() {
        const config = ConfigService.getInstance();
        this.client = new DynamoDBClient({
            region: config.getAws().region
        });
        this.tableName = config.getDynamoDB().tableName;
    }

    async getMessages(conversationId: string, limit: number = 20): Promise<Message[]> {
        try {
            const response = await this.client.send(new QueryCommand({
                TableName: this.tableName,
                KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
                ExpressionAttributeValues: marshall({
                    ':pk': conversationId,
                    ':sk': 'message#'
                }),
                ScanIndexForward: false, // Most recent first
                Limit: limit
            }));

            if (!response.Items) {
                return [];
            }

            // Reverse to get chronological order
            return response.Items.map(item => unmarshall(item) as Message).reverse();
        } catch (error) {
            console.error('Error getting messages:', error);
            throw error;
        }
    }

    async addMessage(message: Message): Promise<void> {
        try {
            await this.client.send(new PutItemCommand({
                TableName: this.tableName,
                Item: marshall(message)
            }));
        } catch (error) {
            console.error('Error adding message:', error);
            throw error;
        }
    }

    async updateMessage(message: Message): Promise<void> {
        try {
            await this.client.send(new PutItemCommand({
                TableName: this.tableName,
                Item: marshall(message)
            }));
        } catch (error) {
            console.error('Error updating message:', error);
            throw error;
        }
    }
}
