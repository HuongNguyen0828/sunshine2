import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import RoleGate from "@/navigation/RootNavigator";
import { colors } from "@/constants/color";
import HeaderWithLogo from "@/components/headers/HeaderWithLogo";
import { useEffect } from "react";
import { fetchSchedulesForTeacher } from "@/services/useScheduleAPI";
import { useAppContext } from "@/contexts/AppContext"
import { EventByMonth, } from "./calendar";
import { ClassRow } from "./dashboard";



/**
 * Teacher tabs layout.
 * - No index tab file.
 * - Dashboard is the initial tab.
 * - RoleGate only allows 'teacher' users.
 */
export default function TeacherTabs() {
  const { sharedData, updateSharedData } = useAppContext();


  // Pre-fetch and split calendar data when the tab layout mounts
  useEffect(() => {
    const preloadAndSplitCalendarData = async () => {
      try {
        console.log("📅 Pre-fetching and splitting calendar data...");
        const currentMonthString = new Date().toISOString().split('T')[0];
        const schedules = await fetchSchedulesForTeacher(currentMonthString);
        // alert(schedules);

        // Split data: today's events vs all events
        const { todayEvents, allCalendarEvents } = processAndSplitSchedules(schedules);

        // Store in context for different tabs to use
        updateSharedData("todayEvents", todayEvents); // For Dashboard
        updateSharedData("otherActivity", allCalendarEvents); // For Calendar
        // console.log("✅ Data split successfully - Today:", Object.keys(todayEvents).length, "All:", Object.keys(allCalendarEvents).length);
      } catch (error) {
        console.error("❌ Failed to pre-load calendar data:", error);
      }
    };

    preloadAndSplitCalendarData();
  }, []);

  // Helper function to process and split schedules
  function processAndSplitSchedules(schedules: any[]) {
    const numberInWeek = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const todayEvents: EventByMonth = {};; // Array for dashboard
    const allCalendarEvents: EventByMonth = {}; // Object for calendar

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    schedules.forEach((activity) => {
      const baseDate = new Date(activity.weekStart);
      const dayIndex = numberInWeek.indexOf(activity.dayOfWeek);
      baseDate.setDate(baseDate.getDate() + dayIndex);
      const date = baseDate.toISOString().split('T')[0];

      // Create event object
      const event = {
        id: activity.id,
        title: activity.activityTitle,
        time: activity.timeSlot,
        classes: activity.classId !== "*"
          ? [(sharedData["classes"] as ClassRow[]).find(cls => cls.id === activity.classId)?.name].filter(Boolean)
          : (sharedData["classes"] as ClassRow[]).map((cls: any) => cls.name),
        type: activity.type,
        description: activity.activityDescription,
        materialsRequired: activity.activityMaterials,
      };

      if (activity.type === "dailyActivity") {
        // Add to today's events if it's today (for dashboard tab)
        if (date === today.toLocaleDateString('en-CA').split('T')[0]) {
          todayEvents[date] = [...(todayEvents[date] || []), event];
        }
      } else {
        // Add to all calendar events (for calendar tab)
        allCalendarEvents[date] = [...(allCalendarEvents[date] || []), event];
      }
    });

    return { todayEvents, allCalendarEvents };
  }

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
          name="messages"
          options={{
            title: "Messages",
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

