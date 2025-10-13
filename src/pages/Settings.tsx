// ===================================
// SIMPLEST SOLUTION - Update SettingsScreen
// ===================================
// This avoids the navigation error by not doing manual navigation

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import FooterNavigation, { TabName } from '../components/shared/Footer';

const SettingsScreen = () => {
    const navigation = useNavigation();
    const { user, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<TabName>('settings');

    const handleTabChange = (tab: TabName) => {
        setActiveTab(tab);

        if (tab === 'dashboard') {
            navigation.navigate('Dashboard' as never);
        } else if (tab === 'incidents') {
            navigation.navigate('Incidents' as never);
        } else if (tab === 'oncall') {
            navigation.navigate('OnCall' as never);
        } else if (tab === 'reports') {
            navigation.navigate('Reports' as never);
        }
    };

    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                        } catch (error) {
                            console.error('Sign out error:', error);
                            Alert.alert('Error', 'Failed to sign out. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.settingsContainer}>
                    <Text style={styles.pageTitle}>Settings</Text>

                    {/* Account Section */}
                    <View style={styles.settingsSection}>
                        <Text style={styles.settingsSectionTitle}>Account</Text>
                        <View style={styles.settingsCard}>
                            <View style={styles.accountInfo}>
                                <View style={styles.avatarCircle}>
                                    <Ionicons name="person" size={32} color="#10b981" />
                                </View>
                                <View style={styles.accountDetails}>
                                    <Text style={styles.accountName}>{user?.email || 'User'}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Preferences Section */}
                    <View style={styles.settingsSection}>
                        <Text style={styles.settingsSectionTitle}>Preferences</Text>
                        <View style={styles.settingsCard}>
                            <TouchableOpacity style={styles.settingsItem}>
                                <View style={styles.settingsItemLeft}>
                                    <Ionicons name="notifications-outline" size={22} color="#e5e7eb" />
                                    <Text style={styles.settingsItemText}>Notifications</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#6b7f72" />
                            </TouchableOpacity>

                            <View style={styles.settingsDivider} />

                            <TouchableOpacity style={styles.settingsItem}>
                                <View style={styles.settingsItemLeft}>
                                    <Ionicons name="moon-outline" size={22} color="#e5e7eb" />
                                    <Text style={styles.settingsItemText}>Dark Mode</Text>
                                </View>
                                <View style={styles.settingsToggle}>
                                    <Text style={styles.settingsToggleText}>On</Text>
                                </View>
                            </TouchableOpacity>

                            <View style={styles.settingsDivider} />

                            <TouchableOpacity style={styles.settingsItem}>
                                <View style={styles.settingsItemLeft}>
                                    <Ionicons name="language-outline" size={22} color="#e5e7eb" />
                                    <Text style={styles.settingsItemText}>Language</Text>
                                </View>
                                <View style={styles.settingsItemRight}>
                                    <Text style={styles.settingsValueText}>English</Text>
                                    <Ionicons name="chevron-forward" size={20} color="#6b7f72" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* About Section */}
                    <View style={styles.settingsSection}>
                        <Text style={styles.settingsSectionTitle}>About</Text>
                        <View style={styles.settingsCard}>
                            <TouchableOpacity style={styles.settingsItem}>
                                <View style={styles.settingsItemLeft}>
                                    <Ionicons name="help-circle-outline" size={22} color="#e5e7eb" />
                                    <Text style={styles.settingsItemText}>Help & Support</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#6b7f72" />
                            </TouchableOpacity>

                            <View style={styles.settingsDivider} />

                            <TouchableOpacity style={styles.settingsItem}>
                                <View style={styles.settingsItemLeft}>
                                    <Ionicons name="document-text-outline" size={22} color="#e5e7eb" />
                                    <Text style={styles.settingsItemText}>Privacy Policy</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#6b7f72" />
                            </TouchableOpacity>

                            <View style={styles.settingsDivider} />

                            <View style={styles.settingsItem}>
                                <View style={styles.settingsItemLeft}>
                                    <Ionicons name="information-circle-outline" size={22} color="#e5e7eb" />
                                    <Text style={styles.settingsItemText}>Version</Text>
                                </View>
                                <Text style={styles.settingsValueText}>1.0.0</Text>
                            </View>
                        </View>
                    </View>

                    {/* Sign Out Button - Using simple handleSignOut */}
                    <TouchableOpacity
                        style={styles.signOutButtonLarge}
                        onPress={handleSignOut}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
                        <Text style={styles.signOutButtonText}>Sign Out</Text>
                    </TouchableOpacity>

                    <View style={styles.bottomPadding} />
                </View>
            </ScrollView>

            <FooterNavigation
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0f0d' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 0 },
    pageTitle: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginBottom: 24, letterSpacing: -1 },
    settingsContainer: { paddingHorizontal: 24, paddingTop: 60 },
    settingsSection: { marginBottom: 32 },
    settingsSectionTitle: { fontSize: 14, fontWeight: '700', color: '#6b7f72', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    settingsCard: { backgroundColor: '#1c261f', borderRadius: 16, borderWidth: 1, borderColor: '#2d3a32', overflow: 'hidden' },
    accountInfo: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#10b98120', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    accountDetails: { flex: 1 },
    accountName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
    settingsItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingHorizontal: 20 },
    settingsItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    settingsItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    settingsItemText: { fontSize: 15, color: '#e5e7eb', fontWeight: '600' },
    settingsValueText: { fontSize: 14, color: '#6b7f72', fontWeight: '500' },
    settingsToggle: { backgroundColor: '#10b98120', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#10b98140' },
    settingsToggleText: { fontSize: 13, color: '#10b981', fontWeight: '700' },
    settingsDivider: { height: 1, backgroundColor: '#2d3a32', marginLeft: 54 },
    signOutButtonLarge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', paddingVertical: 16, borderRadius: 16, gap: 10, marginTop: 8, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    signOutButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
    bottomPadding: { height: 100 },
});

export default SettingsScreen;
