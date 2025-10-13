import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export type TabName = 'dashboard' | 'incidents' | 'oncall' | 'reports' | 'settings';

interface FooterNavigationProps {
    activeTab: TabName;
    onTabChange: (tab: TabName) => void;
}

const FooterNavigation: React.FC<FooterNavigationProps> = ({ activeTab, onTabChange }) => {
    const navigation = useNavigation();

    const handleOnCallPress = () => {
        navigation.navigate('OnCall' as never);
    };

    const handleSettings = () => {
        navigation.navigate('Settings' as never);
    };

    const handleDashboard = () => {
        navigation.navigate('Dashboard' as never);
    };

    return (
        <View style={styles.footer}>
            <TouchableOpacity
                style={styles.footerTab}
                activeOpacity={0.7}
                onPress={handleDashboard}
            >
                <View style={[styles.footerIconContainer, activeTab === 'dashboard' && styles.footerIconActive]}>
                    <Ionicons name="grid" size={22} color={activeTab === 'dashboard' ? '#10b981' : '#6b7f72'} />
                </View>
                <Text style={[styles.footerLabel, activeTab === 'dashboard' && styles.footerLabelActive]}>
                    Dashboard
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.footerTab}
                activeOpacity={0.7}
                onPress={() => onTabChange('incidents')}
            >
                <View style={[styles.footerIconContainer, activeTab === 'incidents' && styles.footerIconActive]}>
                    <Ionicons name="alert-circle" size={22} color={activeTab === 'incidents' ? '#10b981' : '#6b7f72'} />
                </View>
                <Text style={[styles.footerLabel, activeTab === 'incidents' && styles.footerLabelActive]}>
                    Incidents
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.footerTab}
                activeOpacity={0.7}
                onPress={handleOnCallPress}
            >
                <View style={[styles.footerIconContainer, activeTab === 'oncall' && styles.footerIconActive]}>
                    <Ionicons name="people" size={22} color={activeTab === 'oncall' ? '#10b981' : '#6b7f72'} />
                </View>
                <Text style={[styles.footerLabel, activeTab === 'oncall' && styles.footerLabelActive]}>
                    On-Call
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.footerTab}
                activeOpacity={0.7}
                onPress={() => onTabChange('reports')}
            >
                <View style={[styles.footerIconContainer, activeTab === 'reports' && styles.footerIconActive]}>
                    <Ionicons name="stats-chart" size={22} color={activeTab === 'reports' ? '#10b981' : '#6b7f72'} />
                </View>
                <Text style={[styles.footerLabel, activeTab === 'reports' && styles.footerLabelActive]}>
                    Reports
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.footerTab}
                activeOpacity={0.7}
                onPress={handleSettings}
            >
                <View style={[styles.footerIconContainer, activeTab === 'settings' && styles.footerIconActive]}>
                    <Ionicons name="settings" size={22} color={activeTab === 'settings' ? '#10b981' : '#6b7f72'} />
                </View>
                <Text style={[styles.footerLabel, activeTab === 'settings' && styles.footerLabelActive]}>
                    Settings
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    footer: {
        flexDirection: 'row',
        backgroundColor: '#1c261f',
        borderTopWidth: 1,
        borderTopColor: '#2d3a32',
        paddingBottom: 20,
        paddingTop: 12,
        paddingHorizontal: 8,
    },
    footerTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    footerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    footerIconActive: {
        backgroundColor: '#10b98120',
    },
    footerLabel: {
        fontSize: 11,
        color: '#6b7f72',
        fontWeight: '600',
    },
    footerLabelActive: {
        color: '#10b981',
        fontWeight: '700',
    },
});

export default FooterNavigation;