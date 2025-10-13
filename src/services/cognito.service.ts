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
            console.log('📋 Tenant ID from token:', payload['custom:tenant_id']);

            const userData: UserData = {
                username: payload['cognito:username'],
                email: payload.email,
                sub: payload.sub,
                tenantId: payload['custom:tenant_id'],
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
        console.log('🟣 Direct API signUp called (old method)');

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
        console.log('🟣 Direct API confirmSignUp called (old method)');

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

    // NEW: ConfirmSignUp method
    signUpV6: async (
        username: string,
        password: string,
        userAttributes: Record<string, string>
    ): Promise<{ isSignUpComplete: boolean; userId?: string; codeDeliveryDetails?: any }> => {
        console.log('🟣 Direct API signUpV6 called');
        console.log('Username:', username);
        console.log('User attributes:', userAttributes);

        try {
            // Convert user attributes object to Cognito format
            const UserAttributes = Object.entries(userAttributes).map(([key, value]) => ({
                Name: key,
                Value: value,
            }));

            console.log('📤 Sending to Cognito:', JSON.stringify({
                ClientId: COGNITO_CONFIG.clientId,
                Username: username,
                UserAttributes: UserAttributes,
            }, null, 2));

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
                    UserAttributes: UserAttributes,
                }),
            });

            const data = await response.json();

            console.log('📥 Response status:', response.status);
            console.log('📥 Full Response data:', JSON.stringify(data, null, 2));

            if (!response.ok) {
                console.error('❌ SignUp error:', data);
                const errorMessage = data.message || data.__type || 'Sign up failed';
                throw new Error(errorMessage);
            }

            console.log('✅ Sign up successful');
            console.log('📊 UserConfirmed:', data.UserConfirmed);
            console.log('📊 UserSub:', data.UserSub);
            console.log('📊 CodeDeliveryDetails:', JSON.stringify(data.CodeDeliveryDetails, null, 2));

            // Cognito returns UserConfirmed: false when email verification is required
            // Also check if CodeDeliveryDetails exists (indicates code was sent)
            const hasCodeDelivery = !!data.CodeDeliveryDetails;
            const isSignUpComplete = data.UserConfirmed === true;

            console.log('🔍 Has code delivery:', hasCodeDelivery);
            console.log('🔍 isSignUpComplete:', isSignUpComplete);

            if (isSignUpComplete && !hasCodeDelivery) {
                console.log('⚠️ WARNING: User is auto-confirmed without verification!');
                console.log('⚠️ Check your Cognito User Pool settings:');
                console.log('   - Go to AWS Cognito Console');
                console.log('   - Select your User Pool');
                console.log('   - Check "Sign-up experience" > "Attribute verification"');
                console.log('   - Ensure email verification is required');
            }

            return {
                isSignUpComplete: isSignUpComplete,
                userId: data.UserSub,
                codeDeliveryDetails: data.CodeDeliveryDetails,
            };
        } catch (error: any) {
            console.error('❌ SignUp error:', error);
            throw error;
        }
    },

    // NEW: Resend signup code
    resendSignUpCode: async (username: string): Promise<void> => {
        console.log('🟣 Direct API resendSignUpCode called');
        console.log('Username:', username);

        try {
            const response = await fetch(COGNITO_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-amz-json-1.1',
                    'X-Amz-Target': 'AWSCognitoIdentityProviderService.ResendConfirmationCode',
                },
                body: JSON.stringify({
                    ClientId: COGNITO_CONFIG.clientId,
                    Username: username,
                }),
            });

            const data = await response.json();

            console.log('📥 Response status:', response.status);

            if (!response.ok) {
                console.error('❌ Resend code error:', data);
                const errorMessage = data.message || data.__type || 'Failed to resend code';
                throw new Error(errorMessage);
            }

            console.log('✅ Code resent successfully');
            console.log('Destination:', data.CodeDeliveryDetails?.Destination);
        } catch (error: any) {
            console.error('❌ Resend code error:', error);
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
                tenantId: payload['custom:tenant_id'],
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

    forgotPassword: async (username: string): Promise<void> => {
        console.log('🟣 Direct API forgotPassword called');

        try {
            const response = await fetch(COGNITO_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-amz-json-1.1',
                    'X-Amz-Target': 'AWSCognitoIdentityProviderService.ForgotPassword',
                },
                body: JSON.stringify({
                    ClientId: COGNITO_CONFIG.clientId,
                    Username: username,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to initiate password reset');
            }

            console.log('✅ Password reset email sent');
        } catch (error: any) {
            console.error('❌ Forgot password error:', error);
            throw error;
        }
    },

    confirmPassword: async (username: string, code: string, newPassword: string): Promise<void> => {
        console.log('🟣 Direct API confirmPassword called');

        try {
            const response = await fetch(COGNITO_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-amz-json-1.1',
                    'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmForgotPassword',
                },
                body: JSON.stringify({
                    ClientId: COGNITO_CONFIG.clientId,
                    Username: username,
                    ConfirmationCode: code,
                    Password: newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to reset password');
            }

            console.log('✅ Password reset successful');
        } catch (error: any) {
            console.error('❌ Confirm password error:', error);
            throw error;
        }
    },
};