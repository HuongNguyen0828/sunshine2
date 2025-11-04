/**
 * Teacher Messages/Activity Log Tab
 *
 * Displays all daycare entries as an activity feed with filtering capabilities.
 * Allows teachers to see all activities across classes and children.
 */

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  SectionList,
  ScrollView,
} from "react-native";
import { useState, useMemo, memo, useCallback, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Search,
  Filter,
  ChevronDown,
  Activity,
  Coffee,
  Moon,
  Toilet,
  Camera,
  FileText,
  Heart,
  CheckCircle,
  Clock,
  X,
} from "lucide-react-native";
import { generateMockEntries, mockClasses, mockChildren } from "../../../src/data/mockData";
import { EntryDoc } from "@sunshine/src/types/type";

// Entry type icons and colors
const entryTypeConfig = {
  Attendance: { icon: CheckCircle, color: "#10B981", bg: "#D1FAE5" },
  Food: { icon: Coffee, color: "#F59E0B", bg: "#FEF3C7" },
  Sleep: { icon: Moon, color: "#8B5CF6", bg: "#EDE9FE" },
  Toilet: { icon: Toilet, color: "#06B6D4", bg: "#CFFAFE" },
  Activity: { icon: Activity, color: "#3B82F6", bg: "#DBEAFE" },
  Photo: { icon: Camera, color: "#EC4899", bg: "#FCE7F3" },
  Note: { icon: FileText, color: "#6B7280", bg: "#F3F4F6" },
  Health: { icon: Heart, color: "#EF4444", bg: "#FEE2E2" },
};

// Memoized Entry Card Component for better performance
const EntryCard = memo(({ entry }: { entry: Partial<EntryDoc> }) => {
  const config = entryTypeConfig[entry.type as keyof typeof entryTypeConfig];
  const IconComponent = config?.icon || Activity;
  const time = entry.occurredAt
    ? new Date(entry.occurredAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <View style={styles.entryCard}>
      <View style={[styles.entryIconContainer, { backgroundColor: config?.bg }]}>
        <IconComponent size={20} color={config?.color} strokeWidth={2} />
      </View>
      <View style={styles.entryContent}>
        <View style={styles.entryHeader}>
          <Text style={styles.entryTitle}>{entry.childName}</Text>
          <Text style={styles.entryTime}>{time}</Text>
        </View>
        <Text style={styles.entryType}>
          {entry.type}
          {entry.subtype && ` - ${entry.subtype}`}
        </Text>
        {entry.detail && <Text style={styles.entryDetail}>{entry.detail}</Text>}
        <Text style={styles.entryClass}>{entry.className}</Text>
      </View>
    </View>
  );
});

EntryCard.displayName = "EntryCard";

