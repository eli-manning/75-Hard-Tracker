@AGENTS.md

# CrewDay

A social 75 Hard challenge tracker. Users complete daily tasks, track progress, and compete with friends. Runs as a React Native / Expo app (iOS, Android, and PWA via Expo Router web).

---

## Tech Stack

- **Framework**: Expo SDK 56 / React Native with Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind for RN) + `StyleSheet.create` — most UI uses StyleSheet directly
- **Backend**: Firebase (Firestore, Auth, Cloud Functions, FCM push)
- **Functions**: Node 20, `firebase-functions/v2`, TypeScript compiled to `functions/lib/`
- **Auth**: Firebase Auth — email/password + Google OAuth (web redirect flow)
- **Push**: Expo Push (native) + FCM Web Push (PWA) — sends to one, never both
- **Fonts**: PressStart2P (pixel headers), VT323 (retro body), Inter (readable text)
- **Theme**: Cream parchment background (`#ede0c4`), navy accent (`#2d4070`), pixel-art aesthetic

---

## Project Structure

```
app/
  _layout.tsx              — root layout, font loading, auth provider, notifications provider
  index.tsx                — redirects to /today or /login
  login.tsx                — email/password + Google sign-in, sign-up, password reset
  onboarding.tsx           — new user setup (name, avatar, start date, fitness goal, weight, notifications opt-in, PWA install prompt)
  profile.tsx              — profile page (edit name, avatar, start date, challenge mode, notification settings, restart challenge)
  privacy.tsx / terms.tsx  — static legal pages
  (tabs)/
    _layout.tsx            — AuthGuard wrapper, BottomNav (native) / null nav (web)
    today.tsx              — main daily checklist screen
    tasks.tsx              — custom task manager
    history.tsx            — calendar + insights dashboard
    leaderboard.tsx        — friends + global leaderboard

components/
  AuthGuard.tsx            — redirects unauthenticated users to /login
  BottomNav.tsx            — native tab bar (Today / Tasks / History / Leaderboard)
  ChallengeChecklist.tsx   — core 75 Hard task list with inline inputs
  ChallengeItem.tsx        — individual task row (checkbox, nudge button, duration input)
  CustomTaskItem.tsx       — custom task row with nudge support
  CustomTaskList.tsx       — renders user's custom tasks on the today screen
  DailyProgress.tsx        — compact progress bar showing tasks done today
  InstallPrompt.tsx        — PWA "Add to Home Screen" prompt
  LoadingScreen.tsx        — full-screen loading state
  MilestoneBanner.tsx      — banner shown at days 25, 50, 75
  MissedDayModal.tsx       — next-day prompt to retroactively log yesterday if incomplete
  NotificationSettings.tsx — toggles for all/daily/nudge/friend-request notifications + time picker
  RestartModal.tsx         — confirm restart challenge (keep points / keep longest streak options)
  SideMenu.tsx             — slide-out drawer: friend management, sign out, install prompt
  StreakBadge.tsx          — streak count display
  StreakFlame.tsx          — animated flame icon for streaks
  TaskEditor.tsx           — modal for creating/editing a custom task (label, type, points, visibility, why)
  UserTabBar.tsx           — horizontal avatar tab strip to switch between own/friends' days
  WaterTracker.tsx         — water intake progress bar + +8/+16/+32oz buttons + custom input

hooks/
  useAllUsers.ts           — fetches all user profiles (5-min in-memory cache)
  useAuth.ts               — Firebase Auth state
  useCustomTasks.ts        — real-time Firestore listener for the active user's custom tasks
  useDayData.ts            — loads/creates today's DayEntry, real-time snapshot, offline fallback
  useGoogleAuth.ts         — Google OAuth redirect flow (web)
  useInstallPrompt.ts      — captures beforeinstallprompt event for PWA install
  useMinDuration.ts        — ensures loading states show for at least N ms (prevents flicker)
  useNotifications.ts      — push permission + token registration (Expo native / FCM web)

lib/
  auth.ts                  — signIn, signUp, signOut, sendPasswordReset, processGoogleRedirectResult
  avatar.ts                — avatar URL helpers, DiceBear seed generation
  avatarMap.ts             — maps avatar URLs to local require() images
  cache.ts                 — in-memory TTL cache (5 min) + session cache (10 min); both cleared on sign-out
  firebase.ts              — Firebase app/auth/db initialization; persistentLocalCache on web
  firestore.ts             — all Firestore read/write operations
  imageMap.ts              — image asset map
  points.ts                — point values, computeDayPoints, computeStreakFromHistory
  theme.ts                 — colors, fonts, shadows (edit BG/ACCENT here to retheme)
  types.ts                 — UserProfile, DayEntry, CustomTask interfaces

context/
  AuthContext.tsx          — provides Firebase user to the tree
  NavVisibilityContext.tsx — hides bottom nav during loading screens
  NotificationsContext.tsx — singleton notifications hook wrapper

functions/src/
  index.ts                 — Cloud Function triggers (friend request, nudge, accept)
  push.ts                  — sendPush (Expo or FCM, never both)
```

