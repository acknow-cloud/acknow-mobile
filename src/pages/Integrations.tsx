import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    Alert,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FooterNavigation, { TabName } from '../components/shared/Footer';
import { useNavigation } from '@react-navigation/native';
import {
    slackApi,
    teamsApi,
    SlackStatus,
    TeamsStatus,
    SlackChannel,
    TeamsTeam,
    TeamsChannel,
} from '../services/integrations.service';

export default function IntegrationsScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabName>('settings');
    const navigation = useNavigation();

    // Slack state
    const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);
    const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([]);
    const [showSlackChannels, setShowSlackChannels] = useState(false);

    // Teams state
    const [teamsStatus, setTeamsStatus] = useState<TeamsStatus | null>(null);
    const [teamsTeams, setTeamsTeams] = useState<TeamsTeam[]>([]);
    const [teamsChannels, setTeamsChannels] = useState<TeamsChannel[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [showTeamsModal, setShowTeamsModal] = useState(false);

    const handleTabChange = (tab: TabName) => {
        setActiveTab(tab);
        if (tab === 'dashboard') {
            navigation.navigate('Dashboard' as never);
        } else if (tab === 'oncall') {
            navigation.navigate('OnCall' as never);
        } else if (tab === 'reports') {
            navigation.navigate('Reports' as never);
        } else if (tab === 'incidents') {
            navigation.navigate('Incidents' as never);
        } else if (tab === 'rules') {
            navigation.navigate('AlertRules' as never);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchSlackStatus(), fetchTeamsStatus()]);
        } catch (error: any) {
            console.error('Error loading integrations:', error);
            Alert.alert('Error', error.message || 'Failed to load integrations');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // ============= Slack Functions =============

    const fetchSlackStatus = async () => {
        try {
            const status = await slackApi.getStatus();
            setSlackStatus(status);
        } catch (error: any) {
            console.error('Error fetching Slack status:', error);
        }
    };

    const handleSlackConnect = async () => {
        try {
            const url = await slackApi.getInstallUrl();
            const supported = await Linking.canOpenURL(url);

            if (supported) {
                await Linking.openURL(url);
                Alert.alert(
                    'Authorize Slack',
                    'Complete the authorization in your browser, then return to the app and refresh.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Error', 'Cannot open Slack authorization URL');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to connect Slack');
        }
    };

    const handleSlackDisconnect = async () => {
        Alert.alert(
            'Disconnect Slack',
            'Are you sure you want to disconnect Slack?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disconnect',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await slackApi.disconnect();
                            await fetchSlackStatus();
                            setShowSlackChannels(false);
                            Alert.alert('Success', 'Slack disconnected');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to disconnect Slack');
                        }
                    },
                },
            ]
        );
    };

    const handleSelectSlackChannel = async () => {
        try {
            setShowSlackChannels(true);
            const response = await slackApi.listChannels(false);
            setSlackChannels(response.items);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load Slack channels');
        }
    };

    const handleConnectSlackChannel = async (channelId: string) => {
        try {
            await slackApi.connectChannel(channelId);
            setShowSlackChannels(false);
            await fetchSlackStatus();
            Alert.alert('Success', 'Slack channel connected');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to connect channel');
        }
    };

    const handleSlackTest = async () => {
        try {
            await slackApi.sendTest();
            Alert.alert('Success', 'Test message sent to Slack');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send test message');
        }
    };

    // ============= Teams Functions =============

    const fetchTeamsStatus = async () => {
        try {
            const status = await teamsApi.getStatus();
            setTeamsStatus(status);
        } catch (error: any) {
            console.error('Error fetching Teams status:', error);
        }
    };

    const handleTeamsConnect = async () => {
        try {
            const url = await teamsApi.getInstallUrl();
            const supported = await Linking.canOpenURL(url);

            if (supported) {
                await Linking.openURL(url);
                Alert.alert(
                    'Authorize Teams',
                    'Complete the authorization in your browser, then return to the app and refresh.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Error', 'Cannot open Teams authorization URL');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to connect Teams');
        }
    };

    const handleTeamsDisconnect = async () => {
        Alert.alert(
            'Disconnect Teams',
            'Are you sure you want to disconnect Microsoft Teams?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disconnect',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await teamsApi.disconnect();
                            await fetchTeamsStatus();
                            setShowTeamsModal(false);
                            Alert.alert('Success', 'Teams disconnected');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to disconnect Teams');
                        }
                    },
                },
            ]
        );
    };

    const handleSelectTeamsChannel = async () => {
        try {
            setShowTeamsModal(true);
            const response = await teamsApi.listTeams();
            setTeamsTeams(response.items);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load Teams');
        }
    };

    const handleTeamsTeamSelected = async (teamId: string) => {
        try {
            setSelectedTeam(teamId);
            const response = await teamsApi.listChannels(teamId);
            setTeamsChannels(response.items);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load channels');
        }
    };

    const handleConnectTeamsChannel = async (teamId: string, channelId: string) => {
        try {
            await teamsApi.connectChannel(teamId, channelId);
            setShowTeamsModal(false);
            setSelectedTeam(null);
            await fetchTeamsStatus();
            Alert.alert('Success', 'Teams channel connected');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to connect channel');
        }
    };

    const handleTeamsTest = async () => {
        try {
            await teamsApi.sendTest();
            Alert.alert('Success', 'Test message sent to Teams');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send test message');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>Loading integrations...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Integrations</Text>
                    <Text style={styles.headerSubtitle}>
                        Connect your notification channels
                    </Text>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#10b981"
                    />
                }
            >
                {/* Slack Card */}
                <View style={styles.integrationCard}>
                    <View style={styles.cardHeader}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="logo-slack" size={32} color="#E01E5A" />
                        </View>
                        <View style={styles.cardHeaderText}>
                            <Text style={styles.cardTitle}>Slack</Text>
                            <View style={styles.statusBadge}>
                                <View style={[
                                    styles.statusDot,
                                    slackStatus?.connected ? styles.statusDotConnected : styles.statusDotDisconnected
                                ]} />
                                <Text style={[
                                    styles.statusText,
                                    slackStatus?.connected ? styles.statusTextConnected : styles.statusTextDisconnected
                                ]}>
                                    {slackStatus?.connected ? 'Connected' : 'Not Connected'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {slackStatus?.connected ? (
                        <>
                            <View style={styles.cardContent}>
                                <Text style={styles.infoLabel}>Workspace:</Text>
                                <Text style={styles.infoValue}>{slackStatus.teamName || 'N/A'}</Text>
                            </View>

                            <View style={styles.cardActions}>
                                <TouchableOpacity
                                    onPress={handleSelectSlackChannel}
                                    style={[styles.actionButton, styles.actionButtonPrimary]}
                                >
                                    <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                                    <Text style={styles.actionButtonTextPrimary}>Select Channel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSlackTest}
                                    style={[styles.actionButton, styles.actionButtonSecondary]}
                                >
                                    <Ionicons name="send" size={18} color="#10b981" />
                                    <Text style={styles.actionButtonTextSecondary}>Test</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSlackDisconnect}
                                    style={[styles.actionButton, styles.actionButtonDanger]}
                                >
                                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                                    <Text style={styles.actionButtonTextDanger}>Disconnect</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <View style={styles.cardActions}>
                            <TouchableOpacity
                                onPress={handleSlackConnect}
                                style={[styles.actionButton, styles.actionButtonPrimary, { flex: 1 }]}
                            >
                                <Ionicons name="link" size={18} color="#FFFFFF" />
                                <Text style={styles.actionButtonTextPrimary}>Connect Slack</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Teams Card */}
                <View style={styles.integrationCard}>
                    <View style={styles.cardHeader}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="people" size={32} color="#5059C9" />
                        </View>
                        <View style={styles.cardHeaderText}>
                            <Text style={styles.cardTitle}>Microsoft Teams</Text>
                            <View style={styles.statusBadge}>
                                <View style={[
                                    styles.statusDot,
                                    teamsStatus?.connected ? styles.statusDotConnected : styles.statusDotDisconnected
                                ]} />
                                <Text style={[
                                    styles.statusText,
                                    teamsStatus?.connected ? styles.statusTextConnected : styles.statusTextDisconnected
                                ]}>
                                    {teamsStatus?.connected ? 'Connected' : 'Not Connected'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {teamsStatus?.connected ? (
                        <>
                            <View style={styles.cardContent}>
                                <Text style={styles.infoLabel}>Team:</Text>
                                <Text style={styles.infoValue}>{teamsStatus.teamName || 'N/A'}</Text>
                                {teamsStatus.channelName && (
                                    <>
                                        <Text style={[styles.infoLabel, { marginTop: 8 }]}>Channel:</Text>
                                        <Text style={styles.infoValue}>{teamsStatus.channelName}</Text>
                                    </>
                                )}
                            </View>

                            <View style={styles.cardActions}>
                                <TouchableOpacity
                                    onPress={handleSelectTeamsChannel}
                                    style={[styles.actionButton, styles.actionButtonPrimary]}
                                >
                                    <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                                    <Text style={styles.actionButtonTextPrimary}>Select Channel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleTeamsTest}
                                    style={[styles.actionButton, styles.actionButtonSecondary]}
                                >
                                    <Ionicons name="send" size={18} color="#10b981" />
                                    <Text style={styles.actionButtonTextSecondary}>Test</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleTeamsDisconnect}
                                    style={[styles.actionButton, styles.actionButtonDanger]}
                                >
                                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                                    <Text style={styles.actionButtonTextDanger}>Disconnect</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <View style={styles.cardActions}>
                            <TouchableOpacity
                                onPress={handleTeamsConnect}
                                style={[styles.actionButton, styles.actionButtonPrimary, { flex: 1 }]}
                            >
                                <Ionicons name="link" size={18} color="#FFFFFF" />
                                <Text style={styles.actionButtonTextPrimary}>Connect Teams</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Slack Channels Modal */}
                {showSlackChannels && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.modal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Slack Channel</Text>
                                <TouchableOpacity onPress={() => setShowSlackChannels(false)}>
                                    <Ionicons name="close" size={24} color="#6b7f72" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.modalContent}>
                                {slackChannels.map(channel => (
                                    <TouchableOpacity
                                        key={channel.id}
                                        onPress={() => handleConnectSlackChannel(channel.id)}
                                        style={styles.channelItem}
                                    >
                                        <Ionicons
                                            name={channel.is_private ? 'lock-closed-outline' : 'lock-open-outline'}
                                            size={18}
                                            color="#10b981"
                                        />
                                        <Text style={styles.channelName}>{channel.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                )}

                {/* Teams Channels Modal */}
                {showTeamsModal && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.modal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {selectedTeam ? 'Select Channel' : 'Select Team'}
                                </Text>
                                <TouchableOpacity onPress={() => {
                                    setShowTeamsModal(false);
                                    setSelectedTeam(null);
                                }}>
                                    <Ionicons name="close" size={24} color="#6b7f72" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.modalContent}>
                                {!selectedTeam ? (
                                    teamsTeams.map(team => (
                                        <TouchableOpacity
                                            key={team.id}
                                            onPress={() => handleTeamsTeamSelected(team.id)}
                                            style={styles.channelItem}
                                        >
                                            <Ionicons name="people" size={18} color="#10b981" />
                                            <Text style={styles.channelName}>{team.displayName}</Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    teamsChannels.map(channel => (
                                        <TouchableOpacity
                                            key={channel.id}
                                            onPress={() => handleConnectTeamsChannel(selectedTeam, channel.id)}
                                            style={styles.channelItem}
                                        >
                                            <Ionicons name="chatbubbles" size={18} color="#10b981" />
                                            <Text style={styles.channelName}>{channel.displayName}</Text>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>
                        </View>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            <FooterNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f1612',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0f1612',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#6b7f72',
    },
    header: {
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#0f1612',
        borderBottomWidth: 1,
        borderBottomColor: '#2d3a32',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6b7f72',
        marginTop: 4,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    integrationCard: {
        backgroundColor: '#111813',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2d3a32',
        padding: 16,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#0f1612',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardHeaderText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusDotConnected: {
        backgroundColor: '#10b981',
    },
    statusDotDisconnected: {
        backgroundColor: '#6b7f72',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusTextConnected: {
        color: '#10b981',
    },
    statusTextDisconnected: {
        color: '#6b7f72',
    },
    cardContent: {
        marginBottom: 16,
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7f72',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#e5e7eb',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    actionButtonPrimary: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    actionButtonSecondary: {
        backgroundColor: '#0f1612',
        borderColor: '#2d3a32',
    },
    actionButtonDanger: {
        backgroundColor: '#0f1612',
        borderColor: '#2d3a32',
    },
    actionButtonTextPrimary: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    actionButtonTextSecondary: {
        fontSize: 13,
        fontWeight: '700',
        color: '#10b981',
    },
    actionButtonTextDanger: {
        fontSize: 13,
        fontWeight: '700',
        color: '#ef4444',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        width: '100%',
        maxHeight: '80%',
        backgroundColor: '#0f1612',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#10b981',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#2d3a32',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    modalContent: {
        padding: 16,
    },
    channelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        backgroundColor: '#111813',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2d3a32',
        marginBottom: 8,
    },
    channelName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#e5e7eb',
        flex: 1,
    },
});