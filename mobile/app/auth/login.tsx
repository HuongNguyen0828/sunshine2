// Login screen with Firebase auth
// Features: Email/password inputs, loading states, error handling, static styling

// AI assisted reference Claude 4.5 Sonnet
// Prompt Used:
// ### Context

// You are creating the core login screen with Firebase authentication.This screen needs form validation, loading states, error handling, and clean layout with static styling.

// Key features:
// - ** Static header ** with brand color(no keyboard animations)
//   - ** Email and password inputs ** with icons
//   - ** Firebase authentication ** with error handling
//     - ** Loading states ** during authentication
//       - ** Clean spacing ** following Papillon's system
//         - ** Simple back button ** (static, no animations)

// ### Task

// Create a login screen with Firebase authentication and static styling.

// ### Prompt

//   ```
// You are creating the login screen for a React Native app using Expo Router and Firebase Authentication. This is a SIMPLIFIED version with static styling only - NO animations.

// CONTEXT:
// - The app uses Firebase Authentication (already configured)
// - All styling is STATIC (StyleSheet.create)
// - We're using your custom components: Stack, Typography, Button, OnboardingInput
// - Layout uses Papillon's spacing system
// - KeyboardAvoidingView for keyboard handling
// - Simple back button (static, no animations)

// SPACING SYSTEM (FROM PAPILLON):
// - Container padding: 20
// - Gap between inputs: 10
// - Gap between sections: 12
// - Safe area padding: Add to top and sides

// ---

// TASK: Create app/(auth)/login.tsx

// A login screen with Firebase authentication and static styling.

// REQUIREMENTS - LAYOUT:
// - Use KeyboardAvoidingView (behavior="padding") as root container
// - Background: theme.colors.background
// - Safe area insets: Use useSafeAreaInsets from 'react-native-safe-area-context'

// Header section:
// - Stack with padding 20
// - Background color: '#C6C6C6' (light gray, Papillon's credential screen color)
// - Border radius: 42 (bottom corners only using borderBottomLeftRadius, borderBottomRightRadius)
// - paddingTop: insets.top + 20
// - paddingBottom: 40
// - Content: Title "Sign In" (Typography h1, color white)

// Form section:
// - Stack with padding 20
// - Gap: 10 (between inputs)
// - Email input with Mail icon
// - Password input with Lock icon
// - Login button with loading state
// - "Forgot Password?" link (optional, Typography body with primary color)

// Back button:
// - Position: absolute
// - Top: insets.top + 10
// - Left: 20
// - Size: 44x44
// - Background: rgba(255, 255, 255, 0.26) - semi-transparent white
// - Border radius: 22 (circle)
// - Center icon: ArrowLeft (size 24, color white)
// - Simple Pressable (no animations, just opacity feedback)

// ---

// REQUIREMENTS - FORM HANDLING:
// - Use useState for email and password
// - Email input configuration:
//   * keyboardType: 'email-address'
//   * autoCapitalize: 'none'
//   * autoCorrect: false
//   * textContentType: 'emailAddress'
//   * returnKeyType: 'next'
//   * placeholder: 'Email'

// - Password input configuration:
//   * isPassword: true
//   * textContentType: 'password'
//   * returnKeyType: 'done'
//   * placeholder: 'Password'
//   * onSubmitEditing: handleLogin

// - Button configuration:
//   * title: 'Sign In'
//   * loading: isLoading state
//   * disabled: email.length === 0 || password.length === 0
//   * onPress: handleLogin

// ---

// REQUIREMENTS - FIREBASE AUTHENTICATION:

// IMPORTS:
// ```typescript
// import { signInWithEmailAndPassword } from 'firebase/auth';
// import { auth } from '@/config/firebase';
// ```

// LOGIN FUNCTION:
// ```typescript
// const [isLoading, setIsLoading] = useState(false);
// const [email, setEmail] = useState('');
// const [password, setPassword] = useState('');

// const handleLogin = async () => {
//   if (isLoading) return; // Prevent double-submission
//   if (!email || !password) return;

//   setIsLoading(true);
//   try {
//     await signInWithEmailAndPassword(auth, email.trim(), password);
//     // Navigation happens automatically via auth state listener
//     // Or manually: router.replace('/(tabs)');
//   } catch (error: any) {
//     const message = getErrorMessage(error.code);
//     Alert.alert('Login Failed', message);
//   } finally {
//     setIsLoading(false);
//   }
// };

// // Helper function for user-friendly errors
// const getErrorMessage = (code: string): string => {
//   switch (code) {
//     case 'auth/invalid-email':
//       return 'Please enter a valid email address';
//     case 'auth/user-not-found':
//       return 'No account found with this email';
//     case 'auth/wrong-password':
//       return 'Incorrect password';
//     case 'auth/too-many-requests':
//       return 'Too many attempts. Please try again later';
//     case 'auth/network-request-failed':
//       return 'Network error. Check your connection';
//     default:
//       return 'Login failed. Please try again';
//   }
// };
// ```

// ---

// REQUIREMENTS - BACK BUTTON:

// ```typescript
// // Simple back button component (inline in login.tsx)
// const BackButton = () => {
//   const insets = useSafeAreaInsets();

//   return (
//     <Pressable
//       style={({ pressed }) => [
//         styles.backButton,
//         {
//           top: insets.top + 10,
//           opacity: pressed ? 0.7 : 1.0
//         }
//       ]}
//       onPress={() => router.back()}
//     >
//       <ArrowLeft size={24} color="#FFFFFF" />
//     </Pressable>
//   );
// };

