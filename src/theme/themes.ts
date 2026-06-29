/**
 * The Dynamic Theme Engine.
 *
 * Each theme is a complete "visual soul": not just colors but the editorial
 * intent behind them. Spacing and the type scale are intentionally shared so
 * layout rhythm stays consistent while the palette swaps wholesale.
 *
 * Type sizes here are *base* sizes; every Text in the app multiplies them by the
 * OS Dynamic Type scale (see ui/Text.tsx), so nothing is ever truly hardcoded.
 */

export type ThemeName = 'obsidian' | 'sand' | 'tokyo' | 'nordic';

export interface ThemePalette {
  /** App background — the canvas. */
  bg: string;
  /** Slightly raised surfaces (sheets, raised rows). */
  surface: string;
  /** A second elevation for nested surfaces. */
  surfaceAlt: string;
  /** Hairline borders — the editorial frame. */
  border: string;
  borderStrong: string;
  /** Primary text. */
  text: string;
  /** Secondary / supporting text. */
  textMuted: string;
  /** Faintest text — captions, metadata. */
  textFaint: string;
  /** The signature accent. */
  accent: string;
  /** Text/icon color that sits legibly *on* the accent. */
  onAccent: string;
  /** A cool secondary accent. */
  cool: string;
  /** A warm secondary accent. */
  warm: string;
  /** Success / completion. */
  success: string;
  /** Confetti palette for the Achievement Canvas. */
  confetti: string[];
}

export interface Theme {
  name: ThemeName;
  label: string;
  /** Editorial one-liner shown in the theme picker. */
  tagline: string;
  /** Drives the status bar + keyboard appearance. */
  scheme: 'light' | 'dark';
  palette: ThemePalette;
}

export const THEMES: Record<ThemeName, Theme> = {
  obsidian: {
    name: 'obsidian',
    label: 'Obsidian',
    tagline: 'True black. Stark frame. Neon edge.',
    scheme: 'dark',
    palette: {
      bg: '#000000',
      surface: '#0A0A0B',
      surfaceAlt: '#141416',
      border: '#26262B',
      borderStrong: '#FFFFFF',
      text: '#FFFFFF',
      textMuted: '#A1A1AA',
      textFaint: '#5B5B63',
      accent: '#D6FF3D',
      onAccent: '#000000',
      cool: '#5EE6FF',
      warm: '#FF7A59',
      success: '#7CFFB2',
      confetti: ['#D6FF3D', '#5EE6FF', '#FF7A59', '#FFFFFF', '#7CFFB2'],
    },
  },
  sand: {
    name: 'sand',
    label: 'Sand & Craft',
    tagline: 'Oat-milk calm. Espresso ink. Terracotta.',
    scheme: 'light',
    palette: {
      bg: '#F4EFE6',
      surface: '#FBF8F1',
      surfaceAlt: '#EDE5D6',
      border: '#DDD2BE',
      borderStrong: '#3A2E25',
      text: '#2C231C',
      textMuted: '#766556',
      textFaint: '#A89684',
      accent: '#C26B3D',
      onAccent: '#FBF8F1',
      cool: '#5A7D6E',
      warm: '#D89A5B',
      success: '#5A7D4F',
      confetti: ['#C26B3D', '#D89A5B', '#5A7D6E', '#3A2E25', '#E8C9A0'],
    },
  },
  tokyo: {
    name: 'tokyo',
    label: 'Tokyo Neon',
    tagline: 'Cyberpunk midnight. Indigo. Electric cyan.',
    scheme: 'dark',
    palette: {
      bg: '#06060F',
      surface: '#0E0E23',
      surfaceAlt: '#16163A',
      border: '#272761',
      borderStrong: '#27E0FF',
      text: '#EAF6FF',
      textMuted: '#8A8FC7',
      textFaint: '#4B4F86',
      accent: '#27E0FF',
      onAccent: '#06060F',
      cool: '#7C5CFF',
      warm: '#FF4FD8',
      success: '#5BFFB0',
      confetti: ['#27E0FF', '#7C5CFF', '#FF4FD8', '#EAF6FF', '#5BFFB0'],
    },
  },
  nordic: {
    name: 'nordic',
    label: 'Nordic Frost',
    tagline: 'Ice white. Slate calm. Polar blue.',
    scheme: 'light',
    palette: {
      bg: '#F7F9FB',
      surface: '#FFFFFF',
      surfaceAlt: '#ECF1F6',
      border: '#D7DEE6',
      borderStrong: '#1F2933',
      text: '#1F2933',
      textMuted: '#5B6B7B',
      textFaint: '#97A6B5',
      accent: '#3E78B2',
      onAccent: '#FFFFFF',
      cool: '#4FA3C7',
      warm: '#C77B5B',
      success: '#3F8F6B',
      confetti: ['#3E78B2', '#4FA3C7', '#7FB5D8', '#1F2933', '#C7DCEC'],
    },
  },
};

export const THEME_ORDER: ThemeName[] = ['obsidian', 'sand', 'tokyo', 'nordic'];

/** Shared spacing scale — an 8pt-ish rhythm with a tight half-step. */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 36,
  xxxl: 56,
} as const;

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

/**
 * Base type scale. These are multiplied by the live Dynamic Type factor at
 * render time, never used raw — so accessibility sizing always flows through.
 */
export const TYPE = {
  /** Oversized editorial display. */
  display: { size: 40, leading: 42, weight: '800', tracking: -1.2 },
  title: { size: 28, leading: 32, weight: '700', tracking: -0.6 },
  heading: { size: 20, leading: 25, weight: '700', tracking: -0.3 },
  body: { size: 16, leading: 23, weight: '500', tracking: 0 },
  label: { size: 14, leading: 18, weight: '600', tracking: 0.2 },
  caption: { size: 12, leading: 16, weight: '600', tracking: 0.4 },
  /** Spaced-out micro caps for editorial eyebrows. */
  eyebrow: { size: 11, leading: 14, weight: '700', tracking: 2.4 },
} as const;

export type TypeVariant = keyof typeof TYPE;
