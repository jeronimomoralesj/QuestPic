/**
 * Screen — the editorial canvas wrapper.
 *
 * Applies the animated themed background, honors safe-area insets, and gives
 * every screen the same generous side gutters and breathing room. Content is
 * never height-constrained; callers compose freely inside.
 */

import React from 'react';
import { RefreshControl, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedRoot, usePalette } from '@/theme/ThemeProvider';
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
  /** Pull-to-refresh callback. Showing a spinner until the promise resolves. */
  onRefresh?: () => Promise<void> | void;
}

export function Screen({
  children,
  scroll = true,
  bottomInset = 0,
  contentStyle,
  bleed = false,
  onRefresh,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const palette = usePalette();
  const { isCompact } = useDynamicType();
  const gutter = bleed ? 0 : isCompact ? SPACING.lg : SPACING.xl;
  const [refreshing, setRefreshing] = React.useState(false);

  const padding: ViewStyle = {
    paddingTop: insets.top + SPACING.sm,
    paddingHorizontal: gutter,
    paddingBottom: insets.bottom + bottomInset + SPACING.xl,
  };

  const handleRefresh = React.useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <ThemedRoot>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padding, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void handleRefresh()}
                tintColor={palette.accent}
                colors={[palette.accent]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding, contentStyle]}>{children}</View>
      )}
    </ThemedRoot>
  );
}
