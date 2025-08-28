// Acknow Mobile — Expo + React Native (TypeScript)
// Single-file starter you can paste into App.tsx to bootstrap the mobile UI.
// Brand: deep blue primary, soft green accent. No backend calls yet.
// ---------------------------------------------------------------
// Quick start:
// 1) npm i -g expo-cli (if needed)
// 2) npx create-expo-app@latest acknow-mobile -t expo-template-blank-typescript
// 3) cd acknow-mobile && npm i @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-safe-area-context react-native-screens expo-local-authentication
// 4) (iOS) npx pod-install
// 5) Replace the generated App.tsx with this file's content.
// 6) npm run start

import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, StatusBar, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';

// ---------------------------------------------------------------
// Brand tokens
// ---------------------------------------------------------------
const COLORS = {
  bg: '#F4F6FA', // light gray background
  text: '#1A1C24',
  subtext: '#4B5263',
  card: '#FFFFFF',
  border: '#E5E8F0',
  primary: '#0F1A3A', // deep blue
  primarySoft: '#172451',
  accent: '#3AA981', // calming green
  accentSoft: '#58C29A',
  danger: '#D44B4B',
  warn: '#E6B449',
};

// ---------------------------------------------------------------
// Navigation setup
// ---------------------------------------------------------------
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Minimal app theme (keeps iOS/Android defaults but with light BG)
const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
    text: COLORS.text,
    primary: COLORS.accent,
    border: COLORS.border,
    card: COLORS.card,
  },
};

// ---------------------------------------------------------------
// Shared UI
// ---------------------------------------------------------------
function Header({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
      <SafeAreaView style={{ backgroundColor: COLORS.bg }}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{title}</Text>
          <View>{right}</View>
        </View>
      </SafeAreaView>
  );
}

function Pill({ label, color = COLORS.accent }: { label: string; color?: string }) {
  return (
      <View style={[styles.pill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
        <Text style={[styles.pillText, { color }]}>{label}</Text>
      </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

// ---------------------------------------------------------------
// Screens: Alerts (list), Incident (detail), Evidence, OnCall, Settings
// ---------------------------------------------------------------

type AlertItem = {
  id: string;
  title: string;
  severity: 'P1' | 'P2' | 'P3';
  source: 'Alertmanager' | 'CloudWatch' | 'GKE' | 'Custom';
  timeAgo: string;
};

const SAMPLE_ALERTS: AlertItem[] = [
  { id: '1', title: 'High error rate on api-gateway', severity: 'P1', source: 'Alertmanager', timeAgo: '3m' },
  { id: '2', title: 'Elevated latency in orders service', severity: 'P2', source: 'GKE', timeAgo: '15m' },
  { id: '3', title: 'Disk pressure node ip-10-0-2-5', severity: 'P3', source: 'CloudWatch', timeAgo: '36m' },
];

function AlertsScreen({ navigation }: any) {
  const renderItem = ({ item }: { item: AlertItem }) => (
      <TouchableOpacity onPress={() => navigation.navigate('Incident', { id: item.id })}>
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.alertTitle}>{item.title}</Text>
            <Pill label={item.severity} color={item.severity === 'P1' ? COLORS.danger : item.severity === 'P2' ? COLORS.warn : COLORS.accent} />
          </View>
          <View style={styles.rowGapSm}>
            <Text style={styles.alertMeta}>{item.source}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.alertMeta}>{item.timeAgo} ago</Text>
          </View>
        </Card>
      </TouchableOpacity>
  );

  return (
      <View style={styles.screen}>
        <Header title="Active alerts" right={<Feather name="bell" size={22} color={COLORS.primary} />} />
        <FlatList
            contentContainerStyle={{ padding: 16, gap: 12 }}
            data={SAMPLE_ALERTS}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
        />
      </View>
  );
}

function IncidentScreen({ route }: any) {
  const { id } = route.params ?? {};
  const [snoozed, setSnoozed] = useState(false);

  return (
      <View style={styles.screen}>
        <Header title={`Incident ${id}`} right={<Feather name="alert-triangle" size={22} color={COLORS.danger} />} />
        <View style={{ padding: 16, gap: 12 }}>
          <Card>
            <Text style={styles.cardTitle}>api-gateway — 5xx spike</Text>
            <View style={{ height: 8 }} />
            <View style={styles.rowGapSm}>
              <Pill label="P1" color={COLORS.danger} />
              <Pill label="SLO burn" color={COLORS.warn} />
              <Pill label="us-east-1" color={COLORS.accent} />
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionLabel}>Actions</Text>
            <View style={{ height: 8 }} />
            <View style={styles.actionsRow}>
              <ActionButton icon="check-circle" label="Ack" onPress={() => {}} />
              <ActionButton icon="clock" label={snoozed ? 'Snoozed' : 'Snooze'} onPress={() => setSnoozed((v) => !v)} />
              <ActionButton icon="tool" label="Remediate" onPress={() => {}} primary />
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionLabel}>Runbook Runner</Text>
            <View style={{ height: 8 }} />
            <Step label="Pre-checks" state="ok" />
            <Step label="Apply fix: restart canary" state="pending" />
            <Step label="Post-checks" state="idle" />
            <View style={{ height: 10 }} />
            <TouchableOpacity style={styles.primaryBtn}>
              <Feather name="play" color={'#fff'} size={16} />
              <Text style={styles.primaryBtnText}>Run with approvals</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </View>
  );
}

