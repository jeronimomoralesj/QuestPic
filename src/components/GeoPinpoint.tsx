import React, { useState } from 'react';
import { View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
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
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let label: string | undefined;
      try {
        const places = await Location.reverseGeocodeAsync(pos.coords);
        const place = places[0];
        if (place) label = [place.city ?? place.subregion, place.isoCountryCode].filter(Boolean).join(', ');
      } catch { /* best-effort */ }
      onDrop({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, label, droppedAt: Date.now() });
      await haptic.success();
    } catch {
      setError('Could not read your location.');
      await haptic.error();
    } finally {
      setBusy(false);
    }
  };

  const region = pin
    ? { latitude: pin.latitude, longitude: pin.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : { latitude: 20, longitude: 0, latitudeDelta: 120, longitudeDelta: 120 };

  return (
    <View>
      <Eyebrow>Geo-Pinpoint</Eyebrow>
      <Spacer size={SPACING.md} />

      <MapView
        style={{ width: '100%', height: 220, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: palette.border }}
        region={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {pin && (
          <Marker
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            pinColor={palette.accent}
          />
        )}
      </MapView>

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
        <Text variant="caption" tone="textFaint">No pin dropped yet.</Text>
      )}
      {error ? (
        <>
          <Spacer size={SPACING.sm} />
          <Text variant="caption" tone="warm">{error}</Text>
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
