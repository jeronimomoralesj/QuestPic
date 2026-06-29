/**
 * The single text primitive for the whole app.
 *
 * Every label flows through here, which is what guarantees the iOS
 * responsiveness contract: base sizes from the type scale are multiplied by the
 * live, clamped Dynamic Type factor, and we never constrain the container's
 * height — text auto-wraps and the layout flexes around it. Color defaults to
 * the active theme's primary text but accepts any token via `tone`.
 */

import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { usePalette } from '@/theme/ThemeProvider';
import { TYPE, type TypeVariant } from '@/theme/themes';
import { useDynamicType } from '@/theme/useDynamicType';

type Tone = 'text' | 'textMuted' | 'textFaint' | 'accent' | 'cool' | 'warm' | 'success' | 'onAccent';

interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: Tone;
  /** Override color outright (e.g. confetti accents). */
  color?: string;
  center?: boolean;
  /** Multiply the resolved weight to e.g. soften a heading. */
  weight?: '400' | '500' | '600' | '700' | '800' | '900';
}

export function Text({
  variant = 'body',
  tone = 'text',
  color,
  center,
  weight,
  style,
  children,
  ...rest
}: TextProps) {
  const palette = usePalette();
  const { fontScale } = useDynamicType();
  const t = TYPE[variant];

  return (
    <RNText
      // We do the scaling ourselves (clamped), so disable the double-apply.
      allowFontScaling={false}
      style={[
        {
          color: color ?? palette[tone],
          fontSize: t.size * fontScale,
          lineHeight: t.leading * fontScale,
          fontWeight: weight ?? t.weight,
          letterSpacing: t.tracking,
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
