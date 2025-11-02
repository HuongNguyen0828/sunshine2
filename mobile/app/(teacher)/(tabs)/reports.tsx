/**
 * Teacher Reports Tab
 *
 * Displays entries in a table/list format with advanced filtering and date range selection.
 * Future: Will support PDF export functionality.
 */

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useMemo } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Filter,
  ChevronDown,
  Calendar,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Activity,
  Coffee,
  Moon,
  Toilet,
  Camera,
  Heart,
  CheckCircle,
} from "lucide-react-native";
import { generateMockEntries, mockClasses, mockChildren } from "../../../src/data/mockData";
import { EntryDoc } from "@sunshine/src/types/type";

// Entry type icons and colors (matching messages tab)
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

type DateRange = "today" | "week" | "month" | "custom";

export default function TeacherReports() {
  const insets = useSafeAreaInsets();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("week");
  const [showClassModal, setShowClassModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  // Generate entries once and memoize
  const entries = useMemo(() => generateMockEntries(), []);

  // Filter entries based on selections
  const filteredEntries = useMemo(() => {
    let filtered = [...entries];

    // Filter by class
    if (selectedClass) {
      filtered = filtered.filter(entry => entry.classId === selectedClass);
    }

    // Filter by type
    if (selectedType) {
      filtered = filtered.filter(entry => entry.type === selectedType);
    }

    // Filter by date range
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateRange) {
      case "today":
        filtered = filtered.filter(entry => {
          if (!entry.occurredAt) return false;
          const entryDate = new Date(entry.occurredAt);
          return entryDate >= today;
        });
        break;
      case "week":
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(entry => {
          if (!entry.occurredAt) return false;
          const entryDate = new Date(entry.occurredAt);
          return entryDate >= weekAgo;
        });
        break;
      case "month":
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(entry => {
          if (!entry.occurredAt) return false;
          const entryDate = new Date(entry.occurredAt);
          return entryDate >= monthAgo;
        });
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          filtered = filtered.filter(entry => {
            if (!entry.occurredAt) return false;
            const entryDate = new Date(entry.occurredAt);
            return entryDate >= customStartDate && entryDate <= customEndDate;
          });
        }
        break;
    }

    return filtered.sort((a, b) => {
      const dateA = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
      const dateB = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [entries, selectedClass, selectedType, dateRange, customStartDate, customEndDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    const typeCount: { [key: string]: number } = {};
    const classCount: { [key: string]: number } = {};
    const uniqueChildren = new Set<string>();

    filteredEntries.forEach(entry => {
      if (entry.type) {
        typeCount[entry.type] = (typeCount[entry.type] || 0) + 1;
      }
      if (entry.classId) {
        classCount[entry.classId] = (classCount[entry.classId] || 0) + 1;
      }
      if (entry.childId) {
        uniqueChildren.add(entry.childId);
      }
    });

    return {
      totalEntries: filteredEntries.length,
      uniqueChildren: uniqueChildren.size,
      topType: Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
      topClass: Object.entries(classCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
    };
  }, [filteredEntries]);

  const clearFilters = () => {
    setSelectedClass(null);
    setSelectedType(null);
    setDateRange("week");
    setCustomStartDate(null);
    setCustomEndDate(null);
  };

  const hasActiveFilters = selectedClass || selectedType || dateRange !== "week";

  const getDateRangeText = () => {
    switch (dateRange) {
      case "today":
        return "Today";
      case "week":
        return "Last 7 Days";
      case "month":
        return "Last 30 Days";
      case "custom":
        if (customStartDate && customEndDate) {
          return `${customStartDate.toLocaleDateString()} - ${customEndDate.toLocaleDateString()}`;
        }
        return "Custom Range";
      default:
        return "Select Range";
    }
  };

  const renderEntry = (entry: Partial<EntryDoc>, index: number) => {
    const config = entryTypeConfig[entry.type as keyof typeof entryTypeConfig];
    const IconComponent = config?.icon || Activity;
    const date = entry.occurredAt
      ? new Date(entry.occurredAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "";
    const time = entry.occurredAt
      ? new Date(entry.occurredAt).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";

    return (
      <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
        <View style={styles.cellDate}>
          <Text style={styles.cellDateText}>{date}</Text>
          <Text style={styles.cellTimeText}>{time}</Text>
        </View>
        <View style={styles.cellChild}>
          <Text style={styles.cellChildName} numberOfLines={1}>{entry.childName}</Text>
          <Text style={styles.cellClassName}>{entry.className}</Text>
        </View>
        <View style={styles.cellType}>
          <View style={[styles.typeIcon, { backgroundColor: config?.bg }]}>
            <IconComponent size={16} color={config?.color} />
          </View>
          <Text style={styles.cellTypeText}>{entry.type}</Text>
        </View>
        <View style={styles.cellDetail}>
          <Text style={styles.cellDetailText} numberOfLines={2}>
            {entry.subtype && `${entry.subtype}: `}
            {entry.detail || "—"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#E0E7FF", "#F0F4FF", "#FFFFFF"]}
        style={styles.gradientBackground}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.title}>Reports</Text>
          <Pressable style={styles.exportButton}>
            <Download size={20} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>Export PDF</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Soon</Text>
            </View>
          </Pressable>
        </View>

        {/* Stats Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
          contentContainerStyle={styles.statsContainer}
        >
          <View style={[styles.statCard, { backgroundColor: "#EEF2FF" }]}>
            <Text style={styles.statNumber}>{stats.totalEntries}</Text>
            <Text style={styles.statLabel}>Total Entries</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#F0FDF4" }]}>
            <Text style={styles.statNumber}>{stats.uniqueChildren}</Text>
            <Text style={styles.statLabel}>Children</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FFF7ED" }]}>
            <Text style={styles.statNumber}>{stats.topType}</Text>
            <Text style={styles.statLabel}>Top Activity</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FDF2F8" }]}>
            <Text style={styles.statNumber}>
              {mockClasses.find(c => c.id === stats.topClass)?.name?.split(" ")[0] || "N/A"}
            </Text>
            <Text style={styles.statLabel}>Most Active</Text>
          </View>
        </ScrollView>

        {/* Filters */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            <Pressable
              style={[styles.filterButton, dateRange !== "week" && styles.filterButtonActive]}
              onPress={() => setShowDateModal(true)}
            >
              <Calendar size={16} color={dateRange !== "week" ? "#FFFFFF" : "#475569"} />
              <Text style={[styles.filterButtonText, dateRange !== "week" && styles.filterButtonTextActive]}>
                {getDateRangeText()}
              </Text>
              <ChevronDown size={16} color={dateRange !== "week" ? "#FFFFFF" : "#475569"} />
            </Pressable>

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
              style={[styles.filterButton, selectedType && styles.filterButtonActive]}
              onPress={() => setShowTypeModal(true)}
            >
              <Text style={[styles.filterButtonText, selectedType && styles.filterButtonTextActive]}>
                {selectedType || "All Types"}
              </Text>
              <ChevronDown size={16} color={selectedType ? "#FFFFFF" : "#475569"} />
            </Pressable>

            {hasActiveFilters && (
              <Pressable style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={styles.headerDate}>Date/Time</Text>
          <Text style={styles.headerChild}>Child</Text>
          <Text style={styles.headerType}>Type</Text>
          <Text style={styles.headerDetail}>Details</Text>
        </View>

        {/* Table Content */}
        <View style={styles.tableContent}>
          {filteredEntries.length > 0 ? (
            filteredEntries.map((entry, index) => (
              <View key={entry.id || index}>
                {renderEntry(entry, index)}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <FileText size={48} color="#CBD5E1" strokeWidth={1.5} />
              <Text style={styles.emptyStateTitle}>No entries found</Text>
              <Text style={styles.emptyStateText}>
                Try adjusting your filters or date range
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Date Range Modal */}
      <Modal
        visible={showDateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDateModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDateModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date Range</Text>
            {(["today", "week", "month"] as DateRange[]).map(range => (
              <Pressable
                key={range}
                style={[styles.modalOption, dateRange === range && styles.modalOptionSelected]}
                onPress={() => {
                  setDateRange(range);
                  setShowDateModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>
                  {range === "today" && "Today"}
                  {range === "week" && "Last 7 Days"}
                  {range === "month" && "Last 30 Days"}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.modalOption, styles.modalOptionDisabled]}
              onPress={() => {}}
            >
              <Text style={[styles.modalOptionText, styles.modalOptionTextDisabled]}>
                Custom Range (Coming Soon)
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

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
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    position: "relative",
  },
  exportButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  comingSoonBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  statsScroll: {
    marginBottom: 20,
  },
  statsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    padding: 16,
    borderRadius: 16,
    minWidth: 100,
    alignItems: "center",
    marginRight: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
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
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#475569",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  clearButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
  },
  clearButtonText: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "500",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerDate: {
    width: "22%",
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
  },
  headerChild: {
    width: "28%",
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
  },
  headerType: {
    width: "20%",
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
  },
  headerDetail: {
    width: "30%",
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
  },
  tableContent: {
    paddingBottom: 40,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    minHeight: 60,
  },
  tableRowEven: {
    backgroundColor: "#FAFBFC",
  },
  cellDate: {
    width: "22%",
    justifyContent: "center",
  },
  cellDateText: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "500",
  },
  cellTimeText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  cellChild: {
    width: "28%",
    justifyContent: "center",
  },
  cellChildName: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "500",
  },
  cellClassName: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  cellType: {
    width: "20%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  cellTypeText: {
    fontSize: 12,
    color: "#475569",
  },
  cellDetail: {
    width: "30%",
    justifyContent: "center",
  },
  cellDetailText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
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
  loadingText: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 16,
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
  modalOptionDisabled: {
    opacity: 0.5,
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
  modalOptionTextDisabled: {
    color: "#94A3B8",
  },
  modalOptionSubtext: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
});