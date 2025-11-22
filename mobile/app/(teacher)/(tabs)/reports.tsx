// mobile/app/(teacher)/(tabs)/reports.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronDown,
  Calendar,
  Download,
  FileText,
  Activity,
  Coffee,
  Moon,
  Toilet,
  Camera,
  Heart,
  CheckCircle,
  Send,
} from "lucide-react-native";

import { mockClasses } from "../../../src/data/mockData";
import {
  EntryDoc,
  DailyReportDoc,
} from "../../../../shared/types/type";
import { fetchTeacherDailyReports } from "@/services/useDailyReportAPI";

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
  const [selectedReport, setSelectedReport] =
    useState<DailyReportDoc | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const [reports, setReports] = useState<DailyReportDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildDateFilter = (): { dateFrom?: string; dateTo?: string } => {
    const today = new Date();
    const toIsoDate = (d: Date) => d.toISOString().slice(0, 10); // "YYYY-MM-DD"

    const end = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    if (dateRange === "today") {
      const d = toIsoDate(end);
      return { dateFrom: d, dateTo: d };
    }

    if (dateRange === "week") {
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
    }

    if (dateRange === "month") {
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
    }

    return {};
  };

  useEffect(() => {
    let isMounted = true;

    const loadReports = async () => {
      try {
        setLoading(true);
        setError(null);

        const { dateFrom, dateTo } = buildDateFilter();

        const data = await fetchTeacherDailyReports({
          classId: selectedClass ?? undefined,
          dateFrom,
          dateTo,
        });

        if (isMounted) {
          setReports(data);
        }
      } catch (err: any) {
        console.error("Failed to load teacher daily reports:", err);
        if (isMounted) {
          setError(err?.message || "Failed to load reports");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedClass]);

  // Apply type filter on client side
  const filteredReports = useMemo<DailyReportDoc[]>(() => {
    if (!selectedType) return reports;

    return reports.filter((report) =>
      (report.entries || []).some(
        (entry: EntryDoc) => entry.type === selectedType
      )
    );
  }, [reports, selectedType]);

  // Stats based on filtered reports
  const stats = useMemo(() => {
    const typeCount: { [key: string]: number } = {};
    const uniqueChildren = new Set<string>();
    let totalEntries = 0;
    let unsentReports = 0;

    filteredReports.forEach((report) => {
      if (report.childId) {
        uniqueChildren.add(report.childId);
      }
      if (!report.sent) {
        unsentReports++;
      }
      (report.entries || []).forEach((entry: EntryDoc) => {
        totalEntries++;
        if (entry.type) {
          typeCount[entry.type] = (typeCount[entry.type] || 0) + 1;
        }
      });
    });

    return {
      totalEntries,
      totalReports: filteredReports.length,
      unsentReports,
      uniqueChildren: uniqueChildren.size,
      topType:
        Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        "N/A",
    };
  }, [filteredReports]);

  const clearFilters = () => {
    setSelectedClass(null);
    setSelectedType(null);
    setDateRange("week");
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
        return "Custom Range";
      default:
        return "Select Range";
    }
  };

  const renderReportRow = (report: DailyReportDoc, index: number) => {
    const dateObj = new Date(`${report.date}T00:00:00`);
    const dateLabel = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return (
      <Pressable
        key={report.id}
        style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
        onPress={() => {
          setSelectedReport(report);
          setShowReportModal(true);
        }}
      >
        <View style={styles.cellDate}>
          <View style={styles.cellDateWithStatus}>
            <Text style={styles.cellDateText}>{dateLabel}</Text>
            {report.sent ? (
              <View style={styles.statusSent}>
                <CheckCircle size={14} color="#10B981" strokeWidth={2} />
              </View>
            ) : (
              <View style={styles.statusPending}>
                <Send size={12} color="#F59E0B" strokeWidth={2} />
              </View>
            )}
          </View>
          <Text style={styles.cellTimeText}>
            {report.totalActivities}{" "}
            {report.totalActivities === 1 ? "activity" : "activities"}
          </Text>
        </View>
        <View style={styles.cellChild}>
          <Text style={styles.cellChildName} numberOfLines={1}>
            {report.childName || "Unknown child"}
          </Text>
          <Text style={styles.cellClassName}>{report.className || ""}</Text>
        </View>
        <View style={styles.cellSummary}>
          <Text style={styles.cellSummaryText} numberOfLines={2}>
            {report.activitySummary}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Reports</Text>
          {stats.unsentReports > 0 && (
            <Text style={styles.subtitle}>
              <Text style={styles.unsentBadge}>
                {stats.unsentReports} unsent
              </Text>
            </Text>
          )}
          {error && (
            <Text style={[styles.subtitle, { color: "#DC2626" }]}>
              {error}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.downloadButton}>
            <Download size={18} color="#6366F1" strokeWidth={2} />
          </Pressable>
        </View>
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
            style={[
              styles.filterButton,
              dateRange !== "week" && styles.filterButtonActive,
            ]}
            onPress={() => setShowDateModal(true)}
          >
            <Calendar
              size={16}
              color={dateRange !== "week" ? "#FFFFFF" : "#475569"}
            />
            <Text
              style={[
                styles.filterButtonText,
                dateRange !== "week" && styles.filterButtonTextActive,
              ]}
            >
              {getDateRangeText()}
            </Text>
            <ChevronDown
              size={16}
              color={dateRange !== "week" ? "#FFFFFF" : "#475569"}
            />
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              selectedClass && styles.filterButtonActive,
            ]}
            onPress={() => setShowClassModal(true)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedClass && styles.filterButtonTextActive,
              ]}
            >
              {selectedClass
                ? mockClasses.find((c) => c.id === selectedClass)?.name
                : "All Classes"}
            </Text>
            <ChevronDown
              size={16}
              color={selectedClass ? "#FFFFFF" : "#475569"}
            />
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              selectedType && styles.filterButtonActive,
            ]}
            onPress={() => setShowTypeModal(true)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedType && styles.filterButtonTextActive,
              ]}
            >
              {selectedType || "All Types"}
            </Text>
            <ChevronDown
              size={16}
              color={selectedType ? "#FFFFFF" : "#475569"}
            />
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
      </View>
    </>
  );

  const renderFlashItem = ({
    item,
    index,
  }: {
    item: DailyReportDoc;
    index: number;
  }) => renderReportRow(item, index);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#E0E7FF", "#F0F4FF", "#FFFFFF"]}
        style={styles.gradientBackground}
      />

      {loading && reports.length === 0 ? (
        <View style={[styles.emptyState, { paddingTop: insets.top + 40 }]}>
          <ActivityIndicator size="large" />
          <Text style={[styles.emptyStateText, { marginTop: 16 }]}>
            Loading reports...
          </Text>
        </View>
      ) : (
        <FlashList<DailyReportDoc>
          data={filteredReports}
          keyExtractor={(item) => item.id}
          renderItem={renderFlashItem}
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
        />
      )}

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
            {(["today", "week", "month"] as DateRange[]).map((range) => (
              <Pressable
                key={range}
                style={[
                  styles.modalOption,
                  dateRange === range && styles.modalOptionSelected,
                ]}
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
              <Text
                style={[
                  styles.modalOptionText,
                  styles.modalOptionTextDisabled,
                ]}
              >
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
              style={[
                styles.modalOption,
                !selectedClass && styles.modalOptionSelected,
              ]}
              onPress={() => {
                setSelectedClass(null);
                setShowClassModal(false);
              }}
            >
              <Text style={styles.modalOptionText}>All Classes</Text>
            </Pressable>
            {mockClasses.map((cls) => (
              <Pressable
                key={cls.id}
                style={[
                  styles.modalOption,
                  selectedClass === cls.id && styles.modalOptionSelected,
                ]}
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
              style={[
                styles.modalOption,
                !selectedType && styles.modalOptionSelected,
              ]}
              onPress={() => {
                setSelectedType(null);
                setShowTypeModal(false);
              }}
            >
              <Text style={styles.modalOptionText}>All Types</Text>
            </Pressable>
            {Object.keys(entryTypeConfig).map((type) => {
              const config =
                entryTypeConfig[type as keyof typeof entryTypeConfig];
              const IconComponent = config.icon;
              return (
                <Pressable
                  key={type}
                  style={[
                    styles.modalOption,
                    selectedType === type && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedType(type);
                    setShowTypeModal(false);
                  }}
                >
                  <View style={styles.modalOptionWithIcon}>
                    <View
                      style={[
                        styles.modalOptionIcon,
                        { backgroundColor: config.bg },
                      ]}
                    >
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

      {/* Report Detail Modal */}
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
          <View
            style={[
              styles.reportModalHeader,
              { paddingTop: insets.top + 20 },
            ]}
          >
            <Pressable
              onPress={() => setShowReportModal(false)}
              style={styles.reportModalClose}
            >
              <Text style={styles.reportModalCloseText}>Cancel</Text>
            </Pressable>
            <Text style={styles.reportModalTitle}>Daily Report</Text>
            <View style={{ width: 80 }} />
          </View>

          {selectedReport && (
            <ScrollView style={styles.reportModalContent}>
              {/* Report Info */}
              <View style={styles.reportInfoCard}>
                <Text style={styles.reportInfoDate}>
                  {new Date(
                    `${selectedReport.date}T00:00:00`
                  ).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
                <Text style={styles.reportInfoChild}>
                  {selectedReport.childName || "Unknown child"}
                </Text>
                <Text style={styles.reportInfoClass}>
                  {selectedReport.className || ""}
                </Text>
              </View>

              {/* Activity Summary */}
              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Activity Summary</Text>
                <Text style={styles.reportSummaryText}>
                  {selectedReport.totalActivities}{" "}
                  {selectedReport.totalActivities === 1
                    ? "activity"
                    : "activities"}{" "}
                  recorded today
                </Text>
                <Text style={styles.reportSummaryDetail}>
                  {selectedReport.activitySummary}
                </Text>
              </View>

              {/* Detailed Activities */}
              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Activities</Text>
                {(selectedReport.entries || []).map(
                  (entry: EntryDoc, idx: number) => {
                    const config =
                      entryTypeConfig[
                        entry.type as keyof typeof entryTypeConfig
                      ];
                    const IconComponent = config?.icon || Activity;
                    const time = entry.occurredAt
                      ? new Date(entry.occurredAt).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )
                      : "";

                    return (
                      <View key={idx} style={styles.reportActivityCard}>
                        <View
                          style={[
                            styles.reportActivityIcon,
                            { backgroundColor: config?.bg },
                          ]}
                        >
                          <IconComponent
                            size={20}
                            color={config?.color}
                            strokeWidth={2}
                          />
                        </View>
                        <View style={styles.reportActivityContent}>
                          <View style={styles.reportActivityHeader}>
                            <Text style={styles.reportActivityType}>
                              {entry.type}
                            </Text>
                            <Text style={styles.reportActivityTime}>
                              {time}
                            </Text>
                          </View>
                          {entry.subtype && (
                            <Text style={styles.reportActivitySubtype}>
                              {entry.subtype}
                            </Text>
                          )}
                          {entry.detail && (
                            <Text style={styles.reportActivityDetail}>
                              {entry.detail}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  }
                )}
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
    minHeight: 44,
  },
  headerLeft: {
    flex: 1,
    marginRight: 20,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1E293B",
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 20,
  },
  unsentBadge: {
    color: "#F59E0B",
    fontWeight: "600",
  },
  downloadButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#6366F1",
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
  cellDateWithStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cellDateText: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "500",
  },
  cellTimeText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  statusSent: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  statusPending: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
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
  reportModalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  reportModalGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  reportModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  reportModalClose: {
    width: 80,
  },
  reportModalCloseText: {
    fontSize: 16,
    color: "#64748B",
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  reportModalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  reportInfoCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reportInfoDate: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 8,
  },
  reportInfoChild: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 4,
  },
  reportInfoClass: {
    fontSize: 16,
    color: "#6366F1",
    fontWeight: "500",
  },
  reportSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  reportSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  reportSummaryText: {
    fontSize: 15,
    color: "#475569",
    marginBottom: 8,
  },
  reportSummaryDetail: {
    fontSize: 14,
    color: "#64748B",
    fontStyle: "italic",
  },
  reportActivityCard: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reportActivityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  reportActivityContent: {
    flex: 1,
  },
  reportActivityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  reportActivityType: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  reportActivityTime: {
    fontSize: 12,
    color: "#64748B",
  },
  reportActivitySubtype: {
    fontSize: 13,
    color: "#6366F1",
    marginBottom: 4,
  },
  reportActivityDetail: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  reportNotesPlaceholder: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  reportNotesPlaceholderText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
  },
});
