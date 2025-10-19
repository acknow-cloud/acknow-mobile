import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message?: string;
    buttons: AlertButton[];
    onDismiss?: () => void;
    icon?: 'alert-circle' | 'trash' | 'create' | 'information-circle' | 'warning';
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
                                                            visible,
                                                            title,
                                                            message,
                                                            buttons,
                                                            onDismiss,
                                                            icon = 'information-circle',
                                                        }) => {
    const handleButtonPress = (button: AlertButton) => {
        if (button.onPress) {
            button.onPress();
        }
        if (onDismiss) {
            onDismiss();
        }
    };

    const getIconColor = () => {
        switch (icon) {
            case 'alert-circle':
            case 'warning':
                return '#f59e0b';
            case 'trash':
                return '#ef4444';
            case 'create':
                return '#3b82f6';
            default:
                return '#10b981';
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onDismiss}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={styles.alertContainer}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}20` }]}>
                        <Ionicons name={icon} size={32} color={getIconColor()} />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>{title}</Text>

                    {/* Message */}
                    {message && <Text style={styles.message}>{message}</Text>}

                    {/* Buttons */}
                    <View style={styles.buttonsContainer}>
                        {buttons.map((button, index) => {
                            const isCancel = button.style === 'cancel';
                            const isDestructive = button.style === 'destructive';

                            return (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handleButtonPress(button)}
                                    style={[
                                        styles.button,
                                        buttons.length === 1 && styles.buttonSingle,
                                        isCancel && styles.buttonCancel,
                                        isDestructive && styles.buttonDestructive,
                                        !isCancel && !isDestructive && styles.buttonDefault,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.buttonText,
                                            isCancel && styles.buttonTextCancel,
                                            isDestructive && styles.buttonTextDestructive,
                                            !isCancel && !isDestructive && styles.buttonTextDefault,
                                        ]}
                                    >
                                        {button.text}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    alertContainer: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#0f1612',
        borderRadius: 20,
        padding: 24,
        borderWidth: 2,
        borderColor: '#2d3a32',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 15,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    buttonsContainer: {
        gap: 12,
    },
    button: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    buttonSingle: {
        marginTop: 8,
    },
    buttonCancel: {
        backgroundColor: '#243126',
        borderColor: '#2d3a32',
    },
    buttonDestructive: {
        backgroundColor: '#ef444410',
        borderColor: '#ef4444',
    },
    buttonDefault: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    buttonTextCancel: {
        color: '#6b7f72',
    },
    buttonTextDestructive: {
        color: '#ef4444',
    },
    buttonTextDefault: {
        color: '#FFFFFF',
    },
});