/**
 * The Registry — a social timeline of the crew's completed quests.
 *
 * Search filters the local feed by author/title. The "Find friend" bar lets you
 * look up any user by @handle via the API and see their profile card.
 */

import React, { useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { PressableScale } from '@/ui/Pressable';
import { Card, Divider, Eyebrow, GlyphChip, Spacer } from '@/ui/atoms';
import { haptic } from '@/ui/haptics';
import { useVault } from '@/state/VaultProvider';
import { usePalette } from '@/theme/ThemeProvider';
import { RADIUS, SPACING } from '@/theme/themes';
import { relativeTime } from '@/utils/time';
import { api } from '@/sync/client';
import type { PublicUser } from '@/sync/client';
import type { RegistryEntry } from '@/db/types';

const REACTIONS: { key: string; glyph: string }[] = [
  { key: 'fire', glyph: '✸' },
  { key: 'awe', glyph: '✶' },
  { key: 'clap', glyph: '✷' },
];

export default function RegistryScreen() {
  const { registry } = useVault();
  const palette = usePalette();

  const [searchQuery, setSearchQuery] = useState('');
  const [handle, setHandle] = useState('');
  const [lookupResult, setLookupResult] = useState<PublicUser | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [searching, setSearching] = useState(false);

  const filtered = searchQuery.trim()
    ? registry.filter((e) => {
        const q = searchQuery.toLowerCase();
        return (
          e.author.name.toLowerCase().includes(q) ||
          e.author.handle.toLowerCase().includes(q) ||
          e.title.toLowerCase().includes(q)
        );
      })
    : registry;

  const lookupFriend = async () => {
    const raw = handle.trim();
    if (!raw) return;
    const h = raw.startsWith('@') ? raw : `@${raw}`;
    setSearching(true);
    setLookupResult(null);
    setLookupError('');
    try {
      const res = await api.lookupUser(h);
      setLookupResult(res.user);
    } catch (e: unknown) {
      setLookupError(e instanceof Error ? e.message : 'Not found');
    } finally {
      setSearching(false);
    }
  };

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

      {/* Search bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: RADIUS.pill,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
          backgroundColor: palette.surfaceAlt,
          marginBottom: SPACING.xl,
          gap: SPACING.sm,
        }}
      >
        <Text variant="caption" tone="textFaint">◎</Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search quests…"
          placeholderTextColor={palette.textFaint}
          style={{ flex: 1, color: palette.text, fontSize: 14 }}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searchQuery.length > 0 ? (
          <PressableScale onPress={() => setSearchQuery('')} hapticOnPress="tap" scaleTo={0.9}>
            <Text variant="caption" tone="textFaint">✕</Text>
          </PressableScale>
        ) : null}
      </View>

      {/* Find a friend */}
      <Card style={{ marginBottom: SPACING.xl }}>
        <Eyebrow tone="cool">Find a friend</Eyebrow>
        <Spacer size={SPACING.sm} />
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          <TextInput
            value={handle}
            onChangeText={setHandle}
            placeholder="@handle"
            placeholderTextColor={palette.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => void lookupFriend()}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: RADIUS.pill,
              paddingHorizontal: SPACING.md,
              paddingVertical: SPACING.sm,
              color: palette.text,
              fontSize: 14,
              backgroundColor: palette.surfaceAlt,
            }}
          />
          <PressableScale onPress={() => void lookupFriend()} hapticOnPress="tap" scaleTo={0.92} disabled={searching}>
            <View
              style={{
                paddingHorizontal: SPACING.lg,
                paddingVertical: SPACING.sm + 2,
                borderRadius: RADIUS.pill,
                backgroundColor: palette.accent,
              }}
            >
              {searching ? (
                <ActivityIndicator size="small" color={palette.onAccent} />
              ) : (
                <Text variant="label" color={palette.onAccent}>Search</Text>
              )}
            </View>
          </PressableScale>
        </View>

        {lookupError ? (
          <>
            <Spacer size={SPACING.sm} />
            <Text variant="caption" tone="textFaint">{lookupError}</Text>
          </>
        ) : null}

        {lookupResult ? (
          <>
            <Spacer size={SPACING.md} />
            <Divider />
            <Spacer size={SPACING.md} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
              <GlyphChip glyph={lookupResult.avatar || '◈'} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="label">{lookupResult.name}</Text>
                <Text variant="caption" tone="textFaint">{lookupResult.handle}</Text>
              </View>
              <Eyebrow tone="cool">Found</Eyebrow>
            </View>
          </>
        ) : null}

        {!lookupResult && !lookupError && !searching ? (
          <>
            <Spacer size={SPACING.sm} />
            <Text variant="caption" tone="textFaint">
              Enter a handle like @aria to find a friend's profile.
            </Text>
          </>
        ) : null}
      </Card>

      {filtered.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: SPACING.xxl }}>
          <Text variant="display" tone="textFaint" center>⊚</Text>
          <Spacer size={SPACING.lg} />
          <Text variant="heading" center>
            {searchQuery ? 'No matches.' : 'Nothing here yet.'}
          </Text>
          <Spacer size={SPACING.sm} />
          <Text variant="body" tone="textMuted" center>
            {searchQuery
              ? 'Try a different name or quest title.'
              : 'When your crew completes quests, their moments will appear here.'}
          </Text>
        </View>
      ) : (
        filtered.map((entry, i) => (
          <View key={entry.id}>
            <RegistryRow entry={entry} />
            {i < filtered.length - 1 && (
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
          <Text variant="body" tone="textMuted">{entry.subtitle}</Text>
        </>
      ) : null}
      {entry.geoLabel ? (
        <>
          <Spacer size={SPACING.sm} />
          <Text variant="caption" tone="textFaint">◍ {entry.geoLabel}</Text>
        </>
      ) : null}

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
                <Text variant="label" tone="accent">{r.glyph}</Text>
                <Text variant="caption" tone="textMuted">{count}</Text>
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
