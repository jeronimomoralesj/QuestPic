/**
 * QuestPic — Domain schemas.
 *
 * The data engine is intentionally local-first and serverless. Two independent
 * collections (`items` and `lists`) model a strict many-to-many relationship:
 * the canonical edge lives on `BucketItem.listIds`, so a single item can belong
 * to any number of lists purely through ID referencing — no join tables, no
 * server, no duplication of the item payload.
 */

export type ID = string;

/** ISO-ish epoch millis. Stored as numbers so they sort + diff cheaply. */
export type Millis = number;

/** A simulated peer in the local collaboration environment. */
export interface Collaborator {
  id: ID;
  /** Display handle, e.g. "@aria". */
  handle: string;
  name: string;
  /** Single emoji or grapheme used as a lightweight avatar. */
  avatar: string;
}

/** A Base64-encoded image payload kept inline on the item document. */
export interface MediaPayload {
  id: ID;
  /** Raw Base64 (no data-URI prefix) so it round-trips through SQLite text. */
  base64: string;
  /** Mime, e.g. "image/jpeg". */
  mime: string;
  width?: number;
  height?: number;
  capturedAt: Millis;
}

/** An exact geographical pin dropped on a completed milestone. */
export interface GeoPin {
  latitude: number;
  longitude: number;
  /** Optional reverse-geocoded label, e.g. "Kyoto, JP". */
  label?: string;
  droppedAt: Millis;
}

/**
 * The "Memory Studio" — everything unlocked when an item is completed.
 * Kept as an optional sub-document so an open quest stays lean.
 */
export interface Memory {
  note?: string;
  photos: MediaPayload[];
  geo?: GeoPin;
  /** Collaborator IDs tagged on this specific milestone (crew tagging). */
  crew: ID[];
}

export type ItemStatus = 'open' | 'completed';

export interface BucketItem {
  id: ID;
  title: string;
  /** A short editorial subtitle / one-liner. */
  subtitle?: string;
  /** Curation tag, e.g. "Absurd Skills", "Micro-Adventures". */
  category?: string;
  status: ItemStatus;
  /** Canonical many-to-many edge: every list this item lives in. */
  listIds: ID[];
  /** Populated only once status flips to "completed". */
  memory?: Memory;
  completedAt?: Millis;
  travelPins?: CountryPin[];
  template?: string;
  createdAt: Millis;
  updatedAt: Millis;
}

export interface BucketList {
  id: ID;
  name: string;
  /** A single grapheme used as the list's sigil. */
  glyph: string;
  description?: string;
  isPublic: boolean;
  isPrivate: boolean;
  /** Simulated peer environment — collaborator IDs with access. */
  collaborators: ID[];
  createdAt: Millis;
  updatedAt: Millis;
}

/** A country pin on the travel world map. */
export interface CountryPin {
  iso: string;
  country: string;
  status: 'visited' | 'want';
}

/** A pre-curated idea from the Spark Deck, injectable into a list. */
export interface SparkCard {
  id: ID;
  title: string;
  subtitle: string;
  category: string;
  /** Accent hint the UI may use to tint the card. */
  accentKey?: 'primary' | 'cool' | 'warm';
  template?: string;
}

/** A friend's completed quest surfaced in the Registry social feed. */
export interface RegistryEntry {
  id: ID;
  author: Collaborator;
  title: string;
  subtitle?: string;
  category?: string;
  /** Optional inline hero image (Base64) for the feed. */
  heroBase64?: string;
  geoLabel?: string;
  completedAt: Millis;
  /** reactionKey -> count, e.g. { fire: 12, awe: 4 }. */
  reactions: Record<string, number>;
}
