import { Stack } from "expo-router";
import { AppProvider } from "@/contexts/AppContext"; // Sharing data in the context

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProvider>
  );
}