// Registration screen with Firebase auth
// Matching Papillon's design without animations

import { useState, useMemo } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  Text,
} from 'react-native';
import { router, Link } from 'expo-router';
import { Mail, Lock, User } from 'lucide-react-native';
import { registerWithPassword } from '@/lib/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingInput from '@/components/onboarding/OnboardingInput';
import { Button } from '@/components/Button';
import { Typography } from '@/components/Typography';
import { Stack } from '@/components/Stack';
import { colors } from '@/constants/color';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const insets = useSafeAreaInsets();

  // Form validation
  const isValid = useMemo(() => {
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const okName = name.trim().length >= 2;
    const okPassword = password.length >= 6 && password === confirmPassword;
    return okEmail && okName && okPassword && agreedToTerms;
  }, [name, email, password, confirmPassword, agreedToTerms]);

  const handleRegister = async () => {
    if (isLoading) return; // Prevent double-submission
    if (!isValid) return;

    setIsLoading(true);
    try {
      // Register (precheck + auth + completeRegistration)
      const user = await registerWithPassword(name.trim(), email.trim(), password);

      // Read role from custom claims and navigate
      const token = await user.getIdTokenResult(true);
      const role = token.claims?.role as string | undefined;

      // Route based on role
      if (role === 'teacher') {
        router.replace('/(teacher)/(tabs)/dashboard');
      } else if (role === 'parent') {
        router.replace('/(parent)/(tabs)/dashboard');
      } else {
        router.replace('/');
      }
    } catch (error: any) {
      const message = error.message || 'Registration failed. Please try again';
      Alert.alert('Registration Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, backgroundColor: colors.palette.neutral200 }}>
        {/* Header */}
        <Stack
          padding={20}
          backgroundColor={colors.palette.primary500}
          style={{
            borderBottomLeftRadius: 42,
            borderBottomRightRadius: 42,
            paddingTop: insets.top + 20,
            paddingBottom: 40,
          }}
        >
          <Typography variant="h1" color="#FFFFFF">
            Get Started
          </Typography>
        </Stack>

        {/* Form */}
        <Stack padding={20} gap={12} style={{ marginTop: 20 }}>
          <OnboardingInput
            icon={<User />}
            placeholder="Full name"
            text={name}
            setText={setName}
            inputProps={{
              autoCapitalize: 'words',
              autoCorrect: false,
              textContentType: 'name',
              returnKeyType: 'next',
            }}
          />
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
              textContentType: 'newPassword',
              returnKeyType: 'next',
            }}
          />
          <OnboardingInput
            icon={<Lock />}
            placeholder="Confirm password"
            text={confirmPassword}
            setText={setConfirmPassword}
            isPassword
            inputProps={{
              textContentType: 'password',
              returnKeyType: 'done',
              onSubmitEditing: handleRegister,
            }}
          />

          {/* Terms & Privacy Checkbox */}
          <Pressable
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 16,
              gap: 12,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: agreedToTerms
                  ? colors.palette.primary500
                  : colors.palette.neutral400,
                backgroundColor: agreedToTerms
                  ? colors.palette.primary500
                  : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {agreedToTerms && (
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>
                  ✓
                </Text>
              )}
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: 14,
                color: colors.palette.neutral600,
                lineHeight: 20,
              }}
            >
              I agree to the{' '}
              <Text style={{ color: colors.palette.primary600, fontWeight: '600' }}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text style={{ color: colors.palette.primary600, fontWeight: '600' }}>
                Privacy Policy
              </Text>
            </Text>
          </Pressable>

          <Button
            title="Create Account"
            loading={isLoading}
            disabled={!isValid}
            onPress={handleRegister}
            style={{ marginTop: 8 }}
          />

          {/* Link to Sign In */}
          <Link href="/auth/sign-in" asChild>
            <Pressable style={{ alignItems: 'center', marginTop: 16 }}>
              <Text style={{ fontSize: 16, color: colors.palette.neutral600 }}>
                Already have an account?{' '}
                <Text style={{ color: colors.palette.primary600, fontWeight: '600' }}>
                  Sign in
                </Text>
              </Text>
            </Pressable>
          </Link>
        </Stack>
      </View>
    </KeyboardAvoidingView>
  );
}
