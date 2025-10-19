import { useState } from 'react';

interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface AlertConfig {
    title: string;
    message?: string;
    buttons: AlertButton[];
    icon?: 'alert-circle' | 'trash' | 'create' | 'information-circle' | 'warning';
}

export const useCustomAlert = () => {
    const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);

    const showAlert = (config: AlertConfig) => {
        setAlertConfig(config);
    };

    const hideAlert = () => {
        setAlertConfig(null);
    };

    return {
        alertConfig,
        showAlert,
        hideAlert,
    };
};