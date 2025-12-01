// mobile/app/(parent)/(tabs)/_layout.tsx
import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import RoleGate from "@/navigation/RootNavigator";
import { colors } from "@/constants/color";
import HeaderWithLogo from "@/components/headers/HeaderWithLogo";
import { registerForPushNotificationsAsync } from "@/lib/registerPushNotifications";

/**
 * Parent tabs layout.
 * - Wraps all parent tabs with RoleGate so only "parent" users can access.
 * - Dashboard is the initial tab.
 * - Also registers for push notifications when the parent tab layout mounts.
 */
export default function ParentTabs() {
  useEffect(() => {
    const setupPush = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          console.log("Expo push token (parent):", token);
          // Later: send this token to backend / Firestore and attach to parent user doc.
        } else {
          console.log("Push permission not granted or device not supported.");
        }
      } catch (err) {
        console.log("Error registering for push notifications:", err);
      }
    };

    setupPush();
  }, []);

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
            tabBarIcon: (props) => <Ionicons name="home-outline" {...props} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: "Messages",
            tabBarIcon: (props) => (
              <Ionicons name="chatbubble-ellipses-outline" {...props} />
            ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: "Reports",
            tabBarIcon: (props) => (
              <Ionicons name="document-text-outline" {...props} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Calendar",
            headerShown: false,
            tabBarIcon: (props) => (
              <Ionicons name="calendar-outline" {...props} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "More",
            headerShown: false,
            tabBarIcon: (props) => (
              <Ionicons
                name="ellipsis-horizontal-circle-outline"
                {...props}
              />
            ),
          }}
        />
      </Tabs>
    </RoleGate>
  );
}
