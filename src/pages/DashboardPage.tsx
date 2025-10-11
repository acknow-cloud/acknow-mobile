import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const DashboardScreen = () => {
    const { user, tenantId, signOut } = useAuth();

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Dashboard</Text>
                    <Text style={styles.subtitle}>Welcome back!</Text>
                </View>
                <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>

            {/* User Info */}
            <ScrollView style={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>👤 User Information</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Email:</Text>
                        <Text style={styles.value}>{user?.email}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Name:</Text>
                        <Text style={styles.value}>{user?.name || 'Not set'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Tenant ID:</Text>
                        <Text style={styles.value}>{tenantId || 'Not set'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>User ID:</Text>
                        <Text style={styles.valueSmall}>{user?.sub}</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>🎉 Authentication Successful!</Text>
                    <Text style={styles.successText}>
                        You are now signed in with AWS Cognito.
                    </Text>
                    <Text style={styles.successText}>
                        Your web and mobile apps share the same user account!
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F1612',
    },
    header: {
        backgroundColor: '#1C261F',
        padding: 20,
        paddingTop: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#3C5344',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    subtitle: {
        fontSize: 14,
        color: '#9DB8A6',
        marginTop: 4,
    },
    signOutButton: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    signOutText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    card: {
        backgroundColor: '#1C261F',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#3C5344',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#3C5344',
    },
    label: {
        fontSize: 14,
        color: '#9DB8A6',
        fontWeight: '500',
    },
    value: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    valueSmall: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
        maxWidth: '60%',
    },
    successText: {
        fontSize: 14,
        color: '#14B84B',
        lineHeight: 20,
        marginBottom: 8,
    },
});

export default DashboardScreen;