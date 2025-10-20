import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Share,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import FooterNavigation, { TabName } from '../components/shared/Footer';
import { reportsService, Alert as AlertType, MonthlyStats, ChartBucket } from '../services/reports.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;

export default function ReportsPage() {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState<TabName>('reports');
    const [loading, setLoading] = useState(true);
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
        total: 0,
        acked: 0,
        mttrMs: 0,
        topService: '—',
    });
    const [todayAlerts, setTodayAlerts] = useState<AlertType[]>([]);
    const [error, setError] = useState<string | null>(null);

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

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                setError(null);

                const [stats, alerts] = await Promise.all([
                    reportsService.fetchMonthlyStats(),
                    reportsService.fetchTodayAlerts(),
                ]);

                setMonthlyStats(stats);
                setTodayAlerts(alerts);
            } catch (e: any) {
                console.error('Error loading reports:', e);
                setError(e.message || 'Failed to load reports');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    const { data: serviceChartData, services } = useMemo(() =>
            reportsService.aggregateByService(todayAlerts),
        [todayAlerts]
    );

    const priorityChartData = useMemo(() =>
            reportsService.aggregateByPriority(todayAlerts),
        [todayAlerts]
    );

    const monthlyUI = useMemo(() => {
        const ackRate = monthlyStats.total ? (monthlyStats.acked / monthlyStats.total) : 0;
        return {
            totalAlerts: monthlyStats.total.toLocaleString(),
            mttr: reportsService.formatDuration(monthlyStats.mttrMs),
            ackRatePct: `${(ackRate * 100).toFixed(0)}%`,
            topNoisyService: monthlyStats.topService,
        };
    }, [monthlyStats]);

    const exportCSV = async () => {
        const severityToPriority = (severity: string | undefined): string => {
            if (!severity) return 'unknown';
            const sev = severity.toLowerCase();
            if (sev === 'critical') return 'p1';
            if (sev === 'high') return 'p2';
            if (sev === 'medium' || sev === 'low') return 'p3';
            return 'unknown';
        };

        const rows = todayAlerts.map(alert => ({
            AlertID: alert.alert_id || '',
            Service: alert.service || '',
            Priority: severityToPriority(alert.severity),
            Severity: alert.severity || '',
            Message: alert.message || '',
            ReceivedAt: alert.received_at || '',
            Status: alert.status || '',
        }));

        const cols = Object.keys(rows[0] || {});
        const header = cols.join(',');
        const body = rows
            .map((r) =>
                cols
                    .map((c) => {
                        const v = r[c as keyof typeof r];
                        const s = String(v ?? '');
                        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                    })
                    .join(',')
            )
            .join('\n');
        const csv = `${header}\n${body}\n`;

        try {
            await Share.share({
                message: csv,
                title: 'Alerts Report CSV',
            });
        } catch (e: any) {
            Alert.alert('Error', 'Failed to export CSV');
        }
    };

    const exportJSON = async () => {
        const payload = {
            generated_at: new Date().toISOString(),
            monthly: monthlyStats,
            overnightByPriority: priorityChartData,
            alertsByService: serviceChartData,
        };

        try {
            await Share.share({
                message: JSON.stringify(payload, null, 2),
                title: 'Report JSON',
            });
        } catch (e: any) {
            Alert.alert('Error', 'Failed to export JSON');
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Reports</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={styles.loadingText}>Loading reports...</Text>
                </View>
                <FooterNavigation activeTab={activeTab} onTabChange={handleTabChange} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Reports</Text>
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={48} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        onPress={() => {
                            setLoading(true);
                            setError(null);
                        }}
                        style={styles.retryButton}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
                <FooterNavigation activeTab={activeTab} onTabChange={handleTabChange} />
            </View>
        );
    }

    // Prepare chart data
    const priorityLabels = priorityChartData.map(d => d.hour);
    const priorityP1Data = priorityChartData.map(d => d.p1);
    const priorityP2Data = priorityChartData.map(d => d.p2);
    const priorityP3Data = priorityChartData.map(d => d.p3);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Reports</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={exportCSV} style={styles.exportButton}>
                        <Ionicons name="download" size={20} color="#10b981" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={exportJSON} style={styles.exportButton}>
                        <Text style={styles.exportButtonText}>{'{ }'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Monthly KPIs */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Monthly Overview</Text>
                    <View style={styles.statsGrid}>
                        <StatCard
                            icon="megaphone"
                            label="Total Alerts"
                            value={monthlyUI.totalAlerts}
                            color="#10b981"
                        />
                        <StatCard
                            icon="timer"
                            label="MTTR"
                            value={monthlyUI.mttr}
                            color="#3b82f6"
                        />
                        <StatCard
                            icon="checkmark-done"
                            label="Ack Rate"
                            value={monthlyUI.ackRatePct}
                            color="#8b5cf6"
                        />
                        <StatCard
                            icon="alert-circle"
                            label="Top Service"
                            value={monthlyUI.topNoisyService}
                            color="#f59e0b"
                            valueStyle={{ fontSize: 14 }}
                        />
                    </View>
                </View>

                {/* Priority Chart */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Alerts by Priority (Today 00:00 - {currentTime})
                    </Text>
                    <View style={styles.chartContainer}>
                        {priorityChartData.every(d => d.p1 === 0 && d.p2 === 0 && d.p3 === 0) ? (
                            <View style={styles.noDataContainer}>
                                <Ionicons name="information-circle" size={48} color="#6b7f72" />
                                <Text style={styles.noDataText}>No alert data for today</Text>
                            </View>
                        ) : (
                            <>
                                <LineChart
                                    data={{
                                        labels: formatChartLabels(priorityChartData, 8), // ✅ Show max 8 labels
                                        datasets: [
                                            {
                                                data: priorityP1Data,
                                                color: () => '#ef4444',
                                                strokeWidth: 2,
                                            },
                                            {
                                                data: priorityP2Data,
                                                color: () => '#f59e0b',
                                                strokeWidth: 2,
                                            },
                                            {
                                                data: priorityP3Data,
                                                color: () => '#3b82f6',
                                                strokeWidth: 2,
                                            },
                                        ],
                                        legend: ['P1', 'P2', 'P3'],
                                    }}
                                    width={CHART_WIDTH - 16} // ✅ Add some padding
                                    height={220}
                                    chartConfig={chartConfig}
                                    bezier
                                    style={styles.chart}
                                    withHorizontalLabels={true}
                                    withVerticalLabels={true}
                                    withDots={false} // ✅ Remove dots for cleaner look
                                    fromZero={true}
                                />
                                <View style={styles.legendContainer}>
                                    <LegendItem color="#ef4444" label="P1 (Critical)" />
                                    <LegendItem color="#f59e0b" label="P2 (High)" />
                                    <LegendItem color="#3b82f6" label="P3 (Medium/Low)" />
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Service Chart */}
                {services.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Alerts by Service (Today 00:00 - {currentTime})
                        </Text>
                        <View style={styles.chartContainer}>
                            {serviceChartData.every((bucket: ChartBucket) => {
                                return services.every(service => {
                                    const value = bucket[service];
                                    return typeof value === 'number' ? value === 0 : true;
                                });
                            }) ? (
                                <View style={styles.noDataContainer}>
                                    <Ionicons name="information-circle" size={48} color="#6b7f72" />
                                    <Text style={styles.noDataText}>No service data for today</Text>
                                </View>
                            ) : (
                                <>
                                    <LineChart
                                        data={{
                                            labels: formatChartLabels(serviceChartData, 8), // ✅ Show max 8 labels
                                            datasets: services.slice(0, 5).map((service, idx) => {
                                                const colors = ['#10b981', '#6366f1', '#ec4899', '#f59e0b', '#8b5cf6'];
                                                return {
                                                    data: serviceChartData.map((bucket: ChartBucket) => {
                                                        const value = bucket[service];
                                                        return typeof value === 'number' ? value : 0;
                                                    }),
                                                    color: () => colors[idx] || '#10b981',
                                                    strokeWidth: 2,
                                                };
                                            }),
                                            legend: services.slice(0, 5),
                                        }}
                                        width={CHART_WIDTH - 16} // ✅ Add some padding
                                        height={220}
                                        chartConfig={chartConfig}
                                        bezier
                                        style={styles.chart}
                                        withHorizontalLabels={true}
                                        withVerticalLabels={true}
                                        withDots={false} // ✅ Remove dots for cleaner look
                                        fromZero={true}
                                    />
                                    <View style={styles.legendContainer}>
                                        {services.slice(0, 5).map((service, idx) => {
                                            const colors = ['#10b981', '#6366f1', '#ec4899', '#f59e0b', '#8b5cf6'];
                                            return (
                                                <LegendItem
                                                    key={service}
                                                    color={colors[idx] || '#10b981'}
                                                    label={service}
                                                />
                                            );
                                        })}
                                    </View>

                                    {/* Service Totals Summary */}
                                    <View style={styles.serviceSummary}>
                                        {services.slice(0, 5).map((service, idx) => {
                                            const colors = ['#10b981', '#6366f1', '#ec4899', '#f59e0b', '#8b5cf6'];
                                            const serviceData = serviceChartData.map((bucket: ChartBucket) => {
                                                const value = bucket[service];
                                                return typeof value === 'number' ? value : 0;
                                            });
                                            const total = serviceData.reduce((a, b) => a + b, 0);

                                            return (
                                                <View key={service} style={styles.serviceItem}>
                                                    <View style={styles.serviceHeader}>
                                                        <View style={styles.serviceNameContainer}>
                                                            <View
                                                                style={[
                                                                    styles.serviceDot,
                                                                    { backgroundColor: colors[idx] },
                                                                ]}
                                                            />
                                                            <Text style={styles.serviceName}>{service}</Text>
                                                        </View>
                                                        <Text style={styles.serviceTotal}>{total} alerts</Text>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            <FooterNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        </View>
    );
}

function StatCard({
                      icon,
                      label,
                      value,
                      color,
                      valueStyle,
                  }: {
    icon: string;
    label: string;
    value: string;
    color: string;
    valueStyle?: any;
}) {
    return (
        <View style={styles.statCard}>
            <Ionicons name={icon as any} size={20} color={color} />
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, valueStyle]}>{value}</Text>
        </View>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
        </View>
    );
}

const formatChartLabels = (data: any[], maxLabels: number = 8) => {
    if (data.length <= maxLabels) return data.map(d => d.hour);

    const step = Math.ceil(data.length / maxLabels);
    return data.map((d, idx) => (idx % step === 0 ? d.hour : ''));
};

// Update the chart config
const chartConfig = {
    backgroundColor: '#1c261f',
    backgroundGradientFrom: '#1c261f',
    backgroundGradientTo: '#1c261f',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
    style: {
        borderRadius: 12,
    },
    propsForDots: {
        r: '2',
        strokeWidth: '1',
        stroke: '#10b981',
    },
    propsForBackgroundLines: {
        strokeDasharray: '',
        stroke: '#374151',
        strokeWidth: 1,
    },
    // ✅ Better label formatting
    formatXLabel: (value: string) => value,
    propsForLabels: {
        fontSize: 10,
    },
};

const currentTime = reportsService.formatCurrentTime();


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111813',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#2d3a32',
        backgroundColor: '#111813',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    serviceSummary: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#2d3a32',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    exportButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#1c261f',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2d3a32',
    },
    exportButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#10b981',
    },
    scrollView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#6b7f72',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        gap: 16,
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#10b981',
        borderRadius: 8,
        marginTop: 8,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        flex: 1,
        minWidth: '47%',
        padding: 16,
        backgroundColor: '#1c261f',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2d3a32',
        gap: 8,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7f72',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    chartContainer: {
        backgroundColor: '#1c261f',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2d3a32',
        padding: 16,
        overflow: 'hidden', // ✅ Prevent overflow
    },
    chart: {
        marginVertical: 8,
        borderRadius: 12,
        paddingRight: 0, // ✅ Remove extra padding
    },
    chartNote: {
        fontSize: 12,
        color: '#6b7f72',
        marginBottom: 12,
    },
    legendContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginTop: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    noDataContainer: {
        padding: 32,
        alignItems: 'center',
        gap: 12,
    },
    noDataText: {
        fontSize: 14,
        color: '#6b7f72',
    },
    serviceItem: {
        marginBottom: 12,
    },
    serviceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#111813',
        borderRadius: 8,
    },
    serviceNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    serviceDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    serviceName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    serviceTotal: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7f72',
    },
});