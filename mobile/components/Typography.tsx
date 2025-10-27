import React, { ReactNode } from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { colors } from '@/constants/color';

/**
 * AI assitantd: Claude Sonnet 4.5
 * 
 * Prompmt Used:
 * 
 * Context
You are building the foundational layout components for a simple React Native login flow. We're focusing on Papillon's spacing system and visual hierarchy WITHOUT any animations.
Key spacing values from Papillon:
Container padding: 20px
Gap between inputs: 10px
Gap between sections: 12px
Gap between major sections: 20px
Border radius for containers: 42px
Border radius for buttons: 50px
Border radius for inputs: 300px (pill shape)
Key typography from Papillon:
h1: 32px, bold, line-height 34
h5: 18px, semibold, line-height 22
body: 16px, regular, line-height 20
We're using static StyleSheet - no animations.
Task
Create three foundational components with static styling:
Stack.tsx - A flexible layout container
Typography.tsx - A styled text component
Button.tsx - A simple button with static styling  
*/

/**
 * Typography component with predefined text variants following Papillon's design system.
 *
 * @example
 * ```tsx
 * // Page title
 * <Typography variant="h1">Welcome Back</Typography>
 *
 * // Section header
 * <Typography variant="h5">Login Details</Typography>
 *
 * // Body text
 * <Typography variant="body">Enter your credentials</Typography>
 *
 * // Custom color
 * <Typography variant="h5" color="#FF6B6B">
 *   Error Message
 * </Typography>
 *
 * // Custom style override
 * <Typography variant="body" style={{ textAlign: 'center' }}>
 *   Centered text
 * </Typography>
 * ```
 */

interface TypographyProps {
  /** Text variant determining size and weight */
  variant?: 'h1' | 'h5' | 'body';
  /** Text color (overrides theme default) */
  color?: string;
  /** Custom style overrides */
  style?: TextStyle;
  /** Text content */
  children: string | ReactNode;
}

/**
 * Typography component for consistent text styling across the app
 */
export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color,
  style,
  children,
}) => {
  // Get variant style
  const variantStyle = styles[variant];

  // Build color style
  const colorStyle: TextStyle = {
    color: color || colors.text,
  };

  return (
    <Text style={[variantStyle, colorStyle, style]}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  h1: {
    fontSize: 32,
    lineHeight: 34,
    fontWeight: 'bold',
  },
  h5: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '400',
  },
});
