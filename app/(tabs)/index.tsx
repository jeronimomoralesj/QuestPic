/**
 * The Vault — curation home.
 *
 * An editorial overview: a living progress line, the user's lists rendered as
 * generous tap rows (glyph · name · membership · visibility), and the most
 * recent open quests. Everything routes deeper; nothing is a stock card grid.
 */

import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { PressableScale } from '@/ui/Pressable';
import { Button, Card, Divider, Eyebrow, GlyphChip, Pill, Spacer } from '@/ui/atoms';
import { useVault } from '@/state/VaultProvider';
import { usePalette } from '@/theme/ThemeProvider';
import { SPACING } from '@/theme/themes';
import type { BucketItem, BucketList } from '@/db/types';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Still awake';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function VaultScreen() {
  const palette = usePalette();
  const { lists, items, completedCount, ready, itemsInList } = useVault();

  const openItems = useMemo(
    () => items.filter((i) => i.status === 'open').slice(-6).reverse(),
    [items],
  );
  const total = items.length;
  const progress = total === 0 ? 0 : completedCount / total;

  return (
    <Screen bottomInset={96}>
      {/* Masthead */}
      <Eyebrow>QuestPic · The Vault</Eyebrow>
      <Spacer size={SPACING.sm} />
      <Text variant="display">{greeting()}.</Text>
      <Spacer size={SPACING.xs} />
      <Text variant="body" tone="textMuted">
        {total === 0
          ? 'A blank slate. Spark your first quest below.'
          : `${completedCount} of ${total} quests answered.`}
      </Text>

      <Spacer size={SPACING.xl} />
      <ProgressLine progress={progress} />
      <Spacer size={SPACING.xxl} />

      {/* Lists */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Eyebrow>Your Lists</Eyebrow>
        <PressableScale onPress={() => router.push('/compose?mode=list')} hapticOnPress="tap">
          <Text variant="label" tone="accent">+ New list</Text>
        </PressableScale>
      </View>
      <Spacer size={SPACING.md} />

      {ready && lists.length === 0 ? (
        <EmptyHint text="No lists yet. Create one to start curating." />
      ) : (
        lists.map((list) => (
          <ListRow key={list.id} list={list} count={itemsInList(list.id).length} />
        ))
      )}

      <Spacer size={SPACING.xxl} />

      {/* Recent open quests */}
      <Eyebrow>Open Quests</Eyebrow>
      <Spacer size={SPACING.md} />
      {openItems.length === 0 ? (
        <EmptyHint text="Nothing open. Pull an idea from the Spark Deck." />
      ) : (
        openItems.map((item) => <OpenItemRow key={item.id} item={item} />)
      )}

      <Spacer size={SPACING.xl} />
      <Button
        label="Compose a quest"
        onPress={() => router.push('/compose?mode=item')}
      />
    </Screen>
  );
}

function ProgressLine({ progress }: { progress: number }) {
  const palette = usePalette();
  return (
    <View>
      <View
        style={{
          height: 3,
          backgroundColor: palette.surfaceAlt,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: '100%',
            backgroundColor: palette.accent,
          }}
        />
      </View>
      <Spacer size={SPACING.sm} />
      <Text variant="caption" tone="textFaint">
        {Math.round(progress * 100)}% of your vault answered
      </Text>
    </View>
  );
}

function ListRow({ list, count }: { list: BucketList; count: number }) {
  const palette = usePalette();
  return (
    <PressableScale
      onPress={() => router.push(`/list/${list.id}`)}
      hapticOnPress="tap"
      scaleTo={0.99}
    >
      <View style={{ paddingVertical: SPACING.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
          <GlyphChip glyph={list.glyph} />
          <View style={{ flex: 1 }}>
            <Text variant="heading" numberOfLines={1}>
              {list.name}
            </Text>
            <Spacer size={2} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <Text variant="caption" tone="textFaint">
                {count} {count === 1 ? 'quest' : 'quests'}
              </Text>
              <Text variant="caption" tone="textFaint">·</Text>
              <Text
                variant="caption"
                color={list.isPublic ? palette.cool : palette.textFaint}
              >
                {list.isPublic ? 'Public' : 'Private'}
              </Text>
              {list.collaborators.length > 0 && (
                <>
                  <Text variant="caption" tone="textFaint">·</Text>
                  <Text variant="caption" tone="warm">
                    {list.collaborators.length} crew
                  </Text>
                </>
              )}
            </View>
          </View>
          <Text variant="heading" tone="textFaint">›</Text>
        </View>
      </View>
      <Divider />
    </PressableScale>
  );
}

function OpenItemRow({ item }: { item: BucketItem }) {
  return (
    <Card
      onPress={() => router.push(`/item/${item.id}`)}
      style={{ marginBottom: SPACING.md }}
    >
      {item.category ? (
        <>
          <Eyebrow tone="accent">{item.category}</Eyebrow>
          <Spacer size={SPACING.sm} />
        </>
      ) : null}
      <Text variant="heading">{item.title}</Text>
      {item.subtitle ? (
        <>
          <Spacer size={SPACING.xs} />
          <Text variant="body" tone="textMuted">
            {item.subtitle}
          </Text>
        </>
      ) : null}
    </Card>
  );
}

function EmptyHint({ text }: { text: string }) {
  const palette = usePalette();
  return (
    <View
      style={{
        paddingVertical: SPACING.xl,
        paddingHorizontal: SPACING.lg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
        borderStyle: 'dashed',
      }}
    >
      <Text variant="body" tone="textFaint" center>
        {text}
      </Text>
    </View>
  );
}
