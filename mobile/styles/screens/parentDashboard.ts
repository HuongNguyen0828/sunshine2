// mobile/styles/screens/parentDashboard.ts
import { StyleSheet } from "react-native";
import { colors } from "@/constants/color";
import { fontSize, fontWeight } from "@/constants/typography";

export const parentDashboardStyles = StyleSheet.create({
  container: {
    // Outer scroll container padding
    padding: 18,
    paddingBottom: 28,
    backgroundColor: colors.background,
  },
  card: {
    // Child card
    backgroundColor: colors.palette.neutral100,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  childName: {
    // Child name text
    fontSize: fontSize.xl,
    lineHeight: 26,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 12,
  },
  pillRow: {
    // Row for pills (wrap to next line)
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});

export const pillStyles = StyleSheet.create({
  container: {
    // Reusable pill container
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.palette.secondary100,
    borderColor: colors.border,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emoji: {
    // Emoji size
    fontSize: fontSize.xxl,
    lineHeight: 26,
  },
  title: {
    // Pill title (e.g., Attendance)
    color: colors.text,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  meta: {
    // Secondary text (detail/time)
    color: colors.textDim,
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontWeight: fontWeight.regular,
  },
  placeholder: {
    // Placeholder pill (no data)
    opacity: 0.35,
  },
});
