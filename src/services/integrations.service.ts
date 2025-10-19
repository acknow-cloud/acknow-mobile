import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://nal7m2qo8i.execute-api.eu-central-1.amazonaws.com/dev';

// ============= Types =============

export interface SlackStatus {
    connected: boolean;
    teamId?: string;
    teamName?: string;
    id?: string;
    defaultChannelId?: string;
}

export interface SlackChannel {
    id: string;
    name: string;
    is_private: boolean;
}

export interface TeamsStatus {
    connected: boolean;
    email?: string;
    teamId?: string;
    teamName?: string;
    channelId?: string;
    channelName?: string;
    id?: string;
}

export interface TeamsTeam {
    id: string;
    displayName: string;
}

export interface TeamsChannel {
    id: string;
    displayName: string;
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

    return response.json();
}

// ============= Slack API =============

export const slackApi = {
    // Get connection status
    async getStatus(): Promise<SlackStatus> {
        const tenantId = await getTenantId();
        return apiRequest<SlackStatus>(`/slack/status?tenantId=${tenantId}`);
    },

    // Get install URL (for OAuth)
    getInstallUrl: async (): Promise<string> => {
        const tenantId = await getTenantId();
        return `${API_BASE_URL}/slack/install?tenantId=${tenantId}`;
    },

    // Disconnect Slack
    async disconnect(): Promise<{ ok: boolean }> {
        const tenantId = await getTenantId();
        return apiRequest(`/slack/disconnect?tenantId=${tenantId}`, {
            method: 'POST',
        });
    },

    // List channels
    async listChannels(includePrivate = false): Promise<{ items: SlackChannel[] }> {
        const tenantId = await getTenantId();
        return apiRequest(
            `/slack/channels?tenantId=${tenantId}&includePrivate=${includePrivate ? '1' : '0'}`
        );
    },

    // Connect a specific channel
    async connectChannel(channelId: string): Promise<{ ok: boolean }> {
        const tenantId = await getTenantId();
        return apiRequest('/slack/channel/connect', {
            method: 'POST',
            body: JSON.stringify({ tenantId, channelId }),
        });
    },

    // Send test message
    async sendTest(channelId?: string): Promise<{ ok: boolean }> {
        const tenantId = await getTenantId();
        return apiRequest('/slack/test', {
            method: 'POST',
            body: JSON.stringify({ tenantId, channelId }),
        });
    },
};

// ============= Teams API =============

export const teamsApi = {
    // Get connection status
    async getStatus(): Promise<TeamsStatus> {
        const tenantId = await getTenantId();
        return apiRequest<TeamsStatus>(`/teams/status?tenantId=${tenantId}`);
    },

    // Get install URL (for OAuth)
    getInstallUrl: async (): Promise<string> => {
        const tenantId = await getTenantId();
        return `${API_BASE_URL}/teams/install?tenantId=${tenantId}`;
    },

    // Disconnect Teams
    async disconnect(): Promise<{ ok: boolean }> {
        const tenantId = await getTenantId();
        return apiRequest(`/teams/disconnect?tenantId=${tenantId}`, {
            method: 'POST',
        });
    },

    // List teams
    async listTeams(): Promise<{ items: TeamsTeam[] }> {
        const tenantId = await getTenantId();
        return apiRequest(`/teams/teams?tenantId=${tenantId}`);
    },

    // List channels for a team
    async listChannels(teamId: string): Promise<{ items: TeamsChannel[] }> {
        const tenantId = await getTenantId();
        return apiRequest(`/teams/channels?tenantId=${tenantId}&teamId=${teamId}`);
    },

    // Connect a specific channel
    async connectChannel(teamId: string, channelId: string): Promise<{ ok: boolean }> {
        const tenantId = await getTenantId();
        return apiRequest('/teams/channel/connect', {
            method: 'POST',
            body: JSON.stringify({ tenantId, teamId, channelId }),
        });
    },

    // Send test message
    async sendTest(): Promise<{ ok: boolean }> {
        const tenantId = await getTenantId();
        return apiRequest('/teams/test', {
            method: 'POST',
            body: JSON.stringify({ tenantId }),
        });
    },
};