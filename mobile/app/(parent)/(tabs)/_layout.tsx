import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import RoleGate from "@/navigation/RootNavigator";
import { colors } from "@/constants/color";
import HeaderWithLogo from "@/components/headers/HeaderWithLogo";
import { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { ChildRef, ChildRelationship } from "./dashboard";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAppContext } from "@/contexts/AppContext";
import { processAndSplitSchedules, fetchSchedulesForParent } from "@/services/useScheduleAPI";



/**
 * Parent tabs layout.
 * - No index tab file.
 * - Dashboard is the initial tab.
 * - RoleGate only allows 'parent' users.
 */
export default function ParentTabs() {
  // Fetching scope for parent
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildRef[]>([]);

  // Sharing parentData and Children (with class) data as scope
  const { sharedData, updateSharedData } = useAppContext();


  async function getUserDocId(): Promise<string | null> {
    const u = auth.currentUser;
    if (!u) return null;
    const tok = await u.getIdTokenResult(true);
    const userDocId = (tok.claims as any)?.userDocId as string | undefined;
    return userDocId || null;
  }

  useEffect(() => {
    (async () => {
      setLoading(true);

      try {
        const userDocId = await getUserDocId();
        if (!userDocId) {
          setChildren([]);
          updateSharedData("children", []);

          // setEntries([]);
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
          updateSharedData("children", []); // Sharing children
          updateSharedData("classes", []);  // Sharing classes
          // setEntries([]);
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
              classId: c.classId, // From children doc data
              birthday: c.birthDate
            });
          } else {
            childDocs.push({
              id: rel.childId,
              name: rel.childId,
              relationship: rel.relationship,
              // classId: undefined
              birthday: "",
            });
          }
        }

        childDocs.sort((a, b) => a.name.localeCompare(b.name));
        setChildren(childDocs);
        updateSharedData("children", childDocs);
        const classes = childDocs.map(child => child.classId) as string[];
        updateSharedData("classes", classes);

        // const feed = await fetchParentFeed();
        // setEntries(feed);
      } catch (e) {
        console.warn("ParentDashboard load error:", e);
        setChildren([]);
        updateSharedData("children", []);


        // setEntries([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  // Pre-fetch and split calendar data when the tab layout mounts
  useEffect(() => {
    if (loading) return;
    const preloadAndSplitCalendarData = async () => {
      try {
        console.log("📅 Pre-fetching and splitting calendar data...");
        const currentMonthString = new Date().toISOString().split('T')[0];
        const schedules = await fetchSchedulesForParent(currentMonthString);
        console.log("Is this here", schedules)
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
    <RoleGate allow={["parent"]}>
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
            title: "Parent Dashboard",
            tabBarIcon: (p) => <Ionicons name="home-outline" {...p} />,
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: "Activity",
            tabBarIcon: (p) => (
              <Ionicons name="chatbubble-ellipses-outline" {...p} />
            ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: "Reports",
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
