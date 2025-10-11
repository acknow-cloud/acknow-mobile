import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';

export const SignupPage = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [needsConfirmation, setNeedsConfirmation] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const { signUp, confirmSignUp, isLoading } = useAuth();
    const navigation = useNavigation();

    const handleSignUp = async () => {
        setError('');
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            await signUp(username, password, email);
            setNeedsConfirmation(true);
        } catch (err: any) {
            setError(err.message || 'Failed to sign up');
        }
    };

    const handleConfirm = async () => {
        setError('');
        try {
            await confirmSignUp(username, verificationCode);
            navigation.navigate('Login' as never);
        } catch (err: any) {
            setError(err.message || 'Failed to confirm sign up');
        }
    };

    if (needsConfirmation) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Confirm Your Email</Text>
                <Text style={styles.subtitle}>
                    We sent a verification code to {email}
                </Text>

                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <TextInput
                    style={styles.input}
                    placeholder="Verification Code"
                    placeholderTextColor="#9DB8A6"
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="number-pad"
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleConfirm}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>Confirm</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create your account</Text>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#9DB8A6"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
            />

            <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9DB8A6"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9DB8A6"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#9DB8A6"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
            />

            <TouchableOpacity
                style={styles.button}
                onPress={handleSignUp}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.buttonText}>Sign up</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
                <Text style={styles.linkText}>
                    Already have an account? Sign in
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
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#9DB8A6',
        marginBottom: 24,
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