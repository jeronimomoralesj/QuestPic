/**
 * Crew Tagging — tag simulated friends on a specific milestone.
 *
 * Renders the crew as toggleable chips; tapping flips membership in the item's
 * memory.crew array. Tagged crew read back as filled accent chips.
 */

import React from 'react';
import { View } from 'react-native';
import { Text } from '@/ui/Text';
import { PressableScale } from '@/ui/Pressable';
import { Eyebrow, Spacer } from '@/ui/atoms';
import { haptic } from '@/ui/haptics';
import { usePalette } from '@/theme/ThemeProvider';
import { RADIUS, SPACING } from '@/theme/themes';
import type { Collaborator } from '@/db/types';

export function CrewTagging({
  crew,
  taggedIds,
  onToggle,
}: {
  crew: Collaborator[];
  taggedIds: string[];
  onToggle: (id: string) => void;
}) {
  const palette = usePalette();
  return (
    <View>
      <Eyebrow>Crew Tagging</Eyebrow>
      <Spacer size={SPACING.md} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
        {crew.map((c) => {
          const tagged = taggedIds.includes(c.id);
          return (
            <PressableScale
              key={c.id}
              onPress={() => {
                void haptic.select();
                onToggle(c.id);
              }}
              hapticOnPress="none"
              scaleTo={0.94}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SPACING.sm,
                  paddingVertical: SPACING.sm,
                  paddingHorizontal: SPACING.md,
                  borderRadius: RADIUS.pill,
                  borderWidth: 1,
                  borderColor: tagged ? palette.accent : palette.border,
                  backgroundColor: tagged ? palette.accent : 'transparent',
                }}
              >
                <Text variant="label" color={tagged ? palette.onAccent : palette.text}>
                  {c.avatar}
                </Text>
                <Text variant="caption" color={tagged ? palette.onAccent : palette.textMuted}>
                  {c.handle}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
