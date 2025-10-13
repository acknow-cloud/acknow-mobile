// ⚠️ FIRST LINE - Import polyfills
import './src/polyfills';

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LoginPage } from './src/components/auth/LoginPage';
import { SignupPage } from './src/components/auth/SignupPage';
import DashboardScreen from './src/pages/DashboardPage';
import OnCallPage from "./src/pages/OnCallPage";

import { ActivityIndicator, View } from 'react-native';

console.log('✅ Polyfills loaded');

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
    const { isAuthenticated, initialAuthCheckComplete } = useAuth();

    // Show loading ONLY while checking for existing session on app startup
    // After initial check completes, never show this loading screen again
    if (!initialAuthCheckComplete) {
        console.log('⏳ Waiting for initial auth check...');
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F1612' }}>
                <ActivityIndicator size="large" color="#14B84B" />
            </View>
        );
    }

    console.log('✅ Initial auth check complete, rendering navigation');

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
                <Stack.Screen name="OnCall" component={OnCallPage} />
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