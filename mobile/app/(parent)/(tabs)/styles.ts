import { colors } from '@/constants/color';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    gradientBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 450,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    // Profile Header
    profileHeader: {
        backgroundColor: 'transparent',
        paddingVertical: 28,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#FFE6F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },
    avatarInitials: {
        fontSize: 44,
        fontWeight: 'bold',
        color: '#E91E8C',
        letterSpacing: -1,
    },
    userName: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 14,
        letterSpacing: -0.5,
    },
    badgesContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    badge: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E6E6E6',
    },
    badgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666666',
    },
    // Redesigned Action Cards
    actionCardsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    actionCardWrapper: {
        flex: 1,
    },
    actionCard: {
        borderRadius: 20,
        padding: 18,
        paddingVertical: 20,
        position: 'relative',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    cornerDecoration: {
        position: 'absolute',
        top: -15,
        right: -15,
        width: 40,
        height: 40,
        borderRadius: 20,
        opacity: 0.15,
    },
    iconContainer: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        alignSelf: 'center',
    },
    actionCardText: {
        alignItems: 'center',
    },
    actionCardLabel: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: -0.2,
    },
    actionCardSubtitle: {
        fontSize: 12,
        color: '#7A7A7A',
        letterSpacing: 0,
    },
    dotsContainer: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        flexDirection: 'row',
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        opacity: 0.6,
    },
    dotSmall: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    // Menu List
    menuContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.025,
        shadowRadius: 10,
        elevation: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        paddingHorizontal: 18,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F5F5F5',
    },
    menuItemLast: {
        borderBottomWidth: 0,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuItemText: {
        marginLeft: 16,
        flex: 1,
    },
    menuItemLabel: {
        fontSize: 17,
        fontWeight: '500',
        color: '#2A2A2A',
        letterSpacing: -0.3,
    },
    menuItemSubtitle: {
        fontSize: 13,
        color: colors.palette.neutral500,
        marginTop: 2,
    },
    // Settings panel
    settingsPanel: {
        overflow: 'hidden',
        backgroundColor: '#FAFAFB',
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
    },
    settingsInner: {
        paddingHorizontal: 18,
        paddingVertical: 12,
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    settingsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
    },
    settingsAction: {
        fontSize: 18,
        color: '#999',
    },
    dividerThin: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 8,
    },
    sectionTitleSmall: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.palette.neutral600,
        marginTop: 8,
        marginBottom: 6,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    toggleLabel: {
        fontSize: 15,
        color: '#222',
    },
    // Logout Button
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 18,
        marginTop: 4,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.palette.angry500,
        marginLeft: 16,
    },
    // small helpers
    divider: {
        height: 1,
        backgroundColor: '#F5F5F5',
        marginVertical: 6,
    },
    reminderOptionsContainer: {
        marginLeft: 48,
        marginTop: 6,
        paddingVertical: 6,
        gap: 10,
    },

    reminderOption: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.palette.primary500,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },

    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.palette.primary500,
    },

    reminderText: {
        fontSize: 14,
        color: '#444',
    },
});
