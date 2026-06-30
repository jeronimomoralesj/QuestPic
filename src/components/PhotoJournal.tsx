import React, { useState } from 'react';
import { Image, Modal, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const [viewing, setViewing] = useState<MediaPayload | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pick = async (source: 'camera' | 'library') => {
    setBusy(true);
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { await haptic.warning(); return; }
      const opts: ImagePicker.ImagePickerOptions = {
        base64: true,
        quality: 0.55,
        allowsEditing: true,
        aspect: [4, 5],
        mediaTypes: ['images'],
      };
      const result = source === 'camera'
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
            onPress={() => { setViewing(p); setConfirmDelete(false); }}
            hapticOnPress="tap"
            scaleTo={0.92}
          >
            <Image
              source={{ uri: `data:${p.mime};base64,${p.base64}` }}
              style={{ width: TILE, height: TILE, borderRadius: RADIUS.md, borderWidth: 1, borderColor: palette.border }}
            />
          </PressableScale>
        ))}
        <AddTile glyph="◎" label="Camera" onPress={() => pick('camera')} disabled={busy} />
        <AddTile glyph="⊞" label="Library" onPress={() => pick('library')} disabled={busy} />
      </View>
      {photos.length === 0 ? (
        <>
          <Spacer size={SPACING.sm} />
          <Text variant="caption" tone="textFaint">Capture the moment. Tap a photo to view it.</Text>
        </>
      ) : null}

      <PhotoLightbox
        photo={viewing}
        confirmDelete={confirmDelete}
        onClose={() => { setViewing(null); setConfirmDelete(false); }}
        onDeletePress={() => {
          if (!confirmDelete) {
            setConfirmDelete(true);
            void haptic.warning();
          } else {
            if (viewing) onRemove(viewing.id);
            setViewing(null);
            setConfirmDelete(false);
            void haptic.select();
          }
        }}
      />
    </View>
  );
}

function PhotoLightbox({
  photo,
  confirmDelete,
  onClose,
  onDeletePress,
}: {
  photo: MediaPayload | null;
  confirmDelete: boolean;
  onClose: () => void;
  onDeletePress: () => void;
}) {
  const palette = usePalette();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!photo) return null;
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' }}>
        {/* Close — positioned below the status bar using insets */}
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={{
            position: 'absolute',
            top: insets.top + 12,
            right: 20,
            zIndex: 10,
            padding: 10,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <Text variant="heading" color="#fff">✕</Text>
        </TouchableOpacity>

        {/* Image centred in the remaining space */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
          <Image
            source={{ uri: `data:${photo.mime};base64,${photo.base64}` }}
            style={{ width: width - 32, height: height * 0.72, borderRadius: 12 }}
            resizeMode="contain"
          />
        </View>

        {/* Delete — pinned above home indicator */}
        <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16, alignItems: 'flex-end' }}>
          <TouchableOpacity
            onPress={onDeletePress}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: confirmDelete ? palette.warm : 'rgba(255,255,255,0.25)',
              backgroundColor: confirmDelete ? palette.warm + '33' : 'transparent',
            }}
          >
            <Text variant="label" color={confirmDelete ? palette.warm : '#aaa'}>
              {confirmDelete ? 'Tap again to delete' : '⊗ Delete photo'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function AddTile({
  glyph, label, onPress, disabled,
}: {
  glyph: string; label: string; onPress: () => void; disabled?: boolean;
}) {
  const palette = usePalette();
  return (
    <PressableScale onPress={onPress} disabled={disabled} hapticOnPress="tap" scaleTo={0.92}>
      <View style={{ width: TILE, height: TILE, borderRadius: RADIUS.md, borderWidth: 1, borderColor: palette.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: palette.surfaceAlt }}>
        <Text variant="heading" tone="accent">{glyph}</Text>
        <Text variant="caption" tone="textFaint" style={{ fontSize: 10 }}>{label}</Text>
      </View>
    </PressableScale>
  );
}
