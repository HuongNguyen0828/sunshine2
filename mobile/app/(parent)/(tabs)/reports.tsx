// mobile/app/(parent)/(tabs)/reports.tsx
import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import {
  Calendar,
  FileText,
  Activity as ActivityIcon,
  Coffee,
  Moon,
  Toilet,
  Camera,
  Heart,
} from "lucide-react-native";

import {
  fetchParentDailyReports,
} from "../../../services/useDailyReportAPI";
import type {
  DailyReportDoc,
  EntryDoc,
} from "../../../../shared/types/type";

const entryTypeConfig = {
  Attendance: { icon: ActivityIcon, color: "#10B981", bg: "#D1FAE5" },
  Food: { icon: Coffee, color: "#F59E0B", bg: "#FEF3C7" },
  Sleep: { icon: Moon, color: "#8B5CF6", bg: "#EDE9FE" },
  Toilet: { icon: Toilet, color: "#06B6D4", bg: "#CFFAFE" },
  Activity: { icon: ActivityIcon, color: "#3B82F6", bg: "#DBEAFE" },
  Photo: { icon: Camera, color: "#EC4899", bg: "#FCE7F3" },
  Note: { icon: FileText, color: "#6B7280", bg: "#F3F4F6" },
  Health: { icon: Heart, color: "#EF4444", bg: "#FEE2E2" },
};

type DateRange = "today" | "week" | "month";