---

## Data Model (Firestore)

### `users/{uid}`
UserProfile document. Key fields:
- `challengeStartDate: string` — "YYYY-MM-DD", used to compute day number
- `challengeMode: '75hard' | 'general'` — 75hard requires outdoor workout 2; general doesn't
- `isActive: boolean`
- `currentStreak / longestStreak: number`
- `totalPoints: number`
- `friends: string[]` — array of friend UIDs
- `leaderboardOptOut: boolean` — `false` = opted in; `undefined`/`true` = not on global board
- `expoPushToken / fcmWebToken` — push tokens (only one used per send)
- `notifAllEnabled / notifDailyEnabled / notifDailyTime / notifNudgesEnabled / notifFriendRequestsEnabled`
- `nudgesRemaining / purchasedNudgesToday / nudgeResetDate` — nudge quota tracking
- `startingWeight / weightUnit / fitnessGoal` — fitness profile from onboarding
- `missedDayPromptShownDate` — prevents showing missed-day modal twice for same date

### `days/{uid}/entries/{YYYY-MM-DD}`
DayEntry document. Key fields:
- `workoutOneCompleted / workoutOneDuration` — first workout (any location)
- `workoutTwoCompleted / workoutTwoDuration / workoutTwoOutdoor` — second workout (must be outdoor in 75hard mode)
- `dietCompleted / waterCompleted / waterOzLogged` — diet and water (goal: 128oz)
- `readingCompleted / pagesRead` — reading (goal: 10 pages)
- `photoCompleted` — progress photo
- `customTasksCompleted: string[]` — array of completed custom task IDs
- `allCoreCompleted: boolean` — true only when all 6 core tasks done
- `dayNumber: number` — days since challengeStartDate (negative = before start)
- `dailyPoints: number` — computed at write time via computeDayPoints
- `bodyWeight / mood / energyLevel` — optional daily metrics
- `updatedAt: Timestamp`

### `customTasks/{uid}/tasks/{taskId}`
CustomTask document:
- `label / type ('daily'|'backlog') / order / archived / visible / why / points (1–10)`
- Visible tasks can be seen by friends; invisible tasks are hidden from friend view

### `nudges/{nudgeId}`
Ephemeral — created by client, immediately deleted by Cloud Function after processing.
- `fromUid / toUid / fromName / message / taskKey / sentAt`

### `friendRequests/{toUid}/incoming/{fromUid}`
- `status`: not set (pending) → `'accepted'` (triggers notification CF)
- Deleted by Cloud Function on accept

### `users/{uid}/nudgeCooldowns/{toUid_taskKey}`
- `expiresAt: Timestamp` — 3-hour cooldown per (sender, recipient, task) pair
- Document reused (overwritten) on each nudge; bounded count per user

---

## Features

### Authentication
- Email/password sign-in and sign-up with validation
- Google OAuth (web redirect flow)
- Password reset via email
- Persisted auth state via AsyncStorage (native) / Firebase default (web)

### Onboarding (new users)
Multi-step flow:
1. Display name
2. Avatar selection (DiceBear generated or preset sprites)
3. Challenge start date picker
4. Fitness goal selection (lose weight / build muscle / general fitness / mental toughness)
5. Starting weight + unit (lbs/kg)
6. Notification permission opt-in + time picker
7. PWA install prompt (web only)

