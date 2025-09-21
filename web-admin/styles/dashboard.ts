// styles/dashboard.ts
import type React from "react";
import theme from "./color";

export const dash: Record<string, React.CSSProperties> = {
  container: { minHeight: "100vh", background: theme.colors.backgroundAlt as unknown as string },
  header: {
    backgroundColor: theme.colors.primary,
    color: "white",
    padding: "1rem 2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { margin: 0, fontSize: "1.5rem", fontFamily: theme.fonts.heading },
  headerActions: { display: "flex", alignItems: "center", gap: theme.spacing(4) },
  welcome: { fontSize: "1rem", fontFamily: theme.fonts.body },
  logoutButton: {
    backgroundColor: "transparent",
    border: "1px solid white",
    color: "white",
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    cursor: "pointer",
  },
  content: { display: "flex", minHeight: "calc(100vh - 80px)" },
  sidebar: { width: 250, backgroundColor: "#2c3e50", color: "white" },
  nav: { display: "flex", flexDirection: "column", padding: "1rem 0" },
  navButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "white",
    textAlign: "left",
    padding: "1rem 2rem",
    cursor: "pointer",
    fontSize: "1rem",
  },
  navButtonActive: { backgroundColor: theme.colors.primary },
  main: { flex: 1, padding: "2rem", overflowY: "auto" },
  overview: { marginBottom: "2rem" },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
    marginTop: "1rem",
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "1.5rem",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  statNumber: {
    fontSize: "2rem",
    fontWeight: "bold",
    margin: "0.5rem 0 0 0",
    color: theme.colors.primary,
  },
};
