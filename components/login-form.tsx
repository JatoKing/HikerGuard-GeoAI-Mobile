/**
 * components/login-form.tsx
 *
 * Reusable login form UI — NOT an expo-router route.
 * Rendered inside the animated bottom-sheet overlay in app/index.tsx.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  accent: '#4ADE80',
  textPrimary: '#0F1B2E',
  textMuted: 'rgba(15, 27, 46, 0.55)',
  fieldBg: 'rgba(15, 27, 46, 0.035)',
  fieldBorder: 'rgba(15, 27, 46, 0.12)',
  fieldBorderFocused: '#4ADE80',
};

/* -------------------------------------------------------------------------- */
/* Labeled text input                                                        */
/* -------------------------------------------------------------------------- */
function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  secure = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address';
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(15,27,46,0.35)"
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize="none"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.field,
          { borderColor: focused ? COLORS.fieldBorderFocused : COLORS.fieldBorder },
        ]}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Social login button                                                       */
/* -------------------------------------------------------------------------- */
function SocialButton({ provider, onPress }: { provider: 'google' | 'apple'; onPress: () => void }) {
  const isGoogle = provider === 'google';
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.socialButton, pressed && styles.pressedDim]}
    >
      <Ionicons
        name={isGoogle ? 'logo-google' : 'logo-apple'}
        size={18}
        color={COLORS.textPrimary}
        style={{ marginRight: 8 }}
      />
      <Text style={styles.socialButtonText}>
        Continue with {isGoogle ? 'Google' : 'Apple'}
      </Text>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/* Login submit button                                                       */
/* -------------------------------------------------------------------------- */
function LoginSubmitButton({ onPress }: { onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.loginButton, pressed && styles.pressedDim]}
    >
      <Ionicons name="log-in-outline" size={20} color="#0B1524" style={{ marginRight: 8 }} />
      <Text style={styles.loginButtonText}>Login</Text>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/* Main exported form                                                         */
/* -------------------------------------------------------------------------- */
export default function LoginForm({
  onClose,
  onSubmit,
  onSocialLogin,
}: {
  onClose: () => void;
  onSubmit: () => void;
  onSocialLogin: (provider: 'google' | 'apple') => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <Pressable onPress={onClose} style={styles.backButton} hitSlop={12}>
        <Ionicons name="chevron-down" size={24} color={COLORS.textPrimary} />
      </Pressable>

      <View style={styles.headerBlock}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to sync your trail data and alerts.</Text>
      </View>

      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
      />
      <FormField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secure
      />

      <Pressable style={{ alignSelf: 'flex-end', marginBottom: 24 }}>
        <Text style={styles.forgotText}>Forgot password?</Text>
      </Pressable>

      <LoginSubmitButton onPress={onSubmit} />

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialRow}>
        <SocialButton provider="google" onPress={() => onSocialLogin('google')} />
        <SocialButton provider="apple" onPress={() => onSocialLogin('apple')} />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Dont have an account? </Text>
        <Pressable>
          <Text style={styles.footerLink}>Sign up</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  pressedDim: {
    opacity: 0.85,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,27,46,0.05)',
    marginBottom: 24,
  },
  headerBlock: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  field: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.fieldBg,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22C55E',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  loginButtonText: {
    color: '#0B1524',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(15,27,46,0.1)',
  },
  dividerText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginHorizontal: 12,
  },
  socialRow: {
    gap: 12,
    marginBottom: 32,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,27,46,0.12)',
    backgroundColor: 'rgba(15,27,46,0.02)',
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#22C55E',
  },
});