import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

const API_BASE = 'https://nal7m2qo8i.execute-api.eu-central-1.amazonaws.com/dev';

export interface Alert {
    alert_id: string;
    tenant_id: string;
    service?: string;
    severity?: string;
    message?: string;
    received_at?: string;
    acknowledged?: boolean;
    acknowledged_at?: string;
    status?: string;
}

export interface ChartBucket {
    hour: string;
    [service: string]: string | number;
}

export interface PriorityBucket {
    hour: string;
    p1: number;
    p2: number;
    p3: number;
}

export interface MonthlyStats {
    total: number;
    acked: number;
    mttrMs: number;
    topService: string;
}

async function getTenantId(): Promise<string> {
    const idToken = await AsyncStorage.getItem('idToken');
    if (!idToken) throw new Error('No authentication token found');

    const base64Payload = idToken.split('.')[1];
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    const tenantId = payload['custom:tenant_id'];

    if (!tenantId) throw new Error('No tenant ID found in token');
    return tenantId;
}

async function getAuthHeaders(): Promise<HeadersInit> {
    const idToken = await AsyncStorage.getItem('idToken');
    if (!idToken) throw new Error('No authentication token found');
    return {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
    };
}

async function fetchAllAlerts(params?: { startTime?: string }): Promise<Alert[]> {
    const headers = await getAuthHeaders();
    const tenantId = await getTenantId();

    const all: Alert[] = [];
    let cursor: string | undefined = undefined;

    do {
        const queryParams = new URLSearchParams({ limit: '1000' });
        if (params?.startTime) queryParams.set('startTime', params.startTime);
        if (cursor) queryParams.set('cursor', cursor);

        const url = `${API_BASE}/alerts?${queryParams.toString()}`;
        console.log('🔍 Trying alerts endpoint:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const altUrl = `${API_BASE}/alerts/${encodeURIComponent(tenantId)}?${queryParams.toString()}`;
            console.log('🔍 Trying alternative endpoint:', altUrl);

            const altResponse = await fetch(altUrl, {
                method: 'GET',
                headers,
            });

            if (!altResponse.ok) {
                const errorText = await altResponse.text().catch(() => '');
                console.error('❌ Alerts fetch failed:', altResponse.status, errorText);
                throw new Error(`Failed to fetch alerts: ${altResponse.status}`);
            }

            const data = await altResponse.json();
            const items = Array.isArray(data?.items) ? data.items : [];
            all.push(...items);
            cursor = data?.nextCursor || undefined;
            continue;
        }

        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        all.push(...items);
        cursor = data?.nextCursor || undefined;
    } while (cursor);

    console.log('✅ Total alerts fetched:', all.length);
    return all;
}

