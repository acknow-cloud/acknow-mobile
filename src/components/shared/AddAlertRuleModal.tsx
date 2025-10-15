import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type RuleType = 'route' | 'mute' | 'override' | 'standard';
type Severity = 'critical' | 'warning' | 'info';
type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';
type IntegrationType = 'slack' | 'teams' | 'email' | 'mobile_push' | 'digest';

interface Integration {
    id: string;
    name: string;
    type: IntegrationType;
    channel_name?: string;
    team_name?: string;
}

interface AlertRule {
    name: string;
    description?: string;
    status: 'active' | 'inactive';
    priority: number;
    rule_type: RuleType;

    // Conditions
    conditions: {
        severity?: Severity[];
        priority_level?: PriorityLevel[];
        service?: string[];
        message_contains?: string[];
    };

    // Actions
    actions: Array<{
        integration_id: string;
        integration_type: IntegrationType;
        enabled: boolean;
        route_to?: {
            notification_level?: 'urgent' | 'normal' | 'low';
        };
    }>;

    // Quiet Hours
    quiet_hours?: {
        enabled: boolean;
        timezone: string;
        schedules: Array<{
            days: number[];
            start_time: string;
            end_time: string;
        }>;
        behavior: 'suppress' | 'queue' | 'downgrade';
    };

    // Priority Override
    priority_override?: {
        enabled: boolean;
        new_priority: PriorityLevel;
        reason?: string;
    };

    // Mute Settings
    mute_settings?: {
        mute_until?: string;
        mute_reason?: string;
        auto_unmute?: boolean;
    };

    // Digest Settings
    digest_settings?: {
        enabled: boolean;
        frequency: 'hourly' | 'daily' | 'weekly';
        time?: string;
        max_alerts?: number;
    };

    cooldown_minutes?: number;
}

interface AddAlertRuleModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (rule: AlertRule) => Promise<void>;
    integrations?: Integration[];
}

