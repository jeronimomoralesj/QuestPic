import React, { useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, ApiError } from '@/sync/client';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { PressableScale } from '@/ui/Pressable';
import { Button, Card, Divider, Eyebrow, GlyphChip, Pill, Spacer } from '@/ui/atoms';
import { haptic } from '@/ui/haptics';
import { useVault } from '@/state/VaultProvider';
import { usePalette } from '@/theme/ThemeProvider';
import { SPACING, RADIUS } from '@/theme/themes';
import type { BucketItem } from '@/db/types';
import type { PublicUser } from '@/sync/client';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = usePalette();
  const vault = useVault();
  const list = vault.listById(id);
  const members = vault.itemsInList(id);
  const [shareOpen, setShareOpen] = useState(false);

  if (!list) {
    return (
      <Screen>
        <Spacer size={SPACING.xxl} />
        <Text variant="title">List not found.</Text>
        <Spacer size={SPACING.md} />
        <Button label="Back" variant="outline" onPress={() => router.back()} />
      </Screen>
    );
  }

  const open = members.filter((m) => m.status === 'open');
  const done = members.filter((m) => m.status === 'completed');

  return (
    <Screen bottomInset={SPACING.xxl}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <PressableScale onPress={() => router.back()} hapticOnPress="tap">
          <Text variant="heading" tone="textMuted">‹ Back</Text>
        </PressableScale>
        <PressableScale
          onPress={async () => {
            await haptic.warning();
            await vault.deleteList(list.id);
            router.back();
          }}
          hapticOnPress="none"
        >
          <Text variant="caption" tone="textFaint">Delete list</Text>
        </PressableScale>
      </View>

      <Spacer size={SPACING.xl} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.lg }}>
        <GlyphChip glyph={list.glyph} size={56} />
        <View style={{ flex: 1 }}>
          <Text variant="title">{list.name}</Text>
          {list.description ? (
            <>
              <Spacer size={2} />
              <Text variant="caption" tone="textMuted">{list.description}</Text>
            </>
          ) : null}
        </View>
      </View>

      <Spacer size={SPACING.lg} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
        <Pill
          label={list.isPublic ? '◉ Public' : '○ Public'}
          active={list.isPublic}
          tone="cool"
          onPress={() => vault.updateList(list.id, { isPublic: true, isPrivate: false })}
        />
        <Pill
          label={list.isPrivate ? '◉ Private' : '○ Private'}
          active={list.isPrivate}
          onPress={() => vault.updateList(list.id, { isPrivate: true, isPublic: false })}
        />
        {list.collaborators.length > 0 && (
          <Pill label={`${list.collaborators.length} crew`} tone="warm" />
        )}
      </View>

      <Spacer size={SPACING.xl} />
      <Button
        label="+ Add a quest to this list"
        variant="outline"
        onPress={() => router.push(`/compose?mode=item&listId=${list.id}`)}
      />
      <Spacer size={SPACING.md} />
      <Button
        label={shareOpen ? '✕ Cancel share' : '⌁ Share with a friend'}
        tone="cool"
        variant="outline"
        onPress={() => { void haptic.select(); setShareOpen((v) => !v); }}
      />

      {shareOpen && (
        <ShareSheet listId={list.id} listName={list.name} onDone={() => setShareOpen(false)} />
      )}

      <Spacer size={SPACING.xxl} />

      <Eyebrow>Open · {open.length}</Eyebrow>
      <Spacer size={SPACING.md} />
      {open.length === 0 ? (
        <Text variant="caption" tone="textFaint">Nothing open here.</Text>
      ) : (
        open.map((item) => <MemberRow key={item.id} item={item} />)
      )}

      {done.length > 0 && (
        <>
          <Spacer size={SPACING.xxl} />
          <Eyebrow tone="accent">Answered · {done.length}</Eyebrow>
          <Spacer size={SPACING.md} />
          {done.map((item) => <MemberRow key={item.id} item={item} />)}
        </>
      )}
    </Screen>
  );
}

