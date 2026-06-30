/**
 * CountryMap — interactive world map for the Travel Map quest template.
 *
 * Tap once to mark a country as "want to go", tap again for "visited",
 * tap a third time to clear. Stats and a progress bar show at the top.
 */

import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '@/ui/Text';
import { Eyebrow, Spacer } from '@/ui/atoms';
import { PressableScale } from '@/ui/Pressable';
import { haptic } from '@/ui/haptics';
import { usePalette } from '@/theme/ThemeProvider';
import { RADIUS, SPACING } from '@/theme/themes';
import type { CountryPin } from '@/db/types';

interface ContinentData {
  name: string;
  countries: { iso: string; name: string }[];
}

const CONTINENTS: ContinentData[] = [
  {
    name: 'Europe',
    countries: [
      { iso: 'FR', name: 'France' }, { iso: 'IT', name: 'Italy' },
      { iso: 'ES', name: 'Spain' }, { iso: 'PT', name: 'Portugal' },
      { iso: 'GB', name: 'UK' }, { iso: 'DE', name: 'Germany' },
      { iso: 'GR', name: 'Greece' }, { iso: 'NL', name: 'Netherlands' },
      { iso: 'CH', name: 'Switzerland' }, { iso: 'NO', name: 'Norway' },
      { iso: 'SE', name: 'Sweden' }, { iso: 'DK', name: 'Denmark' },
      { iso: 'IS', name: 'Iceland' }, { iso: 'PL', name: 'Poland' },
      { iso: 'AT', name: 'Austria' }, { iso: 'HR', name: 'Croatia' },
      { iso: 'CZ', name: 'Czech Rep.' }, { iso: 'HU', name: 'Hungary' },
      { iso: 'IE', name: 'Ireland' }, { iso: 'BE', name: 'Belgium' },
      { iso: 'RO', name: 'Romania' },
    ],
  },
  {
    name: 'Americas',
    countries: [
      { iso: 'US', name: 'USA' }, { iso: 'CA', name: 'Canada' },
      { iso: 'MX', name: 'Mexico' }, { iso: 'BR', name: 'Brazil' },
      { iso: 'AR', name: 'Argentina' }, { iso: 'CO', name: 'Colombia' },
      { iso: 'PE', name: 'Peru' }, { iso: 'CL', name: 'Chile' },
      { iso: 'CR', name: 'Costa Rica' }, { iso: 'CU', name: 'Cuba' },
      { iso: 'EC', name: 'Ecuador' }, { iso: 'UY', name: 'Uruguay' },
      { iso: 'PA', name: 'Panama' }, { iso: 'BO', name: 'Bolivia' },
    ],
  },
  {
    name: 'Asia',
    countries: [
      { iso: 'JP', name: 'Japan' }, { iso: 'TH', name: 'Thailand' },
      { iso: 'VN', name: 'Vietnam' }, { iso: 'IN', name: 'India' },
      { iso: 'ID', name: 'Indonesia' }, { iso: 'KR', name: 'South Korea' },
      { iso: 'SG', name: 'Singapore' }, { iso: 'TW', name: 'Taiwan' },
      { iso: 'PH', name: 'Philippines' }, { iso: 'NP', name: 'Nepal' },
      { iso: 'KH', name: 'Cambodia' }, { iso: 'MY', name: 'Malaysia' },
      { iso: 'CN', name: 'China' }, { iso: 'TR', name: 'Turkey' },
      { iso: 'AE', name: 'UAE' }, { iso: 'JO', name: 'Jordan' },
      { iso: 'LK', name: 'Sri Lanka' }, { iso: 'BT', name: 'Bhutan' },
      { iso: 'IL', name: 'Israel' }, { iso: 'GE', name: 'Georgia' },
    ],
  },
  {
    name: 'Africa',
    countries: [
      { iso: 'MA', name: 'Morocco' }, { iso: 'EG', name: 'Egypt' },
      { iso: 'KE', name: 'Kenya' }, { iso: 'ZA', name: 'South Africa' },
      { iso: 'TZ', name: 'Tanzania' }, { iso: 'RW', name: 'Rwanda' },
      { iso: 'ET', name: 'Ethiopia' }, { iso: 'SN', name: 'Senegal' },
      { iso: 'MG', name: 'Madagascar' }, { iso: 'NA', name: 'Namibia' },
      { iso: 'GH', name: 'Ghana' }, { iso: 'TN', name: 'Tunisia' },
    ],
  },
  {
    name: 'Oceania',
    countries: [
      { iso: 'AU', name: 'Australia' }, { iso: 'NZ', name: 'New Zealand' },
      { iso: 'FJ', name: 'Fiji' }, { iso: 'PG', name: 'Papua New Guinea' },
    ],
  },
];

