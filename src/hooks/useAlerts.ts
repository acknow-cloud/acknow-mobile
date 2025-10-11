import { useState, useEffect, useCallback } from 'react';
import { alertsService, Alert } from '../services/alerts.service';

export const useAlerts = (tenantId: string | null) => { // ✅ Accept tenantId as parameter
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAlerts = useCallback(async (isRefresh = false) => {
        // Don't fetch if no tenant ID
        if (!tenantId) {
            console.log('⏸️ Waiting for tenant ID...');
            setLoading(false);
            return;
        }

        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const response = await alertsService.fetchAlerts();
            setAlerts(response.items);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch alerts');
            console.error('Error in useAlerts:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [tenantId]); // ✅ Add tenantId as dependency

    useEffect(() => {
        if (tenantId) { // ✅ Only fetch when tenantId exists
            fetchAlerts();
        }
    }, [fetchAlerts, tenantId]);

    const refresh = useCallback(() => {
        fetchAlerts(true);
    }, [fetchAlerts]);

    const acknowledgeAlert = useCallback(async (alertId: string) => {
        const success = await alertsService.acknowledgeAlert(alertId);
        if (success) {
            setAlerts(prev =>
                prev.map(alert =>
                    alert.alert_id === alertId ? { ...alert, acknowledged: true } : alert
                )
            );
        }
        return success;
    }, []);

    const resolveAlert = useCallback(async (alertId: string) => {
        const success = await alertsService.resolveAlert(alertId);
        if (success) {
            setAlerts(prev =>
                prev.map(alert =>
                    alert.alert_id === alertId ? { ...alert, status: 'resolved' } : alert
                )
            );
        }
        return success;
    }, []);

    const counts = {
        critical: alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length,
        warning: alerts.filter(a => a.severity === 'warning' && a.status !== 'resolved').length,
        info: alerts.filter(a => a.severity === 'info' && a.status !== 'resolved').length,
        total: alerts.filter(a => a.status !== 'resolved').length,
    };

    return {
        alerts,
        loading,
        error,
        refreshing,
        counts,
        refresh,
        acknowledgeAlert,
        resolveAlert,
    };
};