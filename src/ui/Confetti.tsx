/**
 * The Achievement Canvas confetti.
 *
 * A dependency-free, Reanimated-driven burst: each shard is launched from the
 * origin with its own velocity, gravity, spin and drift, all interpolated on the
 * UI thread from a single shared progress value. Refined rather than gaudy —
 * thin slivers in the active theme's confetti palette, eased gravity, and a
 * gentle fade-out at the apex of the fall.
 *
 * Mounting <Confetti burstKey={n} /> with a changing key replays the burst.
 */

import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { usePalette } from '@/theme/ThemeProvider';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const COUNT = 90;
const DURATION = 2400;

interface Shard {
  angle: number;
  speed: number;
  spin: number;
  drift: number;
  size: number;
  long: number;
  delay: number;
  colorIndex: number;
}

function buildShards(seed: number): Shard[] {
  // Deterministic pseudo-random so a given burst is stable across re-renders.
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: COUNT }, (_, i) => ({
    angle: -Math.PI / 2 + (rnd() - 0.5) * 2.2, // mostly upward, wide spread
    speed: 420 + rnd() * 520,
    spin: (rnd() - 0.5) * 16,
    drift: (rnd() - 0.5) * 260,
    size: 5 + rnd() * 5,
    long: 10 + rnd() * 16,
    delay: rnd() * 140,
    colorIndex: i,
  }));
}

function Shard({
  shard,
  progress,
  color,
  originX,
  originY,
}: {
  shard: Shard;
  progress: Animated.SharedValue<number>;
  color: string;
  originX: number;
  originY: number;
}) {
  const style = useAnimatedStyle(() => {
    const raw = progress.value;
    // Stagger per-shard via delay, then clamp 0..1.
    const local = Math.min(1, Math.max(0, (raw * DURATION - shard.delay) / DURATION));
    const vx = Math.cos(shard.angle) * shard.speed;
    const vy = Math.sin(shard.angle) * shard.speed;
    const gravity = 1500;
    const t = local * (DURATION / 1000);
    const x = vx * t + shard.drift * local;
    const y = vy * t + 0.5 * gravity * t * t;
    const opacity = local < 0.7 ? 1 : 1 - (local - 0.7) / 0.3;
    const rotate = shard.spin * local * 360;
    return {
      opacity: Math.max(0, opacity),
      transform: [
        { translateX: originX + x },
        { translateY: originY + y },
        { rotateZ: `${rotate}deg` },
        { scale: 1 - local * 0.2 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.shard,
        { width: shard.size, height: shard.long, backgroundColor: color, borderRadius: 1 },
        style,
      ]}
    />
  );
}

export function Confetti({
  burstKey,
  origin,
}: {
  /** Change this to (re)fire the burst. 0 = idle, no burst. */
  burstKey: number;
  /** Launch point; defaults to upper-center. */
  origin?: { x: number; y: number };
}) {
  const palette = usePalette();
  const progress = useSharedValue(0);
  const shards = useMemo(() => buildShards(burstKey || 1), [burstKey]);
  const ox = origin?.x ?? SCREEN_W / 2;
  const oy = origin?.y ?? SCREEN_H * 0.42;

  useEffect(() => {
    if (!burstKey) return;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: DURATION,
      easing: Easing.out(Easing.quad),
    });
  }, [burstKey, progress]);

  if (!burstKey) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {shards.map((shard, i) => (
        <Shard
          key={i}
          shard={shard}
          progress={progress}
          color={palette.confetti[i % palette.confetti.length]}
          originX={ox}
          originY={oy}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  shard: { position: 'absolute', left: 0, top: 0 },
});
