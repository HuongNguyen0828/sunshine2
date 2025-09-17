import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable } from "react-native";
import RoleGate from "@/navigation/RootNavigator";
import ParentHeaderTitle from "@/components/ParentHeaderTitle";
import { signOutUser } from "@/lib/auth";
import { router } from "expo-router";
import { colors } from "@/constants/color";

export default function ParentTabs() {
  return (
    <RoleGate allow={["parent"]}>
      <Tabs
        screenOptions={{
          headerTitle: () => <ParentHeaderTitle />,
          headerShadowVisible: false,
          tabBarActiveTintColor: colors.tint,
          headerRight: () => (
            <Pressable
              onPress={async () => {
                await signOutUser();
                router.replace("/auth/sign-in");
              }}
              style={{ paddingHorizontal: 12 }}
            >
              <Ionicons name="log-out-outline" size={22} color="#111827" />
            </Pressable>
          ),
        }}
      >
        <Tabs.Screen name="dashboard" options={{ title: "Dashboard", tabBarIcon: p => <Ionicons name="home-outline" {...p} /> }} />
        <Tabs.Screen name="messages"  options={{ title: "Messages",  tabBarIcon: p => <Ionicons name="chatbubble-ellipses-outline" {...p} /> }} />
        <Tabs.Screen name="reports"   options={{ title: "Reports",   tabBarIcon: p => <Ionicons name="document-text-outline" {...p} /> }} />
        <Tabs.Screen name="calendar"  options={{ title: "Calendar",  tabBarIcon: p => <Ionicons name="calendar-outline" {...p} /> }} />
        <Tabs.Screen name="more"      options={{ title: "More",      tabBarIcon: p => <Ionicons name="ellipsis-horizontal-circle-outline" {...p} /> }} />
      </Tabs>
    </RoleGate>
  );
}