### Today Screen (main screen)
- **User tab bar**: switch between own day and friends' days via avatar tabs
- **Day header**: shows day number (e.g. "DAY 23"), current date, total points
- **Daily progress bar**: compact visualization of how many tasks done today
- **Core tasks checklist** (collapsible):
  - Workout 1 (checkbox + duration input in minutes)
  - Workout 2 (checkbox + duration + outdoor toggle; outdoor required in 75hard mode)
  - Diet (checkbox)
  - Water (progress bar + +8/+16/+32oz buttons + custom input; goal 128oz)
  - Reading (checkbox + page counter; goal 10 pages)
  - Progress photo (checkbox)
- **Optional daily log** (expandable):
  - Body weight entry
  - Mood rating (1–5: Low/Meh/Ok/Good/Great)
  - Energy level rating (1–5: Drained/Low/Normal/High/Peak)
- **Custom tasks section**: user's daily custom tasks with completion toggles
- **Read-only friend view**: when viewing a friend's day, all controls are disabled
- **Nudge system** (when viewing a friend): send push notifications to encourage incomplete tasks
- **Milestone banners**: shown at days 25, 50, 75
- **Missed-day modal**: shown next morning if yesterday was incomplete; allows retroactive logging or forced restart
- **Challenge restart modal**: reset start date with options to keep/clear points and longest streak
- **Offline support**: falls back to a default (all-zero) entry if Firestore is unreachable; writes are queued

### Tasks Screen
- Manage custom tasks in two lists: **Daily** and **Backlog**
- Create/edit tasks with: label, type, visibility (friends can see?), why/motivation, point value (1–10)
- Reorder tasks up/down within their list
- Archive (soft-delete) tasks

### History Screen
- **User switcher**: view own history or a friend's history
- **Monthly calendar**: color-coded tiles (green=complete, yellow=partial, red=missed, accent=today)
  - Navigate months forward/back
- **Stats grid**: current streak, longest streak, days complete, completion %
- **Insights dashboard** (shown after first full day logged):
  - Challenge progress bar (day X / 75, completed days count)
  - Lifetime stats cards: total water (gallons), total pages, total workout minutes, avg workout duration, weight change
  - Water intake bar chart (30 days) with 128oz goal line
  - Workout minutes stacked bar chart (14 days, W1 vs W2 outdoor)
  - Pages read bar chart (30 days) with 10-page goal line
  - Weight trend line chart (all time) with starting weight reference line
  - Mood & energy line chart (30 days, dual dataset)
  - Task completion rate breakdown (% of days each core task was completed, sorted by rate)

### Leaderboard Screen
- **Friends tab**: sorted by total points, includes self; shows streak alongside points
- **Global tab**: top 50 opted-in users by total points; opt-in button if not yet on global board
- Top-3 ranks highlighted in yellow
- Your own row highlighted with navy border + "YOU" chip

### Points System
Points are computed atomically at write time (`updateDayEntryWithPoints`) and stored in both `DayEntry.dailyPoints` and `UserProfile.totalPoints`:
- Workout 1 completed: **+10 pts**
- Workout 2 completed: **+10 pts**
- Diet completed: **+10 pts**
- Water completed: **+5 pts**
- Reading completed: **+5 pts**
- Progress photo: **+5 pts**
- All core tasks done (perfect day bonus): **+10 pts**
- Reading bonus: +5 pts per 5 extra pages beyond 10, capped at +10
- Water bonus: +5 pts per 40 extra oz beyond 128oz, capped at +10
- Custom tasks: sum of `task.points` values, capped at **+10 pts/day** total for custom tasks

### Streaks
Computed by `computeStreakFromHistory` in `lib/points.ts`:
- A streak requires `allCoreCompleted = true` on consecutive calendar days
- Today counts toward streak if already complete; otherwise yesterday is the start of lookback
- Streak is updated on profile after `allCoreCompleted` transitions to `true`

