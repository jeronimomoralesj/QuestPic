import { initCollections, items, registry } from './repositories';
import type { BucketItem, Collaborator, SparkCard } from './types';

export const CREW: Collaborator[] = [
  { id: 'cr_aria', handle: '@aria', name: 'Aria Voss', avatar: '🜂' },
  { id: 'cr_kai', handle: '@kai', name: 'Kai Mercer', avatar: '🜄' },
  { id: 'cr_noor', handle: '@noor', name: 'Noor El-Amin', avatar: '🜃' },
  { id: 'cr_juno', handle: '@juno', name: 'Juno Park', avatar: '🜁' },
];

export const SPARK_CARDS: SparkCard[] = [
  // ── Adventure ────────────────────────────────────────────────────────────
  { id: 'sp_adv_1', title: 'Scuba dive in a coral reef', subtitle: 'Weightless in an alien world', category: 'Adventure', accentKey: 'warm' },
  { id: 'sp_adv_2', title: 'Jump from a plane at 15,000 ft', subtitle: 'Three minutes of pure freefall', category: 'Adventure', accentKey: 'warm' },
  { id: 'sp_adv_3', title: 'Bungee jump off a real bridge', subtitle: 'Two seconds of absolute silence first', category: 'Adventure', accentKey: 'warm' },
  { id: 'sp_adv_4', title: 'Catch a wave surfing', subtitle: 'Even one real ride counts', category: 'Adventure', accentKey: 'warm' },
  { id: 'sp_adv_5', title: 'Rock climb an outdoor route', subtitle: 'No walls, no mats, just stone', category: 'Adventure', accentKey: 'warm' },
  { id: 'sp_adv_6', title: 'Run white-water rapids', subtitle: 'Class III at minimum', category: 'Adventure', accentKey: 'warm' },
  { id: 'sp_adv_7', title: 'Paraglide off a ridge', subtitle: 'Birds-eye, no engine, just thermals', category: 'Adventure', accentKey: 'warm' },
  { id: 'sp_adv_8', title: 'Take a polar plunge', subtitle: 'Under 10 °C, fully submerged', category: 'Adventure', accentKey: 'warm' },
  { id: 'sp_adv_9', title: 'Ride a motorbike through a mountain pass', subtitle: 'Hairpin bends, cool air, no agenda', category: 'Adventure', accentKey: 'warm' },
  { id: 'sp_adv_10', title: 'Spend a night in a hammock between two trees', subtitle: 'No tent, no excuses', category: 'Adventure', accentKey: 'warm' },

  // ── Skills ───────────────────────────────────────────────────────────────
  { id: 'sp_sk_1', title: 'Play a full song on guitar from memory', subtitle: 'Three chords minimum, no peeking', category: 'Skills', accentKey: 'primary' },
  { id: 'sp_sk_2', title: 'Hold a conversation in a second language', subtitle: 'Not just "where is the hotel"', category: 'Skills', accentKey: 'primary' },
  { id: 'sp_sk_3', title: 'Build something digital from scratch', subtitle: 'App, bot, or website you actually use', category: 'Skills', accentKey: 'primary' },
  { id: 'sp_sk_4', title: 'Cook one dish entirely from memory', subtitle: 'Recipe on paper before you start', category: 'Skills', accentKey: 'primary' },
  { id: 'sp_sk_5', title: 'Draw a recognisable portrait of someone you know', subtitle: 'No tracing, no filters', category: 'Skills', accentKey: 'primary' },
  { id: 'sp_sk_6', title: 'Throw a pot on a wheel', subtitle: 'Even a wonky one counts', category: 'Skills', accentKey: 'primary' },
  { id: 'sp_sk_7', title: 'Sail a small boat solo', subtitle: 'Wind in command, not you', category: 'Skills', accentKey: 'primary' },
  { id: 'sp_sk_8', title: 'Learn to play chess properly', subtitle: 'Beat someone who already knows how', category: 'Skills', accentKey: 'primary' },
  { id: 'sp_sk_9', title: 'Juggle three objects without dropping', subtitle: 'Five consecutive catches minimum', category: 'Skills', accentKey: 'primary' },
  { id: 'sp_sk_10', title: 'Learn a new instrument from zero', subtitle: 'Piano, violin, ukulele — pick one and commit', category: 'Skills', accentKey: 'primary' },

  // ── Travel ───────────────────────────────────────────────────────────────
  { id: 'sp_tr_0', title: 'Build my World Map', subtitle: 'Track every country — visited and on the list', category: 'Travel', accentKey: 'cool', template: 'travel-map' },
  { id: 'sp_tr_1', title: 'See the Northern Lights', subtitle: 'And accept that no photo does it justice', category: 'Travel', accentKey: 'cool' },
  { id: 'sp_tr_2', title: "Solo trip to a country where you don't speak the language", subtitle: 'Figure it out as you go', category: 'Travel', accentKey: 'cool' },
  { id: 'sp_tr_3', title: 'Sleep overnight on a moving train across a border', subtitle: 'Wake up somewhere new', category: 'Travel', accentKey: 'cool' },
  { id: 'sp_tr_4', title: 'Eat something you genuinely cannot identify at a street market', subtitle: 'Order it anyway', category: 'Travel', accentKey: 'cool' },
  { id: 'sp_tr_5', title: 'Visit a place that changes your answer to "where would you live?"', subtitle: "You'll know it when you get there", category: 'Travel', accentKey: 'cool' },
  { id: 'sp_tr_6', title: 'Watch a sunrise from a summit you climbed the same morning', subtitle: 'Headtorch on, 3 AM start', category: 'Travel', accentKey: 'cool' },
  { id: 'sp_tr_7', title: 'Visit 10 countries', subtitle: 'Stamp the passport, not just the airport', category: 'Travel', accentKey: 'cool' },

  // ── Wellness ─────────────────────────────────────────────────────────────
  { id: 'sp_wl_1', title: 'Run a half-marathon (21.1 km)', subtitle: 'Sign up for a race — accountability helps', category: 'Wellness', accentKey: 'primary' },
  { id: 'sp_wl_2', title: 'Meditate every day for 30 consecutive days', subtitle: '10 minutes counts', category: 'Wellness', accentKey: 'primary' },
  { id: 'sp_wl_3', title: 'Complete a full week with no social media', subtitle: 'Phone stays in the drawer', category: 'Wellness', accentKey: 'primary' },
  { id: 'sp_wl_4', title: 'Swim 1 km in open water', subtitle: 'Ocean, lake, or river', category: 'Wellness', accentKey: 'primary' },
  { id: 'sp_wl_5', title: 'Do 100 push-ups without stopping', subtitle: 'Start at 20 and work up', category: 'Wellness', accentKey: 'primary' },
  { id: 'sp_wl_6', title: 'Sleep outside for a week with no plan', subtitle: 'Camp wherever the day ends', category: 'Wellness', accentKey: 'primary' },

  // ── Creative ─────────────────────────────────────────────────────────────
  { id: 'sp_cr_1', title: 'Write the opening chapter of something real', subtitle: 'Not a draft, not a note — a chapter', category: 'Creative', accentKey: 'warm' },
  { id: 'sp_cr_2', title: 'Record a song — even a voice note counts', subtitle: 'Finished beats perfect', category: 'Creative', accentKey: 'warm' },
  { id: 'sp_cr_3', title: 'Perform something in front of strangers', subtitle: 'Poem, music, standup — anything live', category: 'Creative', accentKey: 'warm' },
  { id: 'sp_cr_4', title: 'Make a short film from idea to edit in one weekend', subtitle: 'Phone camera is fine', category: 'Creative', accentKey: 'warm' },
  { id: 'sp_cr_5', title: 'Start a creative project and actually finish it', subtitle: "Ship it. Doesn't matter what it is.", category: 'Creative', accentKey: 'warm' },

  // ── Money ────────────────────────────────────────────────────────────────
  { id: 'sp_mn_1', title: 'Invest your first real money in the market', subtitle: "Put it in and don't touch it for a year", category: 'Money', accentKey: 'primary' },
  { id: 'sp_mn_2', title: 'Build a 3-month emergency fund', subtitle: 'Three months of expenses, nothing else', category: 'Money', accentKey: 'primary' },
  { id: 'sp_mn_3', title: 'Earn your first dollar from something you made', subtitle: "Product, service, or idea — doesn't matter", category: 'Money', accentKey: 'primary' },
  { id: 'sp_mn_4', title: 'Negotiate a raise, a rate, or a price — and win', subtitle: "Ask once. The answer is always no if you don't.", category: 'Money', accentKey: 'primary' },

  // ── Micro-Adventures ─────────────────────────────────────────────────────
  { id: 'sp_ma_1', title: 'Eat breakfast where you ate dinner — 400 km away', subtitle: 'Night train, no plan', category: 'Micro-Adventures', accentKey: 'cool' },
  { id: 'sp_ma_2', title: 'Watch a sunrise from a rooftop you have never stood on', subtitle: 'Permission optional', category: 'Micro-Adventures', accentKey: 'cool' },
  { id: 'sp_ma_3', title: 'Cook a dish from a country you cannot place on a map', subtitle: 'Then learn where it is', category: 'Micro-Adventures', accentKey: 'warm' },
  { id: 'sp_ma_4', title: 'Send a hand-written letter to your future self', subtitle: 'Open in exactly one year', category: 'Micro-Adventures', accentKey: 'primary' },
  { id: 'sp_ma_5', title: 'Spend a night camping alone', subtitle: 'No companions, no excuses', category: 'Micro-Adventures', accentKey: 'cool' },
  { id: 'sp_ma_6', title: 'Have a full conversation with a stranger on a long journey', subtitle: 'No phone, just talk', category: 'Micro-Adventures', accentKey: 'warm' },

  // ── Absurd Skills ────────────────────────────────────────────────────────
  { id: 'sp_as_1', title: 'Learn to whistle with a blade of grass', subtitle: 'A 4,000-year-old party trick', category: 'Absurd Skills', accentKey: 'warm' },
  { id: 'sp_as_2', title: 'Identify three birds by song alone', subtitle: 'Ears before eyes', category: 'Absurd Skills', accentKey: 'primary' },
  { id: 'sp_as_3', title: 'Spend a full day speaking only in questions', subtitle: 'Harder than it sounds', category: 'Absurd Skills', accentKey: 'warm' },
  { id: 'sp_as_4', title: 'Fold an origami crane from memory', subtitle: 'No diagram, no peeking', category: 'Absurd Skills', accentKey: 'primary' },
  { id: 'sp_as_5', title: 'Learn to skip a stone five times', subtitle: 'Physics you can feel', category: 'Absurd Skills', accentKey: 'cool' },
  { id: 'sp_as_6', title: 'Memorise the constellation directly above your home', subtitle: 'And find it from somewhere else', category: 'Absurd Skills', accentKey: 'cool' },
];

export async function seedIfEmpty(): Promise<void> {
  await initCollections();
  // Purge legacy dummy registry entries from older seed versions
  for (const id of ['re_1', 're_2', 're_3']) {
    await registry.remove(id).catch(() => {});
  }
  // Ensure the permanent world map item exists
  const existing = await items.all();
  if (!existing.some((i) => i.template === 'travel-map')) {
    const now = Date.now();
    await items.insert({
      id: 'item_world_map',
      title: 'My World Map',
      subtitle: 'Track every country — visited and on the list',
      category: 'Travel',
      template: 'travel-map',
      status: 'open',
      listIds: [],
      travelPins: [],
      createdAt: now,
      updatedAt: now,
    } as BucketItem);
  }
}
