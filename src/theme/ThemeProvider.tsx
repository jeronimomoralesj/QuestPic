/**
 * Global theme context + the fluid transition engine.
 *
 * Switching themes is meant to feel like the app changing its mind: the root
 * canvas color cross-fades via Reanimated rather than snapping. Screens read the
 * static palette for fine detail, and wrap their outermost surface in
 * <ThemedRoot> to inherit the animated background.
 *
 * The chosen theme persists in the local SQLite store, so the app reopens in the
 * exact soul the user left it in.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { Collection } from '@/db/store';
import { THEME_ORDER, THEMES, type Theme, type ThemeName } from './themes';

interface SettingDoc {
  id: string;
  value: string;
  createdAt: number;
  updatedAt: number;
}
const settings = new Collection<SettingDoc>('settings');
const THEME_KEY = 'active_theme';

interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  /** Advance to the next theme in the canonical order (long-press gesture etc.). */
  cycleTheme: () => void;
  /** 0→1 progress shared value, in case a screen wants to react to transitions. */
  transition: ReturnType<typeof useSharedValue<number>>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DEFAULT: ThemeName = 'obsidian';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(DEFAULT);
  const [prevName, setPrevName] = useState<ThemeName>(DEFAULT);
  const transition = useSharedValue(1);

  // Hydrate the persisted choice once.
  useEffect(() => {
    let active = true;
    (async () => {
      await settings.init();
      const saved = await settings.get(THEME_KEY);
      if (active && saved && saved.value in THEMES) {
        setThemeName(saved.value as ThemeName);
        setPrevName(saved.value as ThemeName);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback(
    (name: ThemeName) => {
      if (name === themeName) return;
      setPrevName(themeName);
      setThemeName(name);
      transition.value = 0;
      transition.value = withTiming(1, {
        duration: 520,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      });
      const now = Date.now();
      void settings.insert({
        id: THEME_KEY,
        value: name,
        createdAt: now,
        updatedAt: now,
      });
    },
    [themeName, transition],
  );

  const cycleTheme = useCallback(() => {
    const idx = THEME_ORDER.indexOf(themeName);
    setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
  }, [themeName, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: THEMES[themeName],
      themeName,
      setTheme,
      cycleTheme,
      transition,
    }),
    [themeName, setTheme, cycleTheme, transition],
  );

  // Expose prev/next colors to ThemedRoot via context-adjacent refs.
  return (
    <ThemeContext.Provider value={value}>
      <TransitionColors from={prevName} to={themeName} progress={transition}>
        {children}
      </TransitionColors>
    </ThemeContext.Provider>
  );
}

/** Internal: provides the animated bg color down to ThemedRoot consumers. */
const ColorBridge = createContext<{ from: ThemeName; to: ThemeName; progress: ReturnType<typeof useSharedValue<number>> } | null>(null);

function TransitionColors({
  from,
  to,
  progress,
  children,
}: {
  from: ThemeName;
  to: ThemeName;
  progress: ReturnType<typeof useSharedValue<number>>;
  children: React.ReactNode;
}) {
  const bridge = useMemo(() => ({ from, to, progress }), [from, to, progress]);
  return <ColorBridge.Provider value={bridge}>{children}</ColorBridge.Provider>;
}

/**
 * The animated root canvas. Cross-fades its background between the previous and
 * current theme whenever the soul changes. Use it as the outermost view of a
 * screen when you want the transition to read across the whole surface.
 */
export function ThemedRoot({ style, children, ...rest }: ViewProps) {
  const bridge = useContext(ColorBridge);
  const fromBg = bridge ? THEMES[bridge.from].palette.bg : '#000';
  const toBg = bridge ? THEMES[bridge.to].palette.bg : '#000';

  const animatedStyle = useAnimatedStyle(() => {
    const p = bridge ? bridge.progress.value : 1;
    return {
      backgroundColor: interpolateColor(p, [0, 1], [fromBg, toBg]),
    };
  });

  return (
    <Animated.View style={[styles.root, animatedStyle, style]} {...rest}>
      {children}
    </Animated.View>
  );
}

/** Static, immediate background — for nested surfaces that shouldn't animate. */
export function Surface({ style, ...rest }: ViewProps) {
  const { theme } = useTheme();
  return <View style={[{ backgroundColor: theme.palette.surface }, style]} {...rest} />;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}

/** Convenience: just the palette, the most common need. */
export function usePalette() {
  return useTheme().theme.palette;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
