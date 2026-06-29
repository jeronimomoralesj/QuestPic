/**
 * Native Dynamic Type bridge.
 *
 * iOS exposes the user's accessibility text size through the font scale. We read
 * it live and clamp it into a sane editorial range so that headlines stay
 * dramatic at the smallest setting and never overflow at the largest — without
 * ever hardcoding a pixel height. Every Text component multiplies its base size
 * by this factor, which is the single mechanism that keeps layouts fluid from
 * iPhone SE up to Pro Max and across every accessibility size.
 */

import { useWindowDimensions } from 'react-native';

/** Lower bound keeps display type punchy; upper bound prevents runaway overflow. */
const MIN_SCALE = 0.9;
const MAX_SCALE = 1.35;

export interface DynamicMetrics {
  /** Clamped OS font scale to multiply base type sizes by. */
  fontScale: number;
  /** Logical screen width — used for fluid, relative sizing. */
  width: number;
  height: number;
  /** True on the narrowest devices (≈ iPhone SE) so layouts can tighten. */
  isCompact: boolean;
}

export function useDynamicType(): DynamicMetrics {
  const { fontScale, width, height } = useWindowDimensions();
  const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, fontScale));
  return {
    fontScale: clamped,
    width,
    height,
    isCompact: width < 360,
  };
}
