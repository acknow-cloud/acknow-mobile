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
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { oncallService, OnCallEntry } from '../services/oncall.service';
import FooterNavigation, { TabName } from '../components/shared/Footer';
import { CustomAlert } from '../components/shared/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlerts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

function addWeeks(d: Date, n: number): Date {
    return addDays(d, n * 7);
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
    const { alertConfig, showAlert, hideAlert } = useCustomAlert();

    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date()));
    const [baseMonth, setBaseMonth] = useState<Date>(startOfMonth(new Date()));
    const [entries, setEntries] = useState<OnCallEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [editing, setEditing] = useState<OnCallEntry | null>(null);
    const [activeTab, setActiveTab] = useState<TabName>('oncall');

    // Calculate week days
    const weekDays = useMemo<string[]>(
        () => [...Array(7)].map((_, i) => fmtISO(addDays(currentWeekStart, i))),
        [currentWeekStart]
    );

    const dateRange = useMemo(() => {
        const monthStart = startOfMonth(baseMonth);
        const monthEnd = endOfMonth(baseMonth);
        const weekStart = currentWeekStart;
        const weekEnd = addDays(currentWeekStart, 6);

        let from = monthStart < weekStart ? monthStart : weekStart;
        let to = monthEnd > weekEnd ? monthEnd : weekEnd;

        if (selectedDay) {
            const selectedDate = fromISO(selectedDay);
            if (selectedDate < from) {
                from = selectedDate;
            }
            if (selectedDate > to) {
                to = selectedDate;
            }
        }

        return {
            from: fmtISO(from),
            to: fmtISO(to)
        };
    }, [baseMonth, currentWeekStart, selectedDay]);

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

    useEffect(() => {
        let cancelled = false;

        async function loadData() {
            setLoading(true);
            setError(null);

            try {
                console.log('📅 Loading on-call data from', dateRange.from, 'to', dateRange.to);
                const items = await oncallService.fetchOncall({
                    from: dateRange.from,
                    to: dateRange.to
                });

                if (!cancelled) {
                    console.log('✅ Loaded', items.length, 'entries');
                    setEntries(items);
                }
            } catch (e: any) {
                console.error('❌ Error loading oncall:', e);
                if (!cancelled) {
                    setError(e.message || 'Failed to load on-call schedule');
                    setEntries([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadData();

        return () => {
            cancelled = true;
        };
    }, [dateRange.from, dateRange.to]);

    async function reloadData() {
        setLoading(true);
        setError(null);
        try {
            console.log('🔄 Reloading on-call data');
            const items = await oncallService.fetchOncall({
                from: dateRange.from,
                to: dateRange.to
            });
            setEntries(items);
            console.log('✅ Reloaded', items.length, 'entries');
        } catch (e: any) {
            console.error('❌ Error reloading oncall:', e);
            setError(e.message || 'Failed to reload on-call schedule');
        } finally {
            setLoading(false);
        }
    }

    function openAdd(dateISO: string): void {
        setEditing(null);
        setSelectedDay(dateISO);
        setModalVisible(true);
    }

    function openEdit(entry: OnCallEntry): void {
        const isRangeEntry = entry.range_from && entry.range_to && entry.range_from !== entry.range_to;

        if (isRangeEntry && selectedDay) {
            showAlert({
                title: 'Edit Range Entry',
                message: `This is part of a range from ${entry.range_from} to ${entry.range_to}.\n\nWhat would you like to do?`,
                icon: 'create',
                buttons: [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                    },
                    {
                        text: 'Edit This Day Only',
                        style: 'default',
                        onPress: () => {
                            setEditing({ ...entry, _editSingleDay: true } as any);
                            setSelectedDay(entry.date);
                            setModalVisible(true);
                        },
                    },
                    {
                        text: 'Edit Entire Range',
                        style: 'default',
                        onPress: () => {
                            setEditing(entry);
                            setSelectedDay(entry.date);
                            setModalVisible(true);
                        },
                    },
                ],
            });
        } else {
            setEditing(entry);
            setSelectedDay(entry.date);
            setModalVisible(true);
        }
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
                const editingSingleDay = (editing as any)._editSingleDay;
                const isRangeEntry = editing.range_from && editing.range_to && editing.range_from !== editing.range_to;

                if (editingSingleDay && isRangeEntry && selectedDay) {
                    console.log('✏️ Editing single day', selectedDay, 'from range', editing.range_from, 'to', editing.range_to);

                    const fromDate = fromISO(editing.range_from!);
                    const toDate = fromISO(editing.range_to!);
                    const editDate = fromISO(selectedDay);

                    const isFirstDay = editing.range_from === selectedDay;
                    const isLastDay = editing.range_to === selectedDay;

                    await oncallService.deleteOncallById(editing.id);

                    await oncallService.createOncallSingle({
                        date: selectedDay,
                        person: payload.person,
                        role: payload.role,
                        start: payload.start,
                        end: payload.end,
                        notes: payload.notes,
                    });

                    if (isFirstDay) {
                        const newFrom = fmtISO(addDays(fromDate, 1));
                        if (newFrom <= editing.range_to!) {
                            console.log('✅ Creating remaining range:', newFrom, 'to', editing.range_to);
                            await oncallService.createOncallRange({
                                from: newFrom,
                                to: editing.range_to!,
                                person: editing.person,
                                role: editing.role,
                                start: editing.start,
                                end: editing.end,
                                notes: editing.notes,
                            });
                        }
                    } else if (isLastDay) {
                        const newTo = fmtISO(addDays(toDate, -1));
                        if (editing.range_from! <= newTo) {
                            console.log('✅ Creating remaining range:', editing.range_from, 'to', newTo);
                            await oncallService.createOncallRange({
                                from: editing.range_from!,
                                to: newTo,
                                person: editing.person,
                                role: editing.role,
                                start: editing.start,
                                end: editing.end,
                                notes: editing.notes,
                            });
                        }
                    } else {
                        const dayBefore = fmtISO(addDays(editDate, -1));
                        const dayAfter = fmtISO(addDays(editDate, 1));

                        console.log('✅ Splitting range around edited day:');
                        console.log('  - Range 1:', editing.range_from, 'to', dayBefore);
                        console.log('  - Range 2:', dayAfter, 'to', editing.range_to);

                        await oncallService.createOncallRange({
                            from: editing.range_from!,
                            to: dayBefore,
                            person: editing.person,
                            role: editing.role,
                            start: editing.start,
                            end: editing.end,
                            notes: editing.notes,
                        });

                        await oncallService.createOncallRange({
                            from: dayAfter,
                            to: editing.range_to!,
                            person: editing.person,
                            role: editing.role,
                            start: editing.start,
                            end: editing.end,
                            notes: editing.notes,
                        });
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

                    console.log('✏️ Updating entry:', editing.id);
                    await oncallService.updateOncallById(editing.id, base);
                }
            }

            setModalVisible(false);
            await reloadData();
        } catch (e: any) {
            console.error('❌ Error saving:', e);
            showAlert({
                title: 'Error',
                message: e.message || 'Failed to save entry',
                icon: 'alert-circle',
                buttons: [{ text: 'OK', style: 'default' }],
            });
        }
    }

    async function handleDelete(entry: OnCallEntry): Promise<void> {
        const isRangeEntry = entry.range_from && entry.range_to && entry.range_from !== entry.range_to;

        if (isRangeEntry && selectedDay) {
            const fromDate = fromISO(entry.range_from!);
            const toDate = fromISO(entry.range_to!);
            const deleteDate = fromISO(selectedDay);

            const isFirstDay = entry.range_from === selectedDay;
            const isLastDay = entry.range_to === selectedDay;
            const isOnlyDay = entry.range_from === entry.range_to;

            if (isOnlyDay) {
                showAlert({
                    title: 'Delete Entry',
                    message: `Delete ${entry.person}'s on-call shift on ${selectedDay}?`,
                    icon: 'trash',
                    buttons: [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                                try {
                                    await oncallService.deleteOncallById(entry.id);
                                    setSelectedDay(null);
                                    await reloadData();
                                } catch (e: any) {
                                    showAlert({
                                        title: 'Error',
                                        message: e.message || 'Failed to delete entry',
                                        icon: 'alert-circle',
                                        buttons: [{ text: 'OK', style: 'default' }],
                                    });
                                }
                            },
                        },
                    ],
                });
                return;
            }

            showAlert({
                title: 'Delete From Range',
                message: `This is part of a range from ${entry.range_from} to ${entry.range_to}.\n\nWhat would you like to do?`,
                icon: 'trash',
                buttons: [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Remove This Day Only',
                        style: 'default',
                        onPress: async () => {
                            try {
                                console.log('🗑️ Removing day', selectedDay, 'from range');

                                await oncallService.deleteOncallById(entry.id);

                                if (isFirstDay) {
                                    const newFrom = fmtISO(addDays(fromDate, 1));
                                    if (newFrom <= entry.range_to!) {
                                        await oncallService.createOncallRange({
                                            from: newFrom,
                                            to: entry.range_to!,
                                            person: entry.person,
                                            role: entry.role,
                                            start: entry.start,
                                            end: entry.end,
                                            notes: entry.notes,
                                        });
                                    }
                                } else if (isLastDay) {
                                    const newTo = fmtISO(addDays(toDate, -1));
                                    if (entry.range_from! <= newTo) {
                                        await oncallService.createOncallRange({
                                            from: entry.range_from!,
                                            to: newTo,
                                            person: entry.person,
                                            role: entry.role,
                                            start: entry.start,
                                            end: entry.end,
                                            notes: entry.notes,
                                        });
                                    }
                                } else {
                                    const dayBefore = fmtISO(addDays(deleteDate, -1));
                                    const dayAfter = fmtISO(addDays(deleteDate, 1));

                                    await oncallService.createOncallRange({
                                        from: entry.range_from!,
                                        to: dayBefore,
                                        person: entry.person,
                                        role: entry.role,
                                        start: entry.start,
                                        end: entry.end,
                                        notes: entry.notes,
                                    });

                                    await oncallService.createOncallRange({
                                        from: dayAfter,
                                        to: entry.range_to!,
                                        person: entry.person,
                                        role: entry.role,
                                        start: entry.start,
                                        end: entry.end,
                                        notes: entry.notes,
                                    });
                                }

                                setSelectedDay(null);
                                await reloadData();

                                showAlert({
                                    title: 'Success',
                                    message: `Removed ${entry.person} from ${selectedDay}`,
                                    icon: 'information-circle',
                                    buttons: [{ text: 'OK', style: 'default' }],
                                });
                            } catch (e: any) {
                                console.error('❌ Error deleting day from range:', e);
                                showAlert({
                                    title: 'Error',
                                    message: e.message || 'Failed to delete entry',
                                    icon: 'alert-circle',
                                    buttons: [{ text: 'OK', style: 'default' }],
                                });
                            }
                        },
                    },
                    {
                        text: 'Delete Entire Range',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                console.log('🗑️ Deleting entire range');
                                await oncallService.deleteOncallById(entry.id);
                                setSelectedDay(null);
                                await reloadData();

                                showAlert({
                                    title: 'Success',
                                    message: `Deleted entire range (${entry.range_from} to ${entry.range_to})`,
                                    icon: 'information-circle',
                                    buttons: [{ text: 'OK', style: 'default' }],
                                });
                            } catch (e: any) {
                                console.error('❌ Error deleting range:', e);
                                showAlert({
                                    title: 'Error',
                                    message: e.message || 'Failed to delete entry',
                                    icon: 'alert-circle',
                                    buttons: [{ text: 'OK', style: 'default' }],
                                });
                            }
                        },
                    },
                ],
            });
        } else {
            showAlert({
                title: 'Delete Entry',
                message: `Delete ${entry.person}'s on-call shift on ${entry.date}?`,
                icon: 'trash',
                buttons: [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                console.log('🗑️ Deleting single day entry');
                                await oncallService.deleteOncallById(entry.id);
                                setSelectedDay(null);
                                await reloadData();
                            } catch (e: any) {
                                console.error('❌ Error deleting entry:', e);
                                showAlert({
                                    title: 'Error',
                                    message: e.message || 'Failed to delete entry',
                                    icon: 'alert-circle',
                                    buttons: [{ text: 'OK', style: 'default' }],
                                });
                            }
                        },
                    },
                ],
            });
        }
    }

    const weekRangeLabel = useMemo(() => {
        const start = fromISO(weekDays[0]!);
        const end = fromISO(weekDays[6]!);

        if (start.getMonth() === end.getMonth()) {
            return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.getDate()}`;
        }

        return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }, [weekDays]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>On-Call Schedule</Text>
                <TouchableOpacity onPress={() => openAdd(todayISO)} style={styles.addButton}>
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.monthNav}>
                    <TouchableOpacity
                        onPress={() => setBaseMonth((prev) => startOfMonth(addMonths(prev, -1)))}
                        style={styles.navButton}
                        disabled={loading}
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
                        disabled={loading}
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

                <MonthView
                    monthDate={baseMonth}
                    todayISO={todayISO}
                    selectedISO={selectedDay}
                    onDayClick={setSelectedDay}
                    entriesByDate={entriesByDate}
                    onAddClick={openAdd}
                />

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

                <View style={styles.weeklySection}>
                    <View style={styles.weekHeader}>
                        <TouchableOpacity
                            onPress={() => setCurrentWeekStart(prev => addWeeks(prev, -1))}
                            style={styles.weekNavButton}
                            disabled={loading}
                        >
                            <Ionicons name="chevron-back" size={20} color="#10b981" />
                        </TouchableOpacity>
                        <View style={styles.weekTitleContainer}>
                            <Text style={styles.sectionTitle}>Week Schedule</Text>
                            <Text style={styles.weekRangeText}>{weekRangeLabel}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setCurrentWeekStart(prev => addWeeks(prev, 1))}
                            style={styles.weekNavButton}
                            disabled={loading}
                        >
                            <Ionicons name="chevron-forward" size={20} color="#10b981" />
                        </TouchableOpacity>
                    </View>

                    {weekDays.map((iso, i) => {
                        const list = entriesByDate.get(iso) ?? [];
                        const first = list[0];
                        const isToday = iso === todayISO;
                        const isSelected = iso === selectedDay;

                        return (
                            <TouchableOpacity
                                key={iso}
                                onPress={() => setSelectedDay(iso)}
                                style={[
                                    styles.weekRow,
                                    isToday && styles.weekRowToday,
                                    isSelected && styles.weekRowSelected,
                                ]}
                            >
                                <View style={styles.weekDayColumn}>
                                    <Text style={[
                                        styles.weekDayName,
                                        (isToday || isSelected) && styles.weekDayNameActive
                                    ]}>
                                        {dowShort(i)}
                                    </Text>
                                    <Text style={[
                                        styles.weekDayNumber,
                                        (isToday || isSelected) && styles.weekDayNumberActive
                                    ]}>
                                        {fromISO(iso).getDate()}
                                    </Text>
                                    {isToday && (
                                        <View style={styles.todayDot} />
                                    )}
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

                <View style={{ height: 100 }} />
            </ScrollView>

            <FooterNavigation
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            <AddEditModal
                visible={modalVisible}
                defaultDate={selectedDay ?? todayISO}
                editing={editing}
                onClose={() => setModalVisible(false)}
                onSave={handleSave}
                existingForDate={(iso) => entries.filter((e) => e.date === iso)}
            />

            {alertConfig && (
                <CustomAlert
                    visible={!!alertConfig}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    buttons={alertConfig.buttons}
                    icon={alertConfig.icon}
                    onDismiss={hideAlert}
                />
            )}
        </View>
    );
}

function MonthView({
                       monthDate,
                       todayISO,
                       selectedISO,
                       onDayClick,
                       entriesByDate,
                       onAddClick,
                   }: {
    monthDate: Date;
    todayISO: string;
    selectedISO: string | null;
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
                    <View key={`dow-${i}`} style={styles.dowHeader}>
                        <Text style={styles.dowText}>{d}</Text>
                    </View>
                ))}

                {days.map((d) => {
                    const iso = fmtISO(d);
                    const inMonth = d.getMonth() === monthIndex;
                    const isToday = iso === todayISO && inMonth;
                    const isSelected = iso === selectedISO && inMonth;
                    const list = entriesByDate.get(iso) ?? [];
                    const primary = list[0];

                    return (
                        <TouchableOpacity
                            key={iso}
                            onPress={() => onDayClick(iso)}
                            onLongPress={() => onAddClick(iso)}
                            style={[
                                styles.dayCell,
                                !inMonth && styles.dayCellInactive,
                                isToday && styles.dayCellToday,
                                isSelected && styles.dayCellSelected,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.dayNumber,
                                    !inMonth && styles.dayNumberInactive,
                                    (isToday || isSelected) && styles.dayNumberActive,
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

    const isEditingSingleDayFromRange = editing && (editing as any)._editSingleDay;
    const isEditingEntireRange = editing && editing.range_from && editing.range_to &&
        editing.range_from !== editing.range_to &&
        !(editing as any)._editSingleDay;

    useEffect(() => {
        if (visible && !editing) {
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
            setSaving(false);
        } else if (visible && editing) {
            setDate(editing.date);
            setFrom(editing.range_from || editing.date);
            setTo(editing.range_to || editing.date);
            setPerson(editing.person);
            setRole(editing.role);
            setStart(editing.start);
            setEnd(editing.end);
            setNotes(editing.notes || '');
            setError(null);

            if (isEditingEntireRange) {
                setMode('range');
            } else {
                setMode('single');
            }
            setSaving(false);
        }
    }, [visible, editing, defaultDate, isEditingSingleDayFromRange, isEditingEntireRange]);

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

            if (mode === 'single' && !isEditingSingleDayFromRange) {
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
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>
                                {editing ? 'Edit Entry' : 'Add Entry'}
                            </Text>
                            {isEditingSingleDayFromRange && (
                                <Text style={styles.modalSubtitle}>
                                    Editing {date} only (was part of range)
                                </Text>
                            )}
                            {isEditingEntireRange && (
                                <Text style={styles.modalSubtitle}>
                                    Editing entire range ({editing.range_from} to {editing.range_to})
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity onPress={onClose} disabled={saving}>
                            <Ionicons name="close" size={24} color="#6b7f72" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
        justifyContent: 'center',
    },
    dowHeader: {
        width: `${100/7}%`,
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
        width: `${100/7}%`,
        aspectRatio: 1,
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        marginBottom: 2,
    },
    dayCellInactive: {
        opacity: 0.3,
    },
    dayCellToday: {
        backgroundColor: '#10b98120',
        borderWidth: 2,
        borderColor: '#10b981',
    },
    dayCellSelected: {
        backgroundColor: '#3b82f620',
        borderWidth: 2,
        borderColor: '#3b82f6',
    },
    dayNumber: {
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    dayNumberInactive: {
        color: '#6b7f72',
    },
    dayNumberActive: {
        fontWeight: '700',
        color: '#10b981',
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
        borderWidth: 2,
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
    weekHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    weekNavButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#1c261f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    weekTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    weekRangeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7f72',
        marginTop: 2,
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
        borderColor: '#10b98180',
        borderWidth: 2,
    },
    weekRowSelected: {
        backgroundColor: '#3b82f615',
        borderColor: '#3b82f6',
        borderWidth: 2,
    },
    weekDayColumn: {
        width: 50,
        alignItems: 'center',
        position: 'relative',
    },
    weekDayName: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7f72',
    },
    weekDayNameActive: {
        color: '#10b981',
        fontWeight: '700',
    },
    weekDayNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginTop: 2,
    },
    weekDayNumberActive: {
        color: '#10b981',
    },
    todayDot: {
        position: 'absolute',
        bottom: -4,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10b981',
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
    modalSubtitle: {
        fontSize: 13,
        color: '#10b981',
        marginTop: 4,
        fontWeight: '600',
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