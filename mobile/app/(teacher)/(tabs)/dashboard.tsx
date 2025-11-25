// mobile/app/(teacher)/(tabs)/dashboard.tsx
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";
import { useAppContext } from "@/contexts/AppContext"; // useAppContext 
import { useEffect, useMemo, useState, useCallback, useContext } from "react";
import { colors } from "@/constants/color";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EventByMonth } from "./calendar";
import {
  Moon,
  Apple,
  FileText,
  Camera,
  Users,
  Calendar,
  ChevronDown,
  X,
  Check,
  Clock,
  Baby,
  Heart,
  Activity as ActivityIcon,
} from "lucide-react-native";

export type ChildRow = {
  id: string;
  name: string;
  classId?: string;
  status?: string;
};

export type ClassRow = {
  id: string;
  name: string;
};

type EntryCard =
  | { id: "attendance"; label: "Attendance"; icon: any; color: string; bgColor: string; subtypes: string[] }
  | { id: "food"; label: "Food"; icon: any; color: string; bgColor: string; subtypes: string[] }
  | { id: "sleep"; label: "Sleep"; icon: any; color: string; bgColor: string; subtypes: string[] }
  | { id: "toilet"; label: "Toilet"; icon: any; color: string; bgColor: string }
  | { id: "activity"; label: "Activity"; icon: any; color: string; bgColor: string }
  | { id: "photo"; label: "Photo"; icon: any; color: string; bgColor: string }
  | { id: "note"; label: "Note"; icon: any; color: string; bgColor: string }
  | { id: "health"; label: "Health"; icon: any; color: string; bgColor: string };

const entryTypes: EntryCard[] = [
  {
    id: "attendance",
    label: "Attendance",
    icon: Clock,
    color: "#10B981",
    bgColor: "#D1FAE5",
    subtypes: ["Check in", "Check out"],
  },
  {
    id: "food",
    label: "Food",
    icon: Apple,
    color: "#F59E0B",
    bgColor: "#FEF3C7",
    subtypes: ["Breakfast", "Lunch", "Snack"],
  },
  {
    id: "sleep",
    label: "Sleep",
    icon: Moon,
    color: "#6366F1",
    bgColor: "#E0E7FF",
    subtypes: ["Started", "Woke up"],
  },
  {
    id: "toilet",
    label: "Toilet",
    icon: Baby,
    color: "#EC4899",
    bgColor: "#FCE7F3",
  },
  {
    id: "activity",
    label: "Activity",
    icon: ActivityIcon,
    color: "#8B5CF6",
    bgColor: "#EDE9FE",
  },
  {
    id: "photo",
    label: "Photo",
    icon: Camera,
    color: "#06B6D4",
    bgColor: "#CFFAFE",
  },
  {
    id: "note",
    label: "Note",
    icon: FileText,
    color: "#64748B",
    bgColor: "#F1F5F9",
  },
  {
    id: "health",
    label: "Health",
    icon: Heart,
    color: "#EF4444",
    bgColor: "#FEE2E2",
  },
];

// read custom claims to get users/{id}
async function getUserDocId(): Promise<string | null> {
  const u = auth.currentUser;
  if (!u) return null;
  const tok = await u.getIdTokenResult(true);
  const userDocId = (tok.claims as any)?.userDocId as string | undefined;
  return userDocId || null;
}

