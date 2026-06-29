/**
 * Photo Journal — a Base64 image gallery stored inline on the item document.
 *
 * Photos are captured/picked via expo-image-picker, requested at a modest
 * quality so the Base64 payload stays reasonable inside SQLite, and rendered
 * from a `data:` URI. Tap a tile to remove it.
 */

import React, { useState } from 'react';
import { Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/ui/Text';
import { PressableScale } from '@/ui/Pressable';
import { Eyebrow, Spacer } from '@/ui/atoms';
import { haptic } from '@/ui/haptics';
import { newId } from '@/db/store';
import { usePalette } from '@/theme/ThemeProvider';
import { RADIUS, SPACING } from '@/theme/themes';
import type { MediaPayload } from '@/db/types';

const TILE = 96;

export function PhotoJournal({
  photos,
  onAdd,
  onRemove,
}: {
  photos: MediaPayload[];
  onAdd: (photo: MediaPayload) => void;
  onRemove: (photoId: string) => void;
}) {
  const palette = usePalette();
  const [busy, setBusy] = useState(false);

  const pick = async (source: 'camera' | 'library') => {
    setBusy(true);
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        await haptic.warning();
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = {
        base64: true,
        quality: 0.55,
        allowsEditing: true,
        aspect: [4, 5],
        mediaTypes: ['images'],
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);

      const asset = result.canceled ? null : result.assets[0];
      if (asset?.base64) {
        onAdd({
          id: newId('img'),
          base64: asset.base64,
          mime: asset.mimeType ?? 'image/jpeg',
          width: asset.width,
          height: asset.height,
          capturedAt: Date.now(),
        });
        await haptic.success();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Eyebrow>Photo Journal</Eyebrow>
      <Spacer size={SPACING.md} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
        {photos.map((p) => (
          <PressableScale
            key={p.id}
            onPress={() => {
              void haptic.warning();
              onRemove(p.id);
            }}
            hapticOnPress="none"
            scaleTo={0.92}
          >
            <Image
              source={{ uri: `data:${p.mime};base64,${p.base64}` }}
              style={{
                width: TILE,
                height: TILE,
                borderRadius: RADIUS.md,
                borderWidth: 1,
                borderColor: palette.border,
              }}
            />
          </PressableScale>
        ))}

        {/* Add tiles */}
        <AddTile glyph="◎" label="Camera" onPress={() => pick('camera')} disabled={busy} />
        <AddTile glyph="⊞" label="Library" onPress={() => pick('library')} disabled={busy} />
      </View>
      {photos.length === 0 ? (
        <>
          <Spacer size={SPACING.sm} />
          <Text variant="caption" tone="textFaint">
            Capture the moment. Tap a photo to remove it.
          </Text>
        </>
      ) : null}
    </View>
  );
}

function AddTile({
  glyph,
  label,
  onPress,
  disabled,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const palette = usePalette();
  return (
    <PressableScale onPress={onPress} disabled={disabled} hapticOnPress="tap" scaleTo={0.92}>
      <View
        style={{
          width: TILE,
          height: TILE,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: palette.border,
          borderStyle: 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          backgroundColor: palette.surfaceAlt,
        }}
      >
        <Text variant="heading" tone="accent">
          {glyph}
        </Text>
        <Text variant="caption" tone="textFaint" style={{ fontSize: 10 }}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}
