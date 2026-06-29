/**
 * Multi-list assignment — the surface of the many-to-many model.
 *
 * Every list is a toggle; an item can belong to any number at once. Selecting a
 * list flips the canonical edge on the item. Used both in the item detail screen
 * and the compose flow.
 */

import React from 'react';
import { View } from 'react-native';
import { Text } from '@/ui/Text';
import { PressableScale } from '@/ui/Pressable';
import { Eyebrow, GlyphChip, Spacer } from '@/ui/atoms';
import { haptic } from '@/ui/haptics';
import { usePalette } from '@/theme/ThemeProvider';
import { RADIUS, SPACING } from '@/theme/themes';
import type { BucketList } from '@/db/types';

export function ListAssign({
  lists,
  selectedIds,
  onToggle,
  title = 'In these lists',
}: {
  lists: BucketList[];
  selectedIds: string[];
  onToggle: (listId: string) => void;
  title?: string;
}) {
  const palette = usePalette();
  return (
    <View>
      <Eyebrow>{title}</Eyebrow>
      <Spacer size={SPACING.md} />
      {lists.length === 0 ? (
        <Text variant="caption" tone="textFaint">
          No lists yet — create one first.
        </Text>
      ) : (
        lists.map((l) => {
          const on = selectedIds.includes(l.id);
          return (
            <PressableScale
              key={l.id}
              onPress={() => {
                void haptic.select();
                onToggle(l.id);
              }}
              hapticOnPress="none"
              scaleTo={0.99}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SPACING.md,
                  padding: SPACING.sm,
                  marginBottom: SPACING.sm,
                  borderRadius: RADIUS.md,
                  borderWidth: 1,
                  borderColor: on ? palette.accent : palette.border,
                  backgroundColor: on ? palette.surfaceAlt : 'transparent',
                }}
              >
                <GlyphChip glyph={l.glyph} size={36} filled={on} />
                <View style={{ flex: 1 }}>
                  <Text variant="label">{l.name}</Text>
                  <Text variant="caption" tone="textFaint">
                    {l.isPublic ? 'Public' : 'Private'}
                  </Text>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 1.5,
                    borderColor: on ? palette.accent : palette.border,
                    backgroundColor: on ? palette.accent : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {on ? (
                    <Text variant="caption" color={palette.onAccent}>
                      ✓
                    </Text>
                  ) : null}
                </View>
              </View>
            </PressableScale>
          );
        })
      )}
    </View>
  );
}