export default function TeacherDashboard() {

  // Sharing classes in the context
  const { sharedData, updateSharedData } = useAppContext(); // sharing classes data

  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userDocId, setUserDocId] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [children, setChildren] = useState<ChildRow[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [showClassPicker, setShowClassPicker] = useState(false);

  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [showChildPicker, setShowChildPicker] = useState(false);

  const [showDetailActivity, sethowDetailActivity] = useState<boolean>(false);

  // load teacher scope
  useEffect(() => {
    let unsubChildren: (() => void) | null = null;

    (async () => {
      try {
        setLoading(true);

        const uidDocId = await getUserDocId();
        setUserDocId(uidDocId);
        if (!uidDocId) throw new Error("Missing userDocId in token");

        // load user doc to get classIds
        const userSnap = await getDoc(doc(db, "users", uidDocId));
        const userData = userSnap.exists() ? (userSnap.data() as any) : {};
        const teacherClassIds: string[] = Array.isArray(userData?.classIds)
          ? userData.classIds.map(String)
          : [];

        // load classes
        if (teacherClassIds.length > 0) {
          const loaded: ClassRow[] = [];
          for (const cid of teacherClassIds) {
            const cSnap = await getDoc(doc(db, "classes", cid));
            if (cSnap.exists()) {
              const cd = cSnap.data() as any;
              loaded.push({ id: cSnap.id, name: cd?.name || cSnap.id });
            }
          }
          loaded.sort((a, b) => a.name.localeCompare(b.name));
          setClasses(loaded);

          updateSharedData("classes", loaded); // Add Classed into the context
        } else {
          setClasses([]);
        }

        // subscribe children only if we actually have classIds
        if (teacherClassIds.length > 0) {
          // we guard here so we never call where("in", []) 👇
          const qy = query(
            collection(db, "children"),
            where("classId", "in", teacherClassIds)
          );
          unsubChildren = onSnapshot(
            qy,
            (snap) => {
              const rows: ChildRow[] = snap.docs.map((d) => {
                const x = d.data() as any;
                return {
                  id: d.id,
                  name: `${x.firstName ?? ""} ${x.lastName ?? ""}`.trim() || "(no name)",
                  classId: x.classId,
                  status: x.enrollmentStatus,
                };
              });
              rows.sort((a, b) => a.name.localeCompare(b.name));
              setChildren(rows);
              updateSharedData("children", rows); // Sharing children for their calendar birthday show
              setLoading(false);
            },
            () => {
              setChildren([]);
              setLoading(false);
            }
          );
        } else {
          // no classes → no children
          setChildren([]);
          setLoading(false);
        }
      } catch (err) {
        setChildren([]);
        setClasses([]);
        setLoading(false);
      }
    })();

    return () => {
      if (unsubChildren) unsubChildren();
    };
  }, []);

  // when class changes, clear selected children
  useEffect(() => {
    setSelectedChildren([]);
  }, [selectedClass]);

  // filter children by selected class
  const filteredChildren = useMemo(() => {
    if (selectedClass === "all") return children;
    return children.filter((c) => c.classId === selectedClass);
  }, [children, selectedClass]);

  // display label for class
  const selectedClassLabel = useMemo(() => {
    if (classes.length === 0) return "No classes assigned";
    if (selectedClass === "all") return "All Classes";
    const found = classes.find((c) => c.id === selectedClass);
    return found ? found.name : `Class ${selectedClass}`;
  }, [selectedClass, classes]);

  const toggleChild = useCallback(
    (id: string) => {
      setSelectedChildren((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    },
    [setSelectedChildren]
  );

  const toggleAllChildren = useCallback(() => {
    if (selectedChildren.length === filteredChildren.length) {
      setSelectedChildren([]);
    } else {
      setSelectedChildren(filteredChildren.map((c) => c.id));
    }
  }, [filteredChildren, selectedChildren]);

  // navigate to entry form with exact EntryType string
  const toEntryForm = (card: EntryCard) => {
    if (selectedChildren.length === 0) {
      Alert.alert("Select Children", "Please select at least one child first");
      return;
    }
    router.push({
      pathname: "/(teacher)/entry-form",
      params: {
        type: card.label, // must match shared EntryType
        classId: selectedClass === "all" ? "" : selectedClass,
        childIds: JSON.stringify(selectedChildren),
      },
    });
  };

  // Show Today Activity
  const showTodayActivity = () => {
    console.log(selectedClass)
    if (selectedClass === "all") {
      alert("Please select a class to view Activity!")
      return;
    }
    const dailyActivities = sharedData["todayEvents"] as EventByMonth;
    const today = new Date().toLocaleDateString('en-CA').split('T')[0]; // Always uses local timezone // "2025-11-19"
    const todayEvents = dailyActivities?.[today as keyof EventByMonth] || [];
    console.log(todayEvents);
    const onlySelectedClassActivity = todayEvents.find(event => event.classes.includes(selectedClassLabel));

    // alert(today);
    if (!onlySelectedClassActivity) {
      alert("No activities for today! 🎉");
      return;
    }

    const eventList =
      `• ${onlySelectedClassActivity.title} (${onlySelectedClassActivity.time})
      ${onlySelectedClassActivity.description}`;

    alert(`Today's Activities:\n\n${eventList}`);
    sethowDetailActivity(true);
  };


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
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.greeting}>Good Morning! 👋</Text>
          <Text style={styles.title}>Create Entry</Text>
          <Text style={styles.subtitle}> Select class before creating entries</Text>
        </View>

        {/* selectors */}
        <View style={styles.selectionContainer}>
          <Pressable style={styles.selector} onPress={() => setShowClassPicker(true)}>
            <View style={styles.selectorIcon}>
              <Users size={20} color="#6366F1" />
            </View>
            <View style={styles.selectorContent}>
              <Text style={styles.selectorLabel}>Class</Text>
              <Text style={styles.selectorValue}>{selectedClassLabel}</Text>
            </View>
            <ChevronDown size={20} color="#94A3B8" />
          </Pressable>

          <Pressable
            style={[styles.selector, styles.childSelector]}
            onPress={() => setShowChildPicker(true)}
          >
            <View style={[styles.selectorIcon, { backgroundColor: "#FCE7F3" }]}>
              <Baby size={20} color="#EC4899" />
            </View>
            <View style={styles.selectorContent}>
              <Text style={styles.selectorLabel}>Children</Text>
              <Text style={styles.selectorValue}>
                {filteredChildren.length === 0
                  ? "No children"
                  : selectedChildren.length === 0
                    ? "Select"
                    : selectedChildren.length === filteredChildren.length
                      ? "All Selected"
                      : `${selectedChildren.length} Selected`}
              </Text>
            </View>
            <ChevronDown size={20} color="#94A3B8" />
          </Pressable>
        </View>

        {/* selected chips */}
        {selectedChildren.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.selectedChildrenContainer}
          >
            {selectedChildren.map((childId) => {
              const child = children.find((c) => c.id === childId);
              return (
                <View key={childId} style={styles.selectedChildPill}>
                  <Text style={styles.selectedChildName}>{child?.name || childId}</Text>
                  <Pressable onPress={() => toggleChild(childId)}>
                    <X size={14} color="#6366F1" />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* entry cards */}
        <View style={styles.entryTypesContainer}>
          <Text style={styles.sectionTitle}>What would you like to record?</Text>
          <View style={styles.entryGrid}>
            {entryTypes.map((card) => (
              <Pressable
                key={card.id}
                style={({ pressed }) => [
                  styles.entryCard,
                  { transform: [{ scale: pressed ? 0.95 : 1 }] },
                ]}
                onPress={card.id !== "activity" ? (() => toEntryForm(card)) : (showTodayActivity)}
              >
                <View
                  style={[
                    styles.entryIconContainer,
                    { backgroundColor: card.bgColor },
                  ]}
                >
                  <card.icon size={24} color={card.color} strokeWidth={2} />
                </View>
                <Text style={styles.entryLabel}>{card.label}</Text>
                {"subtypes" in card && card.subtypes?.length ? (
                  <Text style={styles.entrySubtypes}>
                    {card.subtypes.length} options
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>

        {/* quick actions (placeholder) */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Pressable style={styles.quickAction}>
            <View style={styles.quickActionIcon}>
              <Calendar size={20} color="#10B981" />
            </View>
            <Text style={styles.quickActionText}>Today's Schedule</Text>
            <ChevronDown
              size={18}
              color="#94A3B8"
              style={{ transform: [{ rotate: "-90deg" }] }}
            />
          </Pressable>
          <Pressable style={styles.quickAction}>
            <View style={styles.quickActionIcon}>
              <FileText size={20} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionText}>View Reports</Text>
            <ChevronDown
              size={18}
              color="#94A3B8"
              style={{ transform: [{ rotate: "-90deg" }] }}
            />
          </Pressable>
        </View>
      </ScrollView>

      {/* class picker */}
      <Modal visible={showClassPicker} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowClassPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Class</Text>

            {classes.length === 0 ? (
              <Text style={{ color: "#94A3B8", marginTop: 8 }}>
                No classes assigned to this teacher.
              </Text>
            ) : (
              <>
                <Pressable
                  style={styles.modalOption}
                  onPress={() => {
                    setSelectedClass("all");
                    setShowClassPicker(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>All Classes</Text>
                  {selectedClass === "all" && <Check size={20} color="#6366F1" />}
                </Pressable>

                {classes.map((c) => (
                  <Pressable
                    key={c.id}
                    style={styles.modalOption}
                    onPress={() => {
                      setSelectedClass(c.id);
                      setShowClassPicker(false);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{c.name}</Text>
                    {selectedClass === c.id && <Check size={20} color="#6366F1" />}
                  </Pressable>
                ))}
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Child picker */}
      <Modal visible={showChildPicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowChildPicker(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Children</Text>
              <Pressable onPress={toggleAllChildren}>
                <Text style={styles.selectAllText}>
                  {selectedChildren.length === filteredChildren.length ? "Deselect All" : "Select All"}
                </Text>
              </Pressable>
            </View>

            <ScrollView style={styles.childrenList}>
              {/* extra virtual option */}
              <Pressable style={styles.modalOption} onPress={toggleAllChildren}>
                <Text style={[styles.modalOptionText, { fontWeight: "600" }]}>
                  {selectedChildren.length === filteredChildren.length
                    ? "Deselect All"
                    : "Select All"}
                </Text>
                {selectedChildren.length === filteredChildren.length && (
                  <Check size={20} color="#6366F1" />
                )}
              </Pressable>

              {filteredChildren.map((child) => (
                <Pressable
                  key={child.id}
                  style={styles.modalOption}
                  onPress={() => toggleChild(child.id)}
                >
                  <Text style={styles.modalOptionText}>{child.name}</Text>
                  {selectedChildren.includes(child.id) && <Check size={20} color="#6366F1" />}
                </Pressable>
              ))}
            </ScrollView>

            <Pressable style={styles.doneButton} onPress={() => setShowChildPicker(false)}>
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, marginBottom: 24 },
  greeting: { fontSize: 16, color: "#64748B", marginBottom: 4 },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
  },
  selectionContainer: { paddingHorizontal: 20, marginBottom: 16 },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  childSelector: { marginBottom: 0 },
  selectorIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  selectorContent: { flex: 1 },
  selectorLabel: { fontSize: 12, color: "#94A3B8", marginBottom: 2 },
  selectorValue: { fontSize: 15, fontWeight: "600", color: "#1E293B" },
  selectedChildrenContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    maxHeight: 40,
  },
  selectedChildPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0E7FF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  selectedChildName: {
    fontSize: 13,
    color: "#6366F1",
    fontWeight: "500",
    marginRight: 6,
  },
  entryTypesContainer: { paddingHorizontal: 20, marginBottom: 32 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
  },
  entryGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  entryCard: {
    width: "31%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    margin: "1.16%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  entryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  entryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
  },
  entrySubtypes: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  quickActionsContainer: { paddingHorizontal: 20, marginBottom: 32 },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  quickActionText: { flex: 1, fontSize: 15, fontWeight: "500", color: "#1E293B" },
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
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#1E293B" },
  selectAllText: { fontSize: 14, color: "#6366F1", fontWeight: "500" },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalOptionText: { fontSize: 15, color: "#1E293B" },
  childrenList: { maxHeight: 320 },
  doneButton: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  doneButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