const TOTAL_COUNTRIES = CONTINENTS.reduce((sum, c) => sum + c.countries.length, 0);

export function CountryMap({
  pins,
  onUpdate,
}: {
  pins: CountryPin[];
  onUpdate: (pins: CountryPin[]) => void;
}) {
  const palette = usePalette();

  const pinMap = useMemo(
    () => new Map(pins.map((p) => [p.iso, p.status])),
    [pins],
  );

  const visitedCount = pins.filter((p) => p.status === 'visited').length;
  const wantCount = pins.filter((p) => p.status === 'want').length;
  const leftCount = TOTAL_COUNTRIES - visitedCount - wantCount;

  const toggle = (iso: string, country: string) => {
    const current = pinMap.get(iso);
    const filtered = pins.filter((p) => p.iso !== iso);
    let next: CountryPin[];
    if (!current) {
      next = [...filtered, { iso, country, status: 'want' }];
    } else if (current === 'want') {
      next = [...filtered, { iso, country, status: 'visited' }];
    } else {
      next = filtered;
    }
    onUpdate(next);
    void haptic.select();
  };

  const visitedW = visitedCount / TOTAL_COUNTRIES;
  const wantW = wantCount / TOTAL_COUNTRIES;

  return (
    <View>
      <Eyebrow tone="cool">World Map</Eyebrow>
      <Spacer size={SPACING.md} />

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: SPACING.xl, marginBottom: SPACING.md }}>
        <View>
          <Text variant="title" color={palette.success}>{visitedCount}</Text>
          <Text variant="caption" tone="textFaint" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Visited</Text>
        </View>
        <View>
          <Text variant="title" color={palette.cool}>{wantCount}</Text>
          <Text variant="caption" tone="textFaint" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Want to go</Text>
        </View>
        <View>
          <Text variant="title" tone="textFaint">{leftCount}</Text>
          <Text variant="caption" tone="textFaint" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Undiscovered</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: palette.border,
          flexDirection: 'row',
          overflow: 'hidden',
          marginBottom: SPACING.xl,
        }}
      >
        <View style={{ flex: visitedW, backgroundColor: palette.success }} />
        <View style={{ flex: wantW, backgroundColor: palette.cool }} />
        <View style={{ flex: 1 - visitedW - wantW, backgroundColor: 'transparent' }} />
      </View>

      {/* Hint */}
      <Text variant="caption" tone="textFaint" style={{ marginBottom: SPACING.lg }}>
        Tap once → want to go · tap again → visited · tap again → remove
      </Text>

      {/* Continents */}
      {CONTINENTS.map((continent) => (
        <View key={continent.name} style={{ marginBottom: SPACING.xl }}>
          <Text
            variant="eyebrow"
            tone="textMuted"
            style={{ textTransform: 'uppercase', letterSpacing: 2, marginBottom: SPACING.sm }}
          >
            {continent.name}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs }}>
            {continent.countries.map((c) => {
              const status = pinMap.get(c.iso);
              const isVisited = status === 'visited';
              const isWant = status === 'want';
              return (
                <PressableScale
                  key={c.iso}
                  onPress={() => toggle(c.iso, c.name)}
                  hapticOnPress="none"
                  scaleTo={0.9}
                >
                  <View
                    style={{
                      paddingHorizontal: SPACING.sm + 2,
                      paddingVertical: 5,
                      borderRadius: RADIUS.pill,
                      borderWidth: 1,
                      borderColor: isVisited
                        ? palette.success
                        : isWant
                        ? palette.cool
                        : palette.border,
                      backgroundColor: isVisited
                        ? palette.success + '22'
                        : 'transparent',
                    }}
                  >
                    <Text
                      variant="caption"
                      color={
                        isVisited
                          ? palette.success
                          : isWant
                          ? palette.cool
                          : palette.textFaint
                      }
                    >
                      {isVisited ? '◍ ' : isWant ? '◯ ' : ''}{c.name}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
