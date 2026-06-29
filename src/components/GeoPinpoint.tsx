/**
 * Geo-Pinpoint — drop an exact geographical pin on a milestone.
 *
 * This is a self-contained, Expo-Go-friendly wrapper around expo-location: it
 * requests permission, reads the precise coordinate, reverse-geocodes a label,
 * and renders a minimalist editorial "map" (a coordinate graticule with an
 * animated pin) instead of a heavyweight native map tile. For a production build
 * you can swap `<MapCanvas>` for an `expo-maps` <AppleMaps>/<GoogleMaps> view —
 * the data contract (a GeoPin) stays identical.
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import * as Location from 'expo-location';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/ui/Text';
import { Button, Eyebrow, Spacer } from '@/ui/atoms';
import { haptic } from '@/ui/haptics';
import { usePalette } from '@/theme/ThemeProvider';
import { RADIUS, SPACING } from '@/theme/themes';
import type { GeoPin } from '@/db/types';

export function GeoPinpoint({
  pin,
  onDrop,
}: {
  pin?: GeoPin;
  onDrop: (pin: GeoPin) => void;
}) {
  const palette = usePalette();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropPin = async () => {
    setBusy(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied.');
        await haptic.warning();
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      let label: string | undefined;
      try {
        const places = await Location.reverseGeocodeAsync(pos.coords);
        const place = places[0];
        if (place) {
          label = [place.city ?? place.subregion, place.isoCountryCode]
            .filter(Boolean)
            .join(', ');
        }
      } catch {
        // Reverse geocoding is best-effort; coordinates are the source of truth.
      }
      onDrop({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        label: label || undefined,
        droppedAt: Date.now(),
      });
      await haptic.success();
    } catch {
      setError('Could not read your location.');
      await haptic.error();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Eyebrow>Geo-Pinpoint</Eyebrow>
      <Spacer size={SPACING.md} />
      <MapCanvas pin={pin} />
      <Spacer size={SPACING.md} />
      {pin ? (
        <View>
          <Text variant="label">{pin.label ?? 'Pinned location'}</Text>
          <Spacer size={2} />
          <Text variant="caption" tone="textFaint">
            {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
          </Text>
        </View>
      ) : (
        <Text variant="caption" tone="textFaint">
          No pin dropped yet.
        </Text>
      )}
      {error ? (
        <>
          <Spacer size={SPACING.sm} />
          <Text variant="caption" tone="warm">
            {error}
          </Text>
        </>
      ) : null}
      <Spacer size={SPACING.md} />
      <Button
        label={busy ? 'Locating…' : pin ? 'Re-drop pin here' : 'Drop pin at my location'}
        tone="cool"
        variant="outline"
        disabled={busy}
        onPress={dropPin}
      />
    </View>
  );
}

/**
 * The minimalist map surface: a graticule of hairlines with a pulsing pin placed
 * from the coordinate's fractional part so distinct locations land in distinct
 * spots. Purely decorative-but-meaningful; no native tiles required.
 */
function MapCanvas({ pin }: { pin?: GeoPin }) {
  const palette = usePalette();
  const pulse = useSharedValue(0);

  React.useEffect(() => {
    if (pin) {
      pulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 1100 }), withTiming(0, { duration: 1100 })),
        -1,
        false,
      );
    }
  }, [pin, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.5 - pulse.value * 0.5,
    transform: [{ scale: 1 + pulse.value * 2.2 }],
  }));

  // Map fractional coordinate → 8%..88% of the canvas so the pin stays inset.
  const frac = (n: number) => {
    const f = Math.abs(n % 1);
    return 8 + f * 80;
  };
  const left = pin ? frac(pin.longitude) : 50;
  const top = pin ? frac(pin.latitude) : 50;

  return (
    <View
      style={{
        height: 150,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surfaceAlt,
        overflow: 'hidden',
      }}
    >
      {/* Graticule */}
      {[20, 40, 60, 80].map((p) => (
        <View
          key={`h${p}`}
          style={{ position: 'absolute', left: 0, right: 0, top: `${p}%`, height: 1, backgroundColor: palette.border }}
        />
      ))}
      {[20, 40, 60, 80].map((p) => (
        <View
          key={`v${p}`}
          style={{ position: 'absolute', top: 0, bottom: 0, left: `${p}%`, width: 1, backgroundColor: palette.border }}
        />
      ))}

      {pin ? (
        <View style={{ position: 'absolute', left: `${left}%`, top: `${top}%` }}>
          <Animated.View
            style={[
              { position: 'absolute', left: -14, top: -14, width: 28, height: 28, borderRadius: 14, backgroundColor: palette.accent },
              ringStyle,
            ]}
          />
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              marginLeft: -6,
              marginTop: -6,
              backgroundColor: palette.accent,
              borderWidth: 2,
              borderColor: palette.bg,
            }}
          />
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="caption" tone="textFaint">
            ◍ awaiting pin
          </Text>
        </View>
      )}
    </View>
  );
}
