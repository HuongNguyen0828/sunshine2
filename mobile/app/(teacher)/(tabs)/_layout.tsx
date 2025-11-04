import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import RoleGate from "@/navigation/RootNavigator";
import { colors } from "@/constants/color";
import HeaderWithLogo from "@/components/headers/HeaderWithLogo";

/**
 * Teacher tabs layout.
 * - No index tab file.
 * - Dashboard is the initial tab.
 * - RoleGate only allows 'teacher' users.
 */
export default function TeacherTabs() {
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