// // Styles
// const styles = StyleSheet.create({
//   backButton: {
//     position: 'absolute',
//     left: 20,
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: 'rgba(255, 255, 255, 0.26)',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });
// ```

// ---

// IMPORTS YOU'LL NEED:
// ```typescript
// import React, { useState } from 'react';
// import {
//   View,
//   KeyboardAvoidingView,
//   Platform,
//   StyleSheet,
//   Alert,
//   Pressable,
// } from 'react-native';
// import { router } from 'expo-router';
// import { Mail, Lock, ArrowLeft } from 'lucide-react-native';
// import { signInWithEmailAndPassword } from 'firebase/auth';
// import { auth } from '@/config/firebase';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { useTheme } from '@react-navigation/native';
// import OnboardingInput from '@/components/onboarding/OnboardingInput';
// import Button from '@/components/Button';
// import Typography from '@/components/Typography';
// import Stack from '@/components/Stack';
// ```

// ---

// LAYOUT STRUCTURE:
// ```typescript
//   < KeyboardAvoidingView behavior = { Platform.OS === 'ios' ? 'padding' : 'height' } style = {{ flex: 1 }}>
//     <View style={{ flex: 1, backgroundColor: colors.background }}>
//       {/* Header */}
//       <Stack
//         padding={20}
//         backgroundColor="#C6C6C6"
//         style={{
//           borderBottomLeftRadius: 42,
//           borderBottomRightRadius: 42,
//           paddingTop: insets.top + 20,
//           paddingBottom: 40,
//         }}
//       >
//         <Typography variant="h1" color="#FFFFFF">Sign In</Typography>
//       </Stack>

//       {/* Form */}
//       <Stack padding={20} gap={10}>
//         <OnboardingInput
//           icon={<Mail />}
//           placeholder="Email"
//           text={email}
//           setText={setEmail}
//           inputProps={{ ...}}
//         />
//         <OnboardingInput
//           icon={<Lock />}
//           placeholder="Password"
//           text={password}
//           setText={setPassword}
//           isPassword
//           inputProps={{ ...}}
//         />
//         <Button
//           title="Sign In"
//           loading={isLoading}
//           disabled={!email || !password}
//           onPress={handleLogin}
//         />
//       </Stack>

//       {/* Back Button */}
//       <BackButton />
//     </View>
// </KeyboardAvoidingView >
//   ```

// ---

// DELIVERABLES:
// - app/(auth)/login.tsx with Firebase authentication
// - Static styling using StyleSheet.create
// - Email and password inputs with proper configuration
// - Loading states during authentication
// - User-friendly error handling with Alert
// - Simple back button (static position, opacity feedback only)
// - Form validation (disable button when empty)
// - Auto-submit on Enter key (returnKeyType: 'done', onSubmitEditing)
// - KeyboardAvoidingView for keyboard handling
// - NO animations or complex keyboard transitions
// ```

// ### Expected Output

//   ** login.tsx:**
//     ```typescript
// // Login screen with Firebase auth
// // Features: Email/password inputs, loading states, error handling, static styling
// ```
import React, { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Mail, Lock, ArrowLeft } from 'lucide-react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import OnboardingInput from '@/components/onboarding/OnboardingInput';
import { Button } from '@/components/Button';
import { Typography } from '@/components/Typography';
import { Stack } from '@/components/Stack';

// Helper function for user-friendly errors
const getErrorMessage = (code: string): string => {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection';
    case 'auth/invalid-credential':
      return 'Invalid credentials. Please check your email and password';
    default:
      return 'Login failed. Please try again';
  }
};

// Simple back button component
const BackButton = () => {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.backButton,
        {
          top: insets.top + 10,
          opacity: pressed ? 0.7 : 1.0,
        },
      ]}
      onPress={() => router.back()}
    >
      <ArrowLeft size={24} color="#FFFFFF" />
    </Pressable>
  );
};

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const handleLogin = async () => {
    if (isLoading) return; // Prevent double-submission
    if (!email || !password) return;

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // Navigation happens automatically via auth state listener
      // Or manually: router.replace('/(tabs)');
    } catch (error: any) {
      const message = getErrorMessage(error.code);
      Alert.alert('Login Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <Stack
          padding={20}
          backgroundColor="#C6C6C6"
          style={{
            borderBottomLeftRadius: 42,
            borderBottomRightRadius: 42,
            paddingTop: insets.top + 20,
            paddingBottom: 40,
          }}
        >
          <Typography variant="h1" color="#FFFFFF">
            Sign In
          </Typography>
        </Stack>

        {/* Form */}
        <Stack padding={20} gap={10}>
          <OnboardingInput
            icon={<Mail />}
            placeholder="Email"
            text={email}
            setText={setEmail}
            inputProps={{
              keyboardType: 'email-address',
              autoCapitalize: 'none',
              autoCorrect: false,
              textContentType: 'emailAddress',
              returnKeyType: 'next',
            }}
          />
          <OnboardingInput
            icon={<Lock />}
            placeholder="Password"
            text={password}
            setText={setPassword}
            isPassword
            inputProps={{
              textContentType: 'password',
              returnKeyType: 'done',
              onSubmitEditing: handleLogin,
            }}
          />
          <Button
            title="Sign In"
            loading={isLoading}
            disabled={email.length === 0 || password.length === 0}
            onPress={handleLogin}
          />
        </Stack>

        {/* Back Button */}
        <BackButton />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
