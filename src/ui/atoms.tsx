/**
 * Small editorial atoms shared across screens: eyebrows, hairlines, pills,
 * glyph chips, and the primary button. Kept deliberately spare — the design
 * language is type + space + a single hairline, not chrome.
 */

import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { PressableScale } from './Pressable';
import { Text } from './Text';
import { usePalette } from '@/theme/ThemeProvider';
import { RADIUS, SPACING } from '@/theme/themes';

/** Spaced micro-caps used as section eyebrows. */
export function Eyebrow({ children, tone = 'textFaint' }: { children: React.ReactNode; tone?: 'textFaint' | 'accent' | 'cool' | 'warm' }) {
  return (
    <Text variant="eyebrow" tone={tone} style={{ textTransform: 'uppercase' }}>
      {children}
    </Text>
  );
}

/** A single hairline rule. */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const palette = usePalette();
  return (
    <View
      style={[{ height: 1, backgroundColor: palette.border, width: '100%' }, style]}
    />
  );
}

export function Spacer({ size = SPACING.lg }: { size?: number }) {
  return <View style={{ height: size }} />;
}

/** A small outlined tag. */
export function Pill({
  label,
  active,
  tone,
  onPress,
}: {
  label: string;
  active?: boolean;
  tone?: 'accent' | 'cool' | 'warm';
  onPress?: () => void;
}) {
  const palette = usePalette();
  const accent = tone ? palette[tone] : palette.accent;
  const body = (
    <View
      style={{
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs + 2,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        borderColor: active ? accent : palette.border,
        backgroundColor: active ? accent : 'transparent',
      }}
    >
      <Text
        variant="caption"
        color={active ? palette.onAccent : palette.textMuted}
        style={{ textTransform: 'uppercase', letterSpacing: 1 }}
      >
        {label}
      </Text>
    </View>
  );
  return onPress ? (
    <PressableScale onPress={onPress} hapticOnPress="select" scaleTo={0.94}>
      {body}
    </PressableScale>
  ) : (
    body
  );
}

/** A bordered glyph chip — the list sigil / avatar holder. */
export function GlyphChip({
  glyph,
  size = 44,
  tone,
  filled,
}: {
  glyph: string;
  size?: number;
  tone?: 'accent' | 'cool' | 'warm';
  filled?: boolean;
}) {
  const palette = usePalette();
  const accent = tone ? palette[tone] : palette.accent;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: filled ? accent : palette.border,
        backgroundColor: filled ? accent : palette.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="heading" color={filled ? palette.onAccent : palette.text}>
        {glyph}
      </Text>
    </View>
  );
}

/** The primary call-to-action. Filled, high-contrast, springy. */
export function Button({
  label,
  onPress,
  tone = 'accent',
  variant = 'solid',
  disabled,
  hapticOnPress = 'press',
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: 'accent' | 'cool' | 'warm' | 'success';
  variant?: 'solid' | 'outline';
  disabled?: boolean;
  hapticOnPress?: 'press' | 'tap' | 'heavy' | 'select';
  style?: StyleProp<ViewStyle>;
}) {
  const palette = usePalette();
  const accent = palette[tone];
  const solid = variant === 'solid';
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hapticOnPress={hapticOnPress}
      scaleTo={0.97}
      style={style}
    >
      <View
        style={{
          paddingVertical: SPACING.md + 2,
          paddingHorizontal: SPACING.xl,
          borderRadius: RADIUS.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: solid ? accent : 'transparent',
          borderWidth: 1,
          borderColor: accent,
        }}
      >
        <Text
          variant="label"
          color={solid ? palette.onAccent : accent}
          style={{ textTransform: 'uppercase', letterSpacing: 1.5 }}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

/** A bordered surface card with consistent inset + radius. */
export function Card({
  children,
  style,
  onPress,
  bordered = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  bordered?: boolean;
}) {
  const palette = usePalette();
  const body = (
    <View
      style={[
        {
          backgroundColor: palette.surface,
          borderRadius: RADIUS.lg,
          borderWidth: bordered ? 1 : 0,
          borderColor: palette.border,
          padding: SPACING.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  return onPress ? (
    <PressableScale onPress={onPress} scaleTo={0.985} hapticOnPress="tap">
      {body}
    </PressableScale>
  ) : (
    body
  );
}
