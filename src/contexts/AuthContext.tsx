import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { cognitoService, UserData } from '../services/cognito.service';

interface AuthContextType {
    user: UserData | null;
    tenantId: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: (username: string, password: string) => Promise<void>;
    signUp: (username: string, password: string, email: string) => Promise<void>;
    confirmSignUp: (username: string, code: string) => Promise<void>;
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

    const signUp = async (username: string, password: string, email: string) => {
        setIsLoading(true);
        try {
            await cognitoService.signUp(username, password, email);
        } finally {
            setIsLoading(false);
        }
    };

    const confirmSignUp = async (username: string, code: string) => {
        setIsLoading(true);
        try {
            await cognitoService.confirmSignUp(username, code);
        } finally {
            setIsLoading(false);
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