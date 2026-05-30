# 75 Hard Tracker — Full Software Specification

> **Purpose:** A shared, mobile-first web app for Eli and Rocket to track their 75 Hard challenge together. Firebase Auth with per-user accounts. Each user gets their own tab view (your data is yours to edit; others' data is read-only). Built with Next.js + TypeScript + Tailwind CSS + Firestore. Retro pixel aesthetic matching the Clove Hill skincare tracker.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Firestore Schema](#firestore-schema)
4. [75 Hard Rules — Core Challenge](#75-hard-rules)
5. [Daily Tasks Logic](#daily-tasks-logic)
6. [Pages & Features](#pages--features)
7. [UI / Design Aesthetic](#ui--design-aesthetic)
8. [Component Breakdown](#component-breakdown)
9. [Firebase Config](#firebase-config)
10. [Environment Variables](#environment-variables)
11. [Deployment](#deployment)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Firestore (Firebase) |
| Auth | Firebase Authentication (Email/Password) |
| Hosting | Firebase Hosting |
| Icons | Lucide React |
| Fonts | `Press Start 2P` (headings/accents) + `Inter` (body) via Google Fonts |

---

## Project Structure

```
/
├── app/
│   ├── layout.tsx                  # Root layout, font imports, auth provider, global nav
│   ├── page.tsx                    # Redirects to /today or /login
│   ├── login/
│   │   └── page.tsx                # Login / signup screen
│   ├── today/
│   │   └── page.tsx                # Main daily view — tabs per user
│   ├── tasks/
│   │   └── page.tsx                # Custom daily tasks management
│   └── history/
│       └── page.tsx                # Calendar/streak view
├── components/
│   ├── BottomNav.tsx               # Mobile bottom nav (3 tabs)
│   ├── UserTabBar.tsx              # Per-user tabs at top of /today (Eli | Rocket | ...)
│   ├── DailyProgress.tsx           # Today's overall progress ring or bar
│   ├── ChallengeChecklist.tsx      # The 75 Hard core 5 tasks
│   ├── ChallengeItem.tsx           # Single core task row (with special handling per type)
│   ├── WaterTracker.tsx            # Water intake — tap to add, shows oz remaining
│   ├── CustomTaskList.tsx          # User's custom daily task list
│   ├── CustomTaskItem.tsx          # Single custom task row
│   ├── TaskEditor.tsx              # Add/edit/delete custom tasks modal or drawer
│   ├── StreakBadge.tsx             # Current streak display
│   └── AuthGuard.tsx               # Wraps protected routes, redirects to /login
├── lib/
│   ├── firebase.ts                 # Firebase app init
│   ├── firestore.ts                # All Firestore read/write helpers
│   ├── auth.ts                     # Firebase Auth helpers (signIn, signUp, signOut)
│   └── types.ts                    # All TypeScript interfaces
├── hooks/
│   ├── useAuth.ts                  # Current user, auth state listener
│   ├── useDayData.ts               # Real-time listener for a user's day doc
│   ├── useAllUsers.ts              # Fetches all registered user profiles (for tabs)
│   └── useCustomTasks.ts           # Real-time listener for a user's custom task list
├── context/
│   └── AuthContext.tsx             # Auth context provider
├── public/
│   ├── avatars/                    # Retro portrait images (eli.png, rocket.png, etc.)
│   └── images/                     # Any other static assets
├── .env.local                      # Firebase config (not committed)
├── firebase.json                   # Firebase Hosting config
└── .firebaserc                     # Firebase project alias
```

---

## Firestore Schema

### Collection: `users`

One document per registered user. Created on first sign-in.

```ts
interface UserProfile {
  uid: string;                     // Firebase Auth UID (same as doc ID)
  displayName: string;             // e.g. "Eli" or "Rocket"
  avatarUrl: string;                 // Relative path to local retro avatar image (e.g. "/avatars/eli.png")
  email: string;
  createdAt: Timestamp;
  challengeStartDate: string;      // "YYYY-MM-DD" — the day they started 75 Hard
  isActive: boolean;               // Whether they're currently in the challenge
}
```

---

### Collection: `days/{uid}/entries/{YYYY-MM-DD}`

One document per user per calendar date. Stores all progress for that day.

```ts
interface DayEntry {
  date: string;                    // "YYYY-MM-DD"
  uid: string;                     // Owner's UID

  // ── Core 75 Hard Tasks ──────────────────────────────────────
  workoutOneCompleted: boolean;    // First workout (45 min)
  workoutOneDuration: number;      // Minutes logged (default goal: 45)
  workoutTwoCompleted: boolean;    // Second workout (45 min, must be outdoors)
  workoutTwoDuration: number;
  workoutTwoOutdoor: boolean;      // Confirmed as outdoor
  dietCompleted: boolean;          // Followed diet (boolean, honor system)
  waterCompleted: boolean;         // Drank full gallon (128 oz)
  waterOzLogged: number;           // Running total oz logged today
  photoCompleted: boolean;         // Took progress photo
  readingCompleted: boolean;       // Read 10 pages of nonfiction
  pagesRead: number;               // Running total pages read today (goal: 10)

  // ── Custom Tasks ─────────────────────────────────────────────
  customTasksCompleted: string[];  // Array of completed custom task IDs for today

  // ── Meta ─────────────────────────────────────────────────────
  dayNumber: number;               // Computed: days since challengeStartDate (1-indexed)
  allCoreCompleted: boolean;       // True when all 5 core task groups are done
  updatedAt: Timestamp;
}
```

---

### Collection: `customTasks/{uid}/tasks/{taskId}`

A user's personal task list — tasks they want to do every day or as a backlog.

```ts
interface CustomTask {
  id: string;                      // Firestore doc ID (UUID)
  uid: string;                     // Owner's UID
  label: string;                   // e.g. "Read Bible", "Call mom", "Journal"
  type: 'daily' | 'backlog';       // 'daily' = appears every day; 'backlog' = one-time to-do
  // No emoji field — tasks use plain text labels only
  order: number;                   // Display sort order
  createdAt: Timestamp;
  completedAt?: Timestamp;         // For backlog tasks — when it was done
  archived: boolean;               // Soft delete
}
```

**Type distinction:**
- `daily` tasks appear on every day's checklist and reset at midnight (completion stored in `DayEntry.customTasksCompleted`)
- `backlog` tasks are "eventually" items — they appear in a separate backlog section and are checked off once (not per-day). Think: "buy a journal", "sign up for gym", "text so-and-so"

---

## 75 Hard Rules

The official 75 Hard challenge has 6 non-negotiable daily tasks (alcohol excluded — not a factor). These are hardcoded and the same for all users.

| # | Task | Details |
|---|---|---|
| 1 | Workout #1 | 45 minutes, any exercise |
| 2 | Workout #2 | 45 minutes, **must be outdoors** |
| 3 | Follow your diet | No cheat meals — honor system |
| 4 | Drink 1 gallon of water | 128 oz — logged incrementally |
| 5 | Read 10 pages | Nonfiction or self-help only (honor system) |
| 6 | Take a progress photo | Daily — honor system |

> **Rule:** If you miss ANY task on ANY day, you restart from Day 1. The app does not enforce this automatically but tracks your streak so you know.

---

## Daily Tasks Logic

### Water Tracking

Water is tracked in oz throughout the day. The goal is 128 oz (1 gallon).

- User taps a `+8 oz`, `+16 oz`, or `+32 oz` button to log intake
- A chunky pixel progress bar fills from 0 → 128 oz
- When `waterOzLogged >= 128`, `waterCompleted` auto-sets to `true` and the bar turns green
- Custom oz input also available for flexibility

### Reading Tracking

- User taps `+1`, `+5`, or custom input for pages read
- Progress shows `X / 10 pages`
- When `pagesRead >= 10`, `readingCompleted` auto-sets to `true`

### Workout Logging

- Two separate workout entries
- Each has a checkbox + optional duration field (default 45 min)
- Workout #2 has an extra "Outdoor?" toggle that must be confirmed for it to count
- Duration is informational — the checkbox is what marks it complete

### Diet & Photo

- Simple yes/no checkboxes — honor system
- Diet displayed as a single "No cheat meals today" checkbox
- Photo is its own row — no emoji, just a plain label

### Core Completion

`allCoreCompleted` is set to `true` when all 6 core booleans are `true`:
- `workoutOneCompleted`
- `workoutTwoCompleted && workoutTwoOutdoor`
- `dietCompleted`
- `waterCompleted`
- `readingCompleted`
- `photoCompleted`

### Streak Calculation

On each page load, compute streak client-side:
1. Start from today and walk backwards through `days/{uid}/entries/`
2. Count consecutive days where `allCoreCompleted === true`
3. If today is not yet complete, streak is still valid from yesterday
4. Streak breaks on the first day where `allCoreCompleted === false` and the date is in the past

---

## Pages & Features

### `/login` — Auth Screen

**Layout:** Centered card, mobile-first

**Features:**
- Email + password sign in
- Email + password sign up (with display name)
- Error handling (wrong password, email already in use, etc.)
- On success → redirect to `/today`
- Retro pixel aesthetic — big chunky input borders, pixel font for labels
- No emoji picker — avatar images are static local files (see Avatar section below)

---

### `/today` — Main Daily View

**Layout:** Full-screen mobile view. Top: user tab bar. Below: selected user's day.

**Features:**

#### User Tab Bar (`UserTabBar`)
- One tab per registered user, showing their retro avatar image + displayName (e.g. the Gemini-generated portrait + "Rocket")
- Tabs are dynamically generated from `users` collection — so if a 3rd person joins, their tab auto-appears
- Active tab = your own by default on load
- Viewing someone else's tab → everything is **read-only** (no checkboxes clickable, no inputs, buttons grayed out)
- Clear visual indicator when viewing another user's data: subtle banner `"Viewing Rocket's day — read only"`

#### Day Header
- Shows: `DAY {N}` in pixel font (e.g. `DAY 14`)
- Today's date below it
- Streak badge: `14 DAY STREAK` in pixel font
- Overall progress: e.g. `5 / 6 core tasks done` with a chunky progress bar

#### Core 75 Hard Tasks (`ChallengeChecklist`)
Displayed in order:

1. **Workout #1** — checkbox + duration input (e.g. `45 min`) + label
2. **Workout #2 (Outdoor)** — checkbox + duration input + outdoor toggle. If outdoor toggle is off, checkbox is disabled with tooltip `"Must be outdoor"`
3. **Followed diet** — single checkbox, `"No cheat meals today"`
4. **Water** — `WaterTracker` component (see below)
6. **Read 10 pages** — reading tracker (pages logged + progress bar)
7. **Progress photo** — single checkbox, plain label

#### Water Tracker (`WaterTracker`)
- Shows pixel progress bar: `{waterOzLogged} / 128 oz`
- Quick-add buttons: `+8` `+16` `+32`
- Custom input for manual entry
- Turns green when complete

#### Custom Daily Tasks
Below core tasks, a section titled `"YOUR TASKS"` (pixel font):
- Lists all `type: 'daily'` custom tasks in order
- Each row: label + checkbox (no emoji)
- `+ Add task` button → opens `TaskEditor`

#### Backlog
Below daily tasks, a collapsible section titled `"BACKLOG"`:
- Lists all `type: 'backlog'` custom tasks that are not yet `archived`
- Each row: label + checkbox (no emoji) (checking off sets `completedAt` and `archived: true`)
- `+ Add item` button → opens `TaskEditor` with type defaulting to `backlog`

---

### `/tasks` — Manage Custom Tasks

**Layout:** Simple list, mobile-first

**Features:**
- Shows all of the logged-in user's custom tasks (daily + backlog) in two sections
- Edit task label, type (daily vs backlog), or order
- Delete / archive tasks
- Drag-to-reorder (or up/down arrow buttons for simplicity)
- Only accessible for your own tasks — no read-only view for others here

---

### `/history` — Streak & History

**Layout:** Calendar grid + stats

**Features:**
- Monthly calendar view
  - Each day shows a colored tile: green = all complete, red = missed, gray = future, yellow = partial
- Stats section below:
  - Current streak
  - Longest streak
  - Total days completed
  - Total days started
  - Completion % (`completedDays / totalDays * 100`)
- Per-user — shows your own history by default
- Toggle to view another user's history (read-only)

---

### Bottom Navigation

Three tabs:
- `TODAY` (sun/checkmark icon) → `/today`
- `TASKS` (list icon) → `/tasks`
- `HISTORY` (calendar icon) → `/history`

All tabs in pixel font. Active tab highlighted with accent color.

---

## UI / Design Aesthetic

**Vibe:** Same retro pixel/micro aesthetic as the Clove Hill skincare tracker. Handheld game device energy. Chunky borders, pixel font for all headings and labels, warm off-white background.

**Fonts:**
- `Press Start 2P` — headings, tab labels, section titles, day numbers, progress numbers
- `Inter` — task labels, notes, body text

**Colors:**
```css
:root {
  --bg: #f5f0e8;              /* warm off-white, aged paper */
  --surface: #ffffff;
  --border: #d4c9b0;          /* warm tan border */
  --text: #2a2318;            /* warm near-black */
  --text-muted: #7a6e5f;
  --accent: #c85c3a;          /* retro brick red — primary accent */
  --accent-light: #f4e4dc;
  --green: #4a7c59;           /* complete / success */
  --green-light: #dff0e4;
  --yellow: #e8a820;          /* warning / partial */
  --yellow-light: #fdf3d0;
  --red: #b83232;             /* missed day */
  --red-light: #f5dada;
  --pixel-shadow: 2px 2px 0px #2a2318;
}
```

**Design details (same rules as skincare tracker):**
- Cards: `2px solid var(--border)` with `2px 2px 0 #2a2318` box shadow
- Progress bars: chunky, no border-radius (or max `2px`)
- Checkboxes: custom pixel-style squares — fill with checkmark on completion, strikethrough on label
- Completed core tasks get a green fill; all 6 done → whole card pulses green briefly
- User tabs: chunky pill tabs, active tab has `--accent` background + white pixel text
- Read-only views: slightly desaturated, `pointer-events: none` on all inputs, subtle banner at top
- `DAY {N}` displayed in massive pixel font at top of today view — this is the hero number
- Water tracker progress bar is blue → green as it fills
- Streak badge shows `{N} DAY STREAK` in pixel font — no emoji

---

## Component Breakdown

### `UserTabBar.tsx`

```ts
interface UserTabBarProps {
  users: UserProfile[];
  activeUid: string;
  onSelectUser: (uid: string) => void;
  currentUserUid: string;           // Logged-in user — always selectable
}
```

- Renders one pill tab per user
- Read-only banner rendered by parent when `activeUid !== currentUserUid`

---

### `ChallengeItem.tsx`

```ts
interface ChallengeItemProps {
  taskKey: keyof DayEntry;          // e.g. 'workoutOneCompleted'
  label: string;
  completed: boolean;
  readOnly: boolean;
  children?: React.ReactNode;       // For embedded sub-controls (water tracker, reading counter, outdoor toggle)
  onToggle?: () => void;
}
```

---

### `WaterTracker.tsx`

```ts
interface WaterTrackerProps {
  ozLogged: number;
  goal: number;                     // Default: 128
  readOnly: boolean;
  onAdd: (oz: number) => void;
  onSetCustom: (oz: number) => void;
}
```

---

### `CustomTaskItem.tsx`

```ts
interface CustomTaskItemProps {
  task: CustomTask;
  completed: boolean;
  readOnly: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
```

---

### `TaskEditor.tsx`

```ts
interface TaskEditorProps {
  task?: CustomTask;                // Undefined = create new
  defaultType?: 'daily' | 'backlog';
  onSave: (task: Partial<CustomTask>) => void;
  onClose: () => void;
}
```

- Renders as a bottom drawer on mobile
- Fields: label input, type toggle (daily / backlog) — no emoji field

---

### `StreakBadge.tsx`

```ts
interface StreakBadgeProps {
  streak: number;
}
```

- Returns `null` if streak is 0
- Shows `{streak} DAY STREAK` in pixel font

---

## Firestore Helpers (`lib/firestore.ts`)

```ts
// Users
getUserProfile(uid: string): Promise<UserProfile>
getAllUsers(): Promise<UserProfile[]>
createUserProfile(profile: Omit<UserProfile, 'createdAt'>): Promise<void>
updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void>

// Day entries
getOrCreateDayEntry(uid: string, date: string): Promise<DayEntry>
updateDayEntry(uid: string, date: string, updates: Partial<DayEntry>): Promise<void>
getDayHistory(uid: string, limit?: number): Promise<DayEntry[]>   // For history/streak calc

// Custom tasks
getCustomTasks(uid: string): Promise<CustomTask[]>
createCustomTask(task: Omit<CustomTask, 'id' | 'createdAt'>): Promise<void>
updateCustomTask(uid: string, taskId: string, updates: Partial<CustomTask>): Promise<void>
archiveCustomTask(uid: string, taskId: string): Promise<void>
reorderCustomTasks(uid: string, orderedIds: string[]): Promise<void>
```

---

## Auth Helpers (`lib/auth.ts`)

```ts
signUp(email: string, password: string, displayName: string): Promise<UserCredential>
signIn(email: string, password: string): Promise<UserCredential>
signOut(): Promise<void>
onAuthStateChange(callback: (user: User | null) => void): Unsubscribe
```

`signUp` should:
1. Create the Firebase Auth user
2. Immediately call `createUserProfile` with the new UID, displayName, and the hardcoded `avatarUrl` path for that user
3. Set `challengeStartDate` to today

---

## Firestore Security Rules

These rules are critical — they enforce that users can only write their own data, but can read everyone's.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User profiles: anyone logged in can read all; only write your own
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    // Day entries: anyone logged in can read all; only write your own
    match /days/{uid}/entries/{date} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    // Custom tasks: anyone logged in can read all; only write your own
    match /customTasks/{uid}/tasks/{taskId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

## Firebase Config

### `firebase.json`

```json
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

### `next.config.ts`

```ts
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true }
};
export default nextConfig;
```

> Static export required for Firebase Hosting. All Firestore reads/writes happen client-side. Auth state is managed via Firebase client SDK.

---

## Environment Variables

Create `.env.local` at the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

## Deployment

```bash
# Build
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Deploy Firestore rules (do this first)
firebase deploy --only firestore:rules
```

---

## Seed / Setup Notes

No seed script needed — the app is self-seeding via auth:
- First sign-in creates a `UserProfile` doc automatically
- First visit to `/today` creates a `DayEntry` doc for that date automatically via `getOrCreateDayEntry`

**Initial setup order:**
1. Create Firebase project
2. Enable Firebase Auth (Email/Password)
3. Enable Firestore (start in test mode, then deploy rules above)
4. Add `.env.local` with config values
5. Deploy Firestore rules: `firebase deploy --only firestore:rules`
6. Build and deploy app: `npm run build && firebase deploy --only hosting`
7. Eli signs up first → sets `challengeStartDate` to your actual start date
8. Rocket signs up → same
9. Both users now visible as tabs in `/today`

---

## Modular User System

The app is designed so any new user who signs up automatically gets a tab in `/today`. There is no invite system or user whitelist in v1 — anyone with the URL can create an account. If you want to lock it down:

**Option A (simple):** Share the URL privately and don't publicize it. Only you and Rocket have it.

**Option B (Firestore rule):** Add an `allowedEmails` array to a `config/app` doc and check against it in security rules. Documented here but not implemented in v1.

---

## Future Enhancements (not in scope for v1)

- Push notifications / reminders at a set time each day
- Weekly summary email via Firebase Cloud Functions
- Weight / measurement tracking log
- Challenge restart flow (if you miss a day, tap "Restart" → resets `challengeStartDate`)
- Invite-only mode with email allowlist
- Dark mode (swap CSS vars)
- Export data as CSV
