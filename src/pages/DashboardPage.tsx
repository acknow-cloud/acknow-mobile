import React, { useState, useEffect, useMemo } from 'react';
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
    Alert,
    StatusBar,
} from 'react-native';
import FooterNavigation, {TabName} from '../components/shared/Footer'
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../hooks/useAlerts';
import { alertsService, AlertExplanation } from '../services/alerts.service';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
    const navigation = useNavigation();

    const { user, tenantId, signOut } = useAuth();
    const { alerts, loading, error, refreshing, counts, refresh } = useAlerts(tenantId);
    const [selectedAlert, setSelectedAlert] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<TabName>('dashboard');

    // AI Explanation state
    const [aiExplanation, setAiExplanation] = useState<AlertExplanation | null>(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const [explanationError, setExplanationError] = useState<string | null>(null);

    // Action states
    const [acknowledging, setAcknowledging] = useState(false);
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
    const [resolving, setResolving] = useState(false);

    // Sort alerts by time (newest first)
    const sortedAlerts = useMemo(() => {
        return [...alerts].sort((a, b) =>
            new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
        );
    }, [alerts]);

    // Generate chart data
    const chartData = useMemo(() => {
        const now = new Date();
        const days = 7;
        const data = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const dayAlerts = alerts.filter(alert => {
                const alertDate = new Date(alert.received_at);
                return alertDate >= date && alertDate < nextDate;
            });

            const critical = dayAlerts.filter(a => a.severity === 'critical').length;
            const warning = dayAlerts.filter(a => a.severity === 'warning').length;
            const info = dayAlerts.filter(a => a.severity === 'info').length;

            data.push({
                day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
                critical,
                warning,
                info,
                total: critical + warning + info,
            });
        }

        return data;
    }, [alerts]);

    const maxChartValue = Math.max(...chartData.map(d => d.total), 1);

    useEffect(() => {
        if (selectedAlert?.alert_id) {
            fetchAIExplanation(selectedAlert.alert_id);
        } else {
            setAiExplanation(null);
            setExplanationError(null);
        }
    }, [selectedAlert?.alert_id]);

    const fetchAIExplanation = async (alertId: string) => {
        setLoadingExplanation(true);
        setExplanationError(null);

        const result = await alertsService.getAlertExplanation(alertId);

        if (result.success && result.data) {
            setAiExplanation(result.data);
        } else {
            setExplanationError(result.error || 'Failed to load explanation');
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

    const handleQuickAcknowledge = async (alertId: string) => {
        if (acknowledgingId) return;

        setAcknowledgingId(alertId);

        const success = await alertsService.acknowledgeAlert(alertId);

        if (success) {
            refresh();
        } else {
            Alert.alert('Error', 'Failed to acknowledge alert');
        }

        setAcknowledgingId(null);
    };

    const handleResolve = async () => {
        if (!selectedAlert?.alert_id || resolving) return;

        Alert.alert(
            'Resolve Alert',
            'Are you sure you want to resolve this alert?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Resolve',
                    style: 'destructive',
                    onPress: async () => {
                        setResolving(true);

                        const success = await alertsService.resolveAlert(selectedAlert.alert_id);

                        if (success) {
                            Alert.alert('Success', 'Alert resolved successfully');
                            setSelectedAlert(null);
                            refresh();
                        } else {
                            Alert.alert('Error', 'Failed to resolve alert');
                        }

                        setResolving(false);
                    },
                },
            ]
        );
    };

    if (!tenantId) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
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
            <StatusBar barStyle="light-content" />

            {/* Render different content based on active tab */}
            {activeTab === 'dashboard' ? (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={refresh}
                            tintColor="#10b981"
                            colors={['#10b981']}
                        />
                    }
                >
                    {/* Stats Grid */}
                    <View style={styles.statsContainer}>
                        <Text style={styles.pageTitle}>Dashboard</Text>
                        <Text style={styles.sectionTitle}>Overview</Text>
                        <View style={styles.statsGrid}>
                            {/* Critical */}
                            <View style={styles.statCard}>
                                <View style={styles.statCardHeader}>
                                    <View style={[styles.statIconBadge, { backgroundColor: '#ef444415' }]}>
                                        <Text style={[styles.statIconText, { color: '#ef4444' }]}>!</Text>
                                    </View>
                                    <View style={styles.statTrend}>
                                        <Text style={[styles.statTrendIcon, { color: '#ef4444' }]}>↑</Text>
                                        <Text style={[styles.statTrendText, { color: '#ef4444' }]}>12%</Text>
                                    </View>
                                </View>
                                <Text style={styles.statValue}>{counts.critical}</Text>
                                <Text style={styles.statLabel}>Critical</Text>
                            </View>

                            {/* Warnings */}
                            <View style={styles.statCard}>
                                <View style={styles.statCardHeader}>
                                    <View style={[styles.statIconBadge, { backgroundColor: '#f59e0b15' }]}>
                                        <Text style={[styles.statIconText, { color: '#f59e0b' }]}>!</Text>
                                    </View>
                                    <View style={styles.statTrend}>
                                        <Text style={[styles.statTrendIcon, { color: '#10b981' }]}>↓</Text>
                                        <Text style={[styles.statTrendText, { color: '#10b981' }]}>5%</Text>
                                    </View>
                                </View>
                                <Text style={styles.statValue}>{counts.warning}</Text>
                                <Text style={styles.statLabel}>Warnings</Text>
                            </View>

                            {/* Info */}
                            <View style={styles.statCard}>
                                <View style={styles.statCardHeader}>
                                    <View style={[styles.statIconBadge, { backgroundColor: '#3b82f615' }]}>
                                        <Text style={[styles.statIconText, { color: '#3b82f6' }]}>i</Text>
                                    </View>
                                    <View style={styles.statTrend}>
                                        <Text style={[styles.statTrendIcon, { color: '#10b981' }]}>↓</Text>
                                        <Text style={[styles.statTrendText, { color: '#10b981' }]}>8%</Text>
                                    </View>
                                </View>
                                <Text style={styles.statValue}>{counts.info}</Text>
                                <Text style={styles.statLabel}>Info</Text>
                            </View>

                            {/* Total */}
                            <View style={styles.statCard}>
                                <View style={styles.statCardHeader}>
                                    <View style={[styles.statIconBadge, { backgroundColor: '#10b98115' }]}>
                                        <Text style={[styles.statIconText, { color: '#10b981' }]}>∑</Text>
                                    </View>
                                    <View style={styles.statTrend}>
                                        <Text style={[styles.statTrendIcon, { color: '#10b981' }]}>→</Text>
                                        <Text style={[styles.statTrendText, { color: '#6b7f72' }]}>--</Text>
                                    </View>
                                </View>
                                <Text style={styles.statValue}>{alerts.length}</Text>
                                <Text style={styles.statLabel}>Total</Text>
                            </View>
                        </View>
                    </View>

                    {/* Alert Trend Chart */}
                    <View style={styles.chartSection}>
                        <Text style={styles.sectionTitle}>7-Day Trend</Text>
                        <View style={styles.chartCard}>
                            <View style={styles.chartContainer}>
                                <View style={styles.chartBars}>
                                    {chartData.map((item, idx) => {
                                        const percentage = maxChartValue > 0 ? (item.total / maxChartValue) * 100 : 0;
                                        // Cap at 95% to prevent overflow
                                        const cappedPercentage = Math.min(percentage, 95);

                                        return (
                                            <View key={idx} style={styles.barColumn}>
                                                <View style={styles.barStack}>
                                                    {item.critical > 0 && (
                                                        <View
                                                            style={[
                                                                styles.barSegment,
                                                                {
                                                                    height: `${(item.critical / item.total) * cappedPercentage}%`,
                                                                    backgroundColor: '#ef4444',
                                                                },
                                                            ]}
                                                        />
                                                    )}
                                                    {item.warning > 0 && (
                                                        <View
                                                            style={[
                                                                styles.barSegment,
                                                                {
                                                                    height: `${(item.warning / item.total) * cappedPercentage}%`,
                                                                    backgroundColor: '#f59e0b',
                                                                },
                                                            ]}
                                                        />
                                                    )}
                                                    {item.info > 0 && (
                                                        <View
                                                            style={[
                                                                styles.barSegment,
                                                                {
                                                                    height: `${(item.info / item.total) * cappedPercentage}%`,
                                                                    backgroundColor: '#3b82f6',
                                                                },
                                                            ]}
                                                        />
                                                    )}
                                                </View>
                                                <Text style={styles.barLabel}>{item.day}</Text>
                                                {item.total > 0 && (
                                                    <Text style={styles.barCount}>{item.total}</Text>
                                                )}
                                            </View>
                                        );
                                    })}
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
                    </View>

                    {/* Active Alerts */}
                    <View style={styles.alertsSection}>
                        <View style={styles.alertsHeader}>
                            <Text style={styles.sectionTitle}>Active Alerts</Text>
                            <View style={styles.alertCountBadge}>
                                <Text style={styles.alertCountText}>
                                    {sortedAlerts.filter(a => a.status !== 'resolved').length}
                                </Text>
                            </View>
                        </View>

                        {loading && !refreshing ? (
                            <View style={styles.centerContainer}>
                                <ActivityIndicator size="large" color="#10b981" />
                                <Text style={styles.loadingText}>Loading alerts...</Text>
                            </View>
                        ) : error ? (
                            <View style={styles.centerContainer}>
                                <Text style={styles.errorIcon}>⚠</Text>
                                <Text style={styles.errorText}>{error}</Text>
                                <TouchableOpacity onPress={refresh} style={styles.retryButton}>
                                    <Text style={styles.retryButtonText}>Retry</Text>
                                </TouchableOpacity>
                            </View>
                        ) : sortedAlerts.filter(a => a.status !== 'resolved').length === 0 ? (
                            <View style={styles.centerContainer}>
                                <Text style={styles.emptyIcon}>✓</Text>
                                <Text style={styles.emptyTitle}>All Clear</Text>
                                <Text style={styles.emptyText}>No active alerts at the moment</Text>
                            </View>
                        ) : (
                            <View style={styles.alertsList}>
                                {sortedAlerts
                                    .filter((alert) => alert.status !== 'resolved')
                                    .slice(0, 20)
                                    .map((alert) => (
                                        <TouchableOpacity
                                            key={alert.alert_id}
                                            style={[
                                                styles.alertCard,
                                                !alert.acknowledged && styles.alertCardActive,
                                            ]}
                                            onPress={() => setSelectedAlert(alert)}
                                            activeOpacity={0.7}
                                        >
                                            {/* Severity Indicator */}
                                            <View style={[
                                                styles.alertIndicator,
                                                { backgroundColor: getSeverityColor(alert.severity) }
                                            ]} />

                                            <View style={styles.alertContent}>
                                                {/* Header */}
                                                <View style={styles.alertHeader}>
                                                    <View style={styles.alertHeaderLeft}>
                                                        <View
                                                            style={[
                                                                styles.alertSeverityBadge,
                                                                {
                                                                    backgroundColor: `${getSeverityColor(alert.severity)}15`,
                                                                    borderColor: getSeverityColor(alert.severity),
                                                                },
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.alertSeverityText,
                                                                    { color: getSeverityColor(alert.severity) },
                                                                ]}
                                                            >
                                                                {alert.severity.toUpperCase()}
                                                            </Text>
                                                        </View>
                                                        <Text style={styles.alertService}>{alert.service}</Text>
                                                    </View>
                                                    <View style={styles.alertHeaderRight}>
                                                        <Text style={styles.alertTime}>{formatTime(alert.received_at)}</Text>
                                                        {!alert.acknowledged && (
                                                            <View style={styles.newDot} />
                                                        )}
                                                    </View>
                                                </View>

                                                {/* Message */}
                                                <Text style={styles.alertMessage} numberOfLines={2}>
                                                    {alert.message}
                                                </Text>

                                                {/* Footer */}
                                                <View style={styles.alertFooter}>
                                                    <Text style={styles.alertDate}>
                                                        {formatDate(alert.received_at)}
                                                    </Text>

                                                    {alert.acknowledged ? (
                                                        <View style={styles.ackBadge}>
                                                            <Text style={styles.ackBadgeIcon}>✓</Text>
                                                            <Text style={styles.ackBadgeText}>Acknowledged</Text>
                                                        </View>
                                                    ) : (
                                                        <TouchableOpacity
                                                            style={styles.ackButton}
                                                            onPress={() => handleQuickAcknowledge(alert.alert_id)}
                                                            disabled={acknowledgingId === alert.alert_id}
                                                        >
                                                            {acknowledgingId === alert.alert_id ? (
                                                                <ActivityIndicator size="small" color="#10b981" />
                                                            ) : (
                                                                <>
                                                                    <Text style={styles.ackButtonIcon}>✓</Text>
                                                                    <Text style={styles.ackButtonText}>Acknowledge</Text>
                                                                </>
                                                            )}
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                            </View>
                        )}
                    </View>

                    <View style={styles.bottomPadding} />
                </ScrollView>
            ) : activeTab === 'settings' ? (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >

                </ScrollView>
            ) : (
                <View style={styles.centerContainer}>
                    <Ionicons name="construct-outline" size={64} color="#6b7f72" />
                    <Text style={styles.emptyTitle}>Coming Soon</Text>
                    <Text style={styles.emptyText}>This feature is under development</Text>
                </View>
            )}

            <FooterNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
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
                            <Text style={styles.modalTitle}>Alert Details</Text>
                            <TouchableOpacity
                                onPress={() => setSelectedAlert(null)}
                                style={styles.closeButton}
                            >
                                <Text style={styles.closeButtonText}>×</Text>
                            </TouchableOpacity>
                        </View>

                        {selectedAlert && (
                            <ScrollView
                                style={styles.modalBody}
                                showsVerticalScrollIndicator={false}
                            >
                                {/* Severity Badge */}
                                <View
                                    style={[
                                        styles.modalSeverityBadge,
                                        {
                                            backgroundColor: `${getSeverityColor(selectedAlert.severity)}15`,
                                            borderColor: getSeverityColor(selectedAlert.severity),
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.modalSeverityText,
                                            { color: getSeverityColor(selectedAlert.severity) },
                                        ]}
                                    >
                                        {selectedAlert.severity.toUpperCase()}
                                    </Text>
                                </View>

                                {/* Service & Message */}
                                <Text style={styles.modalService}>{selectedAlert.service}</Text>
                                <Text style={styles.modalMessage}>{selectedAlert.message}</Text>
                                <Text style={styles.modalTime}>
                                    {formatDate(selectedAlert.received_at)} • {formatTime(selectedAlert.received_at)} ago
                                </Text>

                                {/* AI Explanation */}
                                <View style={styles.aiCard}>
                                    <Text style={styles.aiTitle}>AI Analysis</Text>

                                    {loadingExplanation ? (
                                        <View style={styles.aiLoading}>
                                            <ActivityIndicator size="small" color="#10b981" />
                                            <Text style={styles.aiLoadingText}>
                                                Analyzing alert...
                                            </Text>
                                        </View>
                                    ) : explanationError ? (
                                        <View style={styles.aiError}>
                                            <Text style={styles.aiErrorText}>{explanationError}</Text>
                                            <TouchableOpacity
                                                onPress={() => fetchAIExplanation(selectedAlert.alert_id)}
                                                style={styles.aiRetryButton}
                                            >
                                                <Text style={styles.aiRetryText}>Retry</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : aiExplanation?.explanation ? (
                                        <>
                                            <Text style={styles.aiText}>{aiExplanation.explanation}</Text>
                                            {aiExplanation.created_at && (
                                                <Text style={styles.aiTimestamp}>
                                                    Generated {formatDate(aiExplanation.created_at)}
                                                </Text>
                                            )}
                                        </>
                                    ) : (
                                        <Text style={styles.aiText}>No explanation available</Text>
                                    )}
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.actionButtons}>
                                    {/* Row 1 */}
                                    <View style={styles.actionRow}>
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
                                                    <Text style={[
                                                        styles.actionBtnIcon,
                                                        selectedAlert.acknowledged && styles.actionBtnIconAck
                                                    ]}>✓</Text>
                                                    <Text style={[
                                                        styles.actionBtnText,
                                                        selectedAlert.acknowledged && styles.actionBtnTextAck
                                                    ]}>
                                                        {selectedAlert.acknowledged ? 'Acknowledged' : 'Ack'}
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.actionBtn}>
                                            <Text style={styles.actionBtnIcon}>⏰</Text>
                                            <Text style={styles.actionBtnText}>Snooze</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Row 2 */}
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity style={styles.actionBtn}>
                                            <Text style={styles.actionBtnIcon}>🧪</Text>
                                            <Text style={styles.actionBtnText}>Dry-run</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.actionBtnPrimary}
                                            onPress={handleResolve}
                                            disabled={resolving}
                                        >
                                            {resolving ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <>
                                                    <Text style={styles.actionBtnPrimaryIcon}>✓</Text>
                                                    <Text style={styles.actionBtnPrimaryText}>Approve & Fix</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    errorIcon: {
        fontSize: 48,
        color: '#ef4444',
        marginBottom: 12,
    },
    errorText: {
        fontSize: 15,
        color: '#ef4444',
        marginBottom: 24,
        textAlign: 'center',
        paddingHorizontal: 32,
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
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        color: '#10b981',
        fontWeight: '700',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: '#6b7f72',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 0,
    },
    pageTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 24,
        letterSpacing: -1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#e5e7eb',
        marginBottom: 16,
        letterSpacing: -0.3,
    },
    statsContainer: {
        paddingHorizontal: 24,
        paddingTop: 60,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        backgroundColor: '#1c261f',
        borderRadius: 16,
        padding: 18,
        width: (width - 60) / 2,
        borderWidth: 1,
        borderColor: '#2d3a32',
    },
    statCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    statIconBadge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statIconText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    statTrend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    statTrendIcon: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    statTrendText: {
        fontSize: 11,
        fontWeight: '700',
    },
    statValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
        letterSpacing: -1,
    },
    statLabel: {
        fontSize: 13,
        color: '#6b7f72',
        fontWeight: '600',
    },
    chartSection: {
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    chartCard: {
        backgroundColor: '#1c261f',
        borderRadius: 20,
        padding: 20,
        paddingTop: 16,
        borderWidth: 1,
        borderColor: '#2d3a32',
    },
    chartContainer: {
        marginTop: 8,
        paddingVertical: 4,
    },
    chartBars: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 180,
        marginBottom: 16,
        paddingHorizontal: 8,
        paddingTop: 8,
    },
    barColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    barStack: {
        width: '70%',
        height: '100%',
        justifyContent: 'flex-end',
        gap: 2,
        overflow: 'hidden',
    },
    barSegment: {
        width: '100%',
        borderRadius: 6,
        minHeight: 4,
    },
    barLabel: {
        fontSize: 11,
        color: '#6b7f72',
        marginTop: 10,
        fontWeight: '700',
    },
    barCount: {
        fontSize: 10,
        color: '#10b981',
        marginTop: 4,
        fontWeight: '700',
    },
    chartLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#2d3a32',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 13,
        color: '#9ca3af',
        fontWeight: '600',
    },
    alertsSection: {
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    alertsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    alertCountBadge: {
        backgroundColor: '#10b98120',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#10b98140',
    },
    alertCountText: {
        color: '#10b981',
        fontSize: 14,
        fontWeight: '800',
    },
    alertsList: {
        gap: 14,
    },
    alertCard: {
        backgroundColor: '#1c261f',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2d3a32',
        flexDirection: 'row',
    },
    alertCardActive: {
        borderWidth: 2,
        borderColor: '#10b981',
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    alertIndicator: {
        width: 4,
    },
    alertContent: {
        flex: 1,
        padding: 16,
    },
    alertHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    alertHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    alertSeverityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
    },
    alertSeverityText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    alertService: {
        fontSize: 15,
        color: '#10b981',
        fontWeight: '700',
    },
    alertHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    alertTime: {
        fontSize: 13,
        color: '#6b7f72',
        fontWeight: '700',
    },
    newDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10b981',
    },
    alertMessage: {
        fontSize: 15,
        color: '#e5e7eb',
        lineHeight: 22,
        marginBottom: 14,
    },
    alertFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#2d3a32',
    },
    alertDate: {
        fontSize: 12,
        color: '#6b7f72',
        fontWeight: '500',
    },
    ackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10b98120',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
        borderWidth: 1,
        borderColor: '#10b98150',
    },
    ackButtonIcon: {
        fontSize: 12,
        color: '#10b981',
        fontWeight: 'bold',
    },
    ackButtonText: {
        fontSize: 13,
        color: '#10b981',
        fontWeight: '700',
    },
    ackBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10b98115',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
        borderWidth: 1,
        borderColor: '#10b98130',
    },
    ackBadgeIcon: {
        fontSize: 12,
        color: '#10b981',
        fontWeight: 'bold',
    },
    ackBadgeText: {
        fontSize: 13,
        color: '#10b981',
        fontWeight: '700',
    },
    bottomPadding: {
        height: 100,
    },
    footer: {
        flexDirection: 'row',
        backgroundColor: '#1c261f',
        borderTopWidth: 1,
        borderTopColor: '#2d3a32',
        paddingBottom: 20,
        paddingTop: 12,
        paddingHorizontal: 8,
    },
    footerTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    footerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    footerIconActive: {
        backgroundColor: '#10b98120',
    },
    footerLabel: {
        fontSize: 11,
        color: '#6b7f72',
        fontWeight: '600',
    },
    footerLabelActive: {
        color: '#10b981',
        fontWeight: '700',
    },
    settingsContainer: {
        paddingHorizontal: 24,
        paddingTop: 60,
    },
    settingsSection: {
        marginBottom: 32,
    },
    settingsSectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6b7f72',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    settingsCard: {
        backgroundColor: '#1c261f',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2d3a32',
        overflow: 'hidden',
    },
    accountInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    avatarCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#10b98120',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    accountDetails: {
        flex: 1,
    },
    accountName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    accountId: {
        fontSize: 13,
        color: '#6b7f72',
        fontWeight: '500',
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingHorizontal: 20,
    },
    settingsItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    settingsItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    settingsItemText: {
        fontSize: 15,
        color: '#e5e7eb',
        fontWeight: '600',
    },
    settingsValueText: {
        fontSize: 14,
        color: '#6b7f72',
        fontWeight: '500',
    },
    settingsToggle: {
        backgroundColor: '#10b98120',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#10b98140',
    },
    settingsToggleText: {
        fontSize: 13,
        color: '#10b981',
        fontWeight: '700',
    },
    settingsDivider: {
        height: 1,
        backgroundColor: '#2d3a32',
        marginLeft: 54,
    },
    signOutButtonLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ef4444',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 10,
        marginTop: 8,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    signOutButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
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
    closeButtonText: {
        fontSize: 28,
        color: '#6b7f72',
        fontWeight: '300',
        marginTop: -2,
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
    aiTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#10b981',
        marginBottom: 14,
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
    aiError: {
        alignItems: 'center',
    },
    aiErrorText: {
        fontSize: 14,
        color: '#ef4444',
        marginBottom: 16,
        textAlign: 'center',
    },
    aiRetryButton: {
        backgroundColor: '#10b981',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    aiRetryText: {
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    aiTimestamp: {
        fontSize: 12,
        color: '#6b7f72',
        marginTop: 16,
        fontStyle: 'italic',
    },
    actionButtons: {
        gap: 12,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
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
    actionBtnIcon: {
        fontSize: 16,
        color: '#e5e7eb',
    },
    actionBtnIconAck: {
        color: '#10b981',
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#e5e7eb',
    },
    actionBtnTextAck: {
        color: '#10b981',
    },
    actionBtnPrimary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#10b981',
        paddingVertical: 14,
        borderRadius: 12,
    },
    actionBtnPrimaryIcon: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    actionBtnPrimaryText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
});

export default DashboardScreen;