export default function TeacherMessages() {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showChildModal, setShowChildModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  // Debounce search text with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Memoize handlers to prevent re-renders
  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchText("");
    setDebouncedSearchText("");
  }, []);

  // Generate entries once and memoize
  const entries = useMemo(() => generateMockEntries(), []);

  // Filter entries based on selections
  const filteredEntries = useMemo(() => {
    let filtered = [...entries];

    // Filter by search text (using debounced value)
    if (debouncedSearchText) {
      filtered = filtered.filter(entry =>
        entry.childName?.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
        entry.detail?.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
        entry.type?.toLowerCase().includes(debouncedSearchText.toLowerCase())
      );
    }

    // Filter by class
    if (selectedClass) {
      filtered = filtered.filter(entry => entry.classId === selectedClass);
    }

    // Filter by child
    if (selectedChild) {
      filtered = filtered.filter(entry => entry.childId === selectedChild);
    }

    // Filter by type
    if (selectedType) {
      filtered = filtered.filter(entry => entry.type === selectedType);
    }

    return filtered;
  }, [entries, debouncedSearchText, selectedClass, selectedChild, selectedType]);

  // Group entries by date for SectionList
  const sections = useMemo(() => {
    const groups: { [key: string]: Partial<EntryDoc>[] } = {};

    filteredEntries.forEach(entry => {
      if (entry.occurredAt) {
        const date = new Date(entry.occurredAt);
        const dateKey = date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(entry);
      }
    });

    return Object.entries(groups)
      .sort((a, b) => {
        const dateA = a[1][0].occurredAt ? new Date(a[1][0].occurredAt).getTime() : 0;
        const dateB = b[1][0].occurredAt ? new Date(b[1][0].occurredAt).getTime() : 0;
        return dateB - dateA;
      })
      .map(([title, data]) => ({ title, data }));
  }, [filteredEntries]);

  // Get filtered children based on selected class
  const availableChildren = useMemo(() => {
    if (!selectedClass) return mockChildren;
    return mockChildren.filter(child => child.classId === selectedClass);
  }, [selectedClass]);

  const clearFilters = () => {
    setSelectedClass(null);
    setSelectedChild(null);
    setSelectedType(null);
    setSearchText("");
  };

  const hasActiveFilters = selectedClass || selectedChild || selectedType || debouncedSearchText;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#E0E7FF", "#F0F4FF", "#FFFFFF"]}
        style={styles.gradientBackground}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.id || `entry-${index}`}
        renderItem={({ item }) => <EntryCard entry={item} />}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.dateHeader}>{title}</Text>
        )}
        ListHeaderComponent={() => (
          <>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
              <Text style={styles.title}>Activity Log</Text>
              <Text style={styles.subtitle}>
                {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
              </Text>
            </View>

            {/* Search and Filters */}
            <View style={styles.searchContainer}>
              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Search size={20} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by child, activity, or details..."
                  value={searchText}
                  onChangeText={handleSearchChange}
                  placeholderTextColor="#94A3B8"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {searchText.length > 0 && (
                  <Pressable onPress={handleClearSearch}>
                    <X size={20} color="#64748B" />
                  </Pressable>
                )}
              </View>

              {/* Filter Buttons */}
              <View style={styles.filterScroll}>
                <Pressable
                  style={[styles.filterButton, selectedClass && styles.filterButtonActive]}
                  onPress={() => setShowClassModal(true)}
                >
                  <Text style={[styles.filterButtonText, selectedClass && styles.filterButtonTextActive]}>
                    {selectedClass
                      ? mockClasses.find(c => c.id === selectedClass)?.name
                      : "All Classes"}
                  </Text>
                  <ChevronDown size={16} color={selectedClass ? "#FFFFFF" : "#475569"} />
                </Pressable>

                <Pressable
                  style={[styles.filterButton, selectedChild && styles.filterButtonActive]}
                  onPress={() => setShowChildModal(true)}
                >
                  <Text style={[styles.filterButtonText, selectedChild && styles.filterButtonTextActive]}>
                    {selectedChild
                      ? mockChildren.find(c => c.id === selectedChild)?.firstName
                      : "All Children"}
                  </Text>
                  <ChevronDown size={16} color={selectedChild ? "#FFFFFF" : "#475569"} />
                </Pressable>

                <Pressable
                  style={[styles.filterButton, selectedType && styles.filterButtonActive]}
                  onPress={() => setShowTypeModal(true)}
                >
                  <Text style={[styles.filterButtonText, selectedType && styles.filterButtonTextActive]}>
                    {selectedType || "All Types"}
                  </Text>
                  <ChevronDown size={16} color={selectedType ? "#FFFFFF" : "#475569"} />
                </Pressable>
              </View>
            </View>
          </>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Filter size={48} color="#CBD5E1" strokeWidth={1.5} />
            <Text style={styles.emptyStateTitle}>No entries found</Text>
            <Text style={styles.emptyStateText}>
              Try adjusting your filters or search terms
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />

      {/* Class Filter Modal */}
      <Modal
        visible={showClassModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowClassModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowClassModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Class</Text>
            <Pressable
              style={[styles.modalOption, !selectedClass && styles.modalOptionSelected]}
              onPress={() => {
                setSelectedClass(null);
                setSelectedChild(null); // Reset child when class changes
                setShowClassModal(false);
              }}
            >
              <Text style={styles.modalOptionText}>All Classes</Text>
            </Pressable>
            {mockClasses.map(cls => (
              <Pressable
                key={cls.id}
                style={[styles.modalOption, selectedClass === cls.id && styles.modalOptionSelected]}
                onPress={() => {
                  setSelectedClass(cls.id);
                  setSelectedChild(null); // Reset child when class changes
                  setShowClassModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{cls.name}</Text>
                <Text style={styles.modalOptionSubtext}>{cls.ageRange}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Child Filter Modal */}
      <Modal
        visible={showChildModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowChildModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowChildModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Child</Text>
            <ScrollView style={styles.modalScroll}>
              <Pressable
                style={[styles.modalOption, !selectedChild && styles.modalOptionSelected]}
                onPress={() => {
                  setSelectedChild(null);
                  setShowChildModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>All Children</Text>
              </Pressable>
              {availableChildren.map(child => (
                <Pressable
                  key={child.id}
                  style={[styles.modalOption, selectedChild === child.id && styles.modalOptionSelected]}
                  onPress={() => {
                    setSelectedChild(child.id);
                    setShowChildModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>
                    {child.firstName} {child.lastName}
                  </Text>
                  <Text style={styles.modalOptionSubtext}>
                    {mockClasses.find(c => c.id === child.classId)?.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Type Filter Modal */}
      <Modal
        visible={showTypeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTypeModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTypeModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Entry Type</Text>
            <Pressable
              style={[styles.modalOption, !selectedType && styles.modalOptionSelected]}
              onPress={() => {
                setSelectedType(null);
                setShowTypeModal(false);
              }}
            >
              <Text style={styles.modalOptionText}>All Types</Text>
            </Pressable>
            {Object.keys(entryTypeConfig).map(type => {
              const config = entryTypeConfig[type as keyof typeof entryTypeConfig];
              const IconComponent = config.icon;
              return (
                <Pressable
                  key={type}
                  style={[styles.modalOption, selectedType === type && styles.modalOptionSelected]}
                  onPress={() => {
                    setSelectedType(type);
                    setShowTypeModal(false);
                  }}
                >
                  <View style={styles.modalOptionWithIcon}>
                    <View style={[styles.modalOptionIcon, { backgroundColor: config.bg }]}>
                      <IconComponent size={16} color={config.color} />
                    </View>
                    <Text style={styles.modalOptionText}>{type}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  listContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  searchContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#1E293B",
  },
  filterScroll: {
    flexDirection: "row",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#475569",
    marginRight: 4,
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#F9FAFB",
  },
  entryCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  entryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  entryContent: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  entryTime: {
    fontSize: 12,
    color: "#64748B",
  },
  entryType: {
    fontSize: 14,
    color: "#6366F1",
    fontWeight: "500",
    marginBottom: 4,
  },
  entryDetail: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
    lineHeight: 18,
  },
  entryClass: {
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#475569",
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 20,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalOptionSelected: {
    backgroundColor: "#EEF2FF",
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  modalOptionWithIcon: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: "#1E293B",
  },
  modalOptionSubtext: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
});