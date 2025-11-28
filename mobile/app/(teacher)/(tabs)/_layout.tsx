import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import RoleGate from "@/navigation/RootNavigator";
import { colors } from "@/constants/color";
import HeaderWithLogo from "@/components/headers/HeaderWithLogo";
import { useEffect, useState } from "react";
import { fetchSchedulesForTeacher } from "@/services/useScheduleAPI";
import { useAppContext } from "@/contexts/AppContext"
import { EventByMonth, } from "./calendar";
import { ClassRow, ChildRow } from "./dashboard";
import { ScheduleDate } from "./calendar";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { processAndSplitSchedules } from "@/services/useScheduleAPI";

/**
 * Teacher tabs layout.
 * - No index tab file.
 * - Dashboard is the initial tab.
 * - RoleGate only allows 'teacher' users.
 */
export default function TeacherTabs() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [userDocId, setUserDocId] = useState<string | null>(null);


  const { sharedData, updateSharedData } = useAppContext();


  // read custom claims to get users/{id}
  async function getUserDocId(): Promise<string | null> {
    const u = auth.currentUser;
    if (!u) return null;
    const tok = await u.getIdTokenResult(true);
    const userDocId = (tok.claims as any)?.userDocId as string | undefined;
    return userDocId || null;
  };


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
                  birthday: x.birthDate,
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


  // Pre-fetch and split calendar data when the tab layout mounts
  useEffect(() => {
    if (loading) return;
    const preloadAndSplitCalendarData = async () => {
      try {
        console.log("📅 Pre-fetching and splitting calendar data...");
        const currentMonthString = new Date().toISOString().split('T')[0];
        const schedules = await fetchSchedulesForTeacher(currentMonthString);
        console.log("Is this here")
        // alert(schedules);

        // Split data: today's events vs all events
        const { dailyActivities, allCalendarEvents } = processAndSplitSchedules(schedules, sharedData["classes"]);

        // Store in context for different tabs to use
        updateSharedData("dailyActivity", dailyActivities); // For Dashboard
        updateSharedData("otherActivity", allCalendarEvents); // For Calendar
        // console.log("✅ Data split successfully - Today:", Object.keys(todayEvents).length, "All:", Object.keys(allCalendarEvents).length);
      } catch (error) {
        console.error("❌ Failed to pre-load calendar data:", error);
      }
    };

    preloadAndSplitCalendarData();
  }, [loading]);


  if (loading) return (
    <View>
      <Text> Loading layout....</Text>
    </View>
  );  // Make sure render layout only after loading done
  return (
    <RoleGate allow={["teacher"]}>
      <Tabs
        initialRouteName="dashboard"
        screenOptions={{
          tabBarActiveTintColor: colors.tint,
          tabBarStyle: { backgroundColor: colors.palette.neutral100 },
          headerShadowVisible: false,
          header: ({ route, options }) => (
            <HeaderWithLogo
              title={(options.title as string) ?? route.name}
              logoWidth={100}
              logoHeight={60}
              edgeOffset={-10}
              contentOffsetY={50}
            />
          ),
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Teacher Dashboard",
            headerShown: false,
            tabBarIcon: (p) => <Ionicons name="home-outline" {...p} />,
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: "Activity",
            headerShown: false,
            tabBarIcon: (p) => (
              <Ionicons name="chatbubble-ellipses-outline" {...p} />
            ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: "Reports",
            headerShown: false,
            tabBarIcon: (p) => (
              <Ionicons name="document-text-outline" {...p} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Calendar",
            headerShown: false,
            tabBarIcon: (p) => <Ionicons name="calendar-outline" {...p} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "More",
            headerShown: false,
            tabBarIcon: (p) => (
              <Ionicons name="ellipsis-horizontal-circle-outline" {...p} />
            ),
          }}
        />
      </Tabs>
    </RoleGate>
  );
}

