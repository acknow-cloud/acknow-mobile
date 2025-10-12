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

export interface AlertExplanation {
    explanation: string | null;
    created_at: string;
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
            const tenantId = await AsyncStorage.getItem('tenantId');

            if (!accessToken) {
                console.error('❌ No access token');
                return false;
            }

            if (!tenantId) {
                console.error('❌ No tenant ID');
                return false;
            }

            console.log('🔵 Acknowledging alert:', alertId);
            console.log('🔵 Tenant ID:', tenantId);

            const url = `${API_BASE}/tenants/${tenantId}/alerts/${alertId}/acknowledge`;
            console.log('🔵 Acknowledge URL:', url);

            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            console.log('📥 Acknowledge response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Acknowledge failed:', errorText);
            }

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
            const tenantId = await AsyncStorage.getItem('tenantId');

            if (!accessToken) {
                console.error('❌ No access token');
                return false;
            }

            if (!tenantId) {
                console.error('❌ No tenant ID');
                return false;
            }

            console.log('🔵 Resolving alert:', alertId);
            console.log('🔵 Tenant ID:', tenantId);

            const url = `${API_BASE}/tenants/${tenantId}/alerts/${alertId}/resolve`;
            console.log('🔵 Resolve URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            console.log('📥 Resolve response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Resolve failed:', errorText);
            }

            return response.ok;
        } catch (error) {
            console.error('❌ Error resolving alert:', error);
            return false;
        }
    },

    // Get AI explanation for an alert
    getAlertExplanation: async (alertId: string): Promise<{
        success: boolean;
        data?: AlertExplanation;
        error?: string
    }> => {
        try {
            const accessToken = await AsyncStorage.getItem('accessToken');
            const tenantId = await AsyncStorage.getItem('tenantId');

            if (!accessToken) {
                console.error('❌ No access token');
                return {
                    success: false,
                    error: 'No access token found'
                };
            }

            console.log('🔵 Getting AI explanation for alert:', alertId);
            console.log('🔵 Tenant ID:', tenantId);

            const response = await fetch(
                `${API_BASE}/alerts/${encodeURIComponent(alertId)}/explanation`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
                    },
                }
            );

            console.log('📥 Explanation response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API call failed:', response.status, errorText);

                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { message: errorText };
                }

                return {
                    success: false,
                    error: errorData.message || errorData.error || `HTTP error! status: ${response.status}`,
                };
            }

            const data = await response.json();
            console.log('✅ Got explanation response:', JSON.stringify(data, null, 2));

            // Check if explanation exists in items array or at root level
            let explanation: string | null = null;
            let created_at: string | undefined;

            // Check if response has items array (AWS API format)
            if (data.items && Array.isArray(data.items) && data.items.length > 0) {
                explanation = data.items[0].explanation || null;
                created_at = data.items[0].created_at;
            }
            // Check if explanation is at root level (Next.js proxy format)
            else if (data.explanation) {
                explanation = data.explanation;
                created_at = data.created_at;
            }

            if (!explanation) {
                console.warn('⚠️ No explanation found in response');
                return {
                    success: false,
                    error: 'No explanation available for this alert',
                };
            }

            console.log('✅ Successfully extracted explanation');

            return {
                success: true,
                data: {
                    explanation: explanation,
                    created_at: created_at || new Date().toISOString(),
                },
            };
        } catch (error) {
            console.error('❌ Error getting AI explanation:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get explanation',
            };
        }
    },
};