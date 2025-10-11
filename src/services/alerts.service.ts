import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://nal7m2qo8i.execute-api.eu-central-1.amazonaws.com/dev';

export interface Alert {
    alert_id: string;
    severity: 'critical' | 'warning' | 'info';
    service: string;
    message: string;
    received_at: string;
    status: 'active' | 'resolved';
    acknowledged: boolean;
}

export interface AlertsResponse {
    items: Alert[];
}

export const alertsService = {
    // Fetch alerts for tenant
    fetchAlerts: async (params?: {
        startTime?: string;
        service?: string;
    }): Promise<AlertsResponse> => {
        try {
            // Get tenant ID and access token from storage
            const tenantId = await AsyncStorage.getItem('tenantId');
            const accessToken = await AsyncStorage.getItem('accessToken');

            console.log('🔵 Fetching alerts for tenant:', tenantId);

            if (!tenantId) {
                console.error('❌ No tenant ID found');
                return { items: [] };
            }

            if (!accessToken) {
                console.error('❌ No access token found');
                return { items: [] };
            }

            // Build query params
            const queryParams = new URLSearchParams();
            if (params?.startTime) {
                queryParams.set('startTime', params.startTime);
            }
            if (params?.service) {
                queryParams.set('service', params.service);
            }

            const url = `${API_BASE}/tenants/${tenantId}/alerts${
                queryParams.toString() ? `?${queryParams}` : ''
            }`;

            console.log('🔵 Calling API:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            console.log('📥 Response status:', response.status);

            if (!response.ok) {
                console.error('❌ API call failed:', response.status);
                return { items: [] };
            }

            const data = await response.json();
            console.log('✅ Got alerts:', data.items?.length || 0);

            return Array.isArray(data?.items) ? data : { items: [] };
        } catch (error) {
            console.error('❌ Error fetching alerts:', error);
            return { items: [] };
        }
    },

    // Acknowledge an alert
    acknowledgeAlert: async (alertId: string): Promise<boolean> => {
        try {
            const accessToken = await AsyncStorage.getItem('accessToken');

            if (!accessToken) {
                console.error('❌ No access token');
                return false;
            }

            const response = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            return response.ok;
        } catch (error) {
            console.error('❌ Error acknowledging alert:', error);
            return false;
        }
    },

    // Resolve an alert
    resolveAlert: async (alertId: string): Promise<boolean> => {
        try {
            const accessToken = await AsyncStorage.getItem('accessToken');

            if (!accessToken) {
                console.error('❌ No access token');
                return false;
            }

            const response = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            return response.ok;
        } catch (error) {
            console.error('❌ Error resolving alert:', error);
            return false;
        }
    },
};