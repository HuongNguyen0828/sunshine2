import { StyleSheet } from "react-native";
import { colors } from "@/constants/color";

export const signInStyles = StyleSheet.create({
  // Full page background
  page: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // Grow + space-between keeps the hero at visual bottom on tall screens
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24, // Bottom breathing room so image isn't flush
    justifyContent: "space-between",
  },

  // Header area (push title slightly down from the very top)
  header: {
    marginTop: 28,
    marginBottom: 10,
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: "contain",
    marginBottom: 8,
    marginHorizontal: "auto",
    marginVertical: 20
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    color: colors.heading,
    marginVertical: 10,
    textAlign: "center"
  },


  // Compact form layout
  form: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    gap: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    color: colors.text,
  },

  error: {
    color: colors.error,
  },

  button: {
    backgroundColor: colors.tint,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#cfd7e3",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  linkWrap: {
    alignSelf: "center",
    marginTop: 8,
  },
  linkText: {
    color: "#1e90ff" ,
    textDecorationLine: "underline"
  },

  // Bottom hero image (sits near the bottom with safe spacing)
  heroBottom: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
    borderRadius: 5,
    alignSelf: "center",
    marginBottom: 100, // Not flush with bottom thanks to paddingBottom + this margin
  },
});
