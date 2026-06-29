/**
 * Compose — a single modal that authors either a quest or a list.
 *
 *   /compose?mode=item[&listId=...]   → new quest, optionally pre-assigned
 *   /compose?mode=list                → new list
 *
 * Deliberately minimal: a large editorial title input, the few fields that
 * matter, and live multi-list assignment for items. Writes through the Vault.
 */

import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { PressableScale } from '@/ui/Pressable';
import { Button, Divider, Eyebrow, Pill, Spacer } from '@/ui/atoms';
import { haptic } from '@/ui/haptics';
import { ListAssign } from '@/components/ListAssign';
import { useVault } from '@/state/VaultProvider';
import { usePalette } from '@/theme/ThemeProvider';
import { RADIUS, SPACING } from '@/theme/themes';

const GLYPHS = ['◆', '✶', '☉', '☾', '✦', '◍', '⊚', '✸', '❖', '⬡'];
const CATEGORIES = ['Absurd Skills', 'Micro-Adventures', 'Craft', 'Places', 'Growth'];

export default function ComposeScreen() {
  const params = useLocalSearchParams<{ mode?: string; listId?: string }>();
  const mode = params.mode === 'list' ? 'list' : 'item';
  const palette = usePalette();
  const vault = useVault();

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Eyebrow>{mode === 'list' ? 'New List' : 'New Quest'}</Eyebrow>
        <PressableScale onPress={() => router.back()} hapticOnPress="tap">
          <Text variant="label" tone="textMuted">
            Cancel
          </Text>
        </PressableScale>
      </View>
      <Spacer size={SPACING.lg} />
      <Divider />
      <Spacer size={SPACING.xl} />

      {mode === 'list' ? (
        <ListComposer
          onCreate={async (input) => {
            await haptic.success();
            const list = await vault.createList(input);
            router.replace(`/list/${list.id}`);
          }}
        />
      ) : (
        <ItemComposer
          initialListId={params.listId}
          onCreate={async (input) => {
            await haptic.success();
            await vault.createItem(input);
            router.back();
          }}
        />
      )}
    </Screen>
  );
}

/* --------------------------------------------------------------- Item form */

function ItemComposer({
  initialListId,
  onCreate,
}: {
  initialListId?: string;
  onCreate: (input: { title: string; subtitle?: string; category?: string; listIds: string[] }) => void;
}) {
  const palette = usePalette();
  const vault = useVault();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [listIds, setListIds] = useState<string[]>(initialListId ? [initialListId] : []);

  const toggleList = (id: string) =>
    setListIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <View>
      <BigInput value={title} onChangeText={setTitle} placeholder="What's the quest?" />
      <Spacer size={SPACING.lg} />
      <FieldInput value={subtitle} onChangeText={setSubtitle} placeholder="A one-line note (optional)" />

      <Spacer size={SPACING.xl} />
      <Eyebrow>Category</Eyebrow>
      <Spacer size={SPACING.md} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
        {CATEGORIES.map((c) => (
          <Pill
            key={c}
            label={c}
            active={category === c}
            onPress={() => setCategory((cur) => (cur === c ? undefined : c))}
          />
        ))}
      </View>

      <Spacer size={SPACING.xl} />
      <ListAssign lists={vault.lists} selectedIds={listIds} onToggle={toggleList} title="Add to lists" />

      <Spacer size={SPACING.xxl} />
      <Button
        label="Create quest"
        disabled={title.trim().length === 0}
        onPress={() => onCreate({ title, subtitle: subtitle || undefined, category, listIds })}
      />
    </View>
  );
}

/* --------------------------------------------------------------- List form */

function ListComposer({
  onCreate,
}: {
  onCreate: (input: {
    name: string;
    glyph: string;
    description?: string;
    isPublic: boolean;
    isPrivate: boolean;
  }) => void;
}) {
  const palette = usePalette();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [glyph, setGlyph] = useState(GLYPHS[0]);
  const [isPublic, setIsPublic] = useState(false);

  return (
    <View>
      <BigInput value={name} onChangeText={setName} placeholder="Name the list" />
      <Spacer size={SPACING.lg} />
      <FieldInput value={description} onChangeText={setDescription} placeholder="A short intent (optional)" />

      <Spacer size={SPACING.xl} />
      <Eyebrow>Sigil</Eyebrow>
      <Spacer size={SPACING.md} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
        {GLYPHS.map((g) => {
          const on = glyph === g;
          return (
            <PressableScale key={g} onPress={() => setGlyph(g)} hapticOnPress="select" scaleTo={0.9}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: RADIUS.md,
                  borderWidth: on ? 2 : 1,
                  borderColor: on ? palette.accent : palette.border,
                  backgroundColor: on ? palette.surfaceAlt : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="heading" color={on ? palette.accent : palette.textMuted}>
                  {g}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>

      <Spacer size={SPACING.xl} />
      <Eyebrow>Visibility</Eyebrow>
      <Spacer size={SPACING.md} />
      <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
        <Pill label="○ Private" active={!isPublic} onPress={() => setIsPublic(false)} />
        <Pill label="◉ Public" active={isPublic} tone="cool" onPress={() => setIsPublic(true)} />
      </View>

      <Spacer size={SPACING.xxl} />
      <Button
        label="Create list"
        disabled={name.trim().length === 0}
        onPress={() =>
          onCreate({
            name,
            glyph,
            description: description || undefined,
            isPublic,
            isPrivate: !isPublic,
          })
        }
      />
    </View>
  );
}

/* ------------------------------------------------------------------ inputs */

function BigInput(props: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
  const palette = usePalette();
  return (
    <TextInput
      {...props}
      placeholderTextColor={palette.textFaint}
      style={{
        color: palette.text,
        fontSize: 28,
        lineHeight: 34,
        fontWeight: '700',
        letterSpacing: -0.6,
        paddingVertical: SPACING.sm,
      }}
      multiline
      autoFocus
    />
  );
}

function FieldInput(props: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
  const palette = usePalette();
  return (
    <TextInput
      {...props}
      placeholderTextColor={palette.textFaint}
      style={{
        color: palette.text,
        fontSize: 16,
        lineHeight: 23,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
      }}
    />
  );
}
