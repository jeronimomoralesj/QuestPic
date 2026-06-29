/**
 * PressableScale — the app's universal touch target.
 *
 * Springs down on press for a tactile, physical feel and fires a haptic on
 * press-in (configurable). Built on Reanimated so the scale runs on the UI
 * thread and never stutters. Use everywhere instead of bare Pressable.
 */

import React, { useCallback } from 'react';
import { GestureResponderEvent, Pressable, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { haptic } from './haptics';

type HapticKind = keyof typeof haptic | 'none';

interface PressableScaleProps {
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  /** How far it shrinks at full press. */
  scaleTo?: number;
  hapticOnPress?: HapticKind;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
}

export function PressableScale({
  onPress,
  onLongPress,
  disabled,
  scaleTo = 0.96,
  hapticOnPress = 'tap',
  style,
  hitSlop = 6,
  children,
  accessibilityLabel,
  accessibilityRole = 'button',
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.4 : 1,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(scaleTo, { duration: 90 });
    if (hapticOnPress !== 'none') {
      const fn = haptic[hapticOnPress];
      if (typeof fn === 'function') void fn();
    }
  }, [scale, scaleTo, hapticOnPress]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 160 });
  }, [scale]);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    >
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
}
