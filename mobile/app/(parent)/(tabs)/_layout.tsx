// app/(parent)/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import RoleGate from "@/navigation/RootNavigator";
import { colors } from "@/constants/color";
import HeaderWithLogo from "@/components/headers/HeaderWithLogo";

export default function ParentTabs() {
  return (
    <RoleGate allow={["parent"]}>
      <Tabs
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
        <Tabs.Screen name="dashboard" options={{ title: "Parent Dashboard", tabBarIcon: p => <Ionicons name="home-outline" {...p} /> }} />
        <Tabs.Screen name="messages"  options={{ title: "Messages",          tabBarIcon: p => <Ionicons name="chatbubble-ellipses-outline" {...p} /> }} />
        <Tabs.Screen name="reports"   options={{ title: "Reports",           tabBarIcon: p => <Ionicons name="document-text-outline" {...p} /> }} />
        <Tabs.Screen name="calendar"  options={{ title: "Calendar",          tabBarIcon: p => <Ionicons name="calendar-outline" {...p} /> }} />
        <Tabs.Screen name="more"      options={{ title: "More",              tabBarIcon: p => <Ionicons name="ellipsis-horizontal-circle-outline" {...p} /> }} />
      </Tabs>
    </RoleGate>
  );
}
