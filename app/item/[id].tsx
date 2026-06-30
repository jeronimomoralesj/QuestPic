/**
 * Item detail — the Achievement Canvas + Memory Studio.
 *
 * An open quest shows its multi-list assignment and a single, weighty completion
 * action. Triggering completion fires the choreographed haptic surge and a
 * high-fidelity confetti burst, then unlocks the Memory Studio: photo journal,
 * geo-pinpoint, crew tagging, and a reflection note. Reopening is always one tap
 * away. Everything writes straight through to the local store.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { PressableScale } from '@/ui/Pressable';
import { Button, Card, Divider, Eyebrow, Spacer } from '@/ui/atoms';
import { Confetti } from '@/ui/Confetti';
import { haptic } from '@/ui/haptics';
import { ListAssign } from '@/components/ListAssign';
import { PhotoJournal } from '@/components/PhotoJournal';
import { GeoPinpoint } from '@/components/GeoPinpoint';
import { CrewTagging } from '@/components/CrewTagging';
import { CountryMap } from '@/components/CountryMap';
import type { CountryPin } from '@/db/types';
import { useVault } from '@/state/VaultProvider';
import { usePalette } from '@/theme/ThemeProvider';
import { SPACING, RADIUS } from '@/theme/themes';
import { formatDate } from '@/utils/time';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = usePalette();
  const vault = useVault();
  const item = vault.itemById(id);

  const [burstKey, setBurstKey] = useState(0);
  const [note, setNote] = useState(item?.memory?.note ?? '');

  const completed = item?.status === 'completed';

  const onComplete = useCallback(async () => {
    if (!item) return;
    void haptic.surge();
    setBurstKey((k) => k + 1);
    await vault.completeItem(item.id);
  }, [item, vault]);

  const onReopen = useCallback(async () => {
    if (!item) return;
    await haptic.warning();
    await vault.reopenItem(item.id);
  }, [item, vault]);

  const saveNote = useCallback(() => {
    if (!item) return;
    void vault.setMemoryNote(item.id, note);
    void haptic.tap();
  }, [item, vault, note]);

  const memory = useMemo(() => item?.memory ?? { photos: [], crew: [] }, [item]);

  if (!item) {
    return (
      <Screen>
        <Spacer size={SPACING.xxl} />
        <Text variant="title">Not found.</Text>
        <Spacer size={SPACING.md} />
        <Button label="Back" variant="outline" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <>
      <Screen bottomInset={SPACING.xxl}>
        {/* Top bar */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <PressableScale onPress={() => router.back()} hapticOnPress="tap">
            <Text variant="heading" tone="textMuted">
              ‹ Back
            </Text>
          </PressableScale>
          <PressableScale
            onPress={async () => {
              await haptic.warning();
              await vault.deleteItem(item.id);
              router.back();
            }}
            hapticOnPress="none"
          >
            <Text variant="caption" tone="textFaint">
              Delete
            </Text>
          </PressableScale>
        </View>

        <Spacer size={SPACING.xl} />
        {item.category ? <Eyebrow tone="accent">{item.category}</Eyebrow> : null}
        <Spacer size={SPACING.sm} />
        <Text variant="title">{item.title}</Text>
        {item.subtitle ? (
          <>
            <Spacer size={SPACING.sm} />
            <Text variant="body" tone="textMuted">
              {item.subtitle}
            </Text>
          </>
        ) : null}

        {/* Status badge */}
        <Spacer size={SPACING.lg} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: completed ? palette.success : palette.warm,
            }}
          />
          <Text variant="caption" color={completed ? palette.success : palette.warm}>
            {completed
              ? `Answered ${item.completedAt ? formatDate(item.completedAt) : ''}`
              : 'Open quest'}
          </Text>
        </View>

        <Spacer size={SPACING.xl} />
        <Divider />
        <Spacer size={SPACING.xl} />

        {/* Multi-list assignment */}
        <ListAssign
          lists={vault.lists}
          selectedIds={item.listIds}
          onToggle={(listId) => vault.toggleItemInList(item.id, listId)}
        />

        <Spacer size={SPACING.xxl} />

        {/* Travel Map — shown for travel-map template items */}
        {item.template === 'travel-map' && (
          <>
            <Divider />
            <Spacer size={SPACING.xl} />
            <CountryMap
              pins={item.travelPins ?? []}
              onUpdate={(pins: CountryPin[]) => vault.setTravelPins(item.id, pins)}
            />
            <Spacer size={SPACING.xl} />
            <Divider />
            <Spacer size={SPACING.xl} />
          </>
        )}

        {completed ? (
          /* ---------- The Memory Studio ---------- */
          <View>
            <Card bordered style={{ borderColor: palette.success }}>
              <Text variant="eyebrow" color={palette.success} style={{ textTransform: 'uppercase' }}>
                Memory Studio · Unlocked
              </Text>
              <Spacer size={SPACING.sm} />
              <Text variant="body" tone="textMuted">
                The quest is answered. Capture how it felt.
              </Text>
            </Card>

            <Spacer size={SPACING.xl} />
            <PhotoJournal
              photos={memory.photos}
              onAdd={(photo) => vault.addPhoto(item.id, photo)}
              onRemove={(photoId) => vault.removePhoto(item.id, photoId)}
            />

            <Spacer size={SPACING.xxl} />
            <GeoPinpoint pin={memory.geo} onDrop={(geo) => vault.setGeoPin(item.id, geo)} />

            <Spacer size={SPACING.xxl} />
            <CrewTagging
              crew={vault.crew}
              taggedIds={memory.crew}
              onToggle={(cid) => vault.toggleCrew(item.id, cid)}
            />

            <Spacer size={SPACING.xxl} />
            <Eyebrow>Reflection</Eyebrow>
            <Spacer size={SPACING.md} />
            <TextInput
              value={note}
              onChangeText={setNote}
              onBlur={saveNote}
              placeholder="What will you remember about this?"
              placeholderTextColor={palette.textFaint}
              multiline
              style={{
                color: palette.text,
                fontSize: 16,
                lineHeight: 23,
                minHeight: 90,
                padding: SPACING.lg,
                borderRadius: RADIUS.lg,
                borderWidth: 1,
                borderColor: palette.border,
                backgroundColor: palette.surface,
                textAlignVertical: 'top',
              }}
            />

            <Spacer size={SPACING.xxl} />
            <Button label="Reopen this quest" tone="warm" variant="outline" onPress={onReopen} />
          </View>
        ) : (
          /* ---------- The Achievement trigger ---------- */
          <View>
            <Eyebrow>The Achievement Canvas</Eyebrow>
            <Spacer size={SPACING.md} />
            <Text variant="body" tone="textMuted">
              Mark this done to unlock the Memory Studio — photos, a geo-pin, your
              crew, and a note.
            </Text>
            <Spacer size={SPACING.xl} />
            <Button label="✦  Complete this quest" tone="success" hapticOnPress="heavy" onPress={onComplete} />
          </View>
        )}
      </Screen>

      {/* Confetti overlays the whole screen, above content but ignoring touches. */}
      <Confetti burstKey={burstKey} />
    </>
  );
}
