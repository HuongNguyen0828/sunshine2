/**
 * Teacher More/Settings Page with Expandable Dropdowns
 *
 * Enhanced with inline expandable sections that show/hide content
 * with animated arrow rotation and smooth transitions.
 */

import { View, Text, Pressable, Alert, ScrollView, StyleSheet, Animated, TextInput, Image } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { signOutUser } from '@/lib/auth';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '@/lib/firebase';
import {
  Users,
  FileText,
  Camera,
  MessageSquare,
  Calendar,
  Bell,
  ClipboardList,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  ChevronDown,
  Sparkles,
  BookOpen,
  User,
  Shield,
  Smartphone,
  Globe,
  CreditCard,
  Receipt,
  Clock,
  Phone,
  Mail,
  AlertCircle,
  Baby,
  Heart,
  School,
} from 'lucide-react-native';
import { colors } from '@/constants/color';
import { mockSettings, mockTeachers, mockClasses } from '@/src/data/mockData';

interface MenuItem {
  icon: any;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  hasDropdown?: boolean;
  dropdownContent?: any;
}

interface ActionCard {
  icon: any;
  label: string;
  subtitle: string;
  onPress: () => void;
}

export default function TeacherMore() {
  const insets = useSafeAreaInsets();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const rotationValues = useRef<{ [key: string]: Animated.Value }>({});
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  // Get Firebase user email on mount
  useEffect(() => {
    const user = auth.currentUser;
    if (user && !teacherName) {
      setTeacherName(user.email || 'Teacher Name');
    }
  }, []);

  // Initialize rotation values for each dropdown item
  const getRotationValue = (label: string) => {
    if (!rotationValues.current[label]) {
      rotationValues.current[label] = new Animated.Value(0);
    }
    return rotationValues.current[label];
  };

  // Toggle dropdown expansion
  const toggleExpanded = (label: string) => {
    const newExpanded = new Set(expandedItems);
    const isExpanded = newExpanded.has(label);

    if (isExpanded) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }

    // Animate rotation
    Animated.timing(getRotationValue(label), {
      toValue: isExpanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    setExpandedItems(newExpanded);
  };

  // Handle profile image selection
  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to upload a profile picture.');
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as ImagePicker.MediaType,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

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

  // Placeholder handlers
  const handleNavigation = (screen: string) => {
    Alert.alert('Coming Soon', `${screen} will be available soon`);
  };

  // Action cards
  const actionCards: ActionCard[] = [
    {
      icon: Sparkles,
      label: 'My Class',
      subtitle: 'Toddler Room',
      onPress: () => handleNavigation('My Class'),
    },
    {
      icon: BookOpen,
      label: 'Daily Reports',
      subtitle: 'View & Export',
      onPress: () => handleNavigation('Daily Reports'),
    },
  ];

  // Enhanced menu items with dropdown content
  const menuItems: MenuItem[] = [
    {
      icon: User,
      label: 'Profile Settings',
      hasDropdown: true,
      dropdownContent: (
        <View style={styles.dropdownContent}>
          <Pressable style={styles.dropdownItemButton}>
            <User size={18} color="#64748B" />
            <Text style={styles.dropdownText}>Edit Profile</Text>
            <ChevronRight size={16} color="#CBD5E1" />
          </Pressable>
          <Pressable style={styles.dropdownItemButton}>
            <Shield size={18} color="#64748B" />
            <Text style={styles.dropdownText}>Privacy Settings</Text>
            <ChevronRight size={16} color="#CBD5E1" />
          </Pressable>
          <Pressable style={styles.dropdownItemButton}>
            <Globe size={18} color="#64748B" />
            <Text style={styles.dropdownText}>Language</Text>
            <Text style={styles.dropdownValueText}>{mockSettings.profile.preferences.language}</Text>
          </Pressable>
          <Pressable style={styles.dropdownItemButton}>
            <Clock size={18} color="#64748B" />
            <Text style={styles.dropdownText}>Time Format</Text>
            <Text style={styles.dropdownValueText}>{mockSettings.profile.preferences.timeFormat}</Text>
          </Pressable>
        </View>
      ),
    },
    {
      icon: Baby,
      label: 'My Students',
      subtitle: '12 children',
      hasDropdown: true,
      dropdownContent: (
        <View style={styles.dropdownContent}>
          <Text style={styles.dropdownHeader}>Toddler Room Students</Text>
          <View style={styles.studentGrid}>
            {['Emma J.', 'Liam C.', 'Sofia M.', 'Noah W.', 'Ava P.', 'Oliver B.'].map(name => (
              <View key={name} style={styles.studentChip}>
                <Text style={styles.studentName}>{name}</Text>
              </View>
            ))}
          </View>
          <Pressable style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All Students →</Text>
          </Pressable>
        </View>
      ),
    },
    {
      icon: CreditCard,
      label: 'Payment & Invoices',
      hasDropdown: true,
      dropdownContent: (
        <View style={styles.dropdownContent}>
          <Text style={styles.dropdownHeader}>Payment Methods</Text>
          {mockSettings.payment.methods.map((method, idx) => (
            <View key={idx} style={styles.paymentMethod}>
              <CreditCard size={18} color="#64748B" />
              <Text style={styles.paymentText}>
                {method.brand || method.bank} •••• {method.last4}
              </Text>
              {method.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              )}
            </View>
          ))}
          <View style={styles.divider} />
          <Text style={styles.dropdownHeader}>Recent Invoices</Text>
          {mockSettings.payment.history.slice(0, 2).map((invoice, idx) => (
            <View key={idx} style={styles.invoiceItem}>
              <Receipt size={18} color="#64748B" />
              <Text style={styles.invoiceText}>{invoice.description}</Text>
              <Text style={styles.invoiceAmount}>${invoice.amount}</Text>
            </View>
          ))}
        </View>
      ),
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      hasDropdown: true,
      dropdownContent: (
        <View style={styles.dropdownContent}>
          <Text style={styles.dropdownHeader}>Frequently Asked Questions</Text>
          {mockSettings.help.faqs.slice(0, 3).map((faq, idx) => (
            <View key={idx} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{faq.q}</Text>
              <Text style={styles.faqAnswer}>{faq.a}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <Text style={styles.dropdownHeader}>Contact Support</Text>
          <View style={styles.contactItem}>
            <Phone size={18} color="#6366F1" />
            <Text style={styles.contactText}>{mockSettings.help.contactSupport.phone}</Text>
          </View>
          <View style={styles.contactItem}>
            <Mail size={18} color="#6366F1" />
            <Text style={styles.contactText}>{mockSettings.help.contactSupport.email}</Text>
          </View>
          <View style={styles.contactItem}>
            <Clock size={18} color="#64748B" />
            <Text style={styles.contactText}>{mockSettings.help.contactSupport.hours}</Text>
          </View>
        </View>
      ),
    },
    {
      icon: Camera,
      label: 'Photos Plus',
      onPress: () => handleNavigation('Photos Plus'),
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={["#E0E7FF", "#F0F4FF", "#FFFFFF"]}
        style={styles.gradientBackground}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Pressable style={styles.avatarContainer} onPress={pickImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>
                {teacherName ? teacherName.substring(0, 2).toUpperCase() : 'TN'}
              </Text>
            )}
            <View style={styles.cameraButton}>
              <Camera size={18} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </Pressable>

          {isEditingName ? (
            <TextInput
              style={styles.userNameInput}
              value={teacherName}
              onChangeText={setTeacherName}
              onBlur={() => setIsEditingName(false)}
              autoFocus
              selectTextOnFocus
              placeholder="Enter your name"
            />
          ) : (
            <Pressable onPress={() => setIsEditingName(true)}>
              <Text style={styles.userName}>{teacherName || 'Teacher Name'}</Text>
            </Pressable>
          )}

          <View style={styles.badgesContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Sunshine Daycare</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#E0E7FF' }]}>
              <Text style={[styles.badgeText, { color: '#6366F1' }]}>Lead Teacher</Text>
            </View>
          </View>
        </View>

        {/* Action Cards */}
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
              <LinearGradient
                colors={index === 0
                  ? ["#FDF2F8", "#FCE7F3"]
                  : ["#EEF2FF", "#E0E7FF"]
                }
                style={styles.actionCard}
              >
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: index === 0 ? '#FCE7F3' : '#E0E7FF' }
                ]}>
                  <card.icon
                    size={24}
                    color={index === 0 ? '#EC4899' : '#6366F1'}
                    strokeWidth={2}
                  />
                </View>
                <View style={styles.actionCardText}>
                  <Text style={[
                    styles.actionCardLabel,
                    { color: index === 0 ? '#BE185D' : '#4F46E5' }
                  ]}>
                    {card.label}
                  </Text>
                  <Text style={styles.actionCardSubtitle}>{card.subtitle}</Text>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </View>

        {/* Menu List with Expandable Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => {
            const isExpanded = expandedItems.has(item.label);
            const rotation = getRotationValue(item.label);
            const rotateZ = rotation.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '90deg'],
            });

            return (
              <View key={index}>
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    !item.hasDropdown && index === menuItems.length - 1 && styles.menuItemLast,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => {
                    if (item.hasDropdown) {
                      toggleExpanded(item.label);
                    } else if (item.onPress) {
                      item.onPress();
                    }
                  }}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconContainer,
                      item.hasDropdown && isExpanded && { backgroundColor: '#EEF2FF' }
                    ]}>
                      <item.icon size={22} color={colors.palette.neutral600} strokeWidth={2} />
                    </View>
                    <View style={styles.menuItemText}>
                      <Text style={styles.menuItemLabel}>{item.label}</Text>
                      {item.subtitle && (
                        <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                      )}
                    </View>
                  </View>
                  {item.hasDropdown ? (
                    <Animated.View style={{ transform: [{ rotateZ }] }}>
                      <ChevronRight size={20} color="#64748B" strokeWidth={2} />
                    </Animated.View>
                  ) : (
                    <ChevronRight size={20} color="#CCCCCC" strokeWidth={2} />
                  )}
                </Pressable>

                {item.hasDropdown && isExpanded && (
                  <View style={styles.dropdownContainer}>
                    {item.dropdownContent}
                  </View>
                )}
              </View>
            );
          })}

          {/* Sign Out Button */}
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#6366F1',
    letterSpacing: -1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  userNameInput: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
    letterSpacing: -0.5,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
    minWidth: 200,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  // Action Cards
  actionCardsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionCardWrapper: {
    flex: 1,
  },
  actionCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionCardText: {
    alignItems: 'center',
  },
  actionCardLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  actionCardSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  // Menu List
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  menuItemText: {
    marginLeft: 14,
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  // Dropdown Content
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  dropdownItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownText: {
    fontSize: 15,
    color: '#1E293B',
    flex: 1,
  },
  dropdownValueText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  dropdownHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Student Grid
  studentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  studentChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  studentName: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  viewAllButton: {
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  // Teacher Directory
  teacherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  teacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  teacherRole: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  // Payment
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  paymentText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  defaultText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
  },
  invoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  invoiceText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  invoiceAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  // FAQ
  faqItem: {
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  // Contact
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  contactText: {
    fontSize: 14,
    color: '#475569',
  },
  // Logout Button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.palette.angry500,
    marginLeft: 14,
  },
});