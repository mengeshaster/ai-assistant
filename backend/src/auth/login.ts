import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'crypto';

const client = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID!;
const CLIENT_SECRET = process.env.COGNITO_APP_CLIENT_SECRET!;

function generateSecretHash(username: string, clientId: string, clientSecret: string): string {
    return createHmac('SHA256', clientSecret)
        .update(username + clientId)
        .digest('base64');
}

export async function handler(event: any) {
    const { email, password } = JSON.parse(event.body);
    const secretHash = generateSecretHash(email, CLIENT_ID, CLIENT_SECRET);

    const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
            SECRET_HASH: secretHash,
        },
    });
    const res = await client.send(command);
    if (!res.AuthenticationResult) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Invalid credentials' }),
        };
    }
    return {
        statusCode: 200,
        body: JSON.stringify({
            idToken: res.AuthenticationResult.IdToken,
            accessToken: res.AuthenticationResult.AccessToken,
            refreshToken: res.AuthenticationResult.RefreshToken,
        }),
    };
}
