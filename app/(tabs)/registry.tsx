/**
 * The Registry — a social timeline of the crew's completed quests.
 *
 * Each entry is an editorial moment: author, the quest, where it happened, and a
 * row of reactions you can tap (optimistic count bump + haptic). A single tap on
 * "Clone" forks that quest into your own Vault as a fresh open item.
 */

import React from 'react';
import { View } from 'react-native';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { PressableScale } from '@/ui/Pressable';
import { Card, Divider, Eyebrow, GlyphChip, Spacer } from '@/ui/atoms';
import { haptic } from '@/ui/haptics';
import { useVault } from '@/state/VaultProvider';
import { usePalette } from '@/theme/ThemeProvider';
import { SPACING } from '@/theme/themes';
import { relativeTime } from '@/utils/time';
import type { RegistryEntry } from '@/db/types';

const REACTIONS: { key: string; glyph: string }[] = [
  { key: 'fire', glyph: '✸' },
  { key: 'awe', glyph: '✶' },
  { key: 'clap', glyph: '✷' },
];

export default function RegistryScreen() {
  const { registry } = useVault();

  return (
    <Screen bottomInset={96}>
      <Eyebrow>QuestPic · Registry</Eyebrow>
      <Spacer size={SPACING.sm} />
      <Text variant="display">The feed.</Text>
      <Spacer size={SPACING.xs} />
      <Text variant="body" tone="textMuted">
        Quests your crew just answered. Clone any into your Vault.
      </Text>
      <Spacer size={SPACING.xl} />

      {registry.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: SPACING.xxl }}>
          <Text variant="display" tone="textFaint" center>⊚</Text>
          <Spacer size={SPACING.lg} />
          <Text variant="heading" center>Nothing here yet.</Text>
          <Spacer size={SPACING.sm} />
          <Text variant="body" tone="textMuted" center>
            When your crew completes quests, their moments will appear here.
          </Text>
        </View>
      ) : (
        registry.map((entry, i) => (
          <View key={entry.id}>
            <RegistryRow entry={entry} />
            {i < registry.length - 1 && (
              <>
                <Spacer size={SPACING.lg} />
                <Divider />
                <Spacer size={SPACING.lg} />
              </>
            )}
          </View>
        ))
      )}
    </Screen>
  );
}

function RegistryRow({ entry }: { entry: RegistryEntry }) {
  const palette = usePalette();
  const { reactToEntry, cloneEntry } = useVault();
  const [cloned, setCloned] = React.useState(false);
  // Local optimistic reaction overlay so taps feel instant.
  const [bumps, setBumps] = React.useState<Record<string, number>>({});

  const onReact = (key: string) => {
    setBumps((b) => ({ ...b, [key]: (b[key] ?? 0) + 1 }));
    void haptic.tap();
    void reactToEntry(entry.id, key);
  };

  const onClone = async () => {
    await haptic.success();
    await cloneEntry(entry.id);
    setCloned(true);
  };

  return (
    <View>
      {/* Author */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
        <GlyphChip glyph={entry.author.avatar} size={40} />
        <View style={{ flex: 1 }}>
          <Text variant="label">{entry.author.name}</Text>
          <Text variant="caption" tone="textFaint">
            {entry.author.handle} · {relativeTime(entry.completedAt)}
          </Text>
        </View>
        {entry.category ? <Eyebrow tone="cool">{entry.category}</Eyebrow> : null}
      </View>

      <Spacer size={SPACING.md} />
      <Text variant="heading">{entry.title}</Text>
      {entry.subtitle ? (
        <>
          <Spacer size={SPACING.xs} />
          <Text variant="body" tone="textMuted">
            {entry.subtitle}
          </Text>
        </>
      ) : null}
      {entry.geoLabel ? (
        <>
          <Spacer size={SPACING.sm} />
          <Text variant="caption" tone="textFaint">
            ◍ {entry.geoLabel}
          </Text>
        </>
      ) : null}

      {/* Actions */}
      <Spacer size={SPACING.lg} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
        {REACTIONS.map((r) => {
          const count = (entry.reactions[r.key] ?? 0) + (bumps[r.key] ?? 0);
          return (
            <PressableScale key={r.key} onPress={() => onReact(r.key)} hapticOnPress="none" scaleTo={0.9}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: SPACING.md,
                  paddingVertical: SPACING.sm,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: palette.border,
                }}
              >
                <Text variant="label" tone="accent">
                  {r.glyph}
                </Text>
                <Text variant="caption" tone="textMuted">
                  {count}
                </Text>
              </View>
            </PressableScale>
          );
        })}

        <View style={{ flex: 1 }} />

        <PressableScale onPress={onClone} hapticOnPress="none" disabled={cloned} scaleTo={0.94}>
          <View
            style={{
              paddingHorizontal: SPACING.lg,
              paddingVertical: SPACING.sm,
              borderRadius: 999,
              backgroundColor: cloned ? palette.surfaceAlt : palette.accent,
            }}
          >
            <Text
              variant="label"
              color={cloned ? palette.textMuted : palette.onAccent}
              style={{ letterSpacing: 1 }}
            >
              {cloned ? '✓ In Vault' : '⌁ Clone'}
            </Text>
          </View>
        </PressableScale>
      </View>
    </View>
  );
}
