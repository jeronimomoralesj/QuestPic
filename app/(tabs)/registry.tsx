import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, SafeAreaView, ScrollView, TextInput, View } from 'react-native';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { PressableScale } from '@/ui/Pressable';
import { Card, Divider, Eyebrow, GlyphChip, Spacer } from '@/ui/atoms';
import { haptic } from '@/ui/haptics';
import { useVault } from '@/state/VaultProvider';
import { usePalette } from '@/theme/ThemeProvider';
import { SPACING, RADIUS } from '@/theme/themes';
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
  const { registry, refresh, syncNow } = useVault();
  const palette = usePalette();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomInset={96} onRefresh={async () => { await syncNow(); await refresh(); }}>
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
              When your crew completes quests, their moments will appear here.{'\n'}
              Tap ⊛ to find a friend.
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

      {/* FAB */}
      <PressableScale
        onPress={() => { void haptic.tap(); setSearchOpen(true); }}
        hapticOnPress="none"
        scaleTo={0.92}
        style={{
          position: 'absolute',
          bottom: 144,
          right: 20,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: palette.accent,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Text variant="heading" color={palette.onAccent}>⊛</Text>
        </View>
      </PressableScale>

      <SearchOverlay
        visible={searchOpen}
        registry={registry}
        onClose={() => setSearchOpen(false)}
      />
    </View>
  );
}

