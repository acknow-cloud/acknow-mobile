// ⚠️ FIRST LINE - Import polyfills
import './src/polyfills';

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LoginPage } from './src/components/auth/LoginPage';
import { SignupPage } from './src/components/auth/SignupPage';
import DashboardScreen from './src/pages/DashboardPage';

import { ActivityIndicator, View } from 'react-native';

console.log('✅ Polyfills loaded');

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F1612' }}>
                <ActivityIndicator size="large" color="#14B84B" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? (
                    <Stack.Screen name="Dashboard" component={DashboardScreen} />
                ) : (
                    <>
                        <Stack.Screen name="Login" component={LoginPage} />
                        <Stack.Screen name="Signup" component={SignupPage} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default function App() {
    return (
        <AuthProvider>
            <AppNavigator />
        </AuthProvider>
    );
}