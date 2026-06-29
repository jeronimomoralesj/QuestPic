/**
 * Screen — the editorial canvas wrapper.
 *
 * Applies the animated themed background, honors safe-area insets, and gives
 * every screen the same generous side gutters and breathing room. Content is
 * never height-constrained; callers compose freely inside.
 */

import React from 'react';
import { ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedRoot } from '@/theme/ThemeProvider';
import { SPACING } from '@/theme/themes';
import { useDynamicType } from '@/theme/useDynamicType';

interface ScreenProps {
  children: React.ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /** Extra bottom padding, e.g. to clear a floating action / tab bar. */
  bottomInset?: number;
  contentStyle?: StyleProp<ViewStyle>;
  /** Disable horizontal gutters for edge-to-edge screens (e.g. Spark Deck). */
  bleed?: boolean;
}

export function Screen({
  children,
  scroll = true,
  bottomInset = 0,
  contentStyle,
  bleed = false,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { isCompact } = useDynamicType();
  const gutter = bleed ? 0 : isCompact ? SPACING.lg : SPACING.xl;

  const padding: ViewStyle = {
    paddingTop: insets.top + SPACING.sm,
    paddingHorizontal: gutter,
    paddingBottom: insets.bottom + bottomInset + SPACING.xl,
  };

  return (
    <ThemedRoot>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padding, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding, contentStyle]}>{children}</View>
      )}
    </ThemedRoot>
  );
}
