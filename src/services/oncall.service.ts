// src/services/oncall.service.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

// Use the same API_BASE as your other backend calls
const API_BASE = 'https://nal7m2qo8i.execute-api.eu-central-1.amazonaws.com/dev';


export type OnCallEntry = {
    id: string;
    date: string;       // YYYY-MM-DD
    person: string;
    role: string;
    start: string;      // HH:mm
    end: string;        // HH:mm
    notes?: string;
    range_from?: string; // ✅ ADD THIS
    range_to?: string;   // ✅ ADD THIS
};

type BackendOnCallItem = {
    id: string;
    tenant_id: string;
    received_at: string;
    person: string;
    role: string;
    start: string;
    end: string;
    range_from?: string;
    range_to?: string;
    notes?: string;
};

type CreateSinglePayload = {
    date: string;
    person: string;
    role: string;
    start: string;
    end: string;
    notes?: string;
};

type CreateRangePayload = {
    from: string;
    to: string;
    person: string;
    role: string;
    start: string;
    end: string;
    notes?: string;
};

type EditPayload = {
    person: string;
    role: string;
    start: string;
    end: string;
    notes?: string;
    range_from?: string;
    range_to?: string;
};

// Expand date range to array of YYYY-MM-DD
function expandDateRange(from: string, to: string): string[] {
    const dates: string[] = [];
    const startDate = new Date(from + 'T00:00:00');
    const endDate = new Date(to + 'T00:00:00');
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
    }
    return dates;
}

async function getTenantId(): Promise<string> {
    const idToken = await AsyncStorage.getItem('idToken');
    if (!idToken) {
        throw new Error('No authentication token found');
    }

    // Decode ID token to get tenant_id (same as cognito service)
    const base64Payload = idToken.split('.')[1];
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    const tenantId = payload['custom:tenant_id'];

    if (!tenantId) {
        throw new Error('No tenant ID found in token');
    }

    return tenantId;
}

async function getAuthHeaders(): Promise<HeadersInit> {
    const idToken = await AsyncStorage.getItem('idToken');
    if (!idToken) {
        throw new Error('No authentication token found');
    }
    return {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
    };
}

async function fetchAllOncallPages(): Promise<BackendOnCallItem[]> {
    const headers = await getAuthHeaders();
    const tenantId = await getTenantId();
    const out: BackendOnCallItem[] = [];
    let cursor: string | undefined = undefined;

    while (true) {
        const qs = new URLSearchParams();
        qs.set('limit', '1000');
        if (cursor) qs.set('cursor', cursor);

        // Call backend API directly: /oncall/{tenantId}
        const url = `${API_BASE}/oncall/${encodeURIComponent(tenantId)}?${qs.toString()}`;
        console.log('🔵 Fetching oncall:', url);

        const res = await fetch(url, {
            method: 'GET',
            headers,
        });

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            console.error('❌ GET /oncall failed:', res.status, body);
            throw new Error(`Failed to fetch on-call data: ${res.status}`);
        }

        const data = await res.json();
        console.log('✅ Oncall response:', data);

        const items = Array.isArray(data?.items) ? data.items : [];
        out.push(...(items as BackendOnCallItem[]));

        const next = data?.nextCursor as string | undefined;
        if (next) {
            cursor = next;
            continue;
        }
        break;
    }
    return out;
}

export const oncallService = {
    async fetchOncall(params: { from: string; to: string }): Promise<OnCallEntry[]> {
        const { from, to } = params;

        // Get all items for tenant
        const raw = await fetchAllOncallPages();

        // Expand each item to daily entries
        const daily: OnCallEntry[] = [];
        for (const it of raw) {
            if (it.range_from && it.range_to) {
                const days = expandDateRange(it.range_from, it.range_to);
                for (const date of days) {
                    if (date >= from && date <= to) {
                        daily.push({
                            id: it.id,
                            date,
                            person: it.person,
                            role: it.role,
                            start: it.start,
                            end: it.end,
                            notes: it.notes,
                            range_from: it.range_from, // ✅ PRESERVE RANGE INFO
                            range_to: it.range_to,     // ✅ PRESERVE RANGE INFO
                        });
                    }
                }
            } else {
                const date = it.received_at?.split('T')[0];
                if (date && date >= from && date <= to) {
                    daily.push({
                        id: it.id,
                        date,
                        person: it.person,
                        role: it.role,
                        start: it.start,
                        end: it.end,
                        notes: it.notes,
                        // No range_from/range_to for single day entries
                    });
                }
            }
        }

        // Sort by date then start time
        daily.sort((a, b) =>
            a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)
        );

        return daily;
    },

    async createOncallSingle(input: CreateSinglePayload): Promise<any> {
        const headers = await getAuthHeaders();
        const tenantId = await getTenantId();
        const payload = { from: input.date, to: input.date, ...input };

        const url = `${API_BASE}/oncall/${encodeURIComponent(tenantId)}`;
        console.log('🔵 Creating oncall single:', url, payload);

        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            console.error('❌ Create failed:', res.status, body);
            throw new Error(`Create failed: ${res.status}`);
        }
        return res.json();
    },

    async createOncallRange(input: CreateRangePayload): Promise<any> {
        const headers = await getAuthHeaders();
        const tenantId = await getTenantId();

        const url = `${API_BASE}/oncall/${encodeURIComponent(tenantId)}`;
        console.log('🔵 Creating oncall range:', url, input);

        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(input),
        });

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            console.error('❌ Create range failed:', res.status, body);
            throw new Error(`Create (range) failed: ${res.status}`);
        }
        return res.json();
    },

    async updateOncallById(id: string, patch: EditPayload): Promise<any> {
        const headers = await getAuthHeaders();
        const tenantId = await getTenantId();

        const url = `${API_BASE}/oncall/${encodeURIComponent(tenantId)}/${encodeURIComponent(id)}`;
        console.log('🔵 Updating oncall:', url, patch);

        const res = await fetch(url, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(patch),
        });

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            console.error('❌ Update failed:', res.status, body);
            throw new Error(`Update failed: ${res.status}`);
        }
        return res.json();
    },

    async deleteOncallById(id: string): Promise<any> {
        const headers = await getAuthHeaders();
        const tenantId = await getTenantId();

        const url = `${API_BASE}/oncall/${encodeURIComponent(tenantId)}/${encodeURIComponent(id)}`;
        console.log('🔵 Deleting oncall:', url);

        const res = await fetch(url, {
            method: 'DELETE',
            headers,
        });

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            console.error('❌ Delete failed:', res.status, body);
            throw new Error(`Delete failed: ${res.status}`);
        }
        return res.json();
    },
};