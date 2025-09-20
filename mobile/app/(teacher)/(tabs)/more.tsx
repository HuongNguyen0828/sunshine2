// app/(teacher)/(tabs)/more.tsx
import { View, Text, Pressable, Alert } from "react-native";
import { teacherMoreStyles as s } from "@/styles/screens/teacherMore";
import { signOutUser } from "@/lib/auth";
import { router } from "expo-router";

export default function TeacherMore() {
  // Handle logout with confirmation dialog
  const onLogout = () => {
    Alert.alert("Sign out", "Do you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOutUser();
          router.replace("/auth/sign-in");
        },
      },
    ]);
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Settings</Text>

      <Pressable onPress={onLogout} style={s.logoutBtn}>
        <Text style={s.logoutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}
