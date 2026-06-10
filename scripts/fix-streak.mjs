import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const SERVICE_ACCOUNT = '/Users/elimanning/Library/CloudStorage/Dropbox/Mac/Downloads/crew-day-firebase-adminsdk-fbsvc-830c4e8377.json';
const UIDS = ['ED6pRQBTdZXj6I36JVzInAFTbl43', 'rq651qBc9oeTWx1mcBk9h3Wxh2t1'];

initializeApp({ credential: cert(JSON.parse(readFileSync(SERVICE_ACCOUNT, 'utf8'))) });
const db = getFirestore();

// Generate a list of date strings from startDate to today (inclusive)
function dateRange(startDate, endDate) {
  const dates = [];
  const d = new Date(startDate + 'T12:00:00Z');
  const end = new Date(endDate + 'T12:00:00Z');
  while (d <= end) {
    dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

function computeStreakFromHistory(history, challengeStartDate) {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const today = new Date().toISOString().slice(0, 10);
  let current = 0, longest = 0, streak = 0;
  const hasTodayComplete = sorted.some((e) => e.date === today && e.allCoreCompleted);

  function subDay(dateStr) {
    const d = new Date(dateStr + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  let expected = hasTodayComplete ? today : subDay(today);

  for (const entry of sorted) {
    if (entry.date > today) continue;
    if (challengeStartDate && entry.date < challengeStartDate) {
      if (current === 0) current = streak;
      longest = Math.max(longest, streak);
      break;
    }
    if (entry.date < expected) {
      if (current === 0) current = streak;
      longest = Math.max(longest, streak);
      streak = 0;
      expected = subDay(expected);
      if (entry.date < expected) break;
    }
    if (!entry.allCoreCompleted) {
      if (current === 0) current = streak;
      if (entry.date !== today) { longest = Math.max(longest, streak); streak = 0; }
      expected = subDay(entry.date);
      continue;
    }
    streak++;
    longest = Math.max(longest, streak);
    expected = subDay(entry.date);
  }
  if (current === 0) current = streak;
  longest = Math.max(longest, streak);
  return { current, longest };
}

async function fixUser(uid) {
  console.log(`\n── UID: ${uid} ──`);

  const profileSnap = await db.collection('users').doc(uid).get();
  if (!profileSnap.exists) { console.log('  profile not found'); return; }
  const profile = profileSnap.data();
  const startDate = profile.challengeStartDate;
  console.log(`  displayName: ${profile.displayName}`);
  console.log(`  challengeStartDate: ${startDate}`);
  console.log(`  currentStreak (in Firestore now): ${profile.currentStreak}`);

  if (!startDate) {
    console.log('  No challengeStartDate — skipping');
    return;
  }

  // Fetch all entries individually by date (avoids the orderBy query issue)
  const today = new Date().toISOString().slice(0, 10);
  const dates = dateRange(startDate, today);
  console.log(`  Fetching ${dates.length} entries (${startDate} → ${today})...`);

  const fetches = await Promise.all(
    dates.map((d) => db.collection('days').doc(uid).collection('entries').doc(d).get())
  );

  const history = [];
  for (const snap of fetches) {
    const docDate = snap.ref.id; // always use doc ID as the canonical date
    if (snap.exists) {
      const data = snap.data();
      const entry = { ...data, date: docDate }; // ensure date field is set
      console.log(`    ${docDate}: allCoreCompleted=${entry.allCoreCompleted}`);
      history.push(entry);
    } else {
      console.log(`    ${docDate}: (no entry)`);
    }
  }

  const { current, longest } = computeStreakFromHistory(history, startDate);
  console.log(`  → Recomputed streak: current=${current}, longest=${longest}`);

  await db.collection('users').doc(uid).update({ currentStreak: current, longestStreak: longest });
  console.log(`  ✓ Updated Firestore`);
}

(async () => {
  for (const uid of UIDS) {
    await fixUser(uid);
  }
  console.log('\nDone.');
  process.exit(0);
})();
