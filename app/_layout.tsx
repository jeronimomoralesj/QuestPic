/**
 * Root layout — global providers, the auth gate, and the navigation stack.
 *
 * Provider order: gestures → safe area → theme (visual soul) → auth (session) →
 * vault (data, which reacts to the session). The AuthGate redirects between the
 * sign-in screen and the app based on the hydrated session.
 */

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { VaultProvider } from '@/state/VaultProvider';

function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />;
}

/**
 * Redirect based on the auth session once it has hydrated. Signed-out users are
 * pushed to /sign-in; signed-in users on the auth screen are sent into the app.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const onAuthScreen = segments[0] === 'sign-in';
    if (!user && !onAuthScreen) {
      router.replace('/sign-in');
    } else if (user && onAuthScreen) {
      router.replace('/(tabs)');
    }
  }, [user, ready, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <VaultProvider>
              <ThemedStatusBar />
              <AuthGate>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                >
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
                  <Stack.Screen
                    name="item/[id]"
                    options={{ presentation: 'card', animation: 'slide_from_bottom' }}
                  />
                  <Stack.Screen name="list/[id]" options={{ presentation: 'card' }} />
                  <Stack.Screen
                    name="compose"
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                  />
                </Stack>
              </AuthGate>
            </VaultProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
