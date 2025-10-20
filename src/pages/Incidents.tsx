// src/screens/IncidentsScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Modal,
    StatusBar,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../hooks/useAlerts';
import { alertsService, AlertExplanation } from '../services/alerts.service';
import FooterNavigation, { TabName } from '../components/shared/Footer';

type FilterTab = 'all' | 'active' | 'acknowledged';

const IncidentsScreen = () => {
    const navigation = useNavigation();
    const { tenantId } = useAuth();
    const { alerts, loading, error, refreshing, refresh } = useAlerts(tenantId);

    const [activeTab, setActiveTab] = useState<TabName>('incidents');
    const [filterTab, setFilterTab] = useState<FilterTab>('active');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSeverity, setSelectedSeverity] = useState<string>('');
    const [selectedAlert, setSelectedAlert] = useState<any>(null);

    // AI Explanation state
    const [aiExplanation, setAiExplanation] = useState<AlertExplanation | null>(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const [acknowledging, setAcknowledging] = useState(false);

    const handleTabChange = (tab: TabName) => {
        setActiveTab(tab);
        if (tab === 'dashboard') {
            navigation.navigate('Dashboard' as never);
        } else if (tab === 'incidents') {
            navigation.navigate('Incidents' as never);
        } else if (tab === 'oncall') {
            navigation.navigate('OnCall' as never);
        } else if (tab === 'settings') {
            navigation.navigate('Settings' as never);
        }
        else if (tab === 'integrations') {
            navigation.navigate('Integrations' as never);
        }
        else if (tab === 'rules') {
            navigation.navigate('Rules' as never);
        }
    };
    // Filter alerts by tab
    const filteredByTab = useMemo(() => {
        switch (filterTab) {
            case 'all':
                return alerts;
            case 'active':
                return alerts.filter(a => a.status !== 'resolved' && !a.acknowledged);
            case 'acknowledged':
                return alerts.filter(a => a.acknowledged || a.status === 'resolved');
            default:
                return alerts;
        }
    }, [alerts, filterTab]);

    // Apply search and severity filters
    const filteredAlerts = useMemo(() => {
        let filtered = filteredByTab;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(alert =>
                alert.message?.toLowerCase().includes(query) ||
                alert.service?.toLowerCase().includes(query) ||
                alert.severity?.toLowerCase().includes(query)
            );
        }

        // Severity filter
        if (selectedSeverity) {
            filtered = filtered.filter(alert => alert.severity === selectedSeverity);
        }

        // Sort by date (newest first)
        return filtered.sort((a, b) =>
            new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
        );
    }, [filteredByTab, searchQuery, selectedSeverity]);

    // Fetch AI explanation when alert is selected
    useEffect(() => {
        if (selectedAlert?.alert_id) {
            fetchAIExplanation(selectedAlert.alert_id);
        } else {
            setAiExplanation(null);
        }
    }, [selectedAlert?.alert_id]);

    const fetchAIExplanation = async (alertId: string) => {
        setLoadingExplanation(true);
        const result = await alertsService.getAlertExplanation(alertId);

        if (result.success && result.data) {
            setAiExplanation(result.data);
        }
        setLoadingExplanation(false);
    };

    const handleAcknowledge = async () => {
        if (!selectedAlert?.alert_id || acknowledging) return;

        setAcknowledging(true);
        const success = await alertsService.acknowledgeAlert(selectedAlert.alert_id);

        if (success) {
            Alert.alert('Success', 'Alert acknowledged successfully');
            setSelectedAlert({ ...selectedAlert, acknowledged: true });
            refresh();
        } else {
            Alert.alert('Error', 'Failed to acknowledge alert');
        }
        setAcknowledging(false);
    };

    const getSeverityColor = (severity: string) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return '#ef4444';
            case 'high': return '#f97316';
            case 'warning': return '#f59e0b';
            case 'medium': return '#eab308';
            case 'low': return '#3b82f6';
            case 'info': return '#3b82f6';
            default: return '#6b7280';
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getFilterTabCount = (tab: FilterTab) => {
        switch (tab) {
            case 'all':
                return alerts.length;
            case 'active':
                return alerts.filter(a => a.status !== 'resolved' && !a.acknowledged).length;
            case 'acknowledged':
                return alerts.filter(a => a.acknowledged || a.status === 'resolved').length;
            default:
                return 0;
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Incidents</Text>
                <View style={styles.headerActions}>

                    <TouchableOpacity
                        onPress={refresh}
                        style={styles.refreshButton}
                        disabled={refreshing}
                    >
                        <Ionicons
                            name="refresh"
                            size={20}
                            color={refreshing ? '#6b7f72' : '#10b981'}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputWrapper}>
                        <Ionicons name="search" size={20} color="#6b7f72" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search incidents..."
                            placeholderTextColor="#6b7f72"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#6b7f72" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterTabs}>
                    <TouchableOpacity
                        style={[styles.filterTab, filterTab === 'active' && styles.filterTabActive]}
                        onPress={() => setFilterTab('active')}
                    >
                        <Text style={[styles.filterTabText, filterTab === 'active' && styles.filterTabTextActive]}>
                            Active
                        </Text>
                        <View style={styles.filterTabBadge}>
                            <Text style={styles.filterTabBadgeText}>{getFilterTabCount('active')}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterTab, filterTab === 'acknowledged' && styles.filterTabActive]}
                        onPress={() => setFilterTab('acknowledged')}
                    >
                        <Text style={[styles.filterTabText, filterTab === 'acknowledged' && styles.filterTabTextActive]}>
                            Acknowledged
                        </Text>
                        <View style={styles.filterTabBadge}>
                            <Text style={styles.filterTabBadgeText}>{getFilterTabCount('acknowledged')}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterTab, filterTab === 'all' && styles.filterTabActive]}
                        onPress={() => setFilterTab('all')}
                    >
                        <Text style={[styles.filterTabText, filterTab === 'all' && styles.filterTabTextActive]}>
                            All
                        </Text>
                        <View style={styles.filterTabBadge}>
                            <Text style={styles.filterTabBadgeText}>{getFilterTabCount('all')}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Severity Filter */}
                <View style={styles.severityFilter}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity
                            style={[styles.severityChip, !selectedSeverity && styles.severityChipActive]}
                            onPress={() => setSelectedSeverity('')}
                        >
                            <Text style={[styles.severityChipText, !selectedSeverity && styles.severityChipTextActive]}>
                                All
                            </Text>
                        </TouchableOpacity>

                        {['critical', 'high', 'warning', 'low'].map((sev) => (
                            <TouchableOpacity
                                key={sev}
                                style={[
                                    styles.severityChip,
                                    selectedSeverity === sev && styles.severityChipActive
                                ]}
                                onPress={() => setSelectedSeverity(selectedSeverity === sev ? '' : sev)}
                            >
                                <View style={[styles.severityDot, { backgroundColor: getSeverityColor(sev) }]} />
                                <Text style={[
                                    styles.severityChipText,
                                    selectedSeverity === sev && styles.severityChipTextActive
                                ]}>
                                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Incidents List */}
                <View style={styles.incidentsList}>
                    {loading && !refreshing ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color="#10b981" />
                            <Text style={styles.loadingText}>Loading incidents...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={48} color="#ef4444" />
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity onPress={refresh} style={styles.retryButton}>
                                <Text style={styles.retryButtonText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : filteredAlerts.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
                            <Text style={styles.emptyTitle}>No Incidents</Text>
                            <Text style={styles.emptyText}>
                                {searchQuery || selectedSeverity
                                    ? 'No incidents match your filters'
                                    : 'All clear! No active incidents at the moment'}
                            </Text>
                        </View>
                    ) : (
                        filteredAlerts.map((alert) => (
                            <TouchableOpacity
                                key={alert.alert_id}
                                style={styles.incidentCard}
                                onPress={() => setSelectedAlert(alert)}
                                activeOpacity={0.7}
                            >
                                <View style={[
                                    styles.incidentIndicator,
                                    { backgroundColor: getSeverityColor(alert.severity) }
                                ]} />

                                <View style={styles.incidentContent}>
                                    <View style={styles.incidentHeader}>
                                        <View style={styles.incidentHeaderLeft}>
                                            <View style={[
                                                styles.incidentSeverityBadge,
                                                {
                                                    backgroundColor: `${getSeverityColor(alert.severity)}15`,
                                                    borderColor: getSeverityColor(alert.severity),
                                                }
                                            ]}>
                                                <Text style={[
                                                    styles.incidentSeverityText,
                                                    { color: getSeverityColor(alert.severity) }
                                                ]}>
                                                    {alert.severity?.toUpperCase()}
                                                </Text>
                                            </View>
                                            {alert.acknowledged && (
                                                <View style={styles.ackBadgeSmall}>
                                                    <Ionicons name="checkmark" size={12} color="#10b981" />
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.incidentTime}>{formatTime(alert.received_at)}</Text>
                                    </View>

                                    <Text style={styles.incidentMessage} numberOfLines={2}>
                                        {alert.message}
                                    </Text>

                                    <Text style={styles.incidentService}>
                                        {alert.service || 'Unknown service'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Footer Navigation */}
            <FooterNavigation
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* Alert Detail Modal */}
            <Modal
                visible={!!selectedAlert}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedAlert(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Incident Details</Text>
                            <TouchableOpacity
                                onPress={() => setSelectedAlert(null)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color="#6b7f72" />
                            </TouchableOpacity>
                        </View>

                        {selectedAlert && (
                            <ScrollView
                                style={styles.modalBody}
                                showsVerticalScrollIndicator={false}
                            >
                                {/* Severity Badge */}
                                <View style={[
                                    styles.modalSeverityBadge,
                                    {
                                        backgroundColor: `${getSeverityColor(selectedAlert.severity)}15`,
                                        borderColor: getSeverityColor(selectedAlert.severity),
                                    }
                                ]}>
                                    <Text style={[
                                        styles.modalSeverityText,
                                        { color: getSeverityColor(selectedAlert.severity) }
                                    ]}>
                                        {selectedAlert.severity?.toUpperCase()}
                                    </Text>
                                </View>

                                {/* Service & Message */}
                                <Text style={styles.modalService}>{selectedAlert.service || 'Unknown service'}</Text>
                                <Text style={styles.modalMessage}>{selectedAlert.message}</Text>
                                <Text style={styles.modalTime}>
                                    {formatDate(selectedAlert.received_at)} • {formatTime(selectedAlert.received_at)}
                                </Text>

                                {/* AI Explanation */}
                                <View style={styles.aiCard}>
                                    <View style={styles.aiHeader}>
                                        <Ionicons name="sparkles" size={18} color="#10b981" />
                                        <Text style={styles.aiTitle}>AI Analysis</Text>
                                    </View>

                                    {loadingExplanation ? (
                                        <View style={styles.aiLoading}>
                                            <ActivityIndicator size="small" color="#10b981" />
                                            <Text style={styles.aiLoadingText}>Analyzing incident...</Text>
                                        </View>
                                    ) : aiExplanation?.explanation ? (
                                        <Text style={styles.aiText}>{aiExplanation.explanation}</Text>
                                    ) : (
                                        <Text style={styles.aiText}>No AI explanation available</Text>
                                    )}
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={[
                                            styles.actionBtn,
                                            selectedAlert.acknowledged && styles.actionBtnAcknowledged,
                                        ]}
                                        onPress={handleAcknowledge}
                                        disabled={acknowledging || selectedAlert.acknowledged}
                                    >
                                        {acknowledging ? (
                                            <ActivityIndicator size="small" color="#10b981" />
                                        ) : (
                                            <>
                                                <Ionicons name="checkmark" size={18} color={selectedAlert.acknowledged ? '#10b981' : '#e5e7eb'} />
                                                <Text style={[
                                                    styles.actionBtnText,
                                                    selectedAlert.acknowledged && styles.actionBtnTextAck
                                                ]}>
                                                    {selectedAlert.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111813',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        paddingTop: 60,
        backgroundColor: '#0f1612',
        borderBottomWidth: 1,
        borderBottomColor: '#2d3a32',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -1,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    refreshButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1c261f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    searchContainer: {
        padding: 24,
        paddingBottom: 12,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1c261f',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#2d3a32',
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#FFFFFF',
    },
    filterTabs: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 8,
        marginBottom: 16,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#1c261f',
        borderWidth: 1,
        borderColor: '#2d3a32',
        gap: 8,
    },
    filterTabActive: {
        backgroundColor: '#10b98120',
        borderColor: '#10b981',
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7f72',
    },
    filterTabTextActive: {
        color: '#10b981',
    },
    filterTabBadge: {
        backgroundColor: '#2d3a32',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    filterTabBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6b7f72',
    },
    severityFilter: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    severityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#1c261f',
        borderWidth: 1,
        borderColor: '#2d3a32',
        marginRight: 8,
        gap: 6,
    },
    severityChipActive: {
        backgroundColor: '#10b98120',
        borderColor: '#10b981',
    },
    severityChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7f72',
    },
    severityChipTextActive: {
        color: '#10b981',
    },
    severityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    incidentsList: {
        paddingHorizontal: 24,
        gap: 12,
    },
    centerContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 15,
        color: '#6b7f72',
        fontWeight: '500',
    },
    errorContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    errorText: {
        fontSize: 15,
        color: '#ef4444',
        marginTop: 16,
        marginBottom: 24,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#10b981',
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 10,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 20,
        color: '#10b981',
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: '#6b7f72',
        textAlign: 'center',
    },
    incidentCard: {
        backgroundColor: '#1c261f',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2d3a32',
        flexDirection: 'row',
        marginBottom: 12,
    },
    incidentIndicator: {
        width: 4,
    },
    incidentContent: {
        flex: 1,
        padding: 16,
    },
    incidentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    incidentHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    incidentSeverityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
    },
    incidentSeverityText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    ackBadgeSmall: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#10b98120',
        justifyContent: 'center',
        alignItems: 'center',
    },
    incidentTime: {
        fontSize: 12,
        color: '#6b7f72',
        fontWeight: '600',
    },
    incidentMessage: {
        fontSize: 15,
        color: '#FFFFFF',
        marginBottom: 8,
        lineHeight: 22,
    },
    incidentService: {
        fontSize: 13,
        color: '#10b981',
        fontWeight: '600',
    },
    bottomPadding: {
        height: 100,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0f1612',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '90%',
        borderTopWidth: 2,
        borderColor: '#10b981',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#2d3a32',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1c261f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBody: {
        padding: 24,
    },
    modalSeverityBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
        marginBottom: 20,
        borderWidth: 1,
    },
    modalSeverityText: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    modalService: {
        fontSize: 17,
        color: '#10b981',
        marginBottom: 12,
        fontWeight: '700',
    },
    modalMessage: {
        fontSize: 18,
        color: '#FFFFFF',
        fontWeight: '600',
        marginBottom: 16,
        lineHeight: 26,
    },
    modalTime: {
        fontSize: 13,
        color: '#6b7f72',
        marginBottom: 28,
        fontWeight: '500',
    },
    aiCard: {
        backgroundColor: '#10b98110',
        borderRadius: 16,
        padding: 20,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: '#10b98130',
    },
    aiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    aiTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#10b981',
    },
    aiText: {
        fontSize: 15,
        color: '#e5e7eb',
        lineHeight: 24,
    },
    aiLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    aiLoadingText: {
        fontSize: 14,
        color: '#6b7f72',
    },
    actionButtons: {
        gap: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1c261f',
        borderWidth: 1,
        borderColor: '#3c5344',
        paddingVertical: 14,
        borderRadius: 12,
    },
    actionBtnAcknowledged: {
        backgroundColor: '#10b98115',
        borderColor: '#10b98140',
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#e5e7eb',
    },
    actionBtnTextAck: {
        color: '#10b981',
    },
});

export default IncidentsScreen;