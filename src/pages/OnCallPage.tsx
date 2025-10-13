// src/pages/OnCallPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
    StatusBar,  // Add StatusBar, remove SafeAreaView
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { oncallService, OnCallEntry } from '../services/oncall.service';
import FooterNavigation, { TabName } from '../components/shared/Footer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CALENDAR_PADDING = 32; // 16px on each side
const CALENDAR_WIDTH = SCREEN_WIDTH - CALENDAR_PADDING;
const DAY_CELL_SIZE = (CALENDAR_WIDTH - 12) / 7; // 7 days, with small gaps

// Date utilities
const fmtISO = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
    ).padStart(2, '0')}`;

const fromISO = (iso: string): Date => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y!, m! - 1, d!);
};

const todayISO = fmtISO(new Date());

function startOfWeek(d: Date = new Date()): Date {
    const x = new Date(d);
    const dow = x.getDay();
    x.setDate(x.getDate() - dow);
    x.setHours(0, 0, 0, 0);
    return x;
}

function addDays(d: Date, n: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}

function addMonths(d: Date, n: number): Date {
    const x = new Date(d);
    x.setMonth(x.getMonth() + n);
    return x;
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function dowShort(i: number): string {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i] ?? '';
}

function friendlyDate(iso: string): string {
    const d = fromISO(iso);
    return d.toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function timeToMin(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
}

function rangesOverlap(
    aStart: string,
    aEnd: string,
    bStart: string,
    bEnd: string
): boolean {
    return Math.max(timeToMin(aStart), timeToMin(bStart)) < Math.min(timeToMin(aEnd), timeToMin(bEnd));
}

export default function OnCallPage() {
    const navigation = useNavigation();
    const weekStart = startOfWeek(new Date());
    const weekDays = useMemo<string[]>(
        () => [...Array(7)].map((_, i) => fmtISO(addDays(weekStart, i))),
        [weekStart]
    );
    const [activeTab, setActiveTab] = useState<TabName>('oncall');

    const [baseMonth, setBaseMonth] = useState<Date>(startOfMonth(new Date()));
    const [entries, setEntries] = useState<OnCallEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [editing, setEditing] = useState<OnCallEntry | null>(null);
    const handleTabChange = (tab: TabName) => {
        setActiveTab(tab);

        // Navigate to other screens
        if (tab === 'dashboard') {
            navigation.navigate('Dashboard' as never);
        } else if (tab === 'incidents') {
            navigation.navigate('Incidents' as never);
        } else if (tab === 'reports') {
            navigation.navigate('Reports' as never);
        } else if (tab === 'settings') {
            navigation.navigate('Settings' as never);
        }
    };
    const entriesByDate = useMemo<Map<string, OnCallEntry[]>>(() => {
        const m = new Map<string, OnCallEntry[]>();
        for (const e of entries) {
            const arr = m.get(e.date);
            if (arr) {
                arr.push(e);
            } else {
                m.set(e.date, [e]);
            }
        }
        for (const [k, arr] of m) {
            arr.sort((a, b) => a.start.localeCompare(b.start));
            m.set(k, arr);
        }
        return m;
    }, [entries]);

    async function loadOncall(monthAnchor: Date): Promise<void> {
        const startA = startOfMonth(monthAnchor);
        const endB = endOfMonth(monthAnchor);
        const from = fmtISO(startA);
        const to = fmtISO(endB);

        setLoading(true);
        setError(null);
        try {
            const items = await oncallService.fetchOncall({ from, to });
            setEntries(items);
        } catch (e: any) {
            console.error('Error loading oncall:', e);
            setError(e.message || 'Failed to load on-call schedule');
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadOncall(baseMonth);
    }, [baseMonth]);

    function openAdd(dateISO: string): void {
        setEditing(null);
        setSelectedDay(dateISO);
        setModalVisible(true);
    }

    function openEdit(entry: OnCallEntry): void {
        setEditing(entry);
        setSelectedDay(entry.date);
        setModalVisible(true);
    }

    async function handleSave(payload: any): Promise<void> {
        try {
            if (!editing) {
                const maybeRange = payload as any;
                if (
                    'from' in maybeRange &&
                    'to' in maybeRange &&
                    maybeRange.from !== maybeRange.to
                ) {
                    await oncallService.createOncallRange(maybeRange);
                } else {
                    const single = {
                        date: 'date' in payload ? payload.date : payload.from,
                        person: payload.person,
                        role: payload.role,
                        start: payload.start,
                        end: payload.end,
                        notes: payload.notes,
                    };
                    await oncallService.createOncallSingle(single);
                }
            } else {
                const base: any = {
                    person: payload.person,
                    role: payload.role,
                    start: payload.start,
                    end: payload.end,
                    notes: payload.notes,
                };
                const maybeRange = payload as any;
                if (
                    'from' in maybeRange &&
                    'to' in maybeRange &&
                    maybeRange.from &&
                    maybeRange.to
                ) {
                    base.range_from = maybeRange.from;
                    base.range_to = maybeRange.to;
                }
                await oncallService.updateOncallById(editing.id, base);
            }
            await loadOncall(baseMonth);
            setModalVisible(false);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to save entry');
        }
    }

    async function handleDelete(entry: OnCallEntry): Promise<void> {
        Alert.alert(
            'Delete Entry',
            'Are you sure you want to delete this on-call entry?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await oncallService.deleteOncallById(entry.id);
                            await loadOncall(baseMonth);
                            setSelectedDay(null);
                        } catch (e: any) {
                            Alert.alert('Error', e.message || 'Failed to delete entry');
                        }
                    },
                },
            ]
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
            <Text style={styles.headerTitle}>On-Call Schedule</Text>
                <TouchableOpacity onPress={() => openAdd(todayISO)} style={styles.addButton}>
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Month Navigation */}
                <View style={styles.monthNav}>
                    <TouchableOpacity
                        onPress={() => setBaseMonth((prev) => startOfMonth(addMonths(prev, -1)))}
                        style={styles.navButton}
                    >
                        <Ionicons name="chevron-back" size={24} color="#10b981" />
                    </TouchableOpacity>
                    <Text style={styles.monthLabel}>
                        {baseMonth.toLocaleString(undefined, {
                            month: 'long',
                            year: 'numeric',
                        })}
                    </Text>
                    <TouchableOpacity
                        onPress={() => setBaseMonth((prev) => startOfMonth(addMonths(prev, 1)))}
                        style={styles.navButton}
                    >
                        <Ionicons name="chevron-forward" size={24} color="#10b981" />
                    </TouchableOpacity>
                </View>

                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#10b981" />
                        <Text style={styles.loadingText}>Loading schedule...</Text>
                    </View>
                )}

                {error && (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={20} color="#ef4444" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {/* Calendar */}
                <MonthView
                    monthDate={baseMonth}
                    highlightISO={todayISO}
                    onDayClick={setSelectedDay}
                    entriesByDate={entriesByDate}
                    onAddClick={openAdd}
                />

                {/* Selected Day Info */}
                {selectedDay && (
                    <View style={styles.selectedDayContainer}>
                        <View style={styles.selectedDayHeader}>
                            <Ionicons name="information-circle" size={20} color="#10b981" />
                            <Text style={styles.selectedDayTitle} numberOfLines={1}>
                                {friendlyDate(selectedDay)}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedDay(null)}>
                                <Ionicons name="close" size={20} color="#6b7f72" />
                            </TouchableOpacity>
                        </View>
                        {(entriesByDate.get(selectedDay) ?? []).length === 0 ? (
                            <View style={styles.selectedDayContent}>
                                <Text style={styles.selectedDayText}>No on-call assignments</Text>
                                <TouchableOpacity
                                    onPress={() => openAdd(selectedDay)}
                                    style={styles.addSmallButton}
                                >
                                    <Ionicons name="person-add" size={16} color="#10b981" />
                                    <Text style={styles.addSmallButtonText}>Add Assignment</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.selectedDayContent}>
                                {(entriesByDate.get(selectedDay) ?? []).map((entry) => (
                                    <View key={entry.id} style={styles.entryCard}>
                                        <View style={styles.entryInfo}>
                                            <Text style={styles.entryPerson}>{entry.person}</Text>
                                            <Text style={styles.entryDetails}>
                                                {entry.role} • {entry.start}–{entry.end}
                                            </Text>
                                            {entry.notes && (
                                                <Text style={styles.entryNotes}>{entry.notes}</Text>
                                            )}
                                        </View>
                                        <View style={styles.entryActions}>
                                            <TouchableOpacity
                                                onPress={() => openEdit(entry)}
                                                style={styles.actionButton}
                                            >
                                                <Ionicons name="pencil" size={16} color="#10b981" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleDelete(entry)}
                                                style={styles.actionButton}
                                            >
                                                <Ionicons name="trash" size={16} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Weekly Schedule */}
                <View style={styles.weeklySection}>
                    <Text style={styles.sectionTitle}>This Week</Text>
                    {weekDays.map((iso, i) => {
                        const list = entriesByDate.get(iso) ?? [];
                        const first = list[0];
                        const isToday = iso === todayISO;

                        return (
                            <TouchableOpacity
                                key={iso}
                                onPress={() => setSelectedDay(iso)}
                                style={[styles.weekRow, isToday && styles.weekRowToday]}
                            >
                                <View style={styles.weekDayColumn}>
                                    <Text style={styles.weekDayName}>{dowShort(i)}</Text>
                                    <Text style={styles.weekDayNumber}>{fromISO(iso).getDate()}</Text>
                                </View>
                                <View style={styles.weekInfoColumn}>
                                    <Text style={styles.weekPerson} numberOfLines={1}>
                                        {first?.person ?? '—'}
                                    </Text>
                                    <Text style={styles.weekDetails} numberOfLines={1}>
                                        {first ? `${first.role} • ${first.start}–${first.end}` : 'No assignment'}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => (first ? openEdit(first) : openAdd(iso))}
                                    style={styles.weekActionButton}
                                >
                                    <Ionicons
                                        name={first ? 'pencil' : 'person-add'}
                                        size={16}
                                        color="#10b981"
                                    />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Bottom padding for footer */}
                <View style={{ height: 80 }} />
            </ScrollView>

            {/* Footer Navigation */}
            <FooterNavigation
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* Add/Edit Modal */}
            <AddEditModal
                visible={modalVisible}
                defaultDate={selectedDay ?? todayISO}
                editing={editing}
                onClose={() => setModalVisible(false)}
                onSave={handleSave}
                existingForDate={(iso) => entries.filter((e) => e.date === iso)}
            />
        </View>
    );
}

// Month View Component
function MonthView({
                       monthDate,
                       highlightISO,
                       onDayClick,
                       entriesByDate,
                       onAddClick,
                   }: {
    monthDate: Date;
    highlightISO: string;
    onDayClick: (iso: string) => void;
    entriesByDate: Map<string, OnCallEntry[]>;
    onAddClick: (iso: string) => void;
}) {
    const month = startOfMonth(monthDate);
    const monthIndex = month.getMonth();
    const year = month.getFullYear();

    const startDow = month.getDay();
    const gridStart = new Date(year, monthIndex, 1 - startDow);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));

    return (
        <View style={styles.monthContainer}>
            <View style={styles.monthGrid}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <View key={`${d}-${i}`} style={[styles.dowHeader, { width: DAY_CELL_SIZE }]}>
                        <Text style={styles.dowText}>{d}</Text>
                    </View>
                ))}

                {days.map((d) => {
                    const iso = fmtISO(d);
                    const inMonth = d.getMonth() === monthIndex;
                    const isHighlighted = iso === highlightISO && inMonth;
                    const list = entriesByDate.get(iso) ?? [];
                    const primary = list[0];

                    return (
                        <TouchableOpacity
                            key={iso}
                            onPress={() => onDayClick(iso)}
                            onLongPress={() => onAddClick(iso)}
                            style={[
                                styles.dayCell,
                                { width: DAY_CELL_SIZE, height: DAY_CELL_SIZE },
                                !inMonth && styles.dayCellInactive,
                                isHighlighted && styles.dayCellHighlighted,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.dayNumber,
                                    !inMonth && styles.dayNumberInactive,
                                ]}
                            >
                                {d.getDate()}
                            </Text>
                            {primary && inMonth && (
                                <View style={styles.dayBadge}>
                                    <Text style={styles.dayBadgeText} numberOfLines={1}>
                                        {primary.person.split(' ')[0]}
                                    </Text>
                                </View>
                            )}
                            {!primary && inMonth && list.length > 0 && (
                                <View style={styles.dayDot} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

// Add/Edit Modal Component
function AddEditModal({
                          visible,
                          defaultDate,
                          editing,
                          onClose,
                          onSave,
                          existingForDate,
                      }: {
    visible: boolean;
    defaultDate: string;
    editing: OnCallEntry | null;
    onClose: () => void;
    onSave: (payload: any) => Promise<void>;
    existingForDate: (iso: string) => OnCallEntry[];
}) {
    const [mode, setMode] = useState<'single' | 'range'>('single');
    const [date, setDate] = useState<string>(editing?.date ?? defaultDate);
    const [from, setFrom] = useState<string>(defaultDate);
    const [to, setTo] = useState<string>(defaultDate);
    const [person, setPerson] = useState<string>(editing?.person ?? '');
    const [role, setRole] = useState<string>(editing?.role ?? 'Engineer');
    const [start, setStart] = useState<string>(editing?.start ?? '09:00');
    const [end, setEnd] = useState<string>(editing?.end ?? '17:00');
    const [notes, setNotes] = useState<string>(editing?.notes ?? '');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<boolean>(false);

    useEffect(() => {
        if (visible && !editing) {
            // Reset form when opening for new entry
            setDate(defaultDate);
            setFrom(defaultDate);
            setTo(defaultDate);
            setPerson('');
            setRole('Engineer');
            setStart('09:00');
            setEnd('17:00');
            setNotes('');
            setError(null);
            setMode('single');
        }
    }, [visible, editing, defaultDate]);

    const valid =
        person.trim().length > 0 &&
        role.trim().length > 0 &&
        start < end &&
        (mode === 'single' ? Boolean(date) : Boolean(from && to && from <= to));

    async function handleSave() {
        if (!valid || saving) return;

        setError(null);
        setSaving(true);
        try {
            const payload: any =
                mode === 'single'
                    ? { date, person, role, start, end, notes: notes || undefined }
                    : { from, to, person, role, start, end, notes: notes || undefined };

            // Conflict check for single-day
            if (mode === 'single') {
                const conflicts = existingForDate(date);
                for (const c of conflicts) {
                    const overlaps = rangesOverlap(start, end, c.start, c.end);
                    if (editing?.id !== c.id && overlaps) {
                        throw new Error(
                            `Overlaps with ${c.person} (${c.start}–${c.end})`
                        );
                    }
                }
            }

            await onSave(payload);
        } catch (e: any) {
            setError(e.message || 'Failed to save');
            setSaving(false);
        }
    }

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {editing ? 'Edit Entry' : 'Add Entry'}
                        </Text>
                        <TouchableOpacity onPress={onClose} disabled={saving}>
                            <Ionicons name="close" size={24} color="#6b7f72" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {/* Mode Selection */}
                        {!editing && (
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Mode</Text>
                                <View style={styles.modeSelector}>
                                    <TouchableOpacity
                                        onPress={() => setMode('single')}
                                        style={[
                                            styles.modeButton,
                                            mode === 'single' && styles.modeButtonActive,
                                        ]}
                                        disabled={saving}
                                    >
                                        <Text
                                            style={[
                                                styles.modeButtonText,
                                                mode === 'single' && styles.modeButtonTextActive,
                                            ]}
                                        >
                                            Single Day
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setMode('range')}
                                        style={[
                                            styles.modeButton,
                                            mode === 'range' && styles.modeButtonActive,
                                        ]}
                                        disabled={saving}
                                    >
                                        <Text
                                            style={[
                                                styles.modeButtonText,
                                                mode === 'range' && styles.modeButtonTextActive,
                                            ]}
                                        >
                                            Date Range
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Date/Range */}
                        {mode === 'single' ? (
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Date</Text>
                                <TextInput
                                    value={date}
                                    onChangeText={setDate}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="#6b7f72"
                                    style={styles.input}
                                    editable={!saving && !editing}
                                />
                            </View>
                        ) : (
                            <View style={styles.formRow}>
                                <View style={styles.formGroupHalf}>
                                    <Text style={styles.label}>From</Text>
                                    <TextInput
                                        value={from}
                                        onChangeText={setFrom}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#6b7f72"
                                        style={styles.input}
                                        editable={!saving}
                                    />
                                </View>
                                <View style={styles.formGroupHalf}>
                                    <Text style={styles.label}>To</Text>
                                    <TextInput
                                        value={to}
                                        onChangeText={setTo}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#6b7f72"
                                        style={styles.input}
                                        editable={!saving}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Person */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Person</Text>
                            <TextInput
                                value={person}
                                onChangeText={setPerson}
                                placeholder="Jane Doe"
                                placeholderTextColor="#6b7f72"
                                style={styles.input}
                                editable={!saving}
                            />
                        </View>

                        {/* Role */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Role</Text>
                            <View style={styles.pickerContainer}>
                                {['Engineer', 'Team Lead', 'SRE', 'Manager', 'DevOps'].map((r) => (
                                    <TouchableOpacity
                                        key={r}
                                        onPress={() => setRole(r)}
                                        style={[
                                            styles.roleChip,
                                            role === r && styles.roleChipActive,
                                        ]}
                                        disabled={saving}
                                    >
                                        <Text
                                            style={[
                                                styles.roleChipText,
                                                role === r && styles.roleChipTextActive,
                                            ]}
                                        >
                                            {r}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Time Range */}
                        <View style={styles.formRow}>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.label}>Start</Text>
                                <TextInput
                                    value={start}
                                    onChangeText={setStart}
                                    placeholder="09:00"
                                    placeholderTextColor="#6b7f72"
                                    style={styles.input}
                                    editable={!saving}
                                />
                            </View>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.label}>End</Text>
                                <TextInput
                                    value={end}
                                    onChangeText={setEnd}
                                    placeholder="17:00"
                                    placeholderTextColor="#6b7f72"
                                    style={styles.input}
                                    editable={!saving}
                                />
                            </View>
                        </View>

                        {/* Notes */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Notes (optional)</Text>
                            <TextInput
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Additional information..."
                                placeholderTextColor="#6b7f72"
                                style={[styles.input, styles.textArea]}
                                multiline
                                numberOfLines={3}
                                editable={!saving}
                            />
                        </View>

                        {error && (
                            <View style={styles.modalError}>
                                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                                <Text style={styles.modalErrorText}>{error}</Text>
                            </View>
                        )}
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
                            style={[styles.saveButton, (!valid || saving) && styles.saveButtonDisabled]}
                            disabled={!valid || saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.saveButtonText}>
                                    {editing ? 'Save' : 'Add'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

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
        paddingTop: 50,
        marginTop:10,// Add this line - accounts for status bar
        borderBottomWidth: 1,
        borderBottomColor: '#2d3a32',
        backgroundColor: '#111813',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -1,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    navButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#1c261f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 16,
        marginHorizontal: 16,
        backgroundColor: '#1c261f',
        borderRadius: 12,
    },
    loadingText: {
        color: '#6b7f72',
        fontSize: 14,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#ef444415',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ef444440',
    },
    errorText: {
        flex: 1,
        color: '#ef4444',
        fontSize: 14,
    },
    monthContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#1c261f',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2d3a32',
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dowHeader: {
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dowText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7f72',
    },
    dayCell: {
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        marginBottom: 2,
    },
    dayCellInactive: {
        opacity: 0.3,
    },
    dayCellHighlighted: {
        backgroundColor: '#10b98120',
        borderWidth: 2,
        borderColor: '#10b981',
    },
    dayNumber: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    dayNumberInactive: {
        color: '#6b7f72',
    },
    dayBadge: {
        marginTop: 2,
        paddingHorizontal: 4,
        paddingVertical: 1,
        backgroundColor: '#10b98120',
        borderRadius: 4,
        maxWidth: '90%',
    },
    dayBadgeText: {
        fontSize: 9,
        color: '#10b981',
        fontWeight: '600',
    },
    dayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#10b981',
        marginTop: 2,
    },
    selectedDayContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#10b98115',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#10b98140',
    },
    selectedDayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    selectedDayTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#10b981',
    },
    selectedDayContent: {
        gap: 12,
    },
    selectedDayText: {
        fontSize: 14,
        color: '#6b7f72',
    },
    addSmallButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#1c261f',
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    addSmallButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10b981',
    },
    entryCard: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#1c261f',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2d3a32',
    },
    entryInfo: {
        flex: 1,
        gap: 4,
    },
    entryPerson: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    entryDetails: {
        fontSize: 14,
        color: '#6b7f72',
    },
    entryNotes: {
        fontSize: 12,
        color: '#6b7f72',
        fontStyle: 'italic',
        marginTop: 4,
    },
    entryActions: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#243126',
    },
    weeklySection: {
        marginHorizontal: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    weekRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#1c261f',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#2d3a32',
    },
    weekRowToday: {
        backgroundColor: '#10b98115',
        borderColor: '#10b98140',
    },
    weekDayColumn: {
        width: 50,
        alignItems: 'center',
    },
    weekDayName: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7f72',
    },
    weekDayNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginTop: 2,
    },
    weekInfoColumn: {
        flex: 1,
        marginLeft: 12,
    },
    weekPerson: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    weekDetails: {
        fontSize: 13,
        color: '#6b7f72',
        marginTop: 2,
    },
    weekActionButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#243126',
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#1c261f',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
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
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    modalBody: {
        padding: 20,
        maxHeight: '70%',
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
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7f72',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#111813',
        borderWidth: 1,
        borderColor: '#2d3a32',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#FFFFFF',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    modeSelector: {
        flexDirection: 'row',
        gap: 8,
    },
    modeButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#111813',
        borderWidth: 1,
        borderColor: '#2d3a32',
        alignItems: 'center',
    },
    modeButtonActive: {
        backgroundColor: '#10b98120',
        borderColor: '#10b981',
    },
    modeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7f72',
    },
    modeButtonTextActive: {
        color: '#10b981',
    },
    pickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    roleChip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#111813',
        borderWidth: 1,
        borderColor: '#2d3a32',
    },
    roleChipActive: {
        backgroundColor: '#10b98120',
        borderColor: '#10b981',
    },
    roleChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7f72',
    },
    roleChipTextActive: {
        color: '#10b981',
    },
    modalError: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: '#ef444415',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ef444440',
        marginTop: 16,
    },
    modalErrorText: {
        flex: 1,
        fontSize: 14,
        color: '#ef4444',
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
        borderRadius: 8,
        backgroundColor: '#243126',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7f72',
    },
    saveButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        backgroundColor: '#10b981',
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#10b98160',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});