/**
 * A single Spark Deck card.
 *
 * Driven by a shared translateX from the deck: rotates and fades as it's flung,
 * and reveals a "KEEP" / "SKIP" verdict stamp depending on direction. Stacked
 * cards behind it scale up subtly as they approach the top of the deck.
 */

import React from 'react';
import { View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { Text } from '@/ui/Text';
import { Eyebrow, Spacer } from '@/ui/atoms';
import { usePalette } from '@/theme/ThemeProvider';
import { RADIUS, SPACING } from '@/theme/themes';
import type { SparkCard } from '@/db/types';

export const SWIPE_THRESHOLD = 120;

export function SparkCardView({
  card,
  translateX,
  isTop,
  stackIndex,
}: {
  card: SparkCard;
  translateX: SharedValue<number>;
  isTop: boolean;
  stackIndex: number;
}) {
  const palette = usePalette();
  const accent =
    card.accentKey === 'cool'
      ? palette.cool
      : card.accentKey === 'warm'
      ? palette.warm
      : palette.accent;

  const cardStyle = useAnimatedStyle(() => {
    if (!isTop) {
      // Resting cards: nudge down + scale to imply depth.
      const depth = stackIndex;
      return {
        transform: [
          { scale: 1 - depth * 0.04 },
          { translateY: depth * 14 },
        ],
        opacity: depth > 2 ? 0 : 1,
      };
    }
    const rotate = interpolate(translateX.value, [-220, 0, 220], [-9, 0, 9]);
    return {
      transform: [
        { translateX: translateX.value },
        { rotateZ: `${rotate}deg` },
      ],
    };
  });

  const keepStamp = useAnimatedStyle(() => ({
    opacity: isTop ? interpolate(translateX.value, [20, SWIPE_THRESHOLD], [0, 1], 'clamp') : 0,
  }));
  const skipStamp = useAnimatedStyle(() => ({
    opacity: isTop ? interpolate(translateX.value, [-SWIPE_THRESHOLD, -20], [1, 0], 'clamp') : 0,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: palette.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: palette.border,
          padding: SPACING.xl,
          justifyContent: 'space-between',
          zIndex: 100 - stackIndex,
        },
        cardStyle,
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Eyebrow tone={card.accentKey === 'cool' ? 'cool' : card.accentKey === 'warm' ? 'warm' : 'accent'}>
          {card.category}
        </Eyebrow>
        <Text variant="caption" tone="textFaint">
          SPARK
        </Text>
      </View>

      <View>
        <Text variant="title">{card.title}</Text>
        <Spacer size={SPACING.md} />
        <Text variant="body" tone="textMuted">
          {card.subtitle}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Text variant="caption" tone="textFaint">
          Swipe right to keep · left to skip
        </Text>
        <View style={{ width: 40, height: 2, backgroundColor: accent }} />
      </View>

      {/* Verdict stamps */}
      <Animated.View
        style={[
          { position: 'absolute', top: SPACING.xl, left: SPACING.xl, borderWidth: 2, borderColor: palette.success, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, transform: [{ rotate: '-12deg' }] },
          keepStamp,
        ]}
      >
        <Text variant="label" color={palette.success} style={{ letterSpacing: 2 }}>
          KEEP
        </Text>
      </Animated.View>
      <Animated.View
        style={[
          { position: 'absolute', top: SPACING.xl, right: SPACING.xl, borderWidth: 2, borderColor: palette.warm, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, transform: [{ rotate: '12deg' }] },
          skipStamp,
        ]}
      >
        <Text variant="label" color={palette.warm} style={{ letterSpacing: 2 }}>
          SKIP
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
