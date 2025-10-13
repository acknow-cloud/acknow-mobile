import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { signIn, isLoading } = useAuth();
    const navigation = useNavigation();

    const handleSubmit = async () => {
        console.log('🔵 Sign in button clicked');
        console.log('Email:', email);
        console.log('Password length:', password.length);

        setError('');

        // Validation
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        try {
            console.log('🔵 Calling signIn...');
            await signIn(email, password);
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
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="shield-checkmark" size={48} color="#10b981" />
                    </View>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>
                        Sign in to your alert monitoring dashboard
                    </Text>
                </View>

                {error && (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={20} color="#ef4444" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color="#6b7f72" style={styles.inputIcon} />
                        <TextInput
                            style={styles.inputWithIcon}
                            placeholder="Email Address"
                            placeholderTextColor="#6b7f72"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#6b7f72" style={styles.inputIcon} />
                        <TextInput
                            style={styles.inputWithIcon}
                            placeholder="Password"
                            placeholderTextColor="#6b7f72"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity style={styles.forgotPassword}>
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleSubmit}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name="log-in" size={20} color="#FFFFFF" />
                            <Text style={styles.buttonText}>Sign In</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('Signup' as never)}
                    style={styles.linkButton}
                >
                    <Text style={styles.linkText}>
                        Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111813',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 40,
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#10b98120',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 15,
        color: '#6b7f72',
        textAlign: 'center',
        lineHeight: 22,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ef444415',
        padding: 14,
        borderRadius: 12,
        marginBottom: 24,
        gap: 10,
        borderWidth: 1,
        borderColor: '#ef444440',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        flex: 1,
        fontWeight: '500',
    },
    form: {
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1c261f',
        borderWidth: 1,
        borderColor: '#2d3a32',
        borderRadius: 12,
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    inputWithIcon: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 15,
        color: '#FFFFFF',
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginTop: 8,
    },
    forgotPasswordText: {
        color: '#10b981',
        fontSize: 14,
        fontWeight: '600',
    },
    button: {
        flexDirection: 'row',
        backgroundColor: '#10b981',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    linkButton: {
        marginTop: 24,
        padding: 12,
    },
    linkText: {
        color: '#6b7f72',
        fontSize: 15,
        textAlign: 'center',
        fontWeight: '500',
    },
    linkTextBold: {
        color: '#10b981',
        fontWeight: '700',
    },
});