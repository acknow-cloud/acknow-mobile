import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://nal7m2qo8i.execute-api.eu-central-1.amazonaws.com/dev';

// ============= Exported Types =============
export type RuleType = 'route' | 'mute' | 'override' | 'standard';
export type Severity = 'critical' | 'warning' | 'info';
export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';
export type IntegrationType = 'slack' | 'teams' | 'email' | 'mobile_push' | 'digest';

export interface Integration {
    id: string;
    name: string;
    type: IntegrationType;
    channel_name?: string;
    team_name?: string;
}

export interface AlertRule {
    id: string;
    name: string;
    description?: string;
    status: 'active' | 'inactive';
    priority: number;
    rule_type: RuleType;
    conditions: {
        severity?: Severity[];
        priority_level?: PriorityLevel[];
        service?: string[];
        message_contains?: string[];
    };
    actions: Array<{
        integration_id: string;
        integration_type: IntegrationType;
        enabled: boolean;
        route_to?: {
            notification_level?: 'urgent' | 'normal' | 'low';
        };
    }>;
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
    priority_override?: {
        enabled: boolean;
        new_priority: PriorityLevel;
        reason?: string;
    };
    mute_settings?: {
        mute_until?: string;
        mute_reason?: string;
        auto_unmute?: boolean;
    };
    digest_settings?: {
        enabled: boolean;
        frequency: 'hourly' | 'daily' | 'weekly';
        time?: string;
        max_alerts?: number;
    };
    cooldown_minutes?: number;
    created_at: string;
    updated_at: string;
    trigger_count?: number;
    last_triggered_at?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    rule?: T;
    items?: T[];
    count?: number;
    nextCursor?: string;
    message?: string;
}

// ============= Helper Functions =============

async function getAuthToken(): Promise<string> {
    const accessToken = await AsyncStorage.getItem('accessToken');
    if (!accessToken) {
        throw new Error('No auth token found');
    }
    return accessToken;
}

async function getTenantId(): Promise<string> {
    const tenantId = await AsyncStorage.getItem('tenantId');
    if (!tenantId) {
        throw new Error('No tenant ID found');
    }
    return tenantId;
}

async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json() as Promise<T>;
}

// ============= Alert Rules API =============

export const alertRulesApi = {
    async createRule(ruleData: any): Promise<ApiResponse<AlertRule>> {
        const tenantId = await getTenantId();
        return apiRequest<ApiResponse<AlertRule>>(`/tenants/${tenantId}/alert-rules`, {
            method: 'POST',
            body: JSON.stringify(ruleData),
        });
    },

    async updateRule(ruleId: string, ruleData: any): Promise<ApiResponse<AlertRule>> {
        const tenantId = await getTenantId();
        return apiRequest<ApiResponse<AlertRule>>(`/tenants/${tenantId}/alert-rules/${ruleId}`, {
            method: 'PUT',
            body: JSON.stringify(ruleData),
        });
    },

    async listRules(limit = 100, cursor?: string): Promise<ApiResponse<AlertRule>> {
        const tenantId = await getTenantId();
        const params = new URLSearchParams({
            limit: limit.toString(),
            ...(cursor && { cursor }),
        });
        return apiRequest<ApiResponse<AlertRule>>(`/tenants/${tenantId}/alert-rules?${params}`);
    },

    async getRule(ruleId: string): Promise<ApiResponse<AlertRule>> {
        const tenantId = await getTenantId();
        return apiRequest<ApiResponse<AlertRule>>(`/tenants/${tenantId}/alert-rules/${ruleId}`);
    },

    async deleteRule(ruleId: string): Promise<ApiResponse<AlertRule>> {
        const tenantId = await getTenantId();
        return apiRequest<ApiResponse<AlertRule>>(`/tenants/${tenantId}/alert-rules/${ruleId}`, {
            method: 'DELETE',
        });
    },

    async toggleRuleStatus(ruleId: string, status: 'active' | 'inactive'): Promise<ApiResponse<AlertRule>> {
        const tenantId = await getTenantId();
        return apiRequest<ApiResponse<AlertRule>>(`/tenants/${tenantId}/alert-rules/${ruleId}/toggle`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },
};