function startOfCurrentMonthUTC(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

function formatDuration(ms: number): string {
    if (!ms || ms < 0) return '—';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const remS = s % 60;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return h > 0 ? `${h}h ${remM}m ${remS}s` : `${m}m ${remS}s`;
}

function severityToPriority(severity: string | undefined): 'p1' | 'p2' | 'p3' | null {
    if (!severity) return null;
    const sev = severity.toLowerCase();

    if (sev === 'critical') return 'p1';
    if (sev === 'high') return 'p2';
    if (sev === 'medium' || sev === 'low') return 'p3';

    return null;
}

// ✅ Helper to format current time
function formatCurrentTime(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

export const reportsService = {
    async fetchMonthlyStats(): Promise<MonthlyStats> {
        const monthStart = startOfCurrentMonthUTC().toISOString();
        console.log('📊 Fetching monthly stats from:', monthStart);

        const all = await fetchAllAlerts({ startTime: monthStart });

        const total = all.length;

        const isAck = (a: Alert) => a?.acknowledged === true || !!a?.acknowledged_at;
        const acked = all.filter(isAck).length;

        const mttrSamples: number[] = [];
        for (const a of all) {
            const ra = a?.received_at ? Date.parse(a.received_at) : NaN;
            const aa = a?.acknowledged_at ? Date.parse(a.acknowledged_at) : NaN;
            if (Number.isFinite(ra) && Number.isFinite(aa) && aa >= ra) {
                mttrSamples.push(aa - ra);
            }
        }
        const mttrMs = mttrSamples.length
            ? Math.floor(mttrSamples.reduce((s, v) => s + v, 0) / mttrSamples.length)
            : 0;

        const svcCounts = new Map<string, number>();
        for (const a of all) {
            const s = String(a?.service || 'unknown');
            svcCounts.set(s, (svcCounts.get(s) || 0) + 1);
        }
        let topService = '—';
        let max = -1;
        for (const [s, c] of svcCounts.entries()) {
            if (c > max) {
                max = c;
                topService = s;
            }
        }

        console.log('✅ Monthly stats computed:', { total, acked, mttrMs, topService });
        return { total, acked, mttrMs, topService };
    },

    async fetchTodayAlerts(): Promise<Alert[]> {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const startTime = startOfToday.toISOString();

        console.log('📅 Fetching today alerts from:', startTime);
        const alerts = await fetchAllAlerts({ startTime });
        console.log('✅ Today alerts fetched:', alerts.length);
        return alerts;
    },

    aggregateByService(alerts: Alert[]): { data: ChartBucket[]; services: string[] } {
        const now = new Date();
        const currentHour = now.getHours();

        // ✅ Create buckets for each hour from 00:00 to current hour
        const hours = Array.from({ length: currentHour + 1 }, (_, i) =>
            i.toString().padStart(2, '0') + ':00'
        );

        const currentTime = formatCurrentTime();
        console.log(`📊 Aggregating by service from 00:00 to ${currentTime}`);

        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        // ✅ Use exact current time, not rounded to hour
        const currentMoment = now;

        // ✅ Filter alerts from start of today to RIGHT NOW
        const filteredAlerts = alerts.filter(alert => {
            if (!alert.received_at) return false;
            const alertDate = new Date(alert.received_at);
            return alertDate >= startOfToday && alertDate <= currentMoment;
        });

        console.log(`✅ Filtered ${filteredAlerts.length} alerts for today (up to ${currentTime})`);

        const buckets: ChartBucket[] = hours.map(hour => ({ hour }));
        const services = Array.from(
            new Set(filteredAlerts.map(a => a.service).filter(Boolean))
        ) as string[];

        services.forEach(service => {
            buckets.forEach(bucket => {
                bucket[service] = 0;
            });
        });

        filteredAlerts.forEach(alert => {
            if (!alert.received_at || !alert.service) return;

            const alertDate = new Date(alert.received_at);
            const alertHour = alertDate.getHours().toString().padStart(2, '0') + ':00';

            const bucket = buckets.find(b => b.hour === alertHour);
            if (bucket && alert.service) {
                bucket[alert.service] = (bucket[alert.service] as number || 0) + 1;
            }
        });

        return { data: buckets, services };
    },

    aggregateByPriority(alerts: Alert[]): PriorityBucket[] {
        const now = new Date();
        const currentHour = now.getHours();

        // ✅ Create buckets for each hour from 00:00 to current hour
        const hours = Array.from({ length: currentHour + 1 }, (_, i) =>
            i.toString().padStart(2, '0') + ':00'
        );

        const currentTime = formatCurrentTime();
        console.log(`📊 Aggregating by priority from 00:00 to ${currentTime}`);

        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        // ✅ Use exact current time
        const currentMoment = now;

        // ✅ Filter alerts from start of today to RIGHT NOW
        const filteredAlerts = alerts.filter(alert => {
            if (!alert.received_at) return false;
            const alertDate = new Date(alert.received_at);
            return alertDate >= startOfToday && alertDate <= currentMoment;
        });

        console.log(`✅ Filtered ${filteredAlerts.length} alerts for priority aggregation (up to ${currentTime})`);

        const buckets: PriorityBucket[] = hours.map(hour => ({
            hour,
            p1: 0,
            p2: 0,
            p3: 0
        }));

        filteredAlerts.forEach(alert => {
            if (!alert.received_at) return;

            const alertDate = new Date(alert.received_at);
            const alertHour = alertDate.getHours().toString().padStart(2, '0') + ':00';

            const bucket = buckets.find(b => b.hour === alertHour);
            const priority = severityToPriority(alert.severity);

            if (bucket && priority) {
                bucket[priority] += 1;
            }
        });

        return buckets;
    },

    formatDuration,
    formatCurrentTime,
};