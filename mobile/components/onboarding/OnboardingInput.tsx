// Pill-shaped input with icon support
// Usage: <OnboardingInput icon={<Mail />} text={email} setText={setEmail} />

// Reference: Claude Sonnet 4.5
// Prompt used
// ### Context

// You are creating a custom text input that matches Papillon's design aesthetic with static styling only. No animations, just clean spacing and theme-aware colors.

// Key design specifications from Papillon:
// - ** Border radius:** 300(pill shape)
//   - ** Minimum height:** 58px
//     - ** Icon size:** 24px
//       - ** Icon container:** 48x48px
//         - ** Input padding(iOS):** 18 vertical, 20 horizontal
//           - ** Input padding(Android):** 14 vertical, 20 horizontal
//             - ** Font size:** 19px
//               - ** Font weight:** 600(semibold)

// Color system(using hex opacity):
// - ** Icon color:** text + 'B3'(70 % opacity)
//   - ** Text color:** text + 'AF'(68 % opacity)
//     - ** Placeholder color:** text + '7F'(50 % opacity)
//       - ** Background(dark mode):** text + '15'(15 % opacity)
//         - ** Background(light mode):** text + '08'(8 % opacity)

// ### Task

// Create a custom input component with icon support and theme - aware styling.

// ### Prompt

//   ```
// You are creating a custom text input component for a React Native login flow with static styling inspired by Papillon's design. NO animations - just clean layout and theme-aware colors.

// CONTEXT:
// - The app uses React Navigation's theme system (light/dark mode)
// - Design: Modern iOS aesthetic with pill-shaped inputs
// - Icons are passed as JSX elements from lucide-react-native
// - All styling is STATIC (use StyleSheet.create)

// EXACT SPECIFICATIONS FROM PAPILLON:
// - Border radius: 300 (pill shape)
// - Minimum height: 58
// - Icon size: 24x24
// - Icon container: 48x48 (centered)
// - Gap between icon and input: 8
// - Input padding (iOS): paddingVertical 18, paddingHorizontal 20
// - Input padding (Android): paddingVertical 14, paddingHorizontal 20
// - Font size: 19
// - Font weight: '600' (semibold)

// COLOR SYSTEM (use hex opacity codes):
// - Icon color: theme.colors.text + 'B3' (70% opacity)
// - Input text color: theme.colors.text + 'AF' (68% opacity)
// - Placeholder color: theme.colors.text + '7F' (50% opacity)
// - Background (dark mode): theme.colors.text + '15' (15% opacity)
// - Background (light mode): theme.colors.text + '08' (8% opacity)

// HEX OPACITY REFERENCE:
// - 100%: FF
// - 70%: B3
// - 68%: AF
// - 50%: 7F
// - 15%: 15
// - 8%: 08

// ---

// TASK: Create components/onboarding/OnboardingInput.tsx

// A custom pill-shaped input with icon support.

// REQUIREMENTS:
// - Use React Native's TextInput component
// - Use StyleSheet.create for all styles
// - Use React Navigation's useTheme() for colors
// - Use useColorScheme() from 'react-native' to detect dark mode
// - Support these props:
//   * icon: JSX.Element (e.g., <Mail size={24} />)
//   * placeholder: string
//   * text: string (controlled input)
//   * setText: (text: string) => void
//   * isPassword: boolean (default: false)
//   * inputProps: TextInputProps (pass-through props like keyboardType)

// LAYOUT:
// - Container: flexDirection 'row', alignItems 'center'
// - Icon container: 48x48, center icon with alignItems/justifyContent 'center'
// - Input: flex 1 (takes remaining space)
// - Gap between icon and input: 8

// STYLING:
// - Container styles:
//   * borderRadius: 300
//   * minHeight: 58
//   * backgroundColor: theme-aware (see color system above)
//   * flexDirection: 'row'
//   * alignItems: 'center'
//   * paddingHorizontal: 8

// - Icon container styles:
//   * width: 48
//   * height: 48
//   * alignItems: 'center'
//   * justifyContent: 'center'

// - TextInput styles:
//   * flex: 1
//   * fontSize: 19
//   * fontWeight: '600'
//   * color: theme.colors.text + 'AF'
//   * paddingVertical: Platform.OS === 'ios' ? 18 : 14
//   * paddingHorizontal: 20

// TEXTINPUT CONFIGURATION:
// - placeholderTextColor: theme.colors.text + '7F'
// - autoCapitalize: 'none'
// - autoCorrect: false
// - secureTextEntry: isPassword
// - value: text
// - onChangeText: setText
// - Spread inputProps for additional configuration

// IMPLEMENTATION NOTES:
// - Clone icon element and add color prop:
//   ```typescript
// import React, { cloneElement } from 'react';

// const coloredIcon = cloneElement(icon, {
//   color: theme.colors.text + 'B3',
//   size: 24,
// });
// ```
// - Use Platform.select or Platform.OS for platform-specific padding
// - Create separate StyleSheet objects for better organization

// IMPORTS YOU'LL NEED:
// ```typescript
// import React, { cloneElement } from 'react';
// import {
//   TextInput,
//   View,
//   Platform,
//   TextInputProps,
//   StyleSheet,
//   useColorScheme,
// } from 'react-native';
// import { useTheme } from '@react-navigation/native';
// ```

// USAGE EXAMPLE:
// ```typescript
// import { Mail } from 'lucide-react-native';

// <OnboardingInput
//   icon={<Mail />}
//   placeholder="Email"
//   text={email}
//   setText={setEmail}
//   inputProps={{
//     keyboardType: 'email-address',
//     autoCapitalize: 'none',
//   }}
// />
// ```

// DELIVERABLES:
// - components/onboarding/OnboardingInput.tsx
// - Static styling with StyleSheet.create
// - Theme-aware colors with hex opacity
// - Platform-specific padding
// - Icon support with proper sizing/coloring
// - Password masking support
// - Full TypeScript typing
// - NO animations
// ```

// ### Expected Output

//   ** OnboardingInput.tsx:**
//     ```typescript
// // Pill-shaped input with icon support
// // Usage: <OnboardingInput icon={<Mail />} text={email} setText={setEmail} />
import React, { cloneElement } from 'react';
import {
  TextInput,
  View,
  Platform,
  TextInputProps,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useTheme } from '@react-navigation/native';

interface OnboardingInputProps {
  icon: JSX.Element;
  placeholder: string;
  text: string;
  setText: (text: string) => void;
  isPassword?: boolean;
  inputProps?: Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'secureTextEntry'>;
}

export default function OnboardingInput({
  icon,
  placeholder,
  text,
  setText,
  isPassword = false,
  inputProps,
}: OnboardingInputProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();

  // Color system with hex opacity codes
  const iconColor = theme.colors.text + 'B3'; // 70% opacity
  const textColor = theme.colors.text + 'AF'; // 68% opacity
  const placeholderColor = theme.colors.text + '7F'; // 50% opacity
  const backgroundColor = colorScheme === 'dark'
    ? theme.colors.text + '15' // 15% opacity
    : theme.colors.text + '08'; // 8% opacity

  // Clone icon with proper color and size
  const coloredIcon = cloneElement(icon, {
    color: iconColor,
    size: 24,
  });

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.iconContainer}>
        {coloredIcon}
      </View>
      <TextInput
        style={[styles.input, { color: textColor }]}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={isPassword}
        value={text}
        onChangeText={setText}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 300,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 19,
    fontWeight: '600',
    paddingVertical: Platform.OS === 'ios' ? 18 : 14,
    paddingHorizontal: 20,
  },
});
