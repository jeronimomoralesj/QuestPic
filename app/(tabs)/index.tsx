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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Still awake';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function VaultScreen() {
  const palette = usePalette();
  const { lists, items, completedCount, ready, itemsInList, refresh, syncNow } = useVault();

  const worldMapItem = useMemo(
    () => items.find((i) => i.template === 'travel-map') ?? null,
    [items],
  );

  const openItems = useMemo(
    () => items.filter((i) => i.status === 'open' && i.template !== 'travel-map').slice(-6).reverse(),
    [items],
  );

  const completedItems = useMemo(
    () => items
      .filter((i) => i.status === 'completed')
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
    [items],
  );

  const regularCount = items.filter((i) => i.template !== 'travel-map').length;
  const progress = regularCount === 0 ? 0 : completedCount / regularCount;

  return (
    <Screen bottomInset={96} onRefresh={async () => { await syncNow(); await refresh(); }}>
      {/* Masthead */}
      <Eyebrow>QuestPic · The Vault</Eyebrow>
      <Spacer size={SPACING.sm} />
      <Text variant="display">{greeting()}.</Text>
      <Spacer size={SPACING.xs} />
      <Text variant="body" tone="textMuted">
        {regularCount === 0
          ? 'A blank slate. Spark your first quest below.'
          : `${completedCount} of ${regularCount} quests answered.`}
      </Text>

      <Spacer size={SPACING.xl} />
      <ProgressLine progress={progress} />
      <Spacer size={SPACING.xxl} />

      {/* World Map pinned card */}
      {worldMapItem && <WorldMapCard item={worldMapItem} />}

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

      {completedItems.length > 0 && (
        <>
          <Spacer size={SPACING.xxl} />
          <Eyebrow tone="accent">Answered · {completedItems.length}</Eyebrow>
          <Spacer size={SPACING.md} />
          {completedItems.map((item) => <CompletedItemRow key={item.id} item={item} />)}
        </>
      )}
    </Screen>
  );
}

function WorldMapCard({ item }: { item: BucketItem }) {
  const palette = usePalette();
  const visited = (item.travelPins ?? []).filter((p) => p.status === 'visited').length;
  const want = (item.travelPins ?? []).filter((p) => p.status === 'want').length;
  return (
    <PressableScale onPress={() => router.push(`/item/${item.id}`)} hapticOnPress="tap" scaleTo={0.98}>
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: palette.cool,
          backgroundColor: palette.cool + '11',
          padding: SPACING.lg,
          marginBottom: SPACING.xl,
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.lg,
        }}
      >
        <Text variant="display" color={palette.cool} style={{ fontSize: 28 }}>◍</Text>
        <View style={{ flex: 1 }}>
          <Text variant="label" color={palette.cool}>{item.title}</Text>
          <Text variant="caption" tone="textFaint">{visited} visited · {want} want to go</Text>
        </View>
        <Text variant="heading" tone="textFaint">›</Text>
      </View>
    </PressableScale>
  );
}

function CompletedItemRow({ item }: { item: BucketItem }) {
  const palette = usePalette();
  return (
    <Card onPress={() => router.push(`/item/${item.id}`)} style={{ marginBottom: SPACING.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: palette.success,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Text variant="caption" color={palette.onAccent}>✓</Text>
        </View>
        <View style={{ flex: 1 }}>
          {item.category ? (
            <Text variant="caption" tone="accent" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              {item.category}
            </Text>
          ) : null}
          <Text variant="heading" tone="textFaint" style={{ textDecorationLine: 'line-through' }}>{item.title}</Text>
          {item.completedAt ? (
            <Text variant="caption" color={palette.success}>{formatDate(item.completedAt)}</Text>
          ) : null}
        </View>
        <Text variant="heading" tone="textFaint">›</Text>
      </View>
    </Card>
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