function EvidenceScreen() {
  const items = [
    { id: 'e1', t: 'Acknowledged by K.K., Face ID', ts: '10:21' },
    { id: 'e2', t: 'Runbook executed: restart canary', ts: '10:22' },
    { id: 'e3', t: 'SLO burn halted, error rate normal', ts: '10:25' },
  ];
  return (
      <View style={styles.screen}>
        <Header title="Evidence feed" right={<Feather name="file-text" size={22} color={COLORS.primary} />} />
        <View style={{ padding: 16, gap: 12 }}>
          {items.map((it) => (
              <Card key={it.id}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{it.t}</Text>
                  <Text style={styles.alertMeta}>{it.ts}</Text>
                </View>
              </Card>
          ))}
        </View>
      </View>
  );
}

function OnCallScreen() {
  const [quietHours, setQuietHours] = useState(true);
  return (
      <View style={styles.screen}>
        <Header title="On-call" right={<Feather name="calendar" size={22} color={COLORS.primary} />} />
        <View style={{ padding: 16, gap: 12 }}>
          <Card>
            <Text style={styles.sectionLabel}>This week</Text>
            <View style={{ height: 8 }} />
            <Row label="Primary" value="Alice (Mon–Thu)" icon="user" />
            <Row label="Secondary" value="Bob (Thu–Sun)" icon="users" />
            <Row label="Escalation" value="SRE PagerDuty" icon="chevrons-right" />
          </Card>

          <Card>
            <Text style={styles.sectionLabel}>Alert rules</Text>
            <View style={{ height: 8 }} />
            <Row label="Quiet hours" right={<Switch value={quietHours} onValueChange={setQuietHours} />} icon="moon" />
            <Row label="P1 → mobile push" value="Always" icon="smartphone" />
            <Row label="P2 → chat" value="Slack" icon="message-square" />
            <Row label="P3 → digest" value="Daily 9:00" icon="mail" />
          </Card>
        </View>
      </View>
  );
}

