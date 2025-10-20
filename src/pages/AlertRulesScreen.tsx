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
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AddAlertRuleModal } from '../components/shared/AddAlertRuleModal';
import FooterNavigation, {TabName} from "../components/shared/Footer";
import {useNavigation} from "@react-navigation/native";
import {
    alertRulesApi,
    AlertRule,
    Integration,
    RuleType
} from '../services/alert-rules.service';
import {slackApi, teamsApi} from "../services/integrations.service";


export default function AlertRulesScreen() {
    const [rules, setRules] = useState<AlertRule[]>([]);
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [filterType, setFilterType] = useState<'all' | RuleType>('all');
    const [activeTab, setActiveTab] = useState<TabName>('rules');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
    const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
    const navigation = useNavigation();

    const handleTabChange = (tab: TabName) => {
        setActiveTab(tab);

        if (tab === 'dashboard') {
            navigation.navigate('Dashboard' as never);
        } else if (tab === 'oncall') {
            navigation.navigate('OnCall' as never);
        } else if (tab === 'reports') {
            navigation.navigate('Reports' as never);
        } else if (tab === 'settings') {
            navigation.navigate('Settings' as never);
        } else if (tab === 'incidents') {
            navigation.navigate('Incidents' as never);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchRules(), fetchIntegrations()]);
        } catch (error: any) {
            console.error('Error loading data:', error);
            Alert.alert('Error', error.message || 'Failed to load alert rules');
        } finally {
            setLoading(false);
        }
    };

    const fetchRules = async () => {
        try {
            const response = await alertRulesApi.listRules();
            console.log('Fetched rules:', response);
            setRules(response.items || []);
        } catch (error: any) {
            console.error('Error fetching rules:', error);
            Alert.alert('Error', error.message || 'Failed to fetch rules');
            setRules([]);
        }
    };

    const fetchIntegrations = async () => {
        try {
            const [slackStatus, teamsStatus] = await Promise.all([
                slackApi.getStatus(),
                teamsApi.getStatus()
            ]);

            const mockIntegrations: Integration[] = [];

            if (slackStatus.connected) {
                mockIntegrations.push({
                    id: slackStatus.id || 'slack_1',
                    name: `Slack - ${slackStatus.teamName}`,
                    type: 'slack',
                    channel_name: slackStatus.teamName,
                });
            }

            if (teamsStatus.connected) {
                mockIntegrations.push({
                    id: teamsStatus.id || 'teams_1',
                    name: `Teams - ${teamsStatus.teamName}`,
                    type: 'teams',
                    channel_name: teamsStatus.channelName,
                    team_name: teamsStatus.teamName,
                });
            }

            setIntegrations(mockIntegrations);
        } catch (error) {
            console.error('Error fetching integrations:', error);
        }
    };
    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleDeleteRule = (rule: AlertRule) => {
        Alert.alert(
            'Delete Rule',
            `Are you sure you want to delete "${rule.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await alertRulesApi.deleteRule(rule.id);
                            setRules(prev => prev.filter(r => r.id !== rule.id));
                            Alert.alert('Success', 'Rule deleted successfully');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete rule');
                        }
                    },
                },
            ]
        );
    };

    const handleToggleStatus = async (rule: AlertRule) => {
        try {
            const newStatus = rule.status === 'active' ? 'inactive' : 'active';
            const response = await alertRulesApi.toggleRuleStatus(rule.id, newStatus);

            if (response.rule) {
                setRules(prev =>
                    prev.map(r =>
                        r.id === rule.id ? { ...r, ...response.rule } : r
                    )
                );
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update rule status');
        }
    };

    const handleEditRule = (rule: AlertRule) => {
        setEditingRule(rule);
        setShowAddModal(true);
    };

    const handleSaveRule = async (ruleData: any) => {
        try {
            if (editingRule) {
                // Update existing rule
                console.log('Updating rule:', editingRule.id, ruleData);
                const response = await alertRulesApi.updateRule(editingRule.id, ruleData);

                // Add type guard to ensure rule exists
                if (response.rule) {
                    setRules(prev =>
                        prev.map(r =>
                            r.id === editingRule.id ? response.rule! : r
                        )
                    );
                    Alert.alert('Success', 'Rule updated successfully');
                } else {
                    throw new Error('No rule returned from server');
                }
            } else {
                // Create new rule
                console.log('Creating rule:', ruleData);
                const response = await alertRulesApi.createRule(ruleData);

                // Add type guard to ensure rule exists
                if (response.rule) {
                    setRules(prev => [...prev, response.rule!]);
                    Alert.alert('Success', 'Rule created successfully');
                } else {
                    throw new Error('No rule returned from server');
                }
            }

            setEditingRule(null);
        } catch (error: any) {
            console.error('Error saving rule:', error);
            Alert.alert('Error', error.message || 'Failed to save rule');
            throw error;
        }
    };

    const filteredRules = rules.filter(rule => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (
                !rule.name.toLowerCase().includes(query) &&
                !rule.description?.toLowerCase().includes(query)
            ) {
                return false;
            }
        }

        if (filterStatus !== 'all' && rule.status !== filterStatus) {
            return false;
        }

        if (filterType !== 'all' && rule.rule_type !== filterType) {
            return false;
        }

        return true;
    });

    const getRuleTypeIcon = (type: RuleType) => {
        switch (type) {
            case 'route': return 'git-branch';
            case 'mute': return 'volume-mute';
            case 'override': return 'flag';
            case 'standard': return 'settings';
            default: return 'settings';
        }
    };

    const getRuleTypeColor = (type: RuleType) => {
        switch (type) {
            case 'route': return '#3b82f6';
            case 'mute': return '#ef4444';
            case 'override': return '#f59e0b';
            case 'standard': return '#6b7280';
            default: return '#6b7280';
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>Loading rules...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Alert Rules</Text>
                    <Text style={styles.headerSubtitle}>
                        {filteredRules.length} rule{filteredRules.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => {
                        setEditingRule(null);
                        setShowAddModal(true);
                    }}
                    style={styles.addButton}
                >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Add Rule</Text>
                </TouchableOpacity>
            </View>

            {/* Search and Filters */}
            <View style={styles.filtersContainer}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={18} color="#6b7f72" />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search rules..."
                        placeholderTextColor="#6b7f72"
                        style={styles.searchInput}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#6b7f72" />
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterChips}
                    contentContainerStyle={styles.filterChipsContent}
                >
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            filterStatus === 'all' && styles.filterChipActive,
                        ]}
                        onPress={() => setFilterStatus('all')}
                    >
                        <Text
                            style={[
                                styles.filterChipText,
                                filterStatus === 'all' && styles.filterChipTextActive,
                            ]}
                        >
                            All
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            filterStatus === 'active' && styles.filterChipActive,
                        ]}
                        onPress={() => setFilterStatus('active')}
                    >
                        <Text
                            style={[
                                styles.filterChipText,
                                filterStatus === 'active' && styles.filterChipTextActive,
                            ]}
                        >
                            Active
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            filterStatus === 'inactive' && styles.filterChipActive,
                        ]}
                        onPress={() => setFilterStatus('inactive')}
                    >
                        <Text
                            style={[
                                styles.filterChipText,
                                filterStatus === 'inactive' && styles.filterChipTextActive,
                            ]}
                        >
                            Inactive
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.filterDivider} />

                    {(['all', 'route', 'mute', 'override', 'standard'] as const).map(type => (
                        <TouchableOpacity
                            key={type}
                            style={[
                                styles.filterChip,
                                filterType === type && styles.filterChipActive,
                            ]}
                            onPress={() => setFilterType(type)}
                        >
                            <Text
                                style={[
                                    styles.filterChipText,
                                    filterType === type && styles.filterChipTextActive,
                                ]}
                            >
                                {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Rules List */}
            <ScrollView
                style={styles.rulesList}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#10b981"
                    />
                }
            >
                {filteredRules.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="file-tray-outline" size={64} color="#6b7f72" />
                        <Text style={styles.emptyStateTitle}>No rules found</Text>
                        <Text style={styles.emptyStateText}>
                            {searchQuery || filterStatus !== 'all' || filterType !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Create your first alert rule to get started'}
                        </Text>
                    </View>
                ) : (
                    filteredRules.map(rule => (
                        <View key={rule.id} style={styles.ruleCard}>
                            {/* Rule Header */}
                            <TouchableOpacity
                                style={styles.ruleHeader}
                                onPress={() =>
                                    setExpandedRuleId(
                                        expandedRuleId === rule.id ? null : rule.id
                                    )
                                }
                            >
                                <View style={styles.ruleHeaderLeft}>
                                    <View
                                        style={[
                                            styles.ruleTypeIcon,
                                            { backgroundColor: `${getRuleTypeColor(rule.rule_type)}20` },
                                        ]}
                                    >
                                        <Ionicons
                                            name={getRuleTypeIcon(rule.rule_type) as any}
                                            size={18}
                                            color={getRuleTypeColor(rule.rule_type)}
                                        />
                                    </View>
                                    <View style={styles.ruleInfo}>
                                        <Text style={styles.ruleName}>{rule.name}</Text>
                                        {rule.description && (
                                            <Text style={styles.ruleDescription} numberOfLines={1}>
                                                {rule.description}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                <Ionicons
                                    name={expandedRuleId === rule.id ? 'chevron-up' : 'chevron-down'}
                                    size={20}
                                    color="#6b7f72"
                                />
                            </TouchableOpacity>

                            {/* Rule Meta */}
                            <View style={styles.ruleMeta}>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        rule.status === 'active'
                                            ? styles.statusBadgeActive
                                            : styles.statusBadgeInactive,
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.statusDot,
                                            rule.status === 'active'
                                                ? styles.statusDotActive
                                                : styles.statusDotInactive,
                                        ]}
                                    />
                                    <Text
                                        style={[
                                            styles.statusText,
                                            rule.status === 'active'
                                                ? styles.statusTextActive
                                                : styles.statusTextInactive,
                                        ]}
                                    >
                                        {rule.status}
                                    </Text>
                                </View>
                                <Text style={styles.priorityText}>Priority: {rule.priority}</Text>
                                {rule.trigger_count !== undefined && (
                                    <Text style={styles.triggerCount}>
                                        {rule.trigger_count} trigger{rule.trigger_count !== 1 ? 's' : ''}
                                    </Text>
                                )}
                            </View>

                            {/* Expanded Details */}
                            {expandedRuleId === rule.id && (
                                <View style={styles.ruleDetails}>
                                    {/* Conditions */}
                                    {(rule.conditions.severity ||
                                        rule.conditions.priority_level ||
                                        rule.conditions.service) && (
                                        <View style={styles.detailSection}>
                                            <Text style={styles.detailLabel}>Conditions:</Text>
                                            {rule.conditions.severity && (
                                                <View style={styles.detailChips}>
                                                    {rule.conditions.severity.map(sev => (
                                                        <View key={sev} style={styles.detailChip}>
                                                            <Text style={styles.detailChipText}>
                                                                {sev}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                            {rule.conditions.priority_level && (
                                                <View style={styles.detailChips}>
                                                    {rule.conditions.priority_level.map(p => (
                                                        <View key={p} style={styles.detailChip}>
                                                            <Text style={styles.detailChipText}>{p}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                            {rule.conditions.service && (
                                                <View style={styles.detailChips}>
                                                    {rule.conditions.service.map(svc => (
                                                        <View key={svc} style={styles.detailChip}>
                                                            <Text style={styles.detailChipText}>
                                                                {svc}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    {/* Actions */}
                                    {rule.actions.length > 0 && (
                                        <View style={styles.detailSection}>
                                            <Text style={styles.detailLabel}>Sends to:</Text>
                                            {rule.actions.map((action, idx) => {
                                                const integration = integrations.find(
                                                    i => i.id === action.integration_id
                                                );
                                                return (
                                                    <Text key={idx} style={styles.detailText}>
                                                        • {integration?.name || action.integration_type}
                                                    </Text>
                                                );
                                            })}
                                        </View>
                                    )}

                                    {/* Features */}
                                    <View style={styles.detailFeatures}>
                                        {rule.quiet_hours?.enabled && (
                                            <View style={styles.featureBadge}>
                                                <Ionicons name="moon" size={14} color="#10b981" />
                                                <Text style={styles.featureBadgeText}>
                                                    Quiet Hours
                                                </Text>
                                            </View>
                                        )}
                                        {rule.priority_override?.enabled && (
                                            <View style={styles.featureBadge}>
                                                <Ionicons name="flag" size={14} color="#f59e0b" />
                                                <Text style={styles.featureBadgeText}>
                                                    Override to {rule.priority_override.new_priority}
                                                </Text>
                                            </View>
                                        )}
                                        {rule.digest_settings?.enabled && (
                                            <View style={styles.featureBadge}>
                                                <Ionicons name="mail" size={14} color="#3b82f6" />
                                                <Text style={styles.featureBadgeText}>
                                                    {rule.digest_settings.frequency} digest
                                                </Text>
                                            </View>
                                        )}
                                        {rule.mute_settings?.mute_until && (
                                            <View style={styles.featureBadge}>
                                                <Ionicons name="time" size={14} color="#ef4444" />
                                                <Text style={styles.featureBadgeText}>
                                                    Muted until {new Date(rule.mute_settings.mute_until).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Actions */}
                                    <View style={styles.ruleActions}>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => handleToggleStatus(rule)}
                                        >
                                            <Ionicons
                                                name={rule.status === 'active' ? 'pause' : 'play'}
                                                size={16}
                                                color="#10b981"
                                            />
                                            <Text style={styles.actionButtonText}>
                                                {rule.status === 'active' ? 'Disable' : 'Enable'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => handleEditRule(rule)}
                                        >
                                            <Ionicons name="create" size={16} color="#3b82f6" />
                                            <Text style={[styles.actionButtonText, { color: '#3b82f6' }]}>
                                                Edit
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => handleDeleteRule(rule)}
                                        >
                                            <Ionicons name="trash" size={16} color="#ef4444" />
                                            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
                                                Delete
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Last Triggered */}
                                    {rule.last_triggered_at && (
                                        <Text style={styles.lastTriggered}>
                                            Last triggered: {new Date(rule.last_triggered_at).toLocaleString()}
                                        </Text>
                                    )}
                                </View>
                            )}
                        </View>
                    ))
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Add/Edit Modal */}
            <AddAlertRuleModal
                visible={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setEditingRule(null);
                }}
                onSave={handleSaveRule}
                editingRule={editingRule}
                integrations={integrations}
            />

            <FooterNavigation
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111813',
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
    headerSubtitle: {
        fontSize: 14,
        color: '#6b7f72',
        marginTop: 4,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#10b981',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    filtersContainer: {
        padding: 20,
        paddingBottom: 12,
        backgroundColor: '#0f1612',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111813',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2d3a32',
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#FFFFFF',
    },
    filterChips: {
        flexGrow: 0,
    },
    filterChipsContent: {
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#111813',
        borderWidth: 1,
        borderColor: '#2d3a32',
    },
    filterChipActive: {
        backgroundColor: '#10b98120',
        borderColor: '#10b981',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7f72',
    },
    filterChipTextActive: {
        color: '#10b981',
    },
    filterDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#2d3a32',
        marginHorizontal: 4,
    },
    rulesList: {
        flex: 1,
        padding: 20,
    },
    ruleCard: {
        backgroundColor: '#111813',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2d3a32',
        overflow: 'hidden',
    },
    ruleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    ruleHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    ruleTypeIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ruleInfo: {
        flex: 1,
    },
    ruleName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    ruleDescription: {
        fontSize: 13,
        color: '#6b7f72',
    },
    ruleMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 6,
    },
    statusBadgeActive: {
        backgroundColor: '#10b98120',
    },
    statusBadgeInactive: {
        backgroundColor: '#6b7f7220',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusDotActive: {
        backgroundColor: '#10b981',
    },
    statusDotInactive: {
        backgroundColor: '#6b7f72',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusTextActive: {
        color: '#10b981',
    },
    statusTextInactive: {
        color: '#6b7f72',
    },
    priorityText: {
        fontSize: 12,
        color: '#6b7f72',
        fontWeight: '600',
    },
    triggerCount: {
        fontSize: 12,
        color: '#6b7f72',
    },
    ruleDetails: {
        borderTopWidth: 1,
        borderTopColor: '#2d3a32',
        padding: 16,
        gap: 16,
    },
    detailSection: {
        gap: 8,
    },
    detailLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#10b981',
    },
    detailText: {
        fontSize: 13,
        color: '#e5e7eb',
        lineHeight: 20,
    },
    detailChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    detailChip: {
        backgroundColor: '#0f1612',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#2d3a32',
    },
    detailChipText: {
        fontSize: 12,
        color: '#e5e7eb',
        fontWeight: '600',
    },
    detailFeatures: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    featureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#0f1612',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#2d3a32',
    },
    featureBadgeText: {
        fontSize: 12,
        color: '#e5e7eb',
        fontWeight: '600',
    },
    ruleActions: {
        flexDirection: 'row',
        gap: 8,
        paddingTop: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#0f1612',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2d3a32',
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#10b981',
    },
    lastTriggered: {
        fontSize: 11,
        color: '#6b7f72',
        textAlign: 'center',
        paddingTop: 8,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#6b7f72',
        textAlign: 'center',
        maxWidth: 300,
    },
});