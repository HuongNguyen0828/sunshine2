// mobile/styles/screens/parentMore.ts
import { StyleSheet } from "react-native";
import { colors } from "@/constants/color";
import { fontSize, fontWeight } from "@/constants/typography";

export const parentMoreStyles = StyleSheet.create({
  container: {
    // Fill screen and set background
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    // Section title
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.heading,
    marginBottom: 12,
  },
  logoutBtn: {
    // Sign out button
    backgroundColor: colors.tint,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  logoutText: {
    // Sign out button text
    color: colors.palette.neutral100,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
