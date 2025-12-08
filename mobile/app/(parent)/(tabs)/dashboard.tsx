// mobile/app/(parent)/(tabs)/dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Image,
  StyleSheet,
  Pressable,
} from "react-native";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { colors } from "@/constants/color";
import { fontSize } from "@/constants/typography";
import { fetchParentFeed } from "@/services/useParentFeedAPI";
import { ParentFeedEntry } from "../../../../shared/types/type";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { User, ChevronRight } from "lucide-react-native";

export type ChildRef = {
  id: string;
  classId?: string; // Adding class Scope for API call 
  name: string;
  relationship?: string;
  birthday: string;
};

export type ChildRelationship = {
  childId: string;
  relationship?: string;
};

type EntrySection = {
  dateKey: string;
  label: string;
  items: ParentFeedEntry[];
};

async function getUserDocId(): Promise<string | null> {
  const u = auth.currentUser;
  if (!u) return null;
  const tok = await u.getIdTokenResult(true);
  const userDocId = (tok.claims as any)?.userDocId as string | undefined;
  return userDocId || null;
}

export default function ParentDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildRef[]>([]);
  const [entries, setEntries] = useState<ParentFeedEntry[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      try {
        const userDocId = await getUserDocId();
        if (!userDocId) {
          setChildren([]);
          setEntries([]);
          setLoading(false);
          return;
        }

        const userSnap = await getDoc(doc(db, "users", userDocId));
        const userData = userSnap.exists() ? (userSnap.data() as any) : {};

        let rels: ChildRelationship[] = [];

        if (Array.isArray(userData.childRelationships)) {
          rels = userData.childRelationships as ChildRelationship[];
        } else if (
          userData.childRelationships &&
          typeof userData.childRelationships === "object"
        ) {
          rels = Object.values(
            userData.childRelationships
          ) as ChildRelationship[];
        }

        const childIds = rels
          .map((r) => r.childId)
          .filter((id): id is string => typeof id === "string" && !!id);

        if (childIds.length === 0) {
          setChildren([]);
          setEntries([]);
          setLoading(false);
          return;
        }

        const childDocs: ChildRef[] = [];
        for (const rel of rels) {
          if (!rel.childId) continue;

          const cSnap = await getDoc(doc(db, "children", rel.childId));
          if (cSnap.exists()) {
            const c = cSnap.data() as any;
            const fullName =
              `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
              c.name ||
              rel.childId;

            childDocs.push({
              id: rel.childId,
              name: fullName,
              relationship: rel.relationship,
              birthday: c.birthDate
            });
          } else {
            childDocs.push({
              id: rel.childId,
              name: rel.childId,
              relationship: rel.relationship,
              birthday: "",
            });
          }
        }

        childDocs.sort((a, b) => a.name.localeCompare(b.name));
        setChildren(childDocs);

        const feed = await fetchParentFeed();
        setEntries(feed);
      } catch (e) {
        console.warn("ParentDashboard load error:", e);
        setChildren([]);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const childInfoById = useMemo(() => {
    const m: Record<string, { name: string; relationship?: string }> = {};
    children.forEach((c) => {
      m[c.id] = { name: c.name, relationship: c.relationship };
    });
    return m;
  }, [children]);

  const sections = useMemo<EntrySection[]>(() => {
    return groupEntriesByDate(entries);
  }, [entries]);

  // Calculate activity stats for the summary card (must be before loading check for hooks order)
  const activityStats = useMemo(() => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    const countsByDay = last7Days.map((dateKey) => {
      return entries.filter((e) => {
        const entryDate = getDateKey(e.occurredAt || e.createdAt);
        return entryDate === dateKey;
      }).length;
    });

    const todayCount = countsByDay[6] || 0;
    const maxCount = Math.max(...countsByDay, 1);

    return { last7Days, countsByDay, todayCount, maxCount };
  }, [entries]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#E0E7FF", "#F0F4FF", "#FFFFFF"]}
        style={styles.gradientBackground}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Summary</Text>
            <Pressable
              style={styles.profileButton}
              onPress={() => router.push("/(parent)/(tabs)/more")}
            >
              <User size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Summary Card */}
        <View style={styles.summarySection}>
          <Pressable style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryLabel}>Activities</Text>
              <View style={styles.summaryDateRow}>
                <Text style={styles.summaryDate}>This Week</Text>
                <ChevronRight size={16} color="#64748B" />
              </View>
            </View>
            <View style={styles.summaryContent}>
              <View style={styles.summaryStats}>
                <Text style={styles.summaryNumber}>{activityStats.todayCount}</Text>
                <Text style={styles.summaryUnit}>today</Text>
              </View>
              <View style={styles.barChart}>
                {activityStats.countsByDay.map((count, index) => (
                  <View key={index} style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max((count / activityStats.maxCount) * 60, 4),
                          backgroundColor: index === 6 ? "#F97316" : "#E2E8F0",
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>
            </View>
          </Pressable>
        </View>

        {/* Activity Feed Section */}
        <View style={styles.feedSection}>
          <Text style={styles.feedTitle}>Recent Activity</Text>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {children.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No children linked</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No entries yet</Text>
            </View>
          ) : (
            sections.map((section) => (
              <View key={section.dateKey} style={styles.section}>
                <Text style={styles.sectionLabel}>{section.label}</Text>

                {section.items.map((e) => {
                  const info = childInfoById[e.childId] || {
                    name: e.childName || e.childId,
                  };
                  const emoji = iconFor(e);
                  const title = titleFor(e);
                  const detail = detailFor(e);
                  const time = toHM(e.occurredAt || e.createdAt);

                  return (
                    <View key={e.id} style={styles.entryCard}>
                      <View style={styles.entryIconContainer}>
                        <Text style={styles.entryEmoji}>{emoji}</Text>
                      </View>

                      <View style={styles.entryContent}>
                        <Text style={styles.entryTitle}>{title}</Text>

                        <Text style={styles.entryMeta}>
                          {info.name}
                          {info.relationship ? ` (${info.relationship})` : ""}
                          {time ? ` • ${time}` : ""}
                        </Text>

                        {!!detail && (
                          <Text style={styles.entryDetail}>{detail}</Text>
                        )}

                        {e.photoUrl ? (
                          <Image
                            source={{ uri: e.photoUrl }}
                            style={styles.entryImage}
                            resizeMode="cover"
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function iconFor(e: ParentFeedEntry): string {
  const t = e.type;
  if (t === "Attendance") {
    if (e.subtype && e.subtype.toLowerCase().includes("in")) return "✅";
    if (e.subtype && e.subtype.toLowerCase().includes("out")) return "🚪";
    return "🟣";
  }
  if (t === "Food") return "🍽️";
  if (t === "Sleep") return "😴";
  if (t === "Toilet") return "🚽";
  if (t === "Photo") return "📷";
  if (t === "Activity") return "🎨";
  if (t === "Health") return "❤️";
  return "📝";
}

function titleFor(e: ParentFeedEntry): string {
  const t = e.type;

  if (t === "Attendance") {
    const subtype = e.subtype?.toLowerCase() ?? "";
    if (subtype.includes("in")) return "Attendance • Check in";
    if (subtype.includes("out")) return "Attendance • Check out";
    return e.subtype ? `Attendance • ${e.subtype}` : "Attendance";
  }

  if (t === "Food") {
    return e.subtype ? `Meal • ${e.subtype}` : "Meal";
  }

  if (t === "Sleep") {
    const subtype = e.subtype?.toLowerCase() ?? "";

    if (
      subtype.includes("start") ||
      subtype.includes("begin") ||
      subtype.includes("down")
    ) {
      return "Nap • Started";
    }

    if (
      subtype.includes("end") ||
      subtype.includes("wake") ||
      subtype.includes("up")
    ) {
      return "Nap • Woke up";
    }

    return e.subtype ? `Nap • ${e.subtype}` : "Nap";
  }

  if (t === "Toilet") return "Toilet";
  if (t === "Photo") return "Photo";
  if (t === "Activity") return "Activity";
  if (t === "Health") return "Health";
  if (t === "Note") return "Note";
  return t || "Entry";
}



function detailFor(e: ParentFeedEntry): string | undefined {
  if (!e.detail) return undefined;

  if (e.type === "Food") {
    const anyDetail = e.detail as any;
    if (Array.isArray(anyDetail?.menu)) return anyDetail.menu.join(", ");
    if (typeof anyDetail === "string") return anyDetail;
  }

  const anyDetail = e.detail as any;
  if (typeof anyDetail?.text === "string") return anyDetail.text;
  if (typeof anyDetail === "string") return anyDetail;

  return undefined;
}

function toHM(v: any): string | undefined {
  if (!v) return undefined;

  if (typeof v === "string") {
    const d = new Date(v);
    if (isNaN(d.getTime())) return undefined;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  if (typeof v === "object" && typeof (v as any).seconds === "number") {
    const ms =
      (v as any).seconds * 1000 + Math.floor(((v as any).nanoseconds || 0) / 1e6);
    const d = new Date(ms);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  if (typeof v === "object" && typeof (v as any).toDate === "function") {
    const d = (v as any).toDate();
    if (d instanceof Date && !isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  }

  return undefined;
}

function getDateValue(v: any): Date | undefined {
  if (!v) return undefined;

  if (typeof v === "string") {
    const d = new Date(v);
    if (isNaN(d.getTime())) return undefined;
    return d;
  }

  if (typeof v === "object" && typeof (v as any).toDate === "function") {
    const d = (v as any).toDate();
    if (d instanceof Date && !isNaN(d.getTime())) return d;
  }

  if (typeof v === "object" && typeof (v as any).seconds === "number") {
    const ms =
      (v as any).seconds * 1000 + Math.floor(((v as any).nanoseconds || 0) / 1e6);
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d;
  }

  return undefined;
}

function getDateKey(v: any): string | undefined {
  const d = getDateValue(v);
  if (!d) return undefined;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabelFromKey(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function groupEntriesByDate(entries: ParentFeedEntry[]): EntrySection[] {
  const map: Record<string, ParentFeedEntry[]> = {};

  entries.forEach((e) => {
    const key = getDateKey(e.occurredAt || e.createdAt);
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(e);
  });

  const sortedKeys = Object.keys(map).sort((a, b) => (a < b ? 1 : -1));

  return sortedKeys.map((key) => {
    const items = map[key].slice().sort((a, b) => {
      const da = getDateValue(a.occurredAt || a.createdAt);
      const db = getDateValue(b.occurredAt || b.createdAt);
      if (!da || !db) return 0;
      return db.getTime() - da.getTime();
    });

    return {
      dateKey: key,
      label: formatDateLabelFromKey(key),
      items,
    };
  });
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
    height: 280,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  summarySection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F97316",
  },
  summaryDateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryDate: {
    fontSize: 14,
    color: "#64748B",
  },
  summaryContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  summaryStats: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  summaryNumber: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#1E293B",
    letterSpacing: -1,
  },
  summaryUnit: {
    fontSize: 18,
    color: "#64748B",
    marginLeft: 6,
    marginBottom: 4,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 60,
  },
  barContainer: {
    width: 12,
    height: 60,
    justifyContent: "flex-end",
  },
  bar: {
    width: 12,
    borderRadius: 4,
    minHeight: 4,
  },
  feedSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  feedTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E293B",
  },
  contentContainer: {
    paddingHorizontal: 20,
    gap: 14,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 15,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  entryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  entryIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  entryEmoji: {
    fontSize: 20,
  },
  entryContent: {
    flex: 1,
    gap: 4,
  },
  entryTitle: {
    fontWeight: "600",
    fontSize: 15,
    color: "#1E293B",
  },
  entryMeta: {
    color: "#64748B",
    fontSize: 13,
  },
  entryDetail: {
    color: "#1E293B",
    fontSize: 14,
  },
  entryImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginTop: 6,
    backgroundColor: "#E2E8F0",
  },
});
