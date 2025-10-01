const palette = {
  // Neutral grays for text, backgrounds, and subtle UI
  neutral100: "#FFFFFF", // white
  neutral200: "#F9F9F9", // light background
  neutral300: "#E6E6E6", // light gray
  neutral400: "#B0B0B0", // medium gray
  neutral500: "#808080", // gray for icons, muted text
  neutral600: "#4D4D4D", // dark gray text
  neutral700: "#333333", // heading text
  neutral800: "#1A1A1A", // almost black
  neutral900: "#000000", // black

  // Sunshine Yellow (Primary theme)
   primary100: "#E6F9F0",
  primary200: "#B3F0D1",
  primary300: "#80E6B3",
  primary400: "#4DDB94",
  primary500: "#2ECC71", // main green
  primary600: "#27AE60", // darker shade for buttons

  // Sky Blue (Secondary)
  secondary100: "#E6F6FC",
  secondary200: "#B3E5F7",
  secondary300: "#80D4F2",
  secondary400: "#4DBFEB",
  secondary500: "#2088b5ff", // main soft sky blue
  secondary600: "#3a97f5ff",
  

  // Coral Accent (Playful pop color)
  accent100: "#FFE8E8",
  accent200: "#FFC6C6",
  accent300: "#FF9F9F",
  accent400: "#FF7A7A",
  accent500: "#FF6B6B", // coral / playful

  // Angry/Error
  angry100: "#FDD6D6",
  angry500: "#D32F2F",

  // Overlays
  overlay20: "rgba(0, 0, 0, 0.2)",
  overlay50: "rgba(0, 0, 0, 0.5)",
} as const

export const colors = {
  /**
   * The palette is available to use, but prefer using the semantic names below.
   */
  palette,

  transparent: "rgba(0, 0, 0, 0)",

  // Text
  text: palette.neutral700,
  heading: palette.primary600,
  textDim: palette.neutral500,


  // ActivityIndicator
  activityIndicator: palette.primary600,


  // Surfaces
  background: palette.primary100,
  border: palette.neutral300,
  separator: palette.neutral300,

  // Tints
  tint: palette.primary600,
  tintInactive: palette.neutral400,

  // Errors
  error: palette.angry500,
  errorBackground: palette.angry100,
} as const