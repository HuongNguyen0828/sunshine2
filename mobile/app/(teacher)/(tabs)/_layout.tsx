// app/(teacher)/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import RoleGate from "@/navigation/RootNavigator";

export default function TeacherTabs() {
  return (
    <RoleGate allow={["teacher"]}>
      <Tabs
        screenOptions={{
          headerTitle: "Teacher",
          headerShadowVisible: false,
          tabBarActiveTintColor: "#1e90ff",
          // Removed headerRight sign-out button
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            headerTitle: "Teacher Dashboard",
            tabBarIcon: (p) => <Ionicons name="home-outline" {...p} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: "Messages",
            headerTitle: "Messages",
            tabBarIcon: (p) => (
              <Ionicons name="chatbubble-ellipses-outline" {...p} />
            ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: "Reports",
            headerTitle: "Reports",
            tabBarIcon: (p) => (
              <Ionicons name="document-text-outline" {...p} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Calendar",
            headerTitle: "Calendar",
            tabBarIcon: (p) => <Ionicons name="calendar-outline" {...p} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "More",
            headerTitle: "More",
            tabBarIcon: (p) => (
              <Ionicons
                name="ellipsis-horizontal-circle-outline"
                {...p}
              />
            ),
          }}
        />
      </Tabs>
    </RoleGate>
  );
}
