/**
 * Sign-in / sign-up — the gateway to the cloud.
 *
 * One editorial screen that toggles between logging in and creating an account.
 * On success, AuthProvider persists the session and the root gate routes into
 * the app. Errors surface inline with the server's message.
 */

import React, { useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { PressableScale } from '@/ui/Pressable';
import { Button, Eyebrow, Spacer } from '@/ui/atoms';
import { haptic } from '@/ui/haptics';
import { useAuth } from '@/auth/AuthProvider';
import { ApiError } from '@/sync/client';
import { usePalette } from '@/theme/ThemeProvider';
import { RADIUS, SPACING } from '@/theme/themes';

type Mode = 'login' | 'register';

export default function SignInScreen() {
  const palette = usePalette();
  const { signIn, signUp, cloudEnabled } = useAuth();
  const [mode, setMode] = useState<Mode>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'register') {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
      await haptic.success();
      // Root gate navigates on the resulting auth state change.
    } catch (e) {
      // ApiError = the server answered with an error (bad password, etc.).
      // Anything else = the request never reached the server (it's down, the URL
      // is wrong, or the device can't reach it).
      const msg = e instanceof ApiError
        ? e.message
        : "Can't reach the server. Make sure the API is running and the URL is reachable from this device.";
      setError(msg);
      await haptic.error();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Eyebrow tone="accent">QuestPic</Eyebrow>
      <Spacer size={SPACING.sm} />
      <Text variant="display">{mode === 'register' ? 'Begin.' : 'Welcome back.'}</Text>
      <Spacer size={SPACING.xs} />
      <Text variant="body" tone="textMuted">
        {mode === 'register'
          ? 'Create an account to sync your quests and share lists with friends.'
          : 'Sign in to pick up where you left off, on any device.'}
      </Text>

      {!cloudEnabled ? (
        <>
          <Spacer size={SPACING.lg} />
          <Text variant="caption" tone="warm">
            No server is configured (EXPO_PUBLIC_API_BASE_URL is empty), so accounts are
            unavailable. The app still works fully offline.
          </Text>
        </>
      ) : null}

      <Spacer size={SPACING.xxl} />

      {mode === 'register' ? (
        <>
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="What should friends call you?"
            autoCapitalize="words"
          />
          <Spacer size={SPACING.lg} />
        </>
      ) : null}

      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Spacer size={SPACING.lg} />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry
        autoCapitalize="none"
      />

      {error ? (
        <>
          <Spacer size={SPACING.lg} />
          <Text variant="caption" tone="warm">
            {error}
          </Text>
        </>
      ) : null}

      <Spacer size={SPACING.xl} />
      {busy ? (
        <View style={{ paddingVertical: SPACING.md, alignItems: 'center' }}>
          <ActivityIndicator color={palette.accent} />
        </View>
      ) : (
        <Button
          label={mode === 'register' ? 'Create account' : 'Sign in'}
          disabled={!cloudEnabled}
          onPress={submit}
          hapticOnPress="press"
        />
      )}

      <Spacer size={SPACING.xl} />
      <PressableScale
        onPress={() => {
          setError(null);
          setMode((m) => (m === 'register' ? 'login' : 'register'));
        }}
        hapticOnPress="select"
      >
        <Text variant="label" tone="textMuted" center>
          {mode === 'register' ? 'Already have an account? ' : 'New here? '}
          <Text variant="label" tone="accent">
            {mode === 'register' ? 'Sign in' : 'Create one'}
          </Text>
        </Text>
      </PressableScale>
    </Screen>
  );
}

function Field({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
}) {
  const palette = usePalette();
  return (
    <View>
      <Eyebrow>{label}</Eyebrow>
      <Spacer size={SPACING.sm} />
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={palette.textFaint}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize}
        autoCorrect={false}
        style={{
          color: palette.text,
          fontSize: 17,
          paddingVertical: SPACING.md,
          paddingHorizontal: SPACING.lg,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.surface,
        }}
      />
    </View>
  );
}
