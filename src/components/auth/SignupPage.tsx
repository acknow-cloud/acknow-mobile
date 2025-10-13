import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

// Simple nanoid alternative for React Native
const generateTenantId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const SignupPage = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        family_name: '',
        phone_number: '',
    });
    const [confirmationCode, setConfirmationCode] = useState('');
    const [error, setError] = useState('');
    const [mode, setMode] = useState<'signup' | 'confirm'>('signup');
    const [isSubmitting, setIsSubmitting] = useState(false); // NEW: Local loading state
    const { signUp, confirmSignUp, resendSignUpCode, isLoading } = useAuth();
    const navigation = useNavigation();

    // Password strength checker
    const getPasswordStrength = () => {
        const pwd = formData.password;
        let strength = 0;
        const checks = {
            length: pwd.length >= 8,
            uppercase: /[A-Z]/.test(pwd),
            lowercase: /[a-z]/.test(pwd),
            number: /[0-9]/.test(pwd),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
        };

        if (checks.length) strength++;
        if (checks.uppercase) strength++;
        if (checks.lowercase) strength++;
        if (checks.number) strength++;
        if (checks.special) strength++;

        return { strength, checks };
    };

    const passwordStrength = getPasswordStrength();

    // Debug mode changes
    React.useEffect(() => {
        console.log('📍 Current mode:', mode);
    }, [mode]);

    // Replace the handleSignUp function with this heavily logged version

    const handleSignUp = async () => {
        console.log('🟡 handleSignUp START');
        setError('');
        setIsSubmitting(true); // Set local loading

        // Validation
        if (!formData.email || !formData.password || !formData.name || !formData.phone_number) {
            setError('Please fill in all required fields');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }

        // Phone validation
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        let phone = formData.phone_number.trim().replace(/[\s\-()]/g, '');

        if (!phone.startsWith('+')) {
            phone = '+' + phone;
        }

        if (!phoneRegex.test(phone)) {
            setError('Please enter a valid phone number with country code (e.g., +12025551234)');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Enhanced password validation
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (!/[A-Z]/.test(formData.password)) {
            setError('Password must contain at least one uppercase letter');
            return;
        }

        if (!/[a-z]/.test(formData.password)) {
            setError('Password must contain at least one lowercase letter');
            return;
        }

        if (!/[0-9]/.test(formData.password)) {
            setError('Password must contain at least one number');
            return;
        }

        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
            setError('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>?/)');
            return;
        }

        const tenantId = generateTenantId();

        try {
            console.log('🟡 Starting signup try block');

            const userAttributes: Record<string, string> = {
                email: formData.email.trim().toLowerCase(),
                name: formData.name.trim(),
                phone_number: phone,
                'custom:tenant_id': tenantId,
            };

            if (formData.family_name && formData.family_name.trim()) {
                userAttributes.family_name = formData.family_name.trim();
            }

            console.log('📤 Attempting signup');

            const result = await signUp({
                username: formData.email.trim().toLowerCase(),
                password: formData.password,
                options: { userAttributes },
            });

            console.log('✅ Signup result:', JSON.stringify(result, null, 2));
            console.log('📊 isSignUpComplete:', result.isSignUpComplete);

            if (!result.isSignUpComplete) {
                console.log('🔄 Email confirmation required - Moving to confirmation mode');
                setMode('confirm');
                console.log('✅ Mode set to confirm');
                return;
            } else {
                console.log('⚠️ WARNING: isSignUpComplete is TRUE - Auto-confirmed');
                navigation.navigate('Login' as never);
            }
        } catch (err: any) {
            console.error('❌ Sign up error:', err);
            setError(err.message || 'Failed to sign up');
        } finally {
            setIsSubmitting(false); // Clear local loading
            console.log('🟡 handleSignUp END');
        }
    };

    const handleConfirmSignUp = async () => {
        setError('');

        if (!confirmationCode) {
            setError('Please enter the confirmation code');
            return;
        }

        console.log('🔵 Confirming signup for:', formData.email);

        try {
            await confirmSignUp({
                username: formData.email.trim().toLowerCase(),
                confirmationCode: confirmationCode,
            });

            console.log('✅ Confirmation successful, navigating to login');
            navigation.navigate('Login' as never);
        } catch (err: any) {
            console.error('Confirmation error:', err);
            setError(err.message || 'Confirmation failed');
        }
    };
    const handleResendCode = async () => {
        try {
            await resendSignUpCode({ username: formData.email });
            setError(''); // Clear any existing errors
            // Show success message
            setTimeout(() => setError('Confirmation code resent to your email'), 100);
        } catch (err: any) {
            console.error('Resend code error:', err);
            setError(err.message || 'Failed to resend code');
        }
    };

    if (mode === 'confirm') {
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
                            <Ionicons name="mail-outline" size={48} color="#10b981" />
                        </View>
                        <Text style={styles.title}>Confirm Your Email</Text>
                        <Text style={styles.subtitle}>
                            We sent a verification code to{'\n'}
                            <Text style={styles.emailText}>{formData.email}</Text>
                        </Text>
                    </View>

                    {error && (
                        <View style={[
                            styles.errorContainer,
                            error.includes('resent') && styles.successContainer
                        ]}>
                            <Ionicons
                                name={error.includes('resent') ? 'checkmark-circle' : 'alert-circle'}
                                size={20}
                                color={error.includes('resent') ? '#10b981' : '#ef4444'}
                            />
                            <Text style={[
                                styles.errorText,
                                error.includes('resent') && styles.successText
                            ]}>{error}</Text>
                        </View>
                    )}

                    <TextInput
                        style={styles.input}
                        placeholder="Verification Code"
                        placeholderTextColor="#6b7f72"
                        value={confirmationCode}
                        onChangeText={setConfirmationCode}
                        keyboardType="number-pad"
                        autoFocus
                    />

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleConfirmSignUp}
                        disabled={isLoading} // This uses AuthContext isLoading (for confirmSignUp)
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                                <Text style={styles.buttonText}>Confirm Account</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.resendButton}
                        onPress={handleResendCode}
                        disabled={isLoading}
                    >
                        <Ionicons name="refresh" size={16} color="#10b981" />
                        <Text style={styles.resendText}>Resend Code</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setMode('signup')}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={16} color="#6b7f72" />
                        <Text style={styles.backText}>Back to Sign Up</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

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
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>
                        Sign up to get started with alert monitoring{'\n'}
                        <Text style={styles.requiredNote}>* Required fields</Text>
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
                        <Ionicons name="person-outline" size={20} color="#6b7f72" style={styles.inputIcon} />
                        <TextInput
                            style={styles.inputWithIcon}
                            placeholder="First Name *"
                            placeholderTextColor="#6b7f72"
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color="#6b7f72" style={styles.inputIcon} />
                        <TextInput
                            style={styles.inputWithIcon}
                            placeholder="Last Name"
                            placeholderTextColor="#6b7f72"
                            value={formData.family_name}
                            onChangeText={(text) => setFormData({ ...formData, family_name: text })}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color="#6b7f72" style={styles.inputIcon} />
                        <TextInput
                            style={styles.inputWithIcon}
                            placeholder="Email Address *"
                            placeholderTextColor="#6b7f72"
                            value={formData.email}
                            onChangeText={(text) => setFormData({ ...formData, email: text.trim().toLowerCase() })}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="call-outline" size={20} color="#6b7f72" style={styles.inputIcon} />
                        <TextInput
                            style={styles.inputWithIcon}
                            placeholder="Phone Number * (e.g., +12025551234)"
                            placeholderTextColor="#6b7f72"
                            value={formData.phone_number}
                            onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <Text style={styles.phoneHint}>
                        Include country code with '+' (e.g., +1 for USA, +44 for UK)
                    </Text>

                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#6b7f72" style={styles.inputIcon} />
                        <TextInput
                            style={styles.inputWithIcon}
                            placeholder="Password *"
                            placeholderTextColor="#6b7f72"
                            value={formData.password}
                            onChangeText={(text) => setFormData({ ...formData, password: text })}
                            secureTextEntry
                        />
                    </View>

                    {/* Password Strength Indicator */}
                    {formData.password.length > 0 && (
                        <View style={styles.passwordStrength}>
                            <View style={styles.strengthBars}>
                                {[1, 2, 3, 4, 5].map((bar) => (
                                    <View
                                        key={bar}
                                        style={[
                                            styles.strengthBar,
                                            bar <= passwordStrength.strength && styles.strengthBarActive,
                                            passwordStrength.strength >= 5 && styles.strengthBarStrong,
                                        ]}
                                    />
                                ))}
                            </View>
                            <View style={styles.passwordChecks}>
                                <View style={styles.checkItem}>
                                    <Ionicons
                                        name={passwordStrength.checks.length ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={16}
                                        color={passwordStrength.checks.length ? '#10b981' : '#6b7f72'}
                                    />
                                    <Text style={[styles.checkText, passwordStrength.checks.length && styles.checkTextValid]}>
                                        8+ characters
                                    </Text>
                                </View>
                                <View style={styles.checkItem}>
                                    <Ionicons
                                        name={passwordStrength.checks.uppercase ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={16}
                                        color={passwordStrength.checks.uppercase ? '#10b981' : '#6b7f72'}
                                    />
                                    <Text style={[styles.checkText, passwordStrength.checks.uppercase && styles.checkTextValid]}>
                                        Uppercase
                                    </Text>
                                </View>
                                <View style={styles.checkItem}>
                                    <Ionicons
                                        name={passwordStrength.checks.lowercase ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={16}
                                        color={passwordStrength.checks.lowercase ? '#10b981' : '#6b7f72'}
                                    />
                                    <Text style={[styles.checkText, passwordStrength.checks.lowercase && styles.checkTextValid]}>
                                        Lowercase
                                    </Text>
                                </View>
                                <View style={styles.checkItem}>
                                    <Ionicons
                                        name={passwordStrength.checks.number ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={16}
                                        color={passwordStrength.checks.number ? '#10b981' : '#6b7f72'}
                                    />
                                    <Text style={[styles.checkText, passwordStrength.checks.number && styles.checkTextValid]}>
                                        Number
                                    </Text>
                                </View>
                                <View style={styles.checkItem}>
                                    <Ionicons
                                        name={passwordStrength.checks.special ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={16}
                                        color={passwordStrength.checks.special ? '#10b981' : '#6b7f72'}
                                    />
                                    <Text style={[styles.checkText, passwordStrength.checks.special && styles.checkTextValid]}>
                                        Special (!@#$...)
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#6b7f72" style={styles.inputIcon} />
                        <TextInput
                            style={styles.inputWithIcon}
                            placeholder="Confirm Password *"
                            placeholderTextColor="#6b7f72"
                            value={formData.confirmPassword}
                            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                            secureTextEntry
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleSignUp}
                    disabled={isSubmitting} // Use local loading state
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name="person-add" size={20} color="#FFFFFF" />
                            <Text style={styles.buttonText}>Create Account</Text>
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Login' as never)}
                    style={styles.linkButton}
                >
                    <Text style={styles.linkText}>
                        Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
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
        marginBottom: 32,
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
        paddingTop:50,
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
    requiredNote: {
        fontSize: 13,
        color: '#10b981',
        fontWeight: '600',
    },
    emailText: {
        color: '#10b981',
        fontWeight: '600',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ef444415',
        padding: 14,
        borderRadius: 12,
        marginBottom: 20,
        gap: 10,
        borderWidth: 1,
        borderColor: '#ef444440',
    },
    successContainer: {
        backgroundColor: '#10b98115',
        borderColor: '#10b98140',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        flex: 1,
        fontWeight: '500',
    },
    successText: {
        color: '#10b981',
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
        marginBottom: 14,
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
    passwordStrength: {
        marginTop: -8,
        marginBottom: 16,
        backgroundColor: '#1c261f',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2d3a32',
    },
    strengthBars: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        backgroundColor: '#2d3a32',
        borderRadius: 2,
    },
    strengthBarActive: {
        backgroundColor: '#f59e0b',
    },
    strengthBarStrong: {
        backgroundColor: '#10b981',
    },
    passwordChecks: {
        gap: 8,
    },
    checkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    checkText: {
        fontSize: 13,
        color: '#6b7f72',
        fontWeight: '500',
    },
    checkTextValid: {
        color: '#10b981',
    },
    phoneHint: {
        fontSize: 12,
        color: '#6b7f72',
        marginTop: -8,
        marginBottom: 12,
        fontWeight: '500',
        fontStyle: 'italic',
    },
    input: {
        backgroundColor: '#1c261f',
        borderWidth: 1,
        borderColor: '#2d3a32',
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: '#FFFFFF',
        marginBottom: 20,
        textAlign: 'center',
        fontWeight: '600',
        letterSpacing: 2,
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
    resendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
        padding: 12,
    },
    resendText: {
        color: '#10b981',
        fontSize: 15,
        fontWeight: '600',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
        padding: 12,
    },
    backText: {
        color: '#6b7f72',
        fontSize: 14,
        fontWeight: '500',
    },
    linkButton: {
        marginTop: 20,
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