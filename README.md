# QuestPic

A premium, **local-first** bucket-list app built with Expo + TypeScript.
Editorial, hyper-minimalist UI; four switchable visual "souls"; an on-device
NoSQL document store; and a set of core loops (Vault, Spark Deck, Achievement
Canvas + Memory Studio, Registry).

It now has **real accounts and cloud sync** on MongoDB Atlas through a thin API
(`server/`), and you can **share lists with friends** — while the app stays fully
usable offline (the on-device store is the local source of truth and converges to
the cloud when reachable).

## Cost model — only Mongo + Apple

| Piece | Service | Cost |
|---|---|---|
| Database | MongoDB Atlas (free **M0** tier works) | $0 |
| API hosting | **Vercel serverless** (free tier) — runs only per-request | $0 |
| Auth | self-rolled JWT, users stored **in your Mongo** | $0 |
| App distribution | Apple Developer Program | $99/yr |

No always-on server to rent (no Render/Railway bill). MongoDB's old "no-backend"
options (Atlas Data API, Device Sync) were shut down in 2025, so self-rolled JWT
on free serverless is the correct $0 path.

## Run it (dev)

QuestPic is **two processes**: the Expo app and the API.

**1 · API** (terminal A)
```bash
cd server
cp .env.example .env     # paste your Atlas URI (ROTATE the password first); set JWT_SECRET
npm install              # already done in this workspace
npm run dev              # → http://localhost:4000  (verify /api/health)
```

**2 · App** (terminal B)
```bash
cp .env.example .env     # EXPO_PUBLIC_API_BASE_URL — use your LAN IP for a real phone
npm install              # already done in this workspace
npx expo start           # press i for iOS simulator, or scan the QR in Expo Go
```

New accounts start clean; create lists/quests and they sync to Atlas. With no
`EXPO_PUBLIC_API_BASE_URL`, accounts are disabled and the app runs purely local.

