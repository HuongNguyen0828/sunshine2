// styles/color.ts
const theme = {
  colors: {
    // Modern, sophisticated palette
    primary: "#3b82f6", // Softer blue-500
    primaryDark: "#2563eb", // blue-600
    primaryLight: "#60a5fa", // blue-400
    primaryBg: "#eff6ff", // blue-50

    secondary: "#10b981", // Emerald green
    secondaryDark: "#059669",

    accent: "#8b5cf6", // Purple accent
    accentLight: "#a78bfa",

    warning: "#f59e0b", // Amber
    warningLight: "#fbbf24",
    warningBg: "#fef3c7",

    error: "#ef4444", // Red-500
    errorLight: "#f87171",
    errorBg: "#fee2e2",

    success: "#10b981", // Emerald
    successBg: "#d1fae5",

    // Neutrals
    background: "#ffffff",
    backgroundAlt: "#f8fafc", // slate-50
    text: "#1e293b", // slate-800
    textLight: "#64748b", // slate-500
    textMuted: "#94a3b8", // slate-400

    border: "#e2e8f0", // slate-200
    borderDark: "#cbd5e1", // slate-300

    // Card shadows (for consistent depth)
    shadow: "rgba(15, 23, 42, 0.08)",
    shadowMd: "rgba(15, 23, 42, 0.12)",
    shadowLg: "rgba(15, 23, 42, 0.15)",
  },
  fonts: {
    heading: "'Poppins', system-ui, -apple-system, sans-serif",
    body: "'Inter', system-ui, -apple-system, sans-serif",
  },
  spacing: (factor: number) => `${0.25 * factor}rem`, // 1 = 4px (4, 8, 12, 16, 20, 24, 32)
  borderRadius: {
    sm: "0.375rem", // 6px
    md: "0.5rem",   // 8px
    lg: "0.75rem",  // 12px
    xl: "1rem",     // 16px
  },
};

export default theme;