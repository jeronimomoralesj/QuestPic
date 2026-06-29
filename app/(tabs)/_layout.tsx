/**
 * The tab shell with a fully custom, editorial floating tab bar.
 *
 * No stock icons or chrome: each tab is a glyph + an animated label, and the
 * active tab is marked by a single accent dot and a hairline-free filled pill.
 * The bar floats above a translucent surface and respects the bottom safe area.
 */

import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '@/ui/Pressable';
import { Text } from '@/ui/Text';
import { usePalette } from '@/theme/ThemeProvider';
import { RADIUS, SPACING } from '@/theme/themes';

const TABS: Record<string, { glyph: string; label: string }> = {
  index: { glyph: '◇', label: 'Vault' },
  spark: { glyph: '✦', label: 'Spark' },
  registry: { glyph: '⊚', label: 'Registry' },
  profile: { glyph: '☾', label: 'You' },
};

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        left: SPACING.lg,
        right: SPACING.lg,
        bottom: insets.bottom + SPACING.sm,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: palette.surface,
          borderRadius: RADIUS.pill,
          borderWidth: 1,
          borderColor: palette.border,
          paddingVertical: SPACING.sm,
          paddingHorizontal: SPACING.sm,
        }}
      >
        {state.routes.map((route, index) => {
          const meta = TABS[route.name] ?? { glyph: '·', label: route.name };
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <PressableScale
              key={route.key}
              onPress={onPress}
              hapticOnPress="select"
              scaleTo={0.9}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: SPACING.sm,
                  borderRadius: RADIUS.pill,
                  backgroundColor: focused ? palette.surfaceAlt : 'transparent',
                  gap: 2,
                }}
              >
                <Text
                  variant="heading"
                  color={focused ? palette.accent : palette.textFaint}
                >
                  {meta.glyph}
                </Text>
                <Text
                  variant="caption"
                  color={focused ? palette.text : palette.textFaint}
                  style={{ fontSize: 10, letterSpacing: 0.5 }}
                >
                  {meta.label}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="spark" />
      <Tabs.Screen name="registry" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
