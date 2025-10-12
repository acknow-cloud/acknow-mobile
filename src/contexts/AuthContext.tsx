import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { cognitoService, UserData } from '../services/cognito.service';
interface SignUpResult {
    isSignUpComplete: boolean;
    userId?: string;
    codeDeliveryDetails?: any;  // Add this line
}
interface SignUpParams {
    username: string;
    password: string;
    options?: {
        userAttributes?: {
            email?: string;
            name?: string;
            family_name?: string;
            phone_number?: string;
            'custom:tenant_id'?: string;
        };
    };
}

interface ConfirmSignUpParams {
    username: string;
    confirmationCode: string;
}

interface ResendSignUpCodeParams {
    username: string;
}


interface AuthContextType {
    user: UserData | null;
    tenantId: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: (username: string, password: string) => Promise<void>;
    signUp: (params: SignUpParams) => Promise<SignUpResult>;
    confirmSignUp: (params: ConfirmSignUpParams) => Promise<void>;
    resendSignUpCode: (params: ResendSignUpCodeParams) => Promise<void>;
    signOut: () => Promise<void>;
    forgotPassword: (username: string) => Promise<void>;
    confirmPassword: (username: string, code: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserData | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const currentUser = await cognitoService.getCurrentUser();
            if (currentUser) {
                setUser(currentUser);
                setTenantId(currentUser.tenantId || null);
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error('Error loading user:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const signIn = async (username: string, password: string) => {
        console.log('🟢 AuthContext.signIn called');
        setIsLoading(true);

        try {
            console.log('🟢 Calling cognitoService.signIn');
            const userData = await cognitoService.signIn(username, password);
            console.log('🟢 Got user data:', userData);

            setUser(userData);
            setTenantId(userData.tenantId || null);
            setIsAuthenticated(true);
            console.log('✅ Auth state updated');
        } catch (error) {
            console.error('❌ AuthContext signIn error:', error);
            throw error;
        } finally {
            setIsLoading(false);
            console.log('🟢 Loading set to false');
        }
    };

    const signUp = async (params: SignUpParams): Promise<SignUpResult> => {
        setIsLoading(true);
        try {
            console.log('🟢 AuthContext.signUp called with params:', {
                username: params.username,
                hasPassword: !!params.password,
                attributes: params.options?.userAttributes,
            });

            // Call the cognito service with the new format
            const result = await cognitoService.signUpV6(
                params.username,
                params.password,
                params.options?.userAttributes || {}
            );

            console.log('✅ SignUp result from service:', JSON.stringify(result, null, 2));

            // Return the full result including codeDeliveryDetails
            return {
                isSignUpComplete: result.isSignUpComplete,
                userId: result.userId,
                codeDeliveryDetails: result.codeDeliveryDetails,
            };
        } catch (error) {
            console.error('❌ AuthContext signUp error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const confirmSignUp = async (params: ConfirmSignUpParams) => {
        setIsLoading(true);
        try {
            console.log('🟢 AuthContext.confirmSignUp called');
            await cognitoService.confirmSignUpV6(params.username, params.confirmationCode);
            console.log('✅ Confirmation successful');
        } catch (error) {
            console.error('❌ AuthContext confirmSignUp error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const resendSignUpCode = async (params: ResendSignUpCodeParams) => {
        try {
            console.log('🟢 AuthContext.resendSignUpCode called');
            await cognitoService.resendSignUpCode(params.username);
            console.log('✅ Code resent successfully');
        } catch (error) {
            console.error('❌ AuthContext resendSignUpCode error:', error);
            throw error;
        }
    };

    const signOut = async () => {
        setIsLoading(true);
        try {
            await cognitoService.signOut();
            setUser(null);
            setTenantId(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    const forgotPassword = async (username: string) => {
        await cognitoService.forgotPassword(username);
    };

    const confirmPassword = async (username: string, code: string, newPassword: string) => {
        await cognitoService.confirmPassword(username, code, newPassword);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                tenantId,
                isLoading,
                isAuthenticated,
                signIn,
                signUp,
                confirmSignUp,
                resendSignUpCode,
                signOut,
                forgotPassword,
                confirmPassword,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};