import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleSheet, FlexAlignType } from 'react-native';
import { useTheme } from '@react-navigation/native';
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
 * A flexible layout container using flexbox for building layouts with consistent spacing.
 *
 * @example
 * ```tsx
 * // Vertical stack with gap
 * <Stack gap={20} padding={20}>
 *   <Text>Item 1</Text>
 *   <Text>Item 2</Text>
 * </Stack>
 *
 * // Horizontal stack
 * <Stack direction="row" gap={10} alignItems="center">
 *   <Icon />
 *   <Text>Label</Text>
 * </Stack>
 *
 * // Custom background
 * <Stack backgroundColor="#f5f5f5" padding={20}>
 *   <Text>Content</Text>
 * </Stack>
 * ```
 */

type FlexJustifyContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

interface StackProps {
  /** Layout direction - 'row' for horizontal, 'column' for vertical */
  direction?: 'row' | 'column';
  /** Spacing between child elements */
  gap?: number;
  /** Padding inside the container */
  padding?: number;
  /** Background color (optional) */
  backgroundColor?: string;
  /** Alignment of children along the cross axis */
  alignItems?: FlexAlignType;
  /** Alignment of children along the main axis */
  justifyContent?: FlexJustifyContent;
  /** Custom style overrides */
  style?: ViewStyle;
  /** Child elements */
  children: ReactNode;
}

/**
 * Stack component for flexible layouts with consistent spacing
 */
export const Stack: React.FC<StackProps> = ({
  direction = 'column',
  gap,
  padding,
  backgroundColor,
  alignItems,
  justifyContent,
  style,
  children,
}) => {
  const theme = useTheme();

  // Build dynamic style from props
  const dynamicStyle: ViewStyle = {
    flexDirection: direction,
    ...(gap !== undefined && { gap }),
    ...(padding !== undefined && { padding }),
    ...(backgroundColor !== undefined && { backgroundColor }),
    ...(alignItems !== undefined && { alignItems }),
    ...(justifyContent !== undefined && { justifyContent }),
  };

  return (
    <View style={[styles.container, dynamicStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
  },
});
