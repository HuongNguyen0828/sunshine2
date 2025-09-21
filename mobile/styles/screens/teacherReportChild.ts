// mobile/styles/screens/teacherReportChild.ts
import { StyleSheet } from "react-native";
import { colors } from "@/constants/color";
import { fontSize, fontWeight } from "@/constants/typography";

export const reportChildStyles = StyleSheet.create({
  safe: {
    // Root wrapper for safe area (top notch / status bar)
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    // Outer scroll container
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
  childRow: {
    // Row for "Child: <name>"
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  childLabel: {
    // "Child:" label
    color: colors.textDim,
    marginRight: 6,
    fontSize: fontSize.sm,
  },
  childName: {
    // Loaded child name
    color: colors.text,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
  },
  actionRow: {
    // Horizontal row for buttons
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  button: {
    // Primary action button
    backgroundColor: colors.tint,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  buttonText: {
    // Button text
    color: colors.palette.neutral100,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
  },
  sectionLabel: {
    // Field section title
    color: colors.text,
    fontWeight: fontWeight.bold,
    marginBottom: 6,
    fontSize: fontSize.md,
  },
  inputRow: {
    // Row with input + save button
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  input: {
    // TextInput field
    flex: 1,
    backgroundColor: colors.palette.neutral100,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    color: colors.text,
    fontSize: fontSize.md,
  },
  backLink: {
    // Back link container
    alignSelf: "center",
    padding: 12,
    marginTop: 18,
  },
  backText: {
    // Back link text
    color: colors.palette.secondary500,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
  },
});
