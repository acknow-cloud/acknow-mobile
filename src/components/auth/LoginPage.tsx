import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { signIn, isLoading } = useAuth();
    const navigation = useNavigation();

    const handleSubmit = async () => {
        console.log('🔵 Sign in button clicked');
        console.log('Username:', username);
        console.log('Password length:', password.length);

        setError('');

        try {
            console.log('🔵 Calling signIn...');
            await signIn(username, password);
            console.log('✅ Sign in successful!');
            // Navigation happens automatically
        } catch (err: any) {
            console.error('❌ Sign in error:', err);
            console.error('Error message:', err.message);
            console.error('Error code:', err.code);
            setError(err.message || 'Failed to sign in');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sign in to your account</Text>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <TextInput
                style={styles.input}
                placeholder="Username or Email"
                placeholderTextColor="#9DB8A6"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9DB8A6"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity
                style={styles.button}
                onPress={handleSubmit}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.buttonText}>Sign in</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Signup' as never)}>
                <Text style={styles.linkText}>
                    Don't have an account? Sign up
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F1612',
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 40,
        textAlign: 'center',
    },
    errorContainer: {
        backgroundColor: '#EF444420',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
    },
    input: {
        backgroundColor: '#1C261F',
        borderWidth: 1,
        borderColor: '#3C5344',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        fontSize: 16,
        color: '#FFFFFF',
    },
    button: {
        backgroundColor: '#14B84B',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    linkText: {
        color: '#14B84B',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 16,
    },
});