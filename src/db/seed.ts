/**
 * First-run seed data. Runs exactly once (guarded by collection counts) so the
 * app opens onto a curated, alive-feeling state instead of an empty void:
 * a couple of starter lists, the Spark Deck, a simulated crew, and a Registry
 * feed of friends' completed quests ready to be cloned.
 */

import { initCollections, registry } from './repositories';
import type { Collaborator, RegistryEntry, SparkCard } from './types';

/** Simulated peer environment — the "crew" you can tag + collaborate with. */
export const CREW: Collaborator[] = [
  { id: 'cr_aria', handle: '@aria', name: 'Aria Voss', avatar: '🜂' },
  { id: 'cr_kai', handle: '@kai', name: 'Kai Mercer', avatar: '🜄' },
  { id: 'cr_noor', handle: '@noor', name: 'Noor El-Amin', avatar: '🜃' },
  { id: 'cr_juno', handle: '@juno', name: 'Juno Park', avatar: '🜁' },
];

/**
 * The Spark Deck — deliberately non-cliché. No "skydiving" or "see the Northern
 * Lights". These reward curiosity and skew toward absurd skill + micro-adventure.
 */
export const SPARK_CARDS: SparkCard[] = [
  { id: 'sp_1', title: 'Learn to whistle with a blade of grass', subtitle: 'A 4,000-year-old party trick', category: 'Absurd Skills', accentKey: 'warm' },
  { id: 'sp_2', title: 'Eat breakfast where you ate dinner — 400km away', subtitle: 'Night train, no plan', category: 'Micro-Adventures', accentKey: 'cool' },
  { id: 'sp_3', title: 'Identify three birds by song alone', subtitle: 'Ears before eyes', category: 'Absurd Skills', accentKey: 'primary' },
  { id: 'sp_4', title: 'Spend a full day speaking only in questions', subtitle: 'Harder than it sounds', category: 'Absurd Skills', accentKey: 'warm' },
  { id: 'sp_5', title: 'Watch a sunrise from a rooftop you have never stood on', subtitle: 'Permission optional', category: 'Micro-Adventures', accentKey: 'cool' },
  { id: 'sp_6', title: 'Fold a one-sheet origami crane from memory', subtitle: 'No diagram, no peeking', category: 'Absurd Skills', accentKey: 'primary' },
  { id: 'sp_7', title: 'Cook a dish from a country you cannot place on a map', subtitle: 'Then learn where it is', category: 'Micro-Adventures', accentKey: 'warm' },
  { id: 'sp_8', title: 'Learn to skip a stone five times', subtitle: 'Physics you can feel', category: 'Absurd Skills', accentKey: 'cool' },
  { id: 'sp_9', title: 'Send a hand-written letter to your future self', subtitle: 'Open in exactly one year', category: 'Micro-Adventures', accentKey: 'primary' },
  { id: 'sp_10', title: 'Memorise the constellation directly above your home', subtitle: 'And find it from somewhere else', category: 'Absurd Skills', accentKey: 'cool' },
];

const REGISTRY_SEED: RegistryEntry[] = [
  {
    id: 're_1',
    author: CREW[0],
    title: 'Played a full song on a borrowed street piano',
    subtitle: 'Lisbon, at golden hour, to four strangers',
    category: 'Micro-Adventures',
    geoLabel: 'Lisboa, PT',
    completedAt: Date.now() - 1000 * 60 * 60 * 6,
    reactions: { fire: 12, awe: 5, clap: 3 },
  },
  {
    id: 're_2',
    author: CREW[1],
    title: 'Learned to solve a Rubik’s cube under 60 seconds',
    subtitle: '47 seconds, finally',
    category: 'Absurd Skills',
    completedAt: Date.now() - 1000 * 60 * 60 * 28,
    reactions: { fire: 8, awe: 9 },
  },
  {
    id: 're_3',
    author: CREW[2],
    title: 'Swam in three seas in a single week',
    subtitle: 'Adriatic, Ionian, Aegean',
    category: 'Micro-Adventures',
    geoLabel: 'Aegean coast',
    completedAt: Date.now() - 1000 * 60 * 60 * 73,
    reactions: { fire: 21, awe: 11, clap: 6 },
  },
];

/**
 * First-run local bootstrap. Items and lists now belong to the signed-in cloud
 * account (pulled from the server), so we no longer seed demo quests — a new
 * account starts clean. We only seed the local, non-synced Registry demo feed so
 * the social tab isn't empty before the real friend feed is wired up.
 */
export async function seedIfEmpty(): Promise<void> {
  await initCollections();

  if ((await registry.count()) === 0) {
    const now = Date.now();
    await registry.bulkInsert(
      REGISTRY_SEED.map((e) => ({ ...e, createdAt: now, updatedAt: now })),
    );
  }
}