export default function ParentReports() {
  const insets = useSafeAreaInsets();

  const [reports, setReports] = useState<DailyReportDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRange>("week");
  const [showDateModal, setShowDateModal] = useState(false);

  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [showChildModal, setShowChildModal] = useState(false);

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);

  const [selectedReport, setSelectedReport] = useState<DailyReportDoc | null>(
    null
  );
  const [showReportModal, setShowReportModal] = useState(false);

  const buildDateFilter = (): { dateFrom?: string; dateTo?: string } => {
    const now = new Date();
    const todayUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

    const daysAgoUtc = (days: number) => {
      const d = new Date(todayUtc);
      d.setUTCDate(d.getUTCDate() - days);
      return d;
    };

    if (dateRange === "today") {
      const d = toIsoDate(todayUtc);
      return { dateFrom: d, dateTo: d };
    }

    if (dateRange === "week") {
      const start = daysAgoUtc(7);
      return {
        dateFrom: toIsoDate(start),
        dateTo: toIsoDate(todayUtc),
      };
    }

    if (dateRange === "month") {
      const start = daysAgoUtc(30);
      return {
        dateFrom: toIsoDate(start),
        dateTo: toIsoDate(todayUtc),
      };
    }

    return {};
  };

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { dateFrom, dateTo } = buildDateFilter();

      const data = await fetchParentDailyReports({
        childIds: selectedChildId ? [selectedChildId] : undefined,
        filter: { dateFrom, dateTo },
      });

      setReports(data);
    } catch (err: any) {
      console.error("Failed to load parent daily reports:", err);
      setError(err?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedChildId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        if (!active) return;
        await loadReports();
      })();

      return () => {
        active = false;
      };
    }, [loadReports])
  );

  const childOptions = useMemo(() => {
    const map = new Map<string, string>();
    reports.forEach((r) => {
      if (!r.childId) return;
      if (!map.has(r.childId)) {
        map.set(r.childId, r.childName || "Unknown child");
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [reports]);

  const filteredReports = useMemo(() => {
    let data = reports;

    if (selectedType) {
      data = data.filter((report) =>
        (report.entries || []).some(
          (entry: EntryDoc) => entry.type === selectedType
        )
      );
    }

    return data;
  }, [reports, selectedType]);

  const stats = useMemo(() => {
    const typeCount: { [key: string]: number } = {};
    const uniqueChildren = new Set<string>();
    let totalEntries = 0;

    filteredReports.forEach((report) => {
      if (report.childId) {
        uniqueChildren.add(report.childId);
      }
      (report.entries || []).forEach((entry: EntryDoc) => {
        totalEntries++;
        if (entry.type) {
          typeCount[entry.type] = (typeCount[entry.type] || 0) + 1;
        }
      });
    });

    return {
      totalReports: filteredReports.length,
      uniqueChildren: uniqueChildren.size,
      totalEntries,
      topType:
        Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        "N/A",
    };
  }, [filteredReports]);

  const clearFilters = () => {
    setSelectedChildId(null);
    setSelectedType(null);
    setDateRange("week");
  };

  const hasActiveFilters =
    selectedChildId || selectedType || dateRange !== "week";

  const getDateRangeText = () => {
    switch (dateRange) {
      case "today":
        return "Today";
      case "week":
        return "Last 7 Days";
      case "month":
        return "Last 30 Days";
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
          <Text style={styles.cellDateText}>{dateLabel}</Text>
          <Text style={styles.cellTimeText}>
            {report.totalActivities}{" "}
            {report.totalActivities === 1 ? "activity" : "activities"}
          </Text>
        </View>
        <View style={styles.cellChild}>
          <Text style={styles.cellChildName} numberOfLines={1}>
            {report.childName || "Unknown child"}
          </Text>
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
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.subtitle}>Daily summaries from teachers</Text>
          {error && (
            <Text style={[styles.subtitle, { color: "#DC2626" }]}>{error}</Text>
          )}
        </View>
        <View style={styles.headerActions} />
      </View>

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
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              selectedChildId && styles.filterButtonActive,
            ]}
            onPress={() => setShowChildModal(true)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedChildId && styles.filterButtonTextActive,
              ]}
            >
              {selectedChildId
                ? childOptions.find((c) => c.id === selectedChildId)?.name ??
                  "Selected child"
                : "All Children"}
            </Text>
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
          </Pressable>

          {hasActiveFilters && (
            <Pressable style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

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
              <Text style={styles.emptyStateTitle}>No reports yet</Text>
              <Text style={styles.emptyStateText}>
                When teachers share daily reports, they will appear here.
              </Text>
            </View>
          )}
          contentContainerStyle={styles.tableContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Date modal */}
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
          </View>
        </Pressable>
      </Modal>

      {/* Child modal */}
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
            <Pressable
              style={[
                styles.modalOption,
                !selectedChildId && styles.modalOptionSelected,
              ]}
              onPress={() => {
                setSelectedChildId(null);
                setShowChildModal(false);
              }}
            >
              <Text style={styles.modalOptionText}>All Children</Text>
            </Pressable>
            {childOptions.map((child) => (
              <Pressable
                key={child.id}
                style={[
                  styles.modalOption,
                  selectedChildId === child.id && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setSelectedChildId(child.id);
                  setShowChildModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{child.name}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Type modal */}
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

      {/* Report detail modal */}
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
              <Text style={styles.reportModalCloseText}>Close</Text>
            </Pressable>
            <Text style={styles.reportModalTitle}>Daily Report</Text>
            <View style={{ width: 80 }} />
          </View>

          {selectedReport && (
            <ScrollView style={styles.reportModalContent}>
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

              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Activity Summary</Text>
                <Text style={styles.reportSummaryText}>
                  {selectedReport.totalActivities}{" "}
                  {selectedReport.totalActivities === 1
                    ? "activity"
                    : "activities"}{" "}
                  recorded
                </Text>
                <Text style={styles.reportSummaryDetail}>
                  {selectedReport.activitySummary}
                </Text>
              </View>

              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Activities</Text>
                {(selectedReport.entries || []).map(
                  (entry: EntryDoc, idx: number) => {
                    const config =
                      entryTypeConfig[
                        entry.type as keyof typeof entryTypeConfig
                      ];
                    const IconComponent = config?.icon || ActivityIcon;
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
  cellChild: {
    width: "35%",
    justifyContent: "center",
  },
  cellChildName: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "500",
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
});
