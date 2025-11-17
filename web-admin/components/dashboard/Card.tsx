// components/dashboard/Card.tsx
import React from "react";
import theme from "@/styles/color";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = "", hover = true }) => {
  const baseStyle: React.CSSProperties = {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: "1.5rem",
    boxShadow: `0 1px 3px ${theme.colors.shadow}, 0 1px 2px ${theme.colors.shadowMd}`,
    border: `1px solid ${theme.colors.border}`,
    transition: "all 0.2s ease",
  };

  const hoverStyle: React.CSSProperties = hover
    ? {
        cursor: "pointer",
      }
    : {};

  return (
    <div
      className={`card ${className}`}
      style={{ ...baseStyle, ...hoverStyle }}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = `0 4px 6px ${theme.colors.shadowMd}, 0 2px 4px ${theme.colors.shadow}`;
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = `0 1px 3px ${theme.colors.shadow}, 0 1px 2px ${theme.colors.shadowMd}`;
        }
      }}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action }) => {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "1rem",
    }}>
      <div>
        <h3 style={{
          margin: 0,
          fontSize: "1.125rem",
          fontWeight: 600,
          color: theme.colors.text,
          fontFamily: theme.fonts.heading,
        }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{
            margin: "0.25rem 0 0 0",
            fontSize: "0.875rem",
            color: theme.colors.textLight,
            fontFamily: theme.fonts.body,
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

interface CardContentProps {
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ children }) => {
  return (
    <div style={{
      fontSize: "0.875rem",
      color: theme.colors.textLight,
      fontFamily: theme.fonts.body,
    }}>
      {children}
    </div>
  );
};

interface CardActionsProps {
  children: React.ReactNode;
}

export const CardActions: React.FC<CardActionsProps> = ({ children }) => {
  return (
    <div style={{
      display: "flex",
      gap: "0.75rem",
      marginTop: "1rem",
      paddingTop: "1rem",
      borderTop: `1px solid ${theme.colors.border}`,
    }}>
      {children}
    </div>
  );
};

// Button component for cards
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "secondary",
  size = "sm",
  disabled = false,
}) => {
  const variants = {
    primary: {
      backgroundColor: theme.colors.primary,
      color: "#ffffff",
      border: "none",
      hoverBg: theme.colors.primaryDark,
    },
    secondary: {
      backgroundColor: theme.colors.background,
      color: theme.colors.textLight,
      border: `1px solid ${theme.colors.border}`,
      hoverBg: theme.colors.backgroundAlt,
    },
    danger: {
      backgroundColor: theme.colors.background,
      color: theme.colors.error,
      border: `1px solid ${theme.colors.error}`,
      hoverBg: theme.colors.errorBg,
    },
    ghost: {
      backgroundColor: "transparent",
      color: theme.colors.textLight,
      border: "none",
      hoverBg: theme.colors.backgroundAlt,
    },
  };

  const sizes = {
    sm: {
      padding: "0.5rem 0.75rem",
      fontSize: "0.8125rem",
    },
    md: {
      padding: "0.625rem 1rem",
      fontSize: "0.875rem",
    },
  };

  const variantStyle = variants[variant];
  const sizeStyle = sizes[size];

  const baseStyle: React.CSSProperties = {
    ...sizeStyle,
    backgroundColor: disabled ? theme.colors.backgroundAlt : variantStyle.backgroundColor,
    color: disabled ? theme.colors.textMuted : variantStyle.color,
    border: variantStyle.border,
    borderRadius: theme.borderRadius.md,
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 500,
    fontFamily: theme.fonts.body,
    transition: "all 0.2s ease",
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = variantStyle.hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = variantStyle.backgroundColor;
        }
      }}
    >
      {children}
    </button>
  );
};

// Badge component for status
interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "error" | "info" | "default";
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "default" }) => {
  const variants = {
    success: {
      backgroundColor: theme.colors.successBg,
      color: theme.colors.success,
    },
    warning: {
      backgroundColor: theme.colors.warningBg,
      color: theme.colors.warning,
    },
    error: {
      backgroundColor: theme.colors.errorBg,
      color: theme.colors.error,
    },
    info: {
      backgroundColor: theme.colors.primaryBg,
      color: theme.colors.primary,
    },
    default: {
      backgroundColor: theme.colors.backgroundAlt,
      color: theme.colors.textLight,
    },
  };

  const variantStyle = variants[variant];

  return (
    <span style={{
      ...variantStyle,
      display: "inline-block",
      padding: "0.25rem 0.625rem",
      borderRadius: theme.borderRadius.sm,
      fontSize: "0.75rem",
      fontWeight: 600,
      fontFamily: theme.fonts.body,
      textTransform: "uppercase",
      letterSpacing: "0.025em",
    }}>
      {children}
    </span>
  );
};
