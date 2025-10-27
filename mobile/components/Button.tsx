import React from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle, StyleSheet } from 'react-native';
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
 * A simple button component with static styling and opacity feedback.
 *
 * @example
 * ```tsx
 * // Primary button (colored background)
 * <Button
 *   title="Login"
 *   onPress={handleLogin}
 * />
 *
 * // Ghost button (transparent background)
 * <Button
 *   title="Cancel"
 *   variant="ghost"
 *   onPress={handleCancel}
 * />
 *
 * // Loading state
 * <Button
 *   title="Logging in..."
 *   loading={true}
 *   onPress={handleLogin}
 * />
 *
 * // Disabled state
 * <Button
 *   title="Submit"
 *   disabled={!isValid}
 *   onPress={handleSubmit}
 * />
 * ```
 */

interface ButtonProps {
  /** Button text */
  title: string;
  /** Press handler */
  onPress: () => void;
  /** Visual variant */
  variant?: 'primary' | 'ghost';
  /** Show loading indicator */
  loading?: boolean;
  /** Disable button interactions */
  disabled?: boolean;
  /** Custom style overrides */
  style?: ViewStyle;
}

/**
 * Button component with simple press feedback
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) => {
  // Determine colors based on variant
  const isPrimary = variant === 'primary';
  const backgroundColor = isPrimary ? colors.palette.primary500 : 'transparent';
  const textColor = isPrimary ? '#FFFFFF' : colors.palette.primary500;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1.0,
        },
        style,
      ]}
    >
      {loading && (
        <ActivityIndicator color={textColor} />
      )}
      <Text
        style={[
          styles.text,
          { color: textColor },
          loading && styles.textHidden,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  textHidden: {
    opacity: 0,
    position: 'absolute',
  },
});
