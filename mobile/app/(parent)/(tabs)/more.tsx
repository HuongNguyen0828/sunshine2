import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { signOutUser } from '@/lib/auth';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Baby,
  FileText,
  Camera,
  DollarSign,
  CreditCard,
  Star,
  Plus,
  Users,
  HelpCircle,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
  BookOpen,
} from 'lucide-react-native';
import { colors } from '@/constants/color';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MenuItem {
  icon: any;
  label: string;
  subtitle?: string;
  onPress: () => void;
}

interface ActionCard {
  icon: any;
  label: string;
  subtitle: string;
  onPress: () => void;
}

export default function More() {
  const insets = useSafeAreaInsets();

  // Expand state for User Settings (no fixed height)
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  // Calendar reminder choice
  const [calendarReminder, setCalendarReminder] = useState<'at_time' | '1_day' | '2_days'>('at_time');

  // Notification toggles
  const [notif, setNotif] = useState({
    dailyReport: true,
    dailyActivity: true,
    calendarEvents: true,
    foodEntry: true,
    photoEntry: true,
    noteEntry: true,
    sleepEntry: true,
  });

  // Handle logout with confirmation dialog
  const onLogout = () => {
    Alert.alert('Sign out', 'Do you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOutUser();
          router.replace('/welcome');
        },
      },
    ]);
  };

  // Placeholder handlers - replace with actual navigation
  const handleNavigation = (screen: string) => {
    Alert.alert('Coming Soon', `${screen} will be available soon`);
  };

  // Open change password screen (placeholder)
  const onChangePassword = () => {
    // Replace with your navigation to change password screen
    // e.g. router.push('/settings/change-password')
    Alert.alert('Change Password', 'Navigate to change password screen.');
  };

  // Toggle expand with LayoutAnimation (allows natural height)
  const toggleSettingsExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSettingsExpanded((s) => !s);
  };

  const handleToggle = (key: keyof typeof notif) => {
    setNotif((prev) => {
      const newVal = !prev[key];
      if (key === 'calendarEvents' && !newVal) {
        setCalendarReminder('at_time'); // reset when turned OFF
      }
      return { ...prev, [key]: newVal };
    });
  };

  // Redesigned action cards with gradients
  const actionCards: ActionCard[] = [
    {
      icon: Sparkles,
      label: 'My Class',
      subtitle: 'Room activities',
      onPress: () => handleNavigation('My Class'),
    },
    {
      icon: BookOpen,
      label: 'Daily Reports',
      subtitle: "Today's summary",
      onPress: () => handleNavigation('Daily Reports'),
    },
  ];

  // Menu items (other features)
  const menuItems: MenuItem[] = [
    {
      icon: Camera,
      label: 'Photos Plus',
      subtitle: 'Upgrade now',
      onPress: () => handleNavigation('Photos Plus'),
    },
    {
      icon: DollarSign,
      label: 'Invoices',
      onPress: () => handleNavigation('Invoices'),
    },
    {
      icon: CreditCard,
      label: 'Payment Options',
      onPress: () => handleNavigation('Payment Options'),
    },
    {
      icon: Star,
      label: 'Milestones',
      onPress: () => handleNavigation('Milestones'),
    },
    {
      icon: Plus,
      label: 'Add Entry',
      onPress: () => handleNavigation('Add Entry'),
    },
    {
      icon: Users,
      label: 'Crew',
      onPress: () => handleNavigation('Crew'),
    },
    {
      icon: HelpCircle,
      label: 'Hi Q',
      onPress: () => handleNavigation('Hi Q'),
    },
    {
      icon: Settings,
      label: 'User Settings',
      subtitle: undefined,
      // We'll override onPress when rendering so we can toggle expand.
      onPress: () => { },
    },
    {
      icon: HelpCircle,
      label: 'Help Center',
      onPress: () => handleNavigation('Help Center'),
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={['#FCE7F3', '#F3E8FF', '#FFFFFF']}
        style={styles.gradientBackground}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarInitials}>PJ</Text>
          </View>
          <Text style={styles.userName}>Child Name</Text>
          <View style={styles.badgesContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Sam Z</Text>
            </View>
          </View>
        </View>

        {/* Redesigned Action Cards with Gradients */}
        <View style={styles.actionCardsContainer}>
          {actionCards.map((card, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.actionCardWrapper,
                { transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
              onPress={card.onPress}
            >
              <View
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    borderWidth: 0.5,
                    borderColor:
                      index === 0 ? 'rgba(236, 72, 153, 0.06)' : 'rgba(99, 102, 241, 0.06)',
                  },
                ]}
              >
                <View
                  style={[
                    styles.cornerDecoration,
                    { backgroundColor: index === 0 ? '#FFB3C1' : '#A6C8FF' },
                  ]}
                />

                <View style={styles.iconContainer}>
                  <card.icon size={24} color={index === 0 ? '#D61F69' : '#1E5EFF'} strokeWidth={2} />
                </View>

                <View style={styles.actionCardText}>
                  <Text style={[styles.actionCardLabel, { color: index === 0 ? '#C71E5F' : '#1A50DB' }]}>
                    {card.label}
                  </Text>
                  <Text style={styles.actionCardSubtitle}>{card.subtitle}</Text>
                </View>

                <View style={styles.dotsContainer}>
                  <View style={[styles.dot, { backgroundColor: index === 0 ? '#FFD6E0' : '#D6E4FF' }]} />
                  <View style={[styles.dot, styles.dotSmall, { backgroundColor: index === 0 ? '#FFE8ED' : '#E8F0FF' }]} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Menu List */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => {
            // Special handling for User Settings row
            const isSettingsRow = item.label === 'User Settings';
            return (
              <React.Fragment key={index}>
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    index === menuItems.length - 1 && styles.menuItemLast,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={isSettingsRow ? toggleSettingsExpand : item.onPress}
                >
                  <View style={styles.menuItemLeft}>
                    <item.icon size={22} color={colors.palette.neutral600} strokeWidth={2} />
                    <View style={styles.menuItemText}>
                      <Text style={styles.menuItemLabel}>{item.label}</Text>
                      {item.subtitle && <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>}
                    </View>
                  </View>
                  <ChevronRight size={20} color="#CCCCCC" strokeWidth={2} />
                </Pressable>

                {/* Expandable Settings panel — natural height (no clipping) */}
                {isSettingsRow && settingsExpanded && (
                  <View style={styles.settingsPanel}>
                    <View style={styles.settingsInner}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.settingsRow,
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                        onPress={onChangePassword}
                      >
                        <Text style={styles.settingsTitle}>Change Password</Text>
                        <Text style={styles.settingsAction}>›</Text>
                      </Pressable>

                      <View style={styles.dividerThin} />

                      <Text style={styles.settingsTitle}>Notification Settings</Text>

                      <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Daily Report</Text>
                        <Switch
                          value={notif.dailyReport}
                          onValueChange={() => handleToggle('dailyReport')}
                          trackColor={{ true: colors.palette.primary500, false: '#E9E9E9' }}
                          thumbColor={Platform.OS === 'android' ? (notif.dailyReport ? '#fff' : '#fff') : undefined}
                        />
                      </View>

                      <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Daily Activity</Text>
                        <Switch
                          value={notif.dailyActivity}
                          onValueChange={() => handleToggle('dailyActivity')}
                          trackColor={{ true: colors.palette.primary500, false: '#E9E9E9' }}
                          thumbColor={Platform.OS === 'android' ? (notif.dailyActivity ? '#fff' : '#fff') : undefined}
                        />
                      </View>

                      {/* Calendar Events row: keep the Switch visible, render options below when enabled */}
                      <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Calendar Events</Text>
                        <Switch
                          value={notif.calendarEvents}
                          onValueChange={() => handleToggle('calendarEvents')}
                          trackColor={{ true: colors.palette.primary500, false: '#E9E9E9' }}
                          thumbColor={Platform.OS === 'android' ? (notif.calendarEvents ? '#fff' : '#fff') : undefined}
                        />
                      </View>

                      {/* reminder options appear below the Calendar row when enabled */}
                      {notif.calendarEvents && (
                        <View style={styles.reminderOptionsContainer}>
                          <Pressable
                            onPress={() => {
                              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                              setCalendarReminder('at_time');
                            }}
                            style={styles.reminderOption}
                          >
                            <View style={styles.radioOuter}>
                              {calendarReminder === 'at_time' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.reminderText}>At time of event</Text>
                          </Pressable>

                          <Pressable
                            onPress={() => {
                              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                              setCalendarReminder('1_day');
                            }}
                            style={styles.reminderOption}
                          >
                            <View style={styles.radioOuter}>
                              {calendarReminder === '1_day' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.reminderText}>1 day before</Text>
                          </Pressable>

                          <Pressable
                            onPress={() => {
                              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                              setCalendarReminder('2_days');
                            }}
                            style={styles.reminderOption}
                          >
                            <View style={styles.radioOuter}>
                              {calendarReminder === '2_days' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.reminderText}>2 days before</Text>
                          </Pressable>
                        </View>
                      )}

                      <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Food Entry</Text>
                        <Switch
                          value={notif.foodEntry}
                          onValueChange={() => handleToggle('foodEntry')}
                          trackColor={{ true: colors.palette.primary500, false: '#E9E9E9' }}
                          thumbColor={Platform.OS === 'android' ? (notif.foodEntry ? '#fff' : '#fff') : undefined}
                        />
                      </View>

                      <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Photo Entry</Text>
                        <Switch
                          value={notif.photoEntry}
                          onValueChange={() => handleToggle('photoEntry')}
                          trackColor={{ true: colors.palette.primary500, false: '#E9E9E9' }}
                          thumbColor={Platform.OS === 'android' ? (notif.photoEntry ? '#fff' : '#fff') : undefined}
                        />
                      </View>

                      <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Note Entry</Text>
                        <Switch
                          value={notif.noteEntry}
                          onValueChange={() => handleToggle('noteEntry')}
                          trackColor={{ true: colors.palette.primary500, false: '#E9E9E9' }}
                          thumbColor={Platform.OS === 'android' ? (notif.noteEntry ? '#fff' : '#fff') : undefined}
                        />
                      </View>

                      <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Sleep Entry</Text>
                        <Switch
                          value={notif.sleepEntry}
                          onValueChange={() => handleToggle('sleepEntry')}
                          trackColor={{ true: colors.palette.primary500, false: '#E9E9E9' }}
                          thumbColor={Platform.OS === 'android' ? (notif.sleepEntry ? '#fff' : '#fff') : undefined}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </React.Fragment>
            );
          })}

          {/* Sign Out Button */}
          <Pressable
            style={({ pressed }) => [styles.logoutButton, { opacity: pressed ? 0.7 : 1 }]}
            onPress={onLogout}
          >
            <LogOut size={22} color={colors.palette.angry500} strokeWidth={2} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    overflow: 'visible',
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
  // small helpers
  divider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 6,
  },
  reminderOptionsContainer: {
    marginLeft: 8,
    marginTop: 6,
    paddingVertical: 6,
    gap: 10,
    paddingLeft: 40,
    paddingRight: 16,
  },

  reminderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
});