function SettingsScreen() {
  const [bioReady, setBioReady] = useState<boolean | null>(null);
  const [bioEnabled, setBioEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBioReady(hasHardware && enrolled);
    })();
  }, []);

  const handleBiometricTest = async () => {
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm identity' });
    if (res.success) setBioEnabled(true);
  };

  return (
      <View style={styles.screen}>
        <Header title="Settings" right={<Feather name="settings" size={22} color={COLORS.primary} />} />
        <View style={{ padding: 16, gap: 12 }}>
          <Card>
            <Text style={styles.sectionLabel}>Security</Text>
            <View style={{ height: 8 }} />
            <Row label="Biometric approval" value={bioEnabled ? 'Enabled' : bioReady ? 'Available' : 'Unavailable'} icon="shield" right={
              <TouchableOpacity style={[styles.secondaryBtn, { opacity: bioReady ? 1 : 0.5 }]} disabled={!bioReady} onPress={handleBiometricTest}>
                <Text style={styles.secondaryBtnText}>{bioEnabled ? 'Re-auth' : 'Enable'}</Text>
              </TouchableOpacity>
            } />
            <Row label="Export evidence (CSV)" value="On device" icon="download" />
          </Card>
        </View>
      </View>
  );
}

// ---------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------
function ActionButton({ icon, label, onPress, primary }: { icon: any; label: string; onPress: () => void; primary?: boolean }) {
  return (
      <TouchableOpacity onPress={onPress} style={[styles.actionBtn, primary && styles.actionBtnPrimary]}>
        <Feather name={icon} size={18} color={primary ? '#fff' : COLORS.primary} />
        <Text style={[styles.actionBtnText, primary && { color: '#fff' }]}>{label}</Text>
      </TouchableOpacity>
  );
}

function Step({ label, state }: { label: string; state: 'idle' | 'pending' | 'ok' }) {
  const color = state === 'ok' ? COLORS.accent : state === 'pending' ? COLORS.warn : COLORS.border;
  const icon = state === 'ok' ? 'check' : state === 'pending' ? 'loader' : 'minus';
  return (
      <View style={styles.stepRow}>
        <Feather name={icon as any} size={16} color={color} />
        <Text style={[styles.stepText, { color: COLORS.subtext }]}>{label}</Text>
      </View>
  );
}

function Row({ label, value, icon, right }: { label: string; value?: string; icon: any; right?: React.ReactNode }) {
  return (
      <View style={styles.rowItem}>
        <View style={styles.rowLeft}>
          <Feather name={icon} size={18} color={COLORS.primary} />
          <Text style={styles.rowLabel}>{label}</Text>
        </View>
        <View style={styles.rowRight}>
          {value && <Text style={styles.rowValue}>{value}</Text>}
          {right}
        </View>
      </View>
  );
}

// ---------------------------------------------------------------
// Tab Navigation containers
// ---------------------------------------------------------------
function AlertsStack() {
  return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AlertsList" component={AlertsScreen} />
        <Stack.Screen name="Incident" component={IncidentScreen} />
      </Stack.Navigator>
  );
}

export default function App() {
  return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <NavigationContainer theme={navTheme}>
          <Tab.Navigator
              screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: COLORS.accent,
                tabBarInactiveTintColor: COLORS.subtext,
                tabBarStyle: { backgroundColor: COLORS.card, borderTopColor: COLORS.border },
                tabBarIcon: ({ color, size }) => {
                  const map: Record<string, any> = {
                    Alerts: 'bell',
                    Evidence: 'file-text',
                    OnCall: 'calendar',
                    Settings: 'settings',
                  };
                  return <Feather name={map[route.name]} size={size} color={color} />;
                },
              })}
          >
            <Tab.Screen name="Alerts" component={AlertsStack} />
            <Tab.Screen name="Evidence" component={EvidenceScreen} />
            <Tab.Screen name="OnCall" component={OnCallScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
  );
}

// ---------------------------------------------------------------
// Styles
// ---------------------------------------------------------------
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.primary },

  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowGapSm: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  alertMeta: { fontSize: 12, color: COLORS.subtext },
  dot: { color: COLORS.border },

  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 12, fontWeight: '600' },

  sectionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#EEF1F6' },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  actionBtnPrimary: { backgroundColor: COLORS.accent },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  stepText: { fontSize: 14 },

  primaryBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, justifyContent: 'center', borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '800', letterSpacing: 0.2 },

  rowItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowValue: { fontSize: 13, color: COLORS.subtext },
});
