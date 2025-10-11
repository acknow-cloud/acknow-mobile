import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Modal,
    Dimensions,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../hooks/useAlerts';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
    const { user, tenantId, signOut } = useAuth();
    const { alerts, loading, error, refreshing, counts, refresh } = useAlerts(tenantId);
    const [selectedAlert, setSelectedAlert] = useState<any>(null);
    const [timeRange, setTimeRange] = useState('7d');

    if (!tenantId) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#14b84b" />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </View>
        );
    }

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return '#ef4444';
            case 'warning': return '#f59e0b';
            case 'info': return '#3b82f6';
            default: return '#6b7280';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return '⚠️';
            case 'warning': return '⚡';
            case 'info': return 'ℹ️';
            default: return '•';
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diff < 60) return `${diff}s`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
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

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Dashboard</Text>
                    <Text style={styles.headerSubtitle}>Real-time monitoring</Text>
                </View>
                <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refresh}
                        tintColor="#14b84b"
                        colors={['#14b84b']}
                    />
                }
            >
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    {/* Critical */}
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <View style={[styles.statIconContainer, { backgroundColor: '#ef444420' }]}>
                                <Text style={styles.statIcon}>⚠️</Text>
                            </View>
                            <View style={styles.statTrendUp}>
                                <Text style={styles.statTrendText}>↑ 12%</Text>
                            </View>
                        </View>
                        <Text style={styles.statValue}>{counts.critical}</Text>
                        <Text style={styles.statLabel}>Critical Alerts</Text>
                    </View>

                    {/* Warnings */}
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <View style={[styles.statIconContainer, { backgroundColor: '#f59e0b20' }]}>
                                <Text style={styles.statIcon}>⚡</Text>
                            </View>
                            <View style={styles.statTrendDown}>
                                <Text style={[styles.statTrendText, { color: '#14b84b' }]}>↓ 5%</Text>
                            </View>
                        </View>
                        <Text style={styles.statValue}>{counts.warning}</Text>
                        <Text style={styles.statLabel}>Warnings</Text>
                    </View>

                    {/* Resolved */}
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <View style={[styles.statIconContainer, { backgroundColor: '#14b84b20' }]}>
                                <Text style={styles.statIcon}>✓</Text>
                            </View>
                            <View style={styles.statTrendUp}>
                                <Text style={[styles.statTrendText, { color: '#14b84b' }]}>↑ 20%</Text>
                            </View>
                        </View>
                        <Text style={styles.statValue}>45</Text>
                        <Text style={styles.statLabel}>Resolved (24h)</Text>
                    </View>

                    {/* Avg Resolution */}
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <View style={[styles.statIconContainer, { backgroundColor: '#3b82f620' }]}>
                                <Text style={styles.statIcon}>⏱️</Text>
                            </View>
                            <View style={styles.statTrendDown}>
                                <Text style={[styles.statTrendText, { color: '#14b84b' }]}>↓ 8%</Text>
                            </View>
                        </View>
                        <Text style={styles.statValue}>12m</Text>
                        <Text style={styles.statLabel}>Avg. Resolution</Text>
                    </View>
                </View>

                {/* Alert Trend Chart */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>
                            <Text style={styles.cardTitleIcon}>📊 </Text>
                            Alert Trend
                        </Text>
                        <View style={styles.timeRangeContainer}>
                            {['30m', '1h', '24h', '7d', '30d'].map((range) => (
                                <TouchableOpacity
                                    key={range}
                                    style={[
                                        styles.timeRangeButton,
                                        timeRange === range && styles.timeRangeButtonActive,
                                    ]}
                                    onPress={() => setTimeRange(range)}
                                >
                                    <Text
                                        style={[
                                            styles.timeRangeText,
                                            timeRange === range && styles.timeRangeTextActive,
                                        ]}
                                    >
                                        {range}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Simple Bar Chart Visualization */}
                    <View style={styles.chartContainer}>
                        <View style={styles.chartBars}>
                            {[40, 65, 45, 80, 55, 70, 50].map((height, idx) => (
                                <View key={idx} style={styles.barColumn}>
                                    <View style={styles.barStack}>
                                        <View
                                            style={[
                                                styles.barSegment,
                                                {
                                                    height: `${height * 0.4}%`,
                                                    backgroundColor: '#ef4444',
                                                },
                                            ]}
                                        />
                                        <View
                                            style={[
                                                styles.barSegment,
                                                {
                                                    height: `${height * 0.35}%`,
                                                    backgroundColor: '#f59e0b',
                                                },
                                            ]}
                                        />
                                        <View
                                            style={[
                                                styles.barSegment,
                                                {
                                                    height: `${height * 0.25}%`,
                                                    backgroundColor: '#3b82f6',
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.barLabel}>
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx]}
                                    </Text>
                                </View>
                            ))}
                        </View>
                        <View style={styles.chartLegend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                                <Text style={styles.legendText}>Critical</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                                <Text style={styles.legendText}>Warning</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                                <Text style={styles.legendText}>Info</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* On-Call Status */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                        <Text style={styles.cardTitleIcon}>👥 </Text>
                        On-Call Status
                    </Text>

                    <View style={styles.onCallCard}>
                        <View style={styles.onCallHeader}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>AR</Text>
                            </View>
                            <View style={styles.onCallInfo}>
                                <Text style={styles.onCallName}>Alex Rivera</Text>
                                <Text style={styles.onCallTeam}>Platform Team • Since 08:00</Text>
                            </View>
                            <View style={styles.activeStatusBadge}>
                                <View style={styles.activeDot} />
                                <Text style={styles.activeText}>Active</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.nextOnCallContainer}>
                        <Text style={styles.nextOnCallLabel}>Next On-Call</Text>
                        <Text style={styles.nextOnCallText}>
                            Sam Taylor • Backend Team • In 4 hours
                        </Text>
                    </View>
                </View>

                {/* Active Alerts */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>
                            <Text style={styles.cardTitleIcon}>🔔 </Text>
                            Active Alerts
                        </Text>
                    </View>

                    {loading && !refreshing ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#14b84b" />
                            <Text style={styles.loadingText}>Loading alerts...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>⚠️ {error}</Text>
                            <TouchableOpacity onPress={refresh} style={styles.retryButton}>
                                <Text style={styles.retryButtonText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : alerts.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>✓</Text>
                            <Text style={styles.emptyText}>No active alerts</Text>
                        </View>
                    ) : (
                        <View style={styles.alertsTable}>
                            {/* Table Header */}
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Severity</Text>
                                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Service</Text>
                                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Time</Text>
                            </View>

                            {/* Table Rows */}
                            {alerts
                                .filter((alert) => alert.status !== 'resolved')
                                .slice(0, 10)
                                .map((alert) => (
                                    <TouchableOpacity
                                        key={alert.alert_id}
                                        style={styles.tableRow}
                                        onPress={() => setSelectedAlert(alert)}
                                    >
                                        <View style={[styles.tableCell, { flex: 1 }]}>
                                            <View
                                                style={[
                                                    styles.severityBadge,
                                                    { backgroundColor: `${getSeverityColor(alert.severity)}20` },
                                                ]}
                                            >
                                                <Text style={styles.severityIcon}>
                                                    {getSeverityIcon(alert.severity)}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.severityText,
                                                        { color: getSeverityColor(alert.severity) },
                                                    ]}
                                                >
                                                    {alert.severity.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={[styles.tableCell, { flex: 2 }]}>
                                            <Text style={styles.serviceName} numberOfLines={1}>
                                                🖥️ {alert.service}
                                            </Text>
                                            <Text style={styles.alertMessage} numberOfLines={1}>
                                                {alert.message}
                                            </Text>
                                        </View>

                                        <View style={[styles.tableCell, { flex: 1 }]}>
                                            <Text style={styles.timeAgo}>{formatTime(alert.received_at)} ago</Text>
                                            <Text style={styles.timeDate}>{formatDate(alert.received_at)}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                        </View>
                    )}
                </View>

                <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Alert Detail Modal */}
            <Modal
                visible={!!selectedAlert}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedAlert(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Alert Details</Text>
                            <TouchableOpacity onPress={() => setSelectedAlert(null)}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {selectedAlert && (
                            <ScrollView style={styles.modalBody}>
                                <View
                                    style={[
                                        styles.modalSeverityBadge,
                                        {
                                            backgroundColor: `${getSeverityColor(selectedAlert.severity)}20`,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.modalSeverityText,
                                            { color: getSeverityColor(selectedAlert.severity) },
                                        ]}
                                    >
                                        {getSeverityIcon(selectedAlert.severity)}{' '}
                                        {selectedAlert.severity.toUpperCase()}
                                    </Text>
                                </View>

                                <Text style={styles.modalService}>🖥️ {selectedAlert.service}</Text>
                                <Text style={styles.modalMessage}>{selectedAlert.message}</Text>
                                <Text style={styles.modalTime}>
                                    Received {formatTime(selectedAlert.received_at)} ago
                                </Text>

                                {/* AI Explanation */}
                                <View style={styles.aiExplanationCard}>
                                    <View style={styles.aiExplanationHeader}>
                                        <Text style={styles.aiIcon}>🤖</Text>
                                        <Text style={styles.aiTitle}>AI Explanation</Text>
                                    </View>
                                    <Text style={styles.aiText}>
                                        This alert indicates elevated response times in the{' '}
                                        {selectedAlert.service}. The pattern suggests a sudden spike in
                                        concurrent requests that may have exceeded configured limits. Immediate
                                        investigation recommended for critical severity.
                                    </Text>
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.modalActions}>
                                    <TouchableOpacity style={styles.runbookButton}>
                                        <Text style={styles.actionButtonText}>▶️ Run Runbook</Text>
                                    </TouchableOpacity>

                                    {!selectedAlert.acknowledged && (
                                        <TouchableOpacity style={styles.acknowledgeButton}>
                                            <Text style={styles.actionButtonText}>Acknowledge</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity style={styles.resolveButton}>
                                        <Text style={styles.actionButtonText}>Resolve</Text>
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
        backgroundColor: '#0F1612',
    },
    header: {
        backgroundColor: '#1c261f',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#3c5344',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#9db8a6',
        marginTop: 2,
    },
    signOutButton: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    signOutText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 12,
        gap: 12,
    },
    statCard: {
        backgroundColor: '#1c261f',
        borderRadius: 12,
        padding: 16,
        width: (width - 48) / 2,
        borderWidth: 1,
        borderColor: '#3c5344',
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statIcon: {
        fontSize: 18,
    },
    statTrendUp: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statTrendDown: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statTrendText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#ef4444',
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#9db8a6',
    },
    card: {
        backgroundColor: '#1c261f',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#3c5344',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    cardTitleIcon: {
        fontSize: 16,
    },
    timeRangeContainer: {
        flexDirection: 'row',
        backgroundColor: '#111813',
        borderRadius: 8,
        padding: 2,
    },
    timeRangeButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    timeRangeButtonActive: {
        backgroundColor: '#1c261f',
    },
    timeRangeText: {
        fontSize: 10,
        color: '#9db8a6',
        fontWeight: '500',
    },
    timeRangeTextActive: {
        color: '#14b84b',
        fontWeight: '600',
    },
    chartContainer: {
        marginTop: 8,
    },
    chartBars: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 150,
        marginBottom: 12,
    },
    barColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    barStack: {
        width: '80%',
        height: '100%',
        justifyContent: 'flex-end',
    },
    barSegment: {
        width: '100%',
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
    },
    barLabel: {
        fontSize: 9,
        color: '#9db8a6',
        marginTop: 4,
    },
    chartLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginTop: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
        color: '#9db8a6',
    },
    onCallCard: {
        backgroundColor: '#14b84b10',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#14b84b30',
        marginBottom: 12,
    },
    onCallHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#14b84b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    onCallInfo: {
        flex: 1,
        marginLeft: 12,
    },
    onCallName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    onCallTeam: {
        fontSize: 12,
        color: '#9db8a6',
        marginTop: 2,
    },
    activeStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#14b84b20',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#14b84b',
    },
    activeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#14b84b',
    },
    nextOnCallContainer: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#3c5344',
    },
    nextOnCallLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#9db8a6',
        marginBottom: 4,
    },
    nextOnCallText: {
        fontSize: 12,
        color: '#FFFFFF',
    },
    alertsTable: {
        marginTop: 8,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#111813',
        borderRadius: 8,
        marginBottom: 8,
    },
    tableHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9db8a6',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#111813',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#3c5344',
    },
    tableCell: {
        justifyContent: 'center',
    },
    severityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    severityIcon: {
        fontSize: 12,
    },
    severityText: {
        fontSize: 10,
        fontWeight: '700',
    },
    serviceName: {
        fontSize: 13,
        color: '#9db8a6',
        fontWeight: '500',
        marginBottom: 2,
    },
    alertMessage: {
        fontSize: 11,
        color: '#FFFFFF',
    },
    timeAgo: {
        fontSize: 11,
        color: '#9db8a6',
        marginBottom: 2,
    },
    timeDate: {
        fontSize: 9,
        color: '#6b7280',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#9db8a6',
    },
    errorContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    errorText: {
        fontSize: 14,
        color: '#ef4444',
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#14b84b',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 16,
        color: '#14b84b',
    },
    bottomPadding: {
        height: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1c261f',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#3c5344',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    closeButton: {
        fontSize: 28,
        color: '#9db8a6',
    },
    modalBody: {
        padding: 20,
    },
    modalSeverityBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 16,
    },
    modalSeverityText: {
        fontSize: 13,
        fontWeight: '700',
    },
    modalService: {
        fontSize: 16,
        color: '#9db8a6',
        marginBottom: 12,
    },
    modalMessage: {
        fontSize: 18,
        color: '#FFFFFF',
        fontWeight: '500',
        marginBottom: 16,
        lineHeight: 24,
    },
    modalTime: {
        fontSize: 14,
        color: '#9db8a6',
        marginBottom: 24,
    },
    aiExplanationCard: {
        backgroundColor: '#3b82f610',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#3b82f630',
    },
    aiExplanationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    aiIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    aiTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#3b82f6',
    },
    aiText: {
        fontSize: 14,
        color: '#FFFFFF',
        lineHeight: 20,
    },
    modalActions: {
        gap: 12,
    },
    runbookButton: {
        backgroundColor: '#8b5cf6',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    acknowledgeButton: {
        backgroundColor: '#f59e0b',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    resolveButton: {
        backgroundColor: '#14b84b',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default DashboardScreen;