// styles/sharedStyle.ts
import { CSSProperties } from "react";

export const sharedStyles: Record<string, CSSProperties> = {
    form: {
    backgroundColor: "white",
    padding: "1.5rem",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    marginBottom: "2rem",
  },
  input: {
    display: "block",
    width: "100%",
    padding: "0.75rem",
    marginBottom: "1rem",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "1rem",
  },
  button: {
    backgroundColor: "#1e90ff",
    color: "white",
    border: "none",
    padding: "0.75rem 1.5rem",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "1rem",
  },
  list: {
    backgroundColor: "white",
    padding: "1.5rem",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  listItem: {
    padding: "1rem",
    borderBottom: "1px solid #eee",
  },
  addressSection: {
    display: "flex",
    padding: "1.5rem 0",
    gap: "1rem",
  },
  address: {
    display: 'flex',
    gap: "0.5rem"
  },
  dropdown: {
    padding: "0.5rem",
  }
}