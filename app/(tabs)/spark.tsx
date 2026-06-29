/**
 * The Spark Deck.
 *
 * A swipeable deck of deliberately non-cliché ideas. Pick a target list with the
 * pills up top; fling a card right to inject it into that list as a fresh open
 * quest (haptic confirm), or left to skip. The deck is gesture-driven via
 * react-native-gesture-handler with all motion on the UI thread.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Button, Eyebrow, Pill, Spacer } from '@/ui/atoms';
import { haptic } from '@/ui/haptics';
import { SparkCardView, SWIPE_THRESHOLD } from '@/components/SparkCardView';
import { useVault } from '@/state/VaultProvider';
import { SPARK_CARDS } from '@/db/seed';
import { usePalette } from '@/theme/ThemeProvider';
import { SPACING } from '@/theme/themes';

export default function SparkScreen() {
  const palette = usePalette();
  const { lists, createItem } = useVault();
  const [index, setIndex] = useState(0);
  const [targetListId, setTargetListId] = useState<string | null>(null);
  const [keptCount, setKeptCount] = useState(0);

  const translateX = useSharedValue(0);
  const deck = SPARK_CARDS;
  const remaining = deck.length - index;

  const effectiveTarget = targetListId ?? lists[0]?.id ?? null;
  const targetLabel =
    lists.find((l) => l.id === effectiveTarget)?.name ?? 'Open Quests';

  const advance = useCallback(() => {
    translateX.value = 0;
    setIndex((i) => i + 1);
  }, [translateX]);

  const onKeep = useCallback(
    (cardIndex: number) => {
      const card = deck[cardIndex];
      if (!card) return;
      void createItem({
        title: card.title,
        subtitle: card.subtitle,
        category: card.category,
        listIds: effectiveTarget ? [effectiveTarget] : [],
      });
      setKeptCount((c) => c + 1);
      void haptic.success();
      advance();
    },
    [deck, createItem, effectiveTarget, advance],
  );

  const onSkip = useCallback(() => {
    void haptic.select();
    advance();
  }, [advance]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((e) => {
          translateX.value = e.translationX;
        })
        .onEnd((e) => {
          if (e.translationX > SWIPE_THRESHOLD) {
            translateX.value = withTiming(500, { duration: 220 }, () => {
              runOnJS(onKeep)(index);
            });
          } else if (e.translationX < -SWIPE_THRESHOLD) {
            translateX.value = withTiming(-500, { duration: 220 }, () => {
              runOnJS(onSkip)();
            });
          } else {
            translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
          }
        }),
    [translateX, onKeep, onSkip, index],
  );

  return (
    <Screen bottomInset={96} scroll={false}>
      <Eyebrow>QuestPic · Spark Deck</Eyebrow>
      <Spacer size={SPACING.sm} />
      <Text variant="title">Inject an idea.</Text>
      <Spacer size={SPACING.xs} />
      <Text variant="body" tone="textMuted">
        Sending kept cards to{' '}
        <Text variant="body" tone="accent">
          {targetLabel}
        </Text>
        .
      </Text>

      {/* Target list selector */}
      <Spacer size={SPACING.lg} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
        {lists.map((l) => (
          <Pill
            key={l.id}
            label={`${l.glyph} ${l.name}`}
            active={effectiveTarget === l.id}
            onPress={() => setTargetListId(l.id)}
          />
        ))}
      </View>

      {/* Deck */}
      <View style={{ flex: 1, marginTop: SPACING.xl, marginBottom: SPACING.lg }}>
        {remaining <= 0 ? (
          <DeckEmpty keptCount={keptCount} />
        ) : (
          <View style={{ flex: 1, position: 'relative' }}>
            {deck
              .slice(index, index + 3)
              .map((card, stackPos) => {
                const isTop = stackPos === 0;
                const cardEl = (
                  <SparkCardView
                    card={card}
                    translateX={translateX}
                    isTop={isTop}
                    stackIndex={stackPos}
                  />
                );
                return isTop ? (
                  <GestureDetector gesture={panGesture} key={card.id}>
                    {cardEl}
                  </GestureDetector>
                ) : (
                  <React.Fragment key={card.id}>{cardEl}</React.Fragment>
                );
              })
              .reverse()}
          </View>
        )}
      </View>

      {/* Manual controls (accessibility + non-gesture path) */}
      {remaining > 0 && (
        <View style={{ flexDirection: 'row', gap: SPACING.md }}>
          <View style={{ flex: 1 }}>
            <Button label="Skip" tone="warm" variant="outline" onPress={onSkip} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Keep" tone="success" onPress={() => onKeep(index)} />
          </View>
        </View>
      )}
    </Screen>
  );
}

function DeckEmpty({ keptCount }: { keptCount: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text variant="display" tone="accent" center>
        ✦
      </Text>
      <Spacer size={SPACING.md} />
      <Text variant="heading" center>
        Deck cleared.
      </Text>
      <Spacer size={SPACING.xs} />
      <Text variant="body" tone="textMuted" center>
        You injected {keptCount} {keptCount === 1 ? 'idea' : 'ideas'} this round.
      </Text>
      <Spacer size={SPACING.xl} />
      <Button label="Back to the Vault" onPress={() => router.replace('/(tabs)')} />
    </View>
  );
}