function SearchOverlay({
  visible,
  registry,
  onClose,
}: {
  visible: boolean;
  registry: RegistryEntry[];
  onClose: () => void;
}) {
  const palette = usePalette();
  const [query, setQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<PublicUser | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [looking, setLooking] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setLookupResult(null);
      setLookupError('');
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [visible]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const raw = query.trim();
    if (raw.length >= 3) {
      debounceRef.current = setTimeout(() => void lookupFriend(), 400);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const feedResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return registry.filter(
      (e) =>
        e.author.name.toLowerCase().includes(q) ||
        e.author.handle.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q),
    );
  }, [query, registry]);

  const lookupFriend = async () => {
    const raw = query.trim();
    if (!raw) return;
    const h = raw.startsWith('@') ? raw : `@${raw}`;
    setLooking(true);
    setLookupResult(null);
    setLookupError('');
    try {
      const res = await api.lookupUser(h);
      setLookupResult({
        ...res.user,
        friendshipStatus: res.friendshipStatus as PublicUser['friendshipStatus'],
        friendshipId: res.friendshipId,
        mutualFriendsCount: res.mutualFriendsCount,
      });
      await haptic.success();
    } catch {
      setLookupError('No quester found. Try searching by @handle or part of their name.');
      await haptic.warning();
    } finally {
      setLooking(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md }}>
            <PressableScale onPress={onClose} hapticOnPress="tap">
              <Text variant="label" tone="textMuted" style={{ paddingRight: SPACING.sm }}>Cancel</Text>
            </PressableScale>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: RADIUS.lg,
                borderWidth: 1,
                borderColor: palette.border,
                backgroundColor: palette.surface,
                paddingHorizontal: SPACING.md,
                paddingVertical: SPACING.sm + 2,
                gap: SPACING.sm,
              }}
            >
              <Text variant="body" tone="textFaint">⊛</Text>
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={(t) => { setQuery(t); setLookupResult(null); setLookupError(''); }}
                placeholder="Search quests or find @friend"
                placeholderTextColor={palette.textFaint}
                returnKeyType="search"
                onSubmitEditing={() => void lookupFriend()}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ flex: 1, color: palette.text, fontSize: 16 }}
              />
              {query.length > 0 && (
                <PressableScale onPress={() => { setQuery(''); setLookupResult(null); setLookupError(''); }} hapticOnPress="tap">
                  <Text variant="caption" tone="textFaint">✕</Text>
                </PressableScale>
              )}
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl }}>
            {(lookupResult || lookupError || looking) && (
              <View style={{ marginBottom: SPACING.xl }}>
                <Eyebrow tone="cool">Friend search</Eyebrow>
                <Spacer size={SPACING.md} />
                {looking && <ActivityIndicator color={palette.accent} />}
                {lookupError ? <Text variant="caption" tone="warm">{lookupError}</Text> : null}
                {lookupResult && (
                  <Card>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
                      <GlyphChip glyph={lookupResult.avatar || '◈'} size={44} tone="cool" />
                      <View style={{ flex: 1 }}>
                        <Text variant="label">{lookupResult.name}</Text>
                        <Text variant="caption" tone="textFaint">{lookupResult.handle}</Text>
                        {(lookupResult.mutualFriendsCount ?? 0) > 0 && (
                          <Text variant="caption" tone="cool">
                            ◉ {lookupResult.mutualFriendsCount} friend{lookupResult.mutualFriendsCount === 1 ? '' : 's'} in common
                          </Text>
                        )}
                      </View>
                      <FriendInviteButton user={lookupResult} onUpdate={(u) => setLookupResult(u)} />
                    </View>
                  </Card>
                )}
              </View>
            )}

            {query.trim().length > 0 && feedResults.length === 0 && !lookupResult && !looking && (
              <View style={{ alignItems: 'center', paddingTop: SPACING.xxl }}>
                <Text variant="heading" tone="textMuted" center>No matching quests.</Text>
                <Spacer size={SPACING.sm} />
                <PressableScale onPress={() => void lookupFriend()} hapticOnPress="tap" scaleTo={0.96}>
                  <View style={{ paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: palette.cool }}>
                    <Text variant="label" color={palette.cool}>{looking ? 'Looking…' : `Find @${query.replace('@', '')} on QuestPic`}</Text>
                  </View>
                </PressableScale>
              </View>
            )}

            {feedResults.map((entry, i) => (
              <View key={entry.id}>
                <RegistryRowCompact entry={entry} />
                {i < feedResults.length - 1 && (
                  <>
                    <Spacer size={SPACING.md} />
                    <Divider />
                    <Spacer size={SPACING.md} />
                  </>
                )}
              </View>
            ))}

            {query.trim().length === 0 && (
              <View style={{ paddingTop: SPACING.md }}>
                <Text variant="caption" tone="textFaint">
                  Search by @handle or name. Results appear as you type.
                </Text>
                <Spacer size={SPACING.sm} />
                <Text variant="caption" tone="textFaint">
                  Friend requests stay private — nobody can see your connections.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function FriendInviteButton({
  user,
  onUpdate,
}: {
  user: PublicUser;
  onUpdate: (u: PublicUser) => void;
}) {
  const palette = usePalette();
  const [busy, setBusy] = useState(false);
  const status = user.friendshipStatus ?? 'none';

  const handlePress = async () => {
    setBusy(true);
    try {
      if (status === 'none') {
        const res = await api.sendFriendInvite(user.id);
        onUpdate({ ...user, friendshipStatus: 'pending_sent', friendshipId: res.invite.id });
        await haptic.success();
      } else if (status === 'pending_sent' && user.friendshipId) {
        await api.declineFriendInvite(user.friendshipId);
        onUpdate({ ...user, friendshipStatus: 'none', friendshipId: undefined });
        await haptic.tap();
      } else if (status === 'pending_received' && user.friendshipId) {
        await api.acceptFriendInvite(user.friendshipId);
        onUpdate({ ...user, friendshipStatus: 'friends' });
        await haptic.success();
      }
    } catch {
      await haptic.warning();
    } finally {
      setBusy(false);
    }
  };

  if (status === 'friends') {
    return (
      <View style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill, backgroundColor: palette.success + '22', borderWidth: 1, borderColor: palette.success }}>
        <Text variant="caption" color={palette.success}>◉ Friends</Text>
      </View>
    );
  }

  const label =
    status === 'pending_sent' ? 'Cancel invite' :
    status === 'pending_received' ? 'Accept' :
    'Send invite';
  const borderColor =
    status === 'pending_sent' ? palette.warm :
    status === 'pending_received' ? palette.success :
    palette.cool;
  const textColor =
    status === 'pending_sent' ? palette.warm :
    status === 'pending_received' ? palette.success :
    palette.cool;

  return (
    <PressableScale onPress={() => void handlePress()} disabled={busy} hapticOnPress="none" scaleTo={0.94}>
      <View style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill, borderWidth: 1, borderColor, opacity: busy ? 0.5 : 1 }}>
        <Text variant="caption" color={textColor}>{label}</Text>
      </View>
    </PressableScale>
  );
}

function RegistryRowCompact({ entry }: { entry: RegistryEntry }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm }}>
      <GlyphChip glyph={entry.author.avatar} size={36} />
      <View style={{ flex: 1 }}>
        <Text variant="label" numberOfLines={1}>{entry.title}</Text>
        <Text variant="caption" tone="textFaint">{entry.author.handle} · {relativeTime(entry.completedAt)}</Text>
      </View>
    </View>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 999, borderWidth: 1, borderColor: palette.border }}>
                <Text variant="label" tone="accent">{r.glyph}</Text>
                <Text variant="caption" tone="textMuted">{count}</Text>
              </View>
            </PressableScale>
          );
        })}
        <View style={{ flex: 1 }} />
        <PressableScale onPress={onClone} hapticOnPress="none" disabled={cloned} scaleTo={0.94}>
          <View style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: 999, backgroundColor: cloned ? palette.surfaceAlt : palette.accent }}>
            <Text variant="label" color={cloned ? palette.textMuted : palette.onAccent} style={{ letterSpacing: 1 }}>
              {cloned ? '✓ In Vault' : '⌁ Clone'}
            </Text>
          </View>
        </PressableScale>
      </View>
    </View>
  );
}
