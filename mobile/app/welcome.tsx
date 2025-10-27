// Welcome screen - First screen users see

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Sun } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/color';

export default function Welcome() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo and Brand */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Sun size={48} color="#FFFFFF" strokeWidth={2} />
          </View>
          <Text style={styles.brandName}>Sunshine</Text>
        </View>

        {/* Headline and Description */}
        <View style={styles.textSection}>
          <Text style={styles.headline}>
            Stay connected with your child's daycare
          </Text>
          <Text style={styles.description}>
            Access real-time updates, photos, messages, and important information all in one place.
          </Text>
        </View>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomSection}>
        {/* Start Button */}
        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            { opacity: pressed ? 0.9 : 1 }
          ]}
          onPress={() => router.push('/auth/sign-in')}
        >
          <Sun size={20} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.startButtonText}>Get Started</Text>
        </Pressable>

        {/* Need Help Link */}
        <Pressable
          onPress={() => {
            // TODO: Open help/support page
            router.push('/auth/sign-in');
          }}
          style={styles.helpButton}
        >
          <Text style={styles.helpText}>Need help?</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.palette.primary500,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  textSection: {
    alignItems: 'center',
    maxWidth: 400,
  },
  headline: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  description: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSection: {
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  startButton: {
    backgroundColor: colors.palette.neutral900,
    borderRadius: 50,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  helpButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  helpText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
});
