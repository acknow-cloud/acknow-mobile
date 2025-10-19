import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export type TabName = 'dashboard' | 'incidents' | 'rules'| 'oncall' | 'integrations' | 'reports' | 'settings';

interface FooterNavigationProps {
    activeTab: TabName;
    onTabChange: (tab: TabName) => void;
}

const FooterNavigation: React.FC<FooterNavigationProps> = ({ activeTab, onTabChange }) => {
    const navigation = useNavigation();
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    const handleNavigation = (screen: string, tab: TabName) => {
        navigation.navigate(screen as never);
        onTabChange(tab);
        setShowMoreMenu(false);
    };

    // Check if any "More" menu item is active
    const isMoreActive = ['reports', 'integrations', 'settings'].includes(activeTab);

    return (
        <>
            <View style={styles.footer}>
                {/* Dashboard */}
                <TouchableOpacity
                    style={styles.footerTab}
                    activeOpacity={0.7}
                    onPress={() => handleNavigation('Dashboard', 'dashboard')}
                >
                    <View style={[styles.footerIconContainer, activeTab === 'dashboard' && styles.footerIconActive]}>
                        <Ionicons name="grid" size={24} color={activeTab === 'dashboard' ? '#10b981' : '#6b7f72'} />
                    </View>
                    <Text style={[styles.footerLabel, activeTab === 'dashboard' && styles.footerLabelActive]}>
                        Home
                    </Text>
                </TouchableOpacity>

                {/* Incidents */}
                <TouchableOpacity
                    style={styles.footerTab}
                    activeOpacity={0.7}
                    onPress={() => handleNavigation('Incidents', 'incidents')}
                >
                    <View style={[styles.footerIconContainer, activeTab === 'incidents' && styles.footerIconActive]}>
                        <Ionicons name="alert-circle" size={24} color={activeTab === 'incidents' ? '#10b981' : '#6b7f72'} />
                    </View>
                    <Text style={[styles.footerLabel, activeTab === 'incidents' && styles.footerLabelActive]}>
                        Alerts
                    </Text>
                </TouchableOpacity>

                {/* Rules */}
                <TouchableOpacity
                    style={styles.footerTab}
                    activeOpacity={0.7}
                    onPress={() => handleNavigation('Rules', 'rules')}
                >
                    <View style={[styles.footerIconContainer, activeTab === 'rules' && styles.footerIconActive]}>
                        <Ionicons name="options-outline" size={24} color={activeTab === 'rules' ? '#10b981' : '#6b7f72'} />
                    </View>
                    <Text style={[styles.footerLabel, activeTab === 'rules' && styles.footerLabelActive]}>
                        Rules
                    </Text>
                </TouchableOpacity>

                {/* On-Call */}
                <TouchableOpacity
                    style={styles.footerTab}
                    activeOpacity={0.7}
                    onPress={() => handleNavigation('OnCall', 'oncall')}
                >
                    <View style={[styles.footerIconContainer, activeTab === 'oncall' && styles.footerIconActive]}>
                        <Ionicons name="people" size={24} color={activeTab === 'oncall' ? '#10b981' : '#6b7f72'} />
                    </View>
                    <Text style={[styles.footerLabel, activeTab === 'oncall' && styles.footerLabelActive]}>
                        On-Call
                    </Text>
                </TouchableOpacity>

                {/* More - Only highlight if on Reports, Integrations, or Settings */}
                <TouchableOpacity
                    style={styles.footerTab}
                    activeOpacity={0.7}
                    onPress={() => setShowMoreMenu(true)}
                >
                    <View style={[styles.footerIconContainer, isMoreActive && styles.footerIconActive]}>
                        <Ionicons name="ellipsis-horizontal" size={24} color={isMoreActive ? '#10b981' : '#6b7f72'} />
                        {isMoreActive && <View style={styles.activeIndicator} />}
                    </View>
                    <Text style={[styles.footerLabel, isMoreActive && styles.footerLabelActive]}>
                        More
                    </Text>
                </TouchableOpacity>
            </View>

            {/* More Menu Modal */}
            <Modal
                visible={showMoreMenu}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowMoreMenu(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowMoreMenu(false)}
                    />
                    <View style={styles.moreMenu}>
                        <View style={styles.moreMenuHeader}>
                            <Text style={styles.moreMenuTitle}>More Options</Text>
                            <TouchableOpacity onPress={() => setShowMoreMenu(false)}>
                                <Ionicons name="close" size={28} color="#6b7f72" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.moreMenuContent}>
                            {/* Reports */}
                            <TouchableOpacity
                                style={[styles.moreMenuItem, activeTab === 'reports' && styles.moreMenuItemActive]}
                                onPress={() => handleNavigation('Reports', 'reports')}
                            >
                                <View style={[
                                    styles.moreMenuIconContainer,
                                    activeTab === 'reports' && styles.moreMenuIconActive
                                ]}>
                                    <Ionicons
                                        name="stats-chart"
                                        size={24}
                                        color={activeTab === 'reports' ? '#10b981' : '#6b7f72'}
                                    />
                                </View>
                                <View style={styles.moreMenuTextContainer}>
                                    <Text style={[styles.moreMenuItemTitle, activeTab === 'reports' && styles.moreMenuItemTitleActive]}>
                                        Reports
                                    </Text>
                                    <Text style={styles.moreMenuItemSubtitle}>
                                        View analytics and insights
                                    </Text>
                                </View>
                                {activeTab === 'reports' && (
                                    <View style={styles.checkmark}>
                                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Integrations */}
                            <TouchableOpacity
                                style={[styles.moreMenuItem, activeTab === 'integrations' && styles.moreMenuItemActive]}
                                onPress={() => handleNavigation('Integrations', 'integrations')}
                            >
                                <View style={[
                                    styles.moreMenuIconContainer,
                                    activeTab === 'integrations' && styles.moreMenuIconActive
                                ]}>
                                    <Ionicons
                                        name="link"
                                        size={24}
                                        color={activeTab === 'integrations' ? '#10b981' : '#6b7f72'}
                                    />
                                </View>
                                <View style={styles.moreMenuTextContainer}>
                                    <Text style={[styles.moreMenuItemTitle, activeTab === 'integrations' && styles.moreMenuItemTitleActive]}>
                                        Integrations
                                    </Text>
                                    <Text style={styles.moreMenuItemSubtitle}>
                                        Slack, Teams, and more
                                    </Text>
                                </View>
                                {activeTab === 'integrations' && (
                                    <View style={styles.checkmark}>
                                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Settings */}
                            <TouchableOpacity
                                style={[styles.moreMenuItem, activeTab === 'settings' && styles.moreMenuItemActive]}
                                onPress={() => handleNavigation('Settings', 'settings')}
                            >
                                <View style={[
                                    styles.moreMenuIconContainer,
                                    activeTab === 'settings' && styles.moreMenuIconActive
                                ]}>
                                    <Ionicons
                                        name="settings"
                                        size={24}
                                        color={activeTab === 'settings' ? '#10b981' : '#6b7f72'}
                                    />
                                </View>
                                <View style={styles.moreMenuTextContainer}>
                                    <Text style={[styles.moreMenuItemTitle, activeTab === 'settings' && styles.moreMenuItemTitleActive]}>
                                        Settings
                                    </Text>
                                    <Text style={styles.moreMenuItemSubtitle}>
                                        Account and preferences
                                    </Text>
                                </View>
                                {activeTab === 'settings' && (
                                    <View style={styles.checkmark}>
                                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
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
        paddingHorizontal: 4,
    },
    footerTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    footerIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        position: 'relative',
    },
    footerIconActive: {
        backgroundColor: '#10b98120',
    },
    activeIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10b981',
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
    // More Menu Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        flex: 1,
    },
    moreMenu: {
        backgroundColor: '#0f1612',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 2,
        borderColor: '#10b981',
        maxHeight: '60%',
    },
    moreMenuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#2d3a32',
    },
    moreMenuTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    moreMenuContent: {
        padding: 16,
    },
    moreMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#111813',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2d3a32',
        marginBottom: 12,
    },
    moreMenuItemActive: {
        backgroundColor: '#10b98110',
        borderColor: '#10b981',
    },
    moreMenuIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#0f1612',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    moreMenuIconActive: {
        backgroundColor: '#10b98120',
    },
    moreMenuTextContainer: {
        flex: 1,
    },
    moreMenuItemTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#e5e7eb',
        marginBottom: 2,
    },
    moreMenuItemTitleActive: {
        color: '#10b981',
    },
    moreMenuItemSubtitle: {
        fontSize: 13,
        color: '#6b7f72',
    },
    checkmark: {
        marginLeft: 8,
    },
});

export default FooterNavigation;