> **Verified end-to-end against your live Atlas `questpic` DB:** register two
> users, per-user scoping (B can't see A's data), `401` on unauthenticated pulls,
> list sharing (A→B grants visibility), and read-only enforcement (B can't
> overwrite A's shared item). App + server typecheck clean; iOS bundle builds.

## Deploy the API to Vercel (free, no server to babysit)

```bash
cd server
npm i -g vercel          # one-time
vercel                   # link/create the project, then deploy
vercel env add MONGODB_URI       # paste your Atlas URI (server-side only)
vercel env add MONGODB_DB        # questpic
vercel env add JWT_SECRET        # a long random string
vercel --prod
```
Then set the app's `EXPO_PUBLIC_API_BASE_URL` to the deployed `https://…vercel.app`
URL and rebuild. The same Express app runs locally (`npm run dev`) and as a Vercel
function (`server/api/index.ts` + `vercel.json`).

> Add your Atlas cluster's **Network Access** allowlist entry for Vercel
> (simplest: allow `0.0.0.0/0` since access is gated by the DB user + your API).

## Ship to the App Store

Expo Go is only a **dev preview** — it cannot publish. App Store distribution uses
**EAS Build** (makes the `.ipa`) + **EAS Submit**. Everything is pre-configured
(`eas.json`, icon/splash, bundle id `com.tirepro.questpic`, build/version fields,
`expo-doctor` 18/18). The steps that need *your* accounts:

```bash
# 0. Deploy the API first (see above) and put its URL in eas.json:
#    build.production.env.EXPO_PUBLIC_API_BASE_URL = https://<your-api>.vercel.app
#    (a production app pointing at localhost can't reach the server)

eas login                              # your Expo account (free)
eas init                              # creates the EAS project id in app.json
eas build -p ios --profile production  # cloud-builds the .ipa (~15 min)

# Create the app in App Store Connect, then fill eas.json submit.production.ios:
#   ascAppId + appleTeamId, then:
eas submit -p ios --profile production
```

**Prerequisites only you can provide**
- **Apple Developer Program** enrollment ($99/yr) — the one Apple cost you flagged.
- A **deployed API URL** in `eas.json` (production env) — not localhost.
- **App Store listing:** screenshots, description, and a **privacy policy URL** +
  Apple "privacy nutrition label". The app collects: email (accounts), photos, and
  location (geo-pin) — declare these.
- Email/password login means **"Sign in with Apple" is *not* required** (Apple only
  mandates it when you also offer other social logins).

> Want to preview on a real device/simulator before submitting? Use a **dev/preview
> build**, not Expo Go: `eas build -p ios --profile preview`. (Expo Go can still run
> it for quick UI checks, since all native modules used are in the Expo SDK.)

## Why a server at all? (you can't connect Mongo from the phone)

The React Native runtime has no TCP/TLS sockets or DNS-SRV, so the `mongodb`
driver cannot run in-app — and embedding cluster credentials in a mobile binary
would expose your whole database. So the app talks **HTTPS** to the API, which
holds the Mongo connection server-side. The Mongo URI lives **only** in
`server/.env` / Vercel env — never in the app bundle.

```
app (SQLite, offline-first)  ──HTTPS+JWT──>  serverless API  ──>  Atlas
        cluster credentials live ONLY server-side ▲
```

### Auth + sharing model (`src/auth/`, `src/sync/`, `server/src/`)
- **Accounts:** email + password; passwords bcrypt-hashed; sessions are JWTs held
  in the iOS keychain (`expo-secure-store`). Users live in the `users` collection.
- **Per-user scoping:** every item/list carries an `ownerId` set server-side from
  the JWT. `pull` returns only your docs + lists shared with you; `push` refuses to
  write docs you don't own. Unauthenticated requests get `401`.
- **Sharing:** owner shares a list by a friend's `@handle`
  (`POST /api/lists/:id/share`). Collaborators get **read-only** access (view +
  clone); write-collaboration is a later increment.
- **Offline-first, LWW by `updatedAt`:** the local SQLite store is the on-device
  source of truth; `pull`/`push` converge devices, deletions propagate via
  tombstones. Auto-syncs on launch + debounced after edits; **Profile → Sync now**
  is manual.

## Architecture (the three execution layers)

### 1 · Local DB & schemas — `src/db/`
- `store.ts` — a tiny **NoSQL document store over `expo-sqlite`**. Each
  collection is a table of opaque JSON docs (`id, data, createdAt, updatedAt`);
  querying is in-process via predicates. No native Realm/Rx dependency, so it
  runs identically in Expo Go and in dev/prod builds.
- `types.ts` — `BucketItem`, `BucketList`, `Memory`, `MediaPayload` (Base64),
  `GeoPin`, `Collaborator`, `SparkCard`, `RegistryEntry`.
- `repositories.ts` — the only persistence surface. Holds the **strict
  many-to-many** logic: the canonical edge lives on `BucketItem.listIds`, and
  list membership is always *derived* from it — one source of truth, no drift.
- `seed.ts` — first-run curation (crew, Spark Deck, demo lists, Registry feed).

### 2 · Global state & theme engine — `src/theme/`, `src/state/`
- `themes.ts` — the four souls (**Obsidian, Sand & Craft, Tokyo Neon, Nordic
  Frost**) plus shared spacing / radius / type scales.
- `ThemeProvider.tsx` — global theme context with a **fluid cross-fade** of the
  root canvas (Reanimated `interpolateColor`); the choice persists in SQLite.
- `useDynamicType.ts` — clamps the OS Dynamic Type factor; every `Text`
  multiplies its base size by it. This is the mechanism behind the **iOS
  responsiveness guarantee** — no hardcoded text-container heights anywhere.
- `state/VaultProvider.tsx` — the live in-memory projection of the DB. Every
  screen reads here; every mutation flows through here, so UI and store agree.

### 3 · Design system & screens — `src/ui/`, `src/components/`, `app/`
- `ui/` — `Text` (Dynamic-Type aware), `PressableScale` (spring + haptics),
  `Screen` (safe-area editorial canvas), `atoms` (Button/Card/Pill/Eyebrow…),
  `Confetti` (dependency-free Reanimated burst for the Achievement Canvas),
  `haptics` (a named vocabulary incl. the completion `surge`).
- `components/` — `SparkCardView`, `PhotoJournal`, `GeoPinpoint`, `CrewTagging`,
  `ListAssign`.
- `app/` — file-based routes via **expo-router**:
  - `(tabs)/index` — **The Vault** (curation home)
  - `(tabs)/spark` — **The Spark Deck** (swipe to inject ideas)
  - `(tabs)/registry` — **The Registry** (social feed: react + 1-tap clone)
  - `(tabs)/profile` — identity, stats, and the **Theme Engine** control room
  - `item/[id]` — **Achievement Canvas + Memory Studio**
  - `list/[id]` — list detail with inline completion
  - `compose` — modal authoring for quests and lists

## Notes / production upgrade paths
- **Maps:** `GeoPinpoint` is a self-contained `expo-location` wrapper with a
  minimalist editorial map canvas, so it runs in Expo Go today. For production,
  swap `<MapCanvas>` for an `expo-maps` `AppleMaps`/`GoogleMaps` view — the data
  contract (a `GeoPin`) is unchanged. (`expo-maps` needs a custom dev build.)
- **Media:** photos are stored as Base64 inline on the item document per spec.
  At scale you'd move binaries to `expo-file-system` and keep only URIs inline.
- **Collaborators** are a simulated peer environment (`src/db/seed.ts#CREW`).