export const AddAlertRuleModal: React.FC<AddAlertRuleModalProps> = ({
                                                                        visible,
                                                                        onClose,
                                                                        onSave,
                                                                        integrations = [],
                                                                    }) => {
    // Basic Info
    const [ruleName, setRuleName] = useState('');
    const [description, setDescription] = useState('');
    const [ruleType, setRuleType] = useState<RuleType>('route');
    const [priority, setPriority] = useState('10');
    const [enabled, setEnabled] = useState(true);

    // Conditions
    const [selectedSeverities, setSelectedSeverities] = useState<Severity[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<PriorityLevel[]>([]);
    const [services, setServices] = useState('');
    const [messageContains, setMessageContains] = useState('');

    // Actions
    const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
    const [notificationLevel, setNotificationLevel] = useState<'urgent' | 'normal' | 'low'>('normal');

    // Quiet Hours
    const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
    const [timezone, setTimezone] = useState('America/New_York');
    const [startTime, setStartTime] = useState('22:00');
    const [endTime, setEndTime] = useState('08:00');
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
    const [quietBehavior, setQuietBehavior] = useState<'suppress' | 'queue' | 'downgrade'>('queue');

    // Priority Override
    const [overrideEnabled, setOverrideEnabled] = useState(false);
    const [newPriority, setNewPriority] = useState<PriorityLevel>('P3');
    const [overrideReason, setOverrideReason] = useState('');

    // Mute Settings
    const [muteUntil, setMuteUntil] = useState('');
    const [muteReason, setMuteReason] = useState('');

    // Digest Settings
    const [digestEnabled, setDigestEnabled] = useState(false);
    const [digestFrequency, setDigestFrequency] = useState<'hourly' | 'daily' | 'weekly'>('daily');
    const [digestTime, setDigestTime] = useState('09:00');
    const [maxAlerts, setMaxAlerts] = useState('50');

    // Other
    const [cooldown, setCooldown] = useState('15');
    const [saving, setSaving] = useState(false);

    const severities: Severity[] = ['critical', 'warning', 'info'];
    const priorityLevels: PriorityLevel[] = ['P1', 'P2', 'P3', 'P4'];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const ruleTypes: { value: RuleType; label: string; icon: string; description: string }[] = [
        {
            value: 'route',
            label: 'Routing Rule',
            icon: 'git-branch',
            description: 'Route alerts to specific channels',
        },
        {
            value: 'mute',
            label: 'Mute Rule',
            icon: 'volume-mute',
            description: 'Temporarily silence matching alerts',
        },
        {
            value: 'override',
            label: 'Priority Override',
            icon: 'flag',
            description: 'Change alert priority automatically',
        },
        {
            value: 'standard',
            label: 'Standard Rule',
            icon: 'settings',
            description: 'Custom alert handling rule',
        },
    ];

    const toggleSeverity = (severity: Severity) => {
        setSelectedSeverities(prev =>
            prev.includes(severity)
                ? prev.filter(s => s !== severity)
                : [...prev, severity]
        );
    };

    const togglePriority = (p: PriorityLevel) => {
        setSelectedPriorities(prev =>
            prev.includes(p)
                ? prev.filter(pr => pr !== p)
                : [...prev, p]
        );
    };

    const toggleDay = (dayIndex: number) => {
        setSelectedDays(prev =>
            prev.includes(dayIndex)
                ? prev.filter(d => d !== dayIndex)
                : [...prev, dayIndex]
        );
    };

    const toggleIntegration = (integrationId: string) => {
        setSelectedIntegrations(prev =>
            prev.includes(integrationId)
                ? prev.filter(id => id !== integrationId)
                : [...prev, integrationId]
        );
    };

    const resetForm = () => {
        setRuleName('');
        setDescription('');
        setRuleType('route');
        setPriority('10');
        setEnabled(true);
        setSelectedSeverities([]);
        setSelectedPriorities([]);
        setServices('');
        setMessageContains('');
        setSelectedIntegrations([]);
        setNotificationLevel('normal');
        setQuietHoursEnabled(false);
        setTimezone('America/New_York');
        setStartTime('22:00');
        setEndTime('08:00');
        setSelectedDays([1, 2, 3, 4, 5]);
        setQuietBehavior('queue');
        setOverrideEnabled(false);
        setNewPriority('P3');
        setOverrideReason('');
        setMuteUntil('');
        setMuteReason('');
        setDigestEnabled(false);
        setDigestFrequency('daily');
        setDigestTime('09:00');
        setMaxAlerts('50');
        setCooldown('15');
    };

    const handleSave = async () => {
        if (!ruleName.trim()) {
            Alert.alert('Error', 'Please enter a rule name');
            return;
        }

        if (selectedIntegrations.length === 0 && ruleType !== 'mute') {
            Alert.alert('Error', 'Please select at least one integration');
            return;
        }

        const rule: AlertRule = {
            name: ruleName,
            description: description || undefined,
            status: enabled ? 'active' : 'inactive',
            priority: parseInt(priority) || 10,
            rule_type: ruleType,
            conditions: {
                severity: selectedSeverities.length > 0 ? selectedSeverities : undefined,
                priority_level: selectedPriorities.length > 0 ? selectedPriorities : undefined,
                service: services ? services.split(',').map(s => s.trim()) : undefined,
                message_contains: messageContains ? messageContains.split(',').map(m => m.trim()) : undefined,
            },
            actions: selectedIntegrations.map(integrationId => {
                const integration = integrations.find(i => i.id === integrationId);
                return {
                    integration_id: integrationId,
                    integration_type: integration?.type || 'slack',
                    enabled: true,
                    route_to: {
                        notification_level: notificationLevel,
                    },
                };
            }),
            cooldown_minutes: parseInt(cooldown) || undefined,
        };

        // Add quiet hours if enabled
        if (quietHoursEnabled) {
            rule.quiet_hours = {
                enabled: true,
                timezone,
                schedules: [{
                    days: selectedDays,
                    start_time: startTime,
                    end_time: endTime,
                }],
                behavior: quietBehavior,
            };
        }

        // Add priority override if enabled (for override rule type)
        if (ruleType === 'override' || overrideEnabled) {
            rule.priority_override = {
                enabled: true,
                new_priority: newPriority,
                reason: overrideReason || undefined,
            };
        }

        // Add mute settings if this is a mute rule
        if (ruleType === 'mute') {
            rule.mute_settings = {
                mute_until: muteUntil || undefined,
                mute_reason: muteReason || undefined,
                auto_unmute: true,
            };
        }

        // Add digest settings if enabled
        if (digestEnabled) {
            rule.digest_settings = {
                enabled: true,
                frequency: digestFrequency,
                time: digestTime,
                max_alerts: parseInt(maxAlerts) || 50,
            };
        }

        setSaving(true);
        try {
            await onSave(rule);
            resetForm();
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to save alert rule');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add Alert Rule</Text>
                        <TouchableOpacity onPress={onClose} disabled={saving}>
                            <Ionicons name="close" size={24} color="#6b7f72" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {/* Basic Info Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Basic Information</Text>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Rule Name *</Text>
                                <TextInput
                                    value={ruleName}
                                    onChangeText={setRuleName}
                                    placeholder="e.g., Critical P1 to Teams"
                                    placeholderTextColor="#6b7f72"
                                    style={styles.input}
                                    editable={!saving}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Description</Text>
                                <TextInput
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="What does this rule do?"
                                    placeholderTextColor="#6b7f72"
                                    style={[styles.input, styles.textArea]}
                                    multiline
                                    numberOfLines={2}
                                    editable={!saving}
                                />
                            </View>

                            <View style={styles.formRow}>
                                <View style={styles.formGroupHalf}>
                                    <Text style={styles.label}>Priority Order</Text>
                                    <TextInput
                                        value={priority}
                                        onChangeText={setPriority}
                                        placeholder="10"
                                        placeholderTextColor="#6b7f72"
                                        keyboardType="numeric"
                                        style={styles.input}
                                        editable={!saving}
                                    />
                                    <Text style={styles.helperText}>Lower = evaluated first</Text>
                                </View>
                                <View style={styles.formGroupHalf}>
                                    <Text style={styles.label}>Status</Text>
                                    <View style={styles.switchContainer}>
                                        <Text style={styles.switchLabel}>
                                            {enabled ? 'Active' : 'Inactive'}
                                        </Text>
                                        <Switch
                                            value={enabled}
                                            onValueChange={setEnabled}
                                            trackColor={{ false: '#2d3a32', true: '#10b98140' }}
                                            thumbColor={enabled ? '#10b981' : '#6b7f72'}
                                            disabled={saving}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Rule Type */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Rule Type</Text>
                            <View style={styles.ruleTypeGrid}>
                                {ruleTypes.map((type) => (
                                    <TouchableOpacity
                                        key={type.value}
                                        style={[
                                            styles.ruleTypeCard,
                                            ruleType === type.value && styles.ruleTypeCardActive,
                                        ]}
                                        onPress={() => setRuleType(type.value)}
                                        disabled={saving}
                                    >
                                        <Ionicons
                                            name={type.icon as any}
                                            size={20}
                                            color={ruleType === type.value ? '#10b981' : '#6b7f72'}
                                        />
                                        <Text style={[
                                            styles.ruleTypeLabel,
                                            ruleType === type.value && styles.ruleTypeLabelActive,
                                        ]}>
                                            {type.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Conditions Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Conditions (When to trigger)</Text>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Severity Levels</Text>
                                <View style={styles.chipGrid}>
                                    {severities.map((sev) => (
                                        <TouchableOpacity
                                            key={sev}
                                            style={[
                                                styles.chip,
                                                selectedSeverities.includes(sev) && styles.chipActive,
                                            ]}
                                            onPress={() => toggleSeverity(sev)}
                                            disabled={saving}
                                        >
                                            <Text style={[
                                                styles.chipText,
                                                selectedSeverities.includes(sev) && styles.chipTextActive,
                                            ]}>
                                                {sev}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={styles.helperText}>Leave empty to match all severities</Text>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Priority Levels</Text>
                                <View style={styles.chipGrid}>
                                    {priorityLevels.map((p) => (
                                        <TouchableOpacity
                                            key={p}
                                            style={[
                                                styles.chip,
                                                selectedPriorities.includes(p) && styles.chipActive,
                                            ]}
                                            onPress={() => togglePriority(p)}
                                            disabled={saving}
                                        >
                                            <Text style={[
                                                styles.chipText,
                                                selectedPriorities.includes(p) && styles.chipTextActive,
                                            ]}>
                                                {p}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Services (comma-separated)</Text>
                                <TextInput
                                    value={services}
                                    onChangeText={setServices}
                                    placeholder="e.g., api-gateway, database"
                                    placeholderTextColor="#6b7f72"
                                    style={styles.input}
                                    editable={!saving}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Message Contains (comma-separated)</Text>
                                <TextInput
                                    value={messageContains}
                                    onChangeText={setMessageContains}
                                    placeholder="e.g., timeout, error, failed"
                                    placeholderTextColor="#6b7f72"
                                    style={styles.input}
                                    editable={!saving}
                                />
                            </View>
                        </View>

                        {/* Actions Section */}
                        {ruleType !== 'mute' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Actions (Where to send)</Text>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Select Integrations *</Text>
                                    {integrations.length === 0 ? (
                                        <Text style={styles.emptyText}>
                                            No integrations configured. Add integrations first.
                                        </Text>
                                    ) : (
                                        integrations.map((integration) => (
                                            <TouchableOpacity
                                                key={integration.id}
                                                style={[
                                                    styles.integrationOption,
                                                    selectedIntegrations.includes(integration.id) &&
                                                    styles.integrationOptionActive,
                                                ]}
                                                onPress={() => toggleIntegration(integration.id)}
                                                disabled={saving}
                                            >
                                                <Ionicons
                                                    name={
                                                        integration.type === 'slack' ? 'logo-slack' :
                                                            integration.type === 'teams' ? 'people' :
                                                                integration.type === 'email' ? 'mail' :
                                                                    'notifications'
                                                    }
                                                    size={20}
                                                    color={
                                                        selectedIntegrations.includes(integration.id)
                                                            ? '#10b981'
                                                            : '#6b7f72'
                                                    }
                                                />
                                                <View style={styles.integrationInfo}>
                                                    <Text style={[
                                                        styles.integrationName,
                                                        selectedIntegrations.includes(integration.id) &&
                                                        styles.integrationNameActive,
                                                    ]}>
                                                        {integration.name}
                                                    </Text>
                                                    <Text style={styles.integrationChannel}>
                                                        {integration.channel_name || integration.team_name || integration.type}
                                                    </Text>
                                                </View>
                                                {selectedIntegrations.includes(integration.id) && (
                                                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                                                )}
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Notification Level</Text>
                                    <View style={styles.chipGrid}>
                                        {(['urgent', 'normal', 'low'] as const).map((level) => (
                                            <TouchableOpacity
                                                key={level}
                                                style={[
                                                    styles.chip,
                                                    notificationLevel === level && styles.chipActive,
                                                ]}
                                                onPress={() => setNotificationLevel(level)}
                                                disabled={saving}
                                            >
                                                <Text style={[
                                                    styles.chipText,
                                                    notificationLevel === level && styles.chipTextActive,
                                                ]}>
                                                    {level}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Quiet Hours Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Quiet Hours</Text>
                                <Switch
                                    value={quietHoursEnabled}
                                    onValueChange={setQuietHoursEnabled}
                                    trackColor={{ false: '#2d3a32', true: '#10b98140' }}
                                    thumbColor={quietHoursEnabled ? '#10b981' : '#6b7f72'}
                                    disabled={saving}
                                />
                            </View>

                            {quietHoursEnabled && (
                                <>
                                    <View style={styles.formRow}>
                                        <View style={styles.formGroupHalf}>
                                            <Text style={styles.label}>Start Time</Text>
                                            <TextInput
                                                value={startTime}
                                                onChangeText={setStartTime}
                                                placeholder="22:00"
                                                placeholderTextColor="#6b7f72"
                                                style={styles.input}
                                                editable={!saving}
                                            />
                                        </View>
                                        <View style={styles.formGroupHalf}>
                                            <Text style={styles.label}>End Time</Text>
                                            <TextInput
                                                value={endTime}
                                                onChangeText={setEndTime}
                                                placeholder="08:00"
                                                placeholderTextColor="#6b7f72"
                                                style={styles.input}
                                                editable={!saving}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>Active Days</Text>
                                        <View style={styles.chipGrid}>
                                            {daysOfWeek.map((day, index) => (
                                                <TouchableOpacity
                                                    key={day}
                                                    style={[
                                                        styles.chip,
                                                        selectedDays.includes(index) && styles.chipActive,
                                                    ]}
                                                    onPress={() => toggleDay(index)}
                                                    disabled={saving}
                                                >
                                                    <Text style={[
                                                        styles.chipText,
                                                        selectedDays.includes(index) && styles.chipTextActive,
                                                    ]}>
                                                        {day}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>Behavior During Quiet Hours</Text>
                                        <View style={styles.chipGrid}>
                                            {(['suppress', 'queue', 'downgrade'] as const).map((behavior) => (
                                                <TouchableOpacity
                                                    key={behavior}
                                                    style={[
                                                        styles.chip,
                                                        quietBehavior === behavior && styles.chipActive,
                                                    ]}
                                                    onPress={() => setQuietBehavior(behavior)}
                                                    disabled={saving}
                                                >
                                                    <Text style={[
                                                        styles.chipText,
                                                        quietBehavior === behavior && styles.chipTextActive,
                                                    ]}>
                                                        {behavior}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <Text style={styles.helperText}>
                                            {quietBehavior === 'suppress' && 'Drop alerts completely'}
                                            {quietBehavior === 'queue' && 'Send after quiet hours end'}
                                            {quietBehavior === 'downgrade' && 'Send to lower priority channel'}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Priority Override (for override rule type) */}
                        {ruleType === 'override' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Priority Override Settings</Text>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>New Priority Level</Text>
                                    <View style={styles.chipGrid}>
                                        {priorityLevels.map((p) => (
                                            <TouchableOpacity
                                                key={p}
                                                style={[
                                                    styles.chip,
                                                    newPriority === p && styles.chipActive,
                                                ]}
                                                onPress={() => setNewPriority(p)}
                                                disabled={saving}
                                            >
                                                <Text style={[
                                                    styles.chipText,
                                                    newPriority === p && styles.chipTextActive,
                                                ]}>
                                                    {p}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Override Reason</Text>
                                    <TextInput
                                        value={overrideReason}
                                        onChangeText={setOverrideReason}
                                        placeholder="e.g., Scheduled maintenance"
                                        placeholderTextColor="#6b7f72"
                                        style={styles.input}
                                        editable={!saving}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Mute Settings (for mute rule type) */}
                        {ruleType === 'mute' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Mute Settings</Text>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Mute Until (ISO Date)</Text>
                                    <TextInput
                                        value={muteUntil}
                                        onChangeText={setMuteUntil}
                                        placeholder="2025-10-16T06:00:00Z"
                                        placeholderTextColor="#6b7f72"
                                        style={styles.input}
                                        editable={!saving}
                                    />
                                    <Text style={styles.helperText}>
                                        Leave empty for permanent mute
                                    </Text>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Mute Reason</Text>
                                    <TextInput
                                        value={muteReason}
                                        onChangeText={setMuteReason}
                                        placeholder="e.g., Scheduled database migration"
                                        placeholderTextColor="#6b7f72"
                                        style={styles.input}
                                        editable={!saving}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Digest Settings */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Digest Settings</Text>
                                <Switch
                                    value={digestEnabled}
                                    onValueChange={setDigestEnabled}
                                    trackColor={{ false: '#2d3a32', true: '#10b98140' }}
                                    thumbColor={digestEnabled ? '#10b981' : '#6b7f72'}
                                    disabled={saving}
                                />
                            </View>

                            {digestEnabled && (
                                <>
                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>Frequency</Text>
                                        <View style={styles.chipGrid}>
                                            {(['hourly', 'daily', 'weekly'] as const).map((freq) => (
                                                <TouchableOpacity
                                                    key={freq}
                                                    style={[
                                                        styles.chip,
                                                        digestFrequency === freq && styles.chipActive,
                                                    ]}
                                                    onPress={() => setDigestFrequency(freq)}
                                                    disabled={saving}
                                                >
                                                    <Text style={[
                                                        styles.chipText,
                                                        digestFrequency === freq && styles.chipTextActive,
                                                    ]}>
                                                        {freq}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.formRow}>
                                        <View style={styles.formGroupHalf}>
                                            <Text style={styles.label}>Send Time</Text>
                                            <TextInput
                                                value={digestTime}
                                                onChangeText={setDigestTime}
                                                placeholder="09:00"
                                                placeholderTextColor="#6b7f72"
                                                style={styles.input}
                                                editable={!saving}
                                            />
                                        </View>
                                        <View style={styles.formGroupHalf}>
                                            <Text style={styles.label}>Max Alerts</Text>
                                            <TextInput
                                                value={maxAlerts}
                                                onChangeText={setMaxAlerts}
                                                placeholder="50"
                                                placeholderTextColor="#6b7f72"
                                                keyboardType="numeric"
                                                style={styles.input}
                                                editable={!saving}
                                            />
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Advanced Settings */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Advanced Settings</Text>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Cooldown Period (minutes)</Text>
                                <TextInput
                                    value={cooldown}
                                    onChangeText={setCooldown}
                                    placeholder="15"
                                    placeholderTextColor="#6b7f72"
                                    keyboardType="numeric"
                                    style={styles.input}
                                    editable={!saving}
                                />
                                <Text style={styles.helperText}>
                                    Prevent duplicate notifications within this time
                                </Text>
                            </View>
                        </View>

                        <View style={{ height: 20 }} />
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.cancelButton}
                            disabled={saving}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSave}
                            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Rule</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#0f1612',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '95%',
        borderTopWidth: 2,
        borderColor: '#10b981',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2d3a32',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    modalBody: {
        padding: 20,
        maxHeight: '75%',
    },
    section: {
        marginBottom: 24,
        backgroundColor: '#111813',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#2d3a32',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#10b981',
        marginBottom: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    formGroupHalf: {
        flex: 1,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#e5e7eb',
        marginBottom: 8,
    },
    helperText: {
        fontSize: 11,
        color: '#6b7f72',
        marginTop: 6,
        lineHeight: 15,
    },
    input: {
        backgroundColor: '#0f1612',
        borderWidth: 1,
        borderColor: '#2d3a32',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#FFFFFF',
    },
    textArea: {
        minHeight: 60,
        textAlignVertical: 'top',
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0f1612',
        borderWidth: 1,
        borderColor: '#2d3a32',
        borderRadius: 8,
        padding: 12,
    },
    switchLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#e5e7eb',
    },
    ruleTypeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    ruleTypeCard: {
        flex: 1,
        minWidth: '47%',
        backgroundColor: '#0f1612',
        borderRadius: 10,
        padding: 12,
        borderWidth: 2,
        borderColor: '#2d3a32',
        alignItems: 'center',
        gap: 6,
    },
    ruleTypeCardActive: {
        borderColor: '#10b981',
        backgroundColor: '#10b98110',
    },
    ruleTypeLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6b7f72',
        textAlign: 'center',
    },
    ruleTypeLabelActive: {
        color: '#10b981',
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#0f1612',
        borderWidth: 1,
        borderColor: '#2d3a32',
    },
    chipActive: {
        backgroundColor: '#10b98120',
        borderColor: '#10b981',
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7f72',
    },
    chipTextActive: {
        color: '#10b981',
    },
    integrationOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#0f1612',
        borderWidth: 1,
        borderColor: '#2d3a32',
        marginBottom: 8,
        gap: 12,
    },
    integrationOptionActive: {
        backgroundColor: '#10b98110',
        borderColor: '#10b981',
    },
    integrationInfo: {
        flex: 1,
    },
    integrationName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7f72',
    },
    integrationNameActive: {
        color: '#10b981',
    },
    integrationChannel: {
        fontSize: 12,
        color: '#6b7f72',
        marginTop: 2,
    },
    emptyText: {
        fontSize: 13,
        color: '#6b7f72',
        textAlign: 'center',
        paddingVertical: 20,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#2d3a32',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: '#243126',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6b7f72',
    },
    saveButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: '#10b981',
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#10b98160',
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

export default AddAlertRuleModal;