### Friends System
- Friend search by display name (within side menu)
- Send friend request → recipient gets push notification
- Mutual request detection: if both users request each other simultaneously, auto-accepts
- Accept/decline incoming requests
- Remove friends
- Friend's days are visible (read-only) on Today and History screens
- Friend's visible custom tasks shown on their day view

### Nudge System
- When viewing a friend's incomplete task, send a push notification to encourage them
- **Free quota**: 5 nudges/day per sender
- **Paid nudges**: after free quota, spend 10 points per nudge (max 5 paid/day)
- **Per-target cooldown**: 3-hour cooldown per (sender, recipient, task) combination
- Quota tracked server-side in Cloud Functions (prevents client-side spoofing)
- Cooldown stored in `users/{fromUid}/nudgeCooldowns/{toUid_taskKey}` — documents are reused, not accumulated

### Push Notifications
**Cloud Functions** (Firebase Functions v2):
- `onFriendRequestReceived`: notifies recipient when a friend request arrives
- `onFriendRequestAccepted`: notifies original sender when their request is accepted
- `onNudge`: processes nudge doc — checks quota/cooldown, sends push, deletes the trigger doc

**Delivery**: `sendPush` in `push.ts` prefers `expoPushToken` (native); falls back to `fcmWebToken` (PWA). Never sends both simultaneously (prevents duplicates).

**Service worker** (`public/sw.template.js` → `public/sw.js`): handles background FCM messages for the PWA. Does NOT manually call `showNotification` when the payload has a `notification` field — the browser auto-displays those, so calling it manually caused duplicates.

**Notification types** (all toggleable per-user):
- Friend requests (on by default)
- Nudges from friends (on by default)
- Daily reminder at a user-configured time (via Expo local notifications on native)

### Challenge Modes
- **75 Hard**: all 6 core tasks required, workout 2 must be outdoors
- **General**: same tasks, outdoor requirement removed from workout 2

### Profile Page
- Edit display name
- Randomize or pick avatar (DiceBear seeds)
- Edit challenge start date
- Switch challenge mode
- View current/longest streak with flame animation
- Notification settings (master toggle, individual toggles, daily time picker)
- Restart challenge (with options to keep/clear points and longest streak)
- Sign out

---

## Caching

Two-tier in-memory cache (`lib/cache.ts`):
- **Regular cache** (`getCached/setCached`): 5-minute TTL. Used for profiles, day entries, user lists, history.
- **Session cache** (`getSessionCached/setSessionCached`): 10-minute TTL. Used for the current user's profile and today's day entry as a boot-time hydration source.
- Both cleared on sign-out via `clearAll()`.
- Cache keys: `profile-{uid}`, `day-{uid}-{YYYY-MM-DD}`, `all-users`, `history-{uid}-{90|120}`

**Offline behavior**: `useDayData` falls back to a synthetic default entry (all tasks uncompleted, counters at 0) if the Firestore fetch fails. Writes use `setDoc` with `{ merge: true }` so they queue correctly even before the document exists in Firestore. Web uses `persistentLocalCache` for IndexedDB-backed offline support across sessions.

---

## Cloud Functions

Located in `functions/src/`. Build with `npm run build` in `functions/`, deploy with `firebase deploy --only functions`.

All functions are v2 Firestore-triggered, deployed to `us-west2`.

---

## Key Conventions

- **No co-author tags** in commits
- **Small, focused commits** — one concern per commit
- **No `updateDoc`** on day entries — always use `setDoc` with merge to handle offline/first-open edge cases
- **Point writes are atomic** — always use `updateDayEntryWithPoints` (not `updateDayEntry`) when toggling tasks, to keep `DayEntry.dailyPoints` and `UserProfile.totalPoints` in sync
- **Friend day reads are read-only** — never call `getOrCreateDayEntry` for a friend's UID (write permission denied by Firestore rules); use `getDayEntry` instead
- **Theme changes**: edit `BG` and `ACCENT` in `lib/theme.ts`, then update matching values in `app.json`, `app.config.ts`, and `scripts/inject-pwa-meta.js`
- **SW changes**: edit `public/sw.template.js`, then run `node scripts/gen-sw.js` to regenerate `public/sw.js`