function ShareSheet({ listId, listName, onDone }: { listId: string; listName: string; onDone: () => void }) {
  const palette = usePalette();
  const [handle, setHandle] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<PublicUser | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [error, setError] = useState('');

  const lookupFriend = async () => {
    const raw = handle.trim();
    if (!raw) return;
    const h = raw.startsWith('@') ? raw : `@${raw}`;
    setSearching(true);
    setFound(null);
    setError('');
    setShared(false);
    try {
      const res = await api.lookupUser(h);
      setFound(res.user);
      await haptic.success();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No quester found with that handle.');
      await haptic.warning();
    } finally {
      setSearching(false);
    }
  };

  const doShare = async () => {
    if (!found) return;
    setSharing(true);
    try {
      await api.shareList(listId, found.handle);
      await haptic.success();
      setShared(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not share.');
      await haptic.error();
    } finally {
      setSharing(false);
    }
  };

  return (
    <Card style={{ marginTop: SPACING.md }}>
      <Eyebrow tone="cool">Share "{listName}"</Eyebrow>
      <Spacer size={SPACING.sm} />
      <Text variant="caption" tone="textFaint">
        Search a friend's @handle — they get read-only access and can clone the list.
      </Text>
      <Spacer size={SPACING.md} />
      <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
        <TextInput
          value={handle}
          onChangeText={(t) => { setHandle(t); setFound(null); setError(''); setShared(false); }}
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
        <PressableScale onPress={() => void lookupFriend()} hapticOnPress="tap" scaleTo={0.92} disabled={searching || !handle.trim()}>
          <View style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.pill, backgroundColor: palette.cool }}>
            {searching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text variant="label" color="#fff">Find</Text>
            )}
          </View>
        </PressableScale>
      </View>

      {error ? (
        <>
          <Spacer size={SPACING.sm} />
          <Text variant="caption" tone="warm">{error}</Text>
        </>
      ) : null}

      {found && !shared && (
        <>
          <Spacer size={SPACING.md} />
          <Divider />
          <Spacer size={SPACING.md} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
            <GlyphChip glyph={found.avatar || '◈'} size={40} tone="cool" />
            <View style={{ flex: 1 }}>
              <Text variant="label">{found.name}</Text>
              <Text variant="caption" tone="textFaint">{found.handle}</Text>
            </View>
            <PressableScale onPress={() => void doShare()} hapticOnPress="tap" scaleTo={0.94} disabled={sharing}>
              <View style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill, backgroundColor: palette.accent }}>
                {sharing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text variant="label" color={palette.onAccent}>Share ›</Text>
                )}
              </View>
            </PressableScale>
          </View>
        </>
      )}

      {shared && (
        <>
          <Spacer size={SPACING.md} />
          <Divider />
          <Spacer size={SPACING.md} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
            <Text variant="caption" color={palette.success}>✓ Shared with {found?.name}</Text>
            <PressableScale onPress={onDone} hapticOnPress="tap">
              <Text variant="caption" tone="textFaint">Done</Text>
            </PressableScale>
          </View>
        </>
      )}
    </Card>
  );
}

function MemberRow({ item }: { item: BucketItem }) {
  const palette = usePalette();
  const vault = useVault();
  const completed = item.status === 'completed';
  return (
    <Card onPress={() => router.push(`/item/${item.id}`)} style={{ marginBottom: SPACING.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
        <PressableScale
          onPress={() => {
            if (completed) { void vault.reopenItem(item.id); }
            else { void haptic.surge(); void vault.completeItem(item.id); }
          }}
          hapticOnPress="none"
          scaleTo={0.85}
        >
          <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: completed ? palette.success : palette.border, backgroundColor: completed ? palette.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {completed ? <Text variant="caption" color={palette.onAccent}>✓</Text> : null}
          </View>
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text variant="label" tone={completed ? 'textFaint' : 'text'} style={completed ? { textDecorationLine: 'line-through' } : undefined}>
            {item.title}
          </Text>
          {item.category ? <Text variant="caption" tone="textFaint">{item.category}</Text> : null}
        </View>
        <Text variant="heading" tone="textFaint">›</Text>
      </View>
    </Card>
  );
}
