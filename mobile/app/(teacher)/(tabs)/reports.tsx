/**
 * Teacher Reports Tab
 *
 * Displays daily reports grouped by child with filtering and date range selection.
 * Teachers can view, edit, and share reports with parents.
 */

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
} from "react-native";
import { useState, useMemo } from "react";
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
  Share2,
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

type DailyReport = {
  id: string;
  date: Date;
  childId: string;
  childName: string;
  className: string;
  classId: string;
  entries: Partial<EntryDoc>[];
  activitySummary: string;
  totalActivities: number;
};

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
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Generate entries once and memoize
  const entries = useMemo(() => generateMockEntries(), []);

  // Generate daily reports grouped by child and date
  const dailyReports = useMemo(() => {
    let filtered = [...entries];

    // Filter by class
    if (selectedClass) {
      filtered = filtered.filter(entry => entry.classId === selectedClass);
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

    // Group by child and date
    const reportsMap = new Map<string, DailyReport>();

    filtered.forEach(entry => {
      if (!entry.occurredAt || !entry.childId) return;

      const entryDate = new Date(entry.occurredAt);
      const dateKey = `${entryDate.getFullYear()}-${entryDate.getMonth()}-${entryDate.getDate()}`;
      const key = `${entry.childId}-${dateKey}`;

      if (!reportsMap.has(key)) {
        reportsMap.set(key, {
          id: key,
          date: new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate()),
          childId: entry.childId,
          childName: entry.childName || "",
          className: entry.className || "",
          classId: entry.classId || "",
          entries: [],
          activitySummary: "",
          totalActivities: 0,
        });
      }

      const report = reportsMap.get(key)!;
      report.entries.push(entry);
    });

    // Generate summaries and filter by type if needed
    const reports = Array.from(reportsMap.values()).map(report => {
      const typeCounts: { [key: string]: number } = {};
      report.entries.forEach(entry => {
        if (entry.type) {
          typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;
        }
      });

      report.totalActivities = report.entries.length;
      const summaryParts = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type, count]) => `${count} ${type}`);
      report.activitySummary = summaryParts.join(", ");

      return report;
    });

    // Filter by type if selected
    const finalReports = selectedType
      ? reports.filter(report =>
          report.entries.some(entry => entry.type === selectedType)
        )
      : reports;

    // Sort by date descending
    return finalReports.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [entries, selectedClass, selectedType, dateRange, customStartDate, customEndDate]);

  // Calculate statistics based on all entries in the daily reports
  const stats = useMemo(() => {
    const typeCount: { [key: string]: number } = {};
    const uniqueChildren = new Set<string>();
    let totalEntries = 0;

    dailyReports.forEach(report => {
      uniqueChildren.add(report.childId);
      report.entries.forEach(entry => {
        totalEntries++;
        if (entry.type) {
          typeCount[entry.type] = (typeCount[entry.type] || 0) + 1;
        }
      });
    });

    return {
      totalEntries,
      totalReports: dailyReports.length,
      uniqueChildren: uniqueChildren.size,
      topType: Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
    };
  }, [dailyReports]);

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

  const renderReport = (report: DailyReport, index: number) => {
    const date = report.date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return (
      <Pressable
        style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
        onPress={() => {
          setSelectedReport(report);
          setShowReportModal(true);
        }}
      >
        <View style={styles.cellDate}>
          <Text style={styles.cellDateText}>{date}</Text>
          <Text style={styles.cellTimeText}>
            {report.totalActivities} {report.totalActivities === 1 ? "activity" : "activities"}
          </Text>
        </View>
        <View style={styles.cellChild}>
          <Text style={styles.cellChildName} numberOfLines={1}>{report.childName}</Text>
          <Text style={styles.cellClassName}>{report.className}</Text>
        </View>
        <View style={styles.cellSummary}>
          <Text style={styles.cellSummaryText} numberOfLines={2}>{report.activitySummary}</Text>
        </View>
        <Pressable
          style={styles.shareButton}
          onPress={(e) => {
            e.stopPropagation();
            setSelectedReport(report);
            setShowReportModal(true);
          }}
        >
          <Share2 size={18} color="#6366F1" strokeWidth={2} />
        </Pressable>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.subtitle}>
            {stats.totalReports} daily {stats.totalReports === 1 ? "report" : "reports"}
          </Text>
        </View>
        <Pressable style={styles.exportButton}>
          <Download size={20} color="#FFFFFF" />
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
          <Text style={styles.statNumber}>{stats.totalReports}</Text>
          <Text style={styles.statLabel}>Daily Reports</Text>
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
          <Text style={styles.statNumber}>{stats.totalEntries}</Text>
          <Text style={styles.statLabel}>Total Activities</Text>
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
        <Text style={styles.headerDate}>Date</Text>
        <Text style={styles.headerChild}>Child</Text>
        <Text style={styles.headerSummary}>Summary</Text>
        <Text style={styles.headerShare}>Share</Text>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#E0E7FF", "#F0F4FF", "#FFFFFF"]}
        style={styles.gradientBackground}
      />

      <FlatList
        data={dailyReports}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => renderReport(item, index)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <FileText size={48} color="#CBD5E1" strokeWidth={1.5} />
            <Text style={styles.emptyStateTitle}>No reports found</Text>
            <Text style={styles.emptyStateText}>
              Try adjusting your filters or date range
            </Text>
          </View>
        )}
        contentContainerStyle={styles.tableContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />

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

      {/* Report Detail/Edit Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.reportModalContainer}>
          <LinearGradient
            colors={["#E0E7FF", "#F0F4FF", "#FFFFFF"]}
            style={styles.reportModalGradient}
          />

          {/* Modal Header */}
          <View style={[styles.reportModalHeader, { paddingTop: insets.top + 20 }]}>
            <Pressable
              onPress={() => setShowReportModal(false)}
              style={styles.reportModalClose}
            >
              <Text style={styles.reportModalCloseText}>Cancel</Text>
            </Pressable>
            <Text style={styles.reportModalTitle}>Daily Report</Text>
            <Pressable
              onPress={() => {
                // TODO: Implement share/push functionality
                alert("Report will be sent to parents");
                setShowReportModal(false);
              }}
              style={styles.reportModalShare}
            >
              <Share2 size={20} color="#6366F1" strokeWidth={2} />
              <Text style={styles.reportModalShareText}>Share</Text>
            </Pressable>
          </View>

          {selectedReport && (
            <ScrollView style={styles.reportModalContent}>
              {/* Report Info */}
              <View style={styles.reportInfoCard}>
                <Text style={styles.reportInfoDate}>
                  {selectedReport.date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
                <Text style={styles.reportInfoChild}>{selectedReport.childName}</Text>
                <Text style={styles.reportInfoClass}>{selectedReport.className}</Text>
              </View>

              {/* Activity Summary */}
              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Activity Summary</Text>
                <Text style={styles.reportSummaryText}>
                  {selectedReport.totalActivities} {selectedReport.totalActivities === 1 ? "activity" : "activities"} recorded today
                </Text>
                <Text style={styles.reportSummaryDetail}>{selectedReport.activitySummary}</Text>
              </View>

              {/* Detailed Activities */}
              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Activities</Text>
                {selectedReport.entries.map((entry, idx) => {
                  const config = entryTypeConfig[entry.type as keyof typeof entryTypeConfig];
                  const IconComponent = config?.icon || Activity;
                  const time = entry.occurredAt
                    ? new Date(entry.occurredAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "";

                  return (
                    <View key={idx} style={styles.reportActivityCard}>
                      <View style={[styles.reportActivityIcon, { backgroundColor: config?.bg }]}>
                        <IconComponent size={20} color={config?.color} strokeWidth={2} />
                      </View>
                      <View style={styles.reportActivityContent}>
                        <View style={styles.reportActivityHeader}>
                          <Text style={styles.reportActivityType}>{entry.type}</Text>
                          <Text style={styles.reportActivityTime}>{time}</Text>
                        </View>
                        {entry.subtype && (
                          <Text style={styles.reportActivitySubtype}>{entry.subtype}</Text>
                        )}
                        {entry.detail && (
                          <Text style={styles.reportActivityDetail}>{entry.detail}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Notes Section (placeholder for future editing) */}
              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Teacher Notes</Text>
                <View style={styles.reportNotesPlaceholder}>
                  <Text style={styles.reportNotesPlaceholderText}>
                    Tap to add notes for parents...
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
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
    height: "40%",
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
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 4,
  },
  exportButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 24,
    position: "relative",
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
    width: "25%",
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
  },
  headerChild: {
    width: "35%",
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
  },
  headerSummary: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
  },
  headerShare: {
    width: 60,
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
    textAlign: "center",
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
    width: "25%",
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
    width: "35%",
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
  cellSummary: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 8,
  },
  cellSummaryText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
  shareButton: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
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