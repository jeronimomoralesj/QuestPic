/**
 * List detail — a single curated list.
 *
 * Header with the list sigil + editable visibility (public/private) and a crew
 * summary, then its member items as tappable rows with an inline completion
 * toggle. Members are derived live from the many-to-many edge.
 */

import React from 'react';
import { Alert, Platform, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, ApiError } from '@/sync/client';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { PressableScale } from '@/ui/Pressable';
import { Button, Card, Divider, Eyebrow, GlyphChip, Pill, Spacer } from '@/ui/atoms';
import { haptic } from '@/ui/haptics';
import { useVault } from '@/state/VaultProvider';
import { usePalette } from '@/theme/ThemeProvider';
import { SPACING } from '@/theme/themes';
import type { BucketItem } from '@/db/types';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = usePalette();
  const vault = useVault();
  const list = vault.listById(id);
  const members = vault.itemsInList(id);

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
          <Text variant="heading" tone="textMuted">
            ‹ Back
          </Text>
        </PressableScale>
        <PressableScale
          onPress={async () => {
            await haptic.warning();
            await vault.deleteList(list.id);
            router.back();
          }}
          hapticOnPress="none"
        >
          <Text variant="caption" tone="textFaint">
            Delete list
          </Text>
        </PressableScale>
      </View>

      {/* Header */}
      <Spacer size={SPACING.xl} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.lg }}>
        <GlyphChip glyph={list.glyph} size={56} />
        <View style={{ flex: 1 }}>
          <Text variant="title">{list.name}</Text>
          {list.description ? (
            <>
              <Spacer size={2} />
              <Text variant="caption" tone="textMuted">
                {list.description}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      {/* Visibility + collaborators */}
      <Spacer size={SPACING.lg} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
        <Pill
          label={list.isPublic ? '◉ Public' : '○ Public'}
          active={list.isPublic}
          tone="cool"
          onPress={() =>
            vault.updateList(list.id, { isPublic: true, isPrivate: false })
          }
        />
        <Pill
          label={list.isPrivate ? '◉ Private' : '○ Private'}
          active={list.isPrivate}
          onPress={() =>
            vault.updateList(list.id, { isPrivate: true, isPublic: false })
          }
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
        label="⌁ Share with a friend"
        tone="cool"
        variant="outline"
        onPress={() => shareList(list.id, list.name)}
      />

      <Spacer size={SPACING.xxl} />

      {/* Open */}
      <Eyebrow>Open · {open.length}</Eyebrow>
      <Spacer size={SPACING.md} />
      {open.length === 0 ? (
        <Text variant="caption" tone="textFaint">
          Nothing open here.
        </Text>
      ) : (
        open.map((item) => <MemberRow key={item.id} item={item} />)
      )}

      {done.length > 0 && (
        <>
          <Spacer size={SPACING.xxl} />
          <Eyebrow tone="accent">Answered · {done.length}</Eyebrow>
          <Spacer size={SPACING.md} />
          {done.map((item) => (
            <MemberRow key={item.id} item={item} />
          ))}
        </>
      )}
    </Screen>
  );
}

/** Prompt for a friend's handle and share the list (read-only) via the API. */
function shareList(listId: string, listName: string) {
  const doShare = async (handle?: string) => {
    const h = (handle ?? '').trim();
    if (!h) return;
    try {
      const res = await api.shareList(listId, h);
      await haptic.success();
      Alert.alert('Shared', `"${listName}" is now visible to ${res.sharedWith.handle}.`);
    } catch (e) {
      await haptic.error();
      Alert.alert('Could not share', e instanceof ApiError ? e.message : 'Please try again.');
    }
  };

  if (Platform.OS === 'ios') {
    Alert.prompt(
      'Share list',
      `Enter a friend's handle (e.g. @aria) to share "${listName}". They get read-only access and can clone it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: (value) => void doShare(value) },
      ],
      'plain-text',
      '',
      'default',
    );
  } else {
    // Alert.prompt is iOS-only; a small input modal would replace this on Android.
    Alert.alert('Share', 'Inline sharing prompt is iOS-only in this build.');
  }
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
            if (completed) {
              void vault.reopenItem(item.id);
            } else {
              void haptic.surge();
              void vault.completeItem(item.id);
            }
          }}
          hapticOnPress="none"
          scaleTo={0.85}
        >
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              borderWidth: 1.5,
              borderColor: completed ? palette.success : palette.border,
              backgroundColor: completed ? palette.success : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {completed ? (
              <Text variant="caption" color={palette.onAccent}>
                ✓
              </Text>
            ) : null}
          </View>
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text
            variant="label"
            tone={completed ? 'textFaint' : 'text'}
            style={completed ? { textDecorationLine: 'line-through' } : undefined}
          >
            {item.title}
          </Text>
          {item.category ? (
            <Text variant="caption" tone="textFaint">
              {item.category}
            </Text>
          ) : null}
        </View>
        <Text variant="heading" tone="textFaint">
          ›
        </Text>
      </View>
    </Card>
  );
}
