// styles/color.ts
const theme = {
  colors: {
    primary: "#1e90ff", // sky blue
    secondary: "#4caf50", // green
    warning: "#ff9800", // orange
    error: "#d32f2f",
    background: "#fff",
    text: "#333",
    backgroundAlt: "linear-gradient(to bottom right, #f9f9f9, #e0f7fa)", // Light gradient background
  },
  fonts: {
    heading: "'Poppins', sans-serif",
    body: "'Inter', sans-serif",
  },
  spacing: (factor: number) => `${0.25 * factor}rem`, // 1 = 4px
};

export default theme;