// mobile/styles/screens/teacherReports.ts
import { StyleSheet } from "react-native";
import { colors } from "@/constants/color";
import { fontSize, fontWeight } from "@/constants/typography";

export const teacherReportsStyles = StyleSheet.create({
  container: {
    // Outer scroll container padding and background
    padding: 16,
    paddingBottom: 24,
    backgroundColor: colors.background,
  },
  title: {
    // Screen title
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.heading,
    marginBottom: 8,
  },
  group: {
    // Wrapper for each classroom group
    marginBottom: 16,
  },
  groupHeader: {
    // Classroom header bar
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: colors.separator,
    backgroundColor: colors.palette.secondary100,
    borderRadius: 8,
  },
  groupHeaderText: {
    // Classroom header text
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textDim,
  },
  card: {
    // Child card button
    backgroundColor: colors.palette.neutral100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    shadowColor: colors.palette.neutral900,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  row: {
    // Row inside card
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    // Child name text
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  classBadge: {
    // Placeholder for right-side small text (kept empty by design)
    fontSize: fontSize.ss,
    color: colors.textDim,
  },
  loadingWrap: {
    // Full-screen loader container
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    // Loading text under spinner
    marginTop: 8,
    color: colors.textDim,
    fontSize: fontSize.md,
  },
  emptyWrap: {
    // Empty state wrapper
    alignItems: "center",
    marginTop: 24,
  },
  emptyText: {
    // Empty state text
    color: colors.textDim,
    fontSize: fontSize.md,
  },
});
