import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

const COGNITO_CONFIG = {
    region: 'eu-central-1',
    userPoolId: 'eu-central-1_YUZkplLQe',
    clientId: '56soajmosv4j6srjrp2o27km5t',
};

const COGNITO_ENDPOINT = `https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`;

export interface UserData {
    username: string;
    email: string;
    sub: string;
    tenantId?: string;
    name?: string;
    attributes?: any;
}

export const cognitoService = {
    signIn: async (username: string, password: string): Promise<UserData> => {
        console.log('🟣 Direct Cognito API signIn called');
        console.log('Username:', username);

        try {
            const response = await fetch(COGNITO_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-amz-json-1.1',
                    'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
                },
                body: JSON.stringify({
                    AuthFlow: 'USER_PASSWORD_AUTH',
                    ClientId: COGNITO_CONFIG.clientId,
                    AuthParameters: {
                        USERNAME: username,
                        PASSWORD: password,
                    },
                }),
            });

            const data = await response.json();

            console.log('📥 Response status:', response.status);

            if (!response.ok) {
                console.error('❌ Cognito error:', data);
                const errorMessage = data.message || data.__type || 'Authentication failed';
                throw new Error(errorMessage);
            }

            console.log('✅ Got authentication response');

            const idToken = data.AuthenticationResult.IdToken;
            const accessToken = data.AuthenticationResult.AccessToken;
            const refreshToken = data.AuthenticationResult.RefreshToken;

            // Decode ID token (base64)
            const base64Payload = idToken.split('.')[1];
            const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());

            console.log('✅ Token decoded');
            console.log('📋 Tenant ID from token:', payload['custom:tenant_id']); // Debug log

            const userData: UserData = {
                username: payload['cognito:username'],
                email: payload.email,
                sub: payload.sub,
                tenantId: payload['custom:tenant_id'], // ✅ Fixed: underscore instead of camelCase
                name: payload.name,
                attributes: payload,
            };

            // Store tokens
            await AsyncStorage.setItem('idToken', idToken);
            await AsyncStorage.setItem('accessToken', accessToken);
            await AsyncStorage.setItem('refreshToken', refreshToken);
            await AsyncStorage.setItem('username', username);

            if (userData.tenantId) {
                await AsyncStorage.setItem('tenantId', userData.tenantId);
                console.log('✅ Tenant ID stored:', userData.tenantId);
            } else {
                console.warn('⚠️ No tenant ID found in token');
            }

            console.log('✅ Sign in complete!');
            return userData;
        } catch (error: any) {
            console.error('❌ Direct API error:', error);
            console.error('Error message:', error.message);
            throw error;
        }
    },

    signUp: async (username: string, password: string, email: string): Promise<any> => {
        console.log('🟣 Direct API signUp called');

        try {
            const response = await fetch(COGNITO_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-amz-json-1.1',
                    'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp',
                },
                body: JSON.stringify({
                    ClientId: COGNITO_CONFIG.clientId,
                    Username: username,
                    Password: password,
                    UserAttributes: [
                        { Name: 'email', Value: email },
                    ],
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('❌ SignUp error:', data);
                throw new Error(data.message || 'Sign up failed');
            }

            console.log('✅ Sign up successful');
            return data;
        } catch (error: any) {
            console.error('❌ SignUp error:', error);
            throw error;
        }
    },

    confirmSignUp: async (username: string, code: string): Promise<any> => {
        console.log('🟣 Direct API confirmSignUp called');

        try {
            const response = await fetch(COGNITO_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-amz-json-1.1',
                    'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmSignUp',
                },
                body: JSON.stringify({
                    ClientId: COGNITO_CONFIG.clientId,
                    Username: username,
                    ConfirmationCode: code,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Confirmation failed');
            }

            return data;
        } catch (error: any) {
            console.error('❌ ConfirmSignUp error:', error);
            throw error;
        }
    },

    getCurrentUser: async (): Promise<UserData | null> => {
        try {
            const idToken = await AsyncStorage.getItem('idToken');
            if (!idToken) return null;

            // Decode token
            const base64Payload = idToken.split('.')[1];
            const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());

            // Check if token expired
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                console.log('Token expired');
                return null;
            }

            return {
                username: payload['cognito:username'],
                email: payload.email,
                sub: payload.sub,
                tenantId: payload['custom:tenant_id'], // ✅ Fixed: underscore
                name: payload.name,
                attributes: payload,
            };
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    },

    signOut: async (): Promise<void> => {
        console.log('🟣 Signing out');
        await AsyncStorage.multiRemove([
            'accessToken',
            'idToken',
            'refreshToken',
            'username',
            'tenantId'
        ]);
    },

    getIdToken: async (): Promise<string | null> => {
        return await AsyncStorage.getItem('idToken');
    },

    getTenantId: async (): Promise<string | null> => {
        return await AsyncStorage.getItem('tenantId');
    },
};