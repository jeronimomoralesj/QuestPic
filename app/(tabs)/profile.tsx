/**
 * You — identity, stats, and the Theme Engine control room.
 *
 * The theme picker is the star: each swatch previews its palette inline and
 * applies instantly with a fluid cross-fade of the entire app. Stats summarise
 * the vault. The crew section shows the simulated peer environment.
 */

import React from 'react';
import { View } from 'react-native';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { PressableScale } from '@/ui/Pressable';
import { Button, Card, Divider, Eyebrow, GlyphChip, Spacer } from '@/ui/atoms';
import { haptic } from '@/ui/haptics';
import { useTheme, usePalette } from '@/theme/ThemeProvider';
import { THEMES, THEME_ORDER, RADIUS, SPACING, type ThemeName } from '@/theme/themes';
import { useVault } from '@/state/VaultProvider';
import { useAuth } from '@/auth/AuthProvider';
import { relativeTime } from '@/utils/time';
import type { SyncOutcome } from '@/sync/engine';

export default function ProfileScreen() {
  const palette = usePalette();
  const { themeName, setTheme } = useTheme();
  const { items, lists, completedCount, crew, sync, syncNow } = useVault();
  const { user, signOut } = useAuth();

  return (
    <Screen bottomInset={96}>
      <Eyebrow>QuestPic · You</Eyebrow>
      <Spacer size={SPACING.sm} />
      <Text variant="display">{user?.name ?? 'Studio'}.</Text>
      <Spacer size={SPACING.xs} />
      <Text variant="body" tone="textMuted">
        {user ? `Signed in as ${user.handle}` : "Tune the app's entire visual soul."}
      </Text>

      {user ? (
        <>
          <Spacer size={SPACING.lg} />
          <Card bordered>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
              <GlyphChip glyph={user.avatar} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="label">{user.name}</Text>
                <Text variant="caption" tone="textFaint">
                  {user.handle} · {user.email}
                </Text>
              </View>
              <PressableScale onPress={() => void signOut()} hapticOnPress="warning">
                <Text variant="label" tone="warm">
                  Sign out
                </Text>
              </PressableScale>
            </View>
          </Card>
        </>
      ) : null}

      {/* Stats */}
      <Spacer size={SPACING.xl} />
      <View style={{ flexDirection: 'row', gap: SPACING.md }}>
        <Stat value={completedCount} label="Answered" tone="success" />
        <Stat value={items.length - completedCount} label="Open" tone="accent" />
        <Stat value={lists.length} label="Lists" tone="cool" />
      </View>

      {/* Cloud sync */}
      <Spacer size={SPACING.xxl} />
      <Eyebrow>Cloud Sync · MongoDB Atlas</Eyebrow>
      <Spacer size={SPACING.md} />
      <SyncPanel sync={sync} onSync={syncNow} />

      {/* Theme engine */}
      <Spacer size={SPACING.xxl} />
      <Eyebrow>Theme Engine</Eyebrow>
      <Spacer size={SPACING.md} />
      {THEME_ORDER.map((name) => (
        <ThemeSwatch
          key={name}
          name={name}
          active={themeName === name}
          onPress={() => {
            void haptic.press();
            setTheme(name);
          }}
        />
      ))}

      {/* Crew */}
      <Spacer size={SPACING.xxl} />
      <Eyebrow>Your Crew</Eyebrow>
      <Spacer size={SPACING.xs} />
      <Text variant="caption" tone="textFaint">
        Simulated peers you can tag on milestones + collaborate with on lists.
      </Text>
      <Spacer size={SPACING.md} />
      <Card bordered>
        {crew.map((c, i) => (
          <View key={c.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm }}>
              <GlyphChip glyph={c.avatar} size={38} />
              <View style={{ flex: 1 }}>
                <Text variant="label">{c.name}</Text>
                <Text variant="caption" tone="textFaint">
                  {c.handle}
                </Text>
              </View>
            </View>
            {i < crew.length - 1 && <Divider />}
          </View>
        ))}
      </Card>
      <Spacer size={SPACING.xl} />
      <Text variant="caption" tone="textFaint" center>
        QuestPic · local-first · serverless · {items.length} quests on this device
      </Text>
    </Screen>
  );
}

function SyncPanel({
  sync,
  onSync,
}: {
  sync: { configured: boolean; syncing: boolean; lastOutcome?: SyncOutcome };
  onSync: () => void;
}) {
  const palette = usePalette();
  const outcome = sync.lastOutcome;

  let statusColor = palette.textFaint;
  let statusText = 'Idle';
  if (!sync.configured) {
    statusColor = palette.textFaint;
    statusText = 'Local only — no server configured';
  } else if (sync.syncing) {
    statusColor = palette.cool;
    statusText = 'Syncing…';
  } else if (outcome?.ok) {
    statusColor = palette.success;
    statusText = `Synced · ↓${outcome.pulled} ↑${outcome.pushed} · ${relativeTime(outcome.at)}`;
  } else if (outcome && !outcome.ok) {
    statusColor = palette.warm;
    statusText =
      outcome.error === 'not-configured' ? 'Local only' : `Offline · ${outcome.error ?? 'unreachable'}`;
  }

  return (
    <Card bordered>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
        <Text variant="label" color={statusColor} style={{ flex: 1 }}>
          {statusText}
        </Text>
      </View>
      <Spacer size={SPACING.xs} />
      <Text variant="caption" tone="textFaint">
        Your quests live on-device first, then converge to MongoDB Atlas through your
        sync API. Works offline; deletions propagate too.
      </Text>
      <Spacer size={SPACING.md} />
      <Button
        label={sync.syncing ? 'Syncing…' : 'Sync now'}
        tone="cool"
        variant="outline"
        disabled={!sync.configured || sync.syncing}
        onPress={onSync}
      />
    </Card>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: 'success' | 'accent' | 'cool' }) {
  const palette = usePalette();
  return (
    <View
      style={{
        flex: 1,
        padding: SPACING.lg,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
      }}
    >
      <Text variant="title" color={palette[tone]}>
        {value}
      </Text>
      <Spacer size={2} />
      <Text variant="caption" tone="textFaint" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Text>
    </View>
  );
}

function ThemeSwatch({ name, active, onPress }: { name: ThemeName; active: boolean; onPress: () => void }) {
  const palette = usePalette();
  const theme = THEMES[name];
  const p = theme.palette;
  return (
    <PressableScale onPress={onPress} hapticOnPress="none" scaleTo={0.985}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.lg,
          padding: SPACING.md,
          marginBottom: SPACING.md,
          borderRadius: RADIUS.lg,
          borderWidth: active ? 2 : 1,
          borderColor: active ? palette.accent : palette.border,
          backgroundColor: palette.surface,
        }}
      >
        {/* Mini palette preview rendered in the theme's own colors */}
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: RADIUS.md,
            backgroundColor: p.bg,
            borderWidth: 1,
            borderColor: p.border,
            padding: 8,
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Dot color={p.accent} />
            <Dot color={p.cool} />
            <Dot color={p.warm} />
          </View>
          <View style={{ height: 3, width: '70%', backgroundColor: p.text, borderRadius: 2 }} />
          <View style={{ height: 3, width: '45%', backgroundColor: p.textMuted, borderRadius: 2 }} />
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="heading">{theme.label}</Text>
          <Spacer size={2} />
          <Text variant="caption" tone="textMuted">
            {theme.tagline}
          </Text>
        </View>

        {active ? (
          <Text variant="heading" tone="accent">
            ✓
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />;
}
