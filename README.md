# CrewDay

A social fitness challenge tracker built around the 75 Hard protocol. Complete six daily tasks, track your streak, earn points, and compete with friends — on iOS, Android, and as a PWA.

**Live app:** [crewday.app](https://crew-day.web.app/)

---

## Features

- **Daily checklist** — two workouts, diet, water (128 oz), reading (10 pages), progress photo
- **Custom tasks** — add personal habits worth 1–10 bonus points per day
- **Crews** — team up with friends for shared tasks and group accountability
- **Leaderboard** — friends tab and global top-50 ranked by total points
- **History** — monthly calendar, streak stats, and charts for water, workouts, pages read, weight, mood, and energy
- **Nudge system** — push a notification to a friend when they haven't finished a task yet
- **PWA + native** — installable on iOS/Android home screen, or download from the App Store / Play Store

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Expo SDK 56 / React Native, Expo Router |
| Styling | NativeWind + `StyleSheet.create` |
| Backend | Firebase (Firestore, Auth, Cloud Functions, FCM) |
| Auth | Firebase Auth — email/password + Google OAuth |
| Push | Expo Push (native) + FCM Web Push (PWA) |
| Fonts | PressStart2P, VT323, Inter |

---

## Local Development

### 1. Prerequisites

- Node 20+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- A Firebase project on the **Blaze plan** (required for Cloud Functions)

### 2. Clone and install

```bash
git clone https://github.com/eli-manning/CrewDay.git
cd CrewDay
npm install
```

### 3. Set up Firebase

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore**, **Authentication** (email/password + Google), and **Cloud Messaging**
3. Add a **Web app** in Project Settings to get your config values
4. Deploy Firestore security rules: `firebase deploy --only firestore:rules`

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your Firebase config values. See `.env.example` for descriptions of each variable.

### 5. Generate the service worker

The PWA background push handler is built from a template. Run this before starting or exporting:

```bash
node scripts/gen-sw.js
```

### 6. Start the app

```bash
# Web (PWA)
npx expo start --web

# iOS simulator
npx expo start --ios

# Android emulator
npx expo start --android
```

---

## Deploying Cloud Functions

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

Functions are deployed to `us-west2`. They handle nudge delivery, friend request notifications, and crew evaluation.

## Deploying the PWA

```bash
node scripts/gen-sw.js        # inject Firebase config into service worker
npx expo export --platform web
firebase deploy --only hosting
```

---

## Project Structure

```
app/              Expo Router screens (file-based routing)
components/       Shared UI components
hooks/            Custom React hooks
lib/              Firebase, Firestore helpers, points logic, types
context/          React context providers (auth, notifications, theme, tutorial)
functions/src/    Firebase Cloud Functions
public/           Static assets and service worker template
scripts/          Build utilities (gen-sw.js, etc.)
```

---

## Challenge Modes

- **75 Hard** — all six core tasks required daily; second workout must be outdoors
- **General** — same tasks with configurable visibility; outdoor requirement removed

## Points System

| Action | Points |
|---|---|
| Each core task completed | +5 or +10 |
| All core tasks in one day (perfect day) | +10 bonus |
| Extra reading (per 5 pages beyond 10) | +5, capped at +10 |
| Extra water (per 40 oz beyond 128) | +5, capped at +10 |
| Custom tasks | task value, capped at +10/day total |

---

## Contributing

Pull requests are welcome. For large changes, open an issue first to discuss the approach.

- Keep commits small and focused (one concern per commit)
- Run `npx tsc --noEmit` before opening a PR

---

## License

MIT
