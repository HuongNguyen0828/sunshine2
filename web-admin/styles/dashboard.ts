// styles/dashboard.ts
import type React from "react";
import theme from "./color";

export const dash: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: theme.colors.backgroundAlt,
  },
  header: {
    backgroundColor: theme.colors.background,
    borderBottom: `1px solid ${theme.colors.border}`,
    color: theme.colors.text,
    padding: "1rem 2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: `0 1px 3px ${theme.colors.shadow}`,
  },
  headerTitle: {
    margin: 0,
    fontSize: "1.5rem",
    fontFamily: theme.fonts.heading,
    color: theme.colors.text,
    fontWeight: 600,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(4),
  },
  welcome: {
    fontSize: "0.875rem",
    fontFamily: theme.fonts.body,
    color: theme.colors.textLight,
    fontWeight: 500,
  },
  logoutButton: {
    backgroundColor: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.text,
    padding: "0.5rem 1rem",
    borderRadius: theme.borderRadius.md,
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 500,
    transition: "all 0.2s ease",
    fontFamily: theme.fonts.body,
  },
  content: {
    display: "flex",
    minHeight: "calc(100vh - 80px)",
  },
  sidebar: {
    width: 250,
    backgroundColor: theme.colors.background,
    borderRight: `1px solid ${theme.colors.border}`,
    color: theme.colors.text,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    padding: "1rem 0",
  },
  navButton: {
    backgroundColor: "transparent",
    border: "none",
    color: theme.colors.textLight,
    textAlign: "left",
    padding: "0.75rem 1.5rem",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 500,
    transition: "all 0.2s ease",
    fontFamily: theme.fonts.body,
  },
  navButtonActive: {
    backgroundColor: theme.colors.primaryBg,
    color: theme.colors.primary,
    borderLeft: `3px solid ${theme.colors.primary}`,
    fontWeight: 600,
  },
  main: {
    flex: 1,
    padding: "2rem",
    overflowY: "auto",
    backgroundColor: theme.colors.backgroundAlt,
  },
  overview: {
    marginBottom: "2rem",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem",
    marginTop: "1.5rem",
  },
  statCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: "1.5rem",
    boxShadow: `0 1px 3px ${theme.colors.shadow}, 0 1px 2px ${theme.colors.shadowMd}`,
    textAlign: "center",
    border: `1px solid ${theme.colors.border}`,
    transition: "all 0.2s ease",
  },
  statNumber: {
    fontSize: "2.5rem",
    fontWeight: 700,
    margin: "0.5rem 0 0 0",
    color: theme.colors.primary,
    fontFamily: theme.fonts.heading,
  },
};
