/**
 * Re-keys Firestore data from old UIDs to new UIDs after a Google sign-in migration.
 *
 * Run AFTER:
 *   1. Firestore data has been migrated (migrate-firestore.js)
 *   2. Users have signed in with Google on the new project (creating new UIDs)
 *
 * What it does:
 *   - Matches old UIDs → new UIDs by email address
 *   - Copies users/, days/, customTasks/, friendRequests/ to new UID paths
 *   - Updates uid fields, friends arrays, and fromUid/toUid inside documents
 *   - Deletes old UID paths when done
 *
 * Usage:
 *   node scripts/rekey-firestore.js scripts/keys/dest-key.json scripts/users.json
 *
 * Arguments:
 *   dest-key.json  — service account for the new project (crew-day)
 *   users.json     — the export from `firebase auth:export` on the OLD project
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const [, , destKeyPath, usersJsonPath] = process.argv;
if (!destKeyPath || !usersJsonPath) {
  console.error('Usage: node scripts/rekey-firestore.js <dest-key.json> <users.json>');
  process.exit(1);
}

const app = admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(destKeyPath))),
});
const db = app.firestore();
const auth = app.auth();

const BATCH_SIZE = 400;

// Build email → oldUid map from the exported users.json
const exported = JSON.parse(fs.readFileSync(path.resolve(usersJsonPath), 'utf8'));
const emailToOldUid = {};
for (const u of exported.users ?? []) {
  if (u.email) emailToOldUid[u.email.toLowerCase()] = u.localId;
}

async function copySubcollection(srcParent, dstParent, collectionId, fieldUpdates) {
  const snap = await srcParent.collection(collectionId).get();
  if (snap.empty) return 0;

  let batch = db.batch();
  let count = 0;
  let total = 0;

  for (const docSnap of snap.docs) {
    const data = { ...docSnap.data(), ...fieldUpdates };
    batch.set(dstParent.collection(collectionId).doc(docSnap.id), data);
    count++;
    total++;
    if (count === BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
  return total;
}

async function deleteSubcollection(parent, collectionId) {
  const snap = await parent.collection(collectionId).get();
  if (snap.empty) return;
  let batch = db.batch();
  let count = 0;
  for (const docSnap of snap.docs) {
    batch.delete(docSnap.ref);
    count++;
    if (count === BATCH_SIZE) { await batch.commit(); batch = db.batch(); count = 0; }
  }
  if (count > 0) await batch.commit();
}

async function rekey(oldUid, newUid, uidMap) {
  console.log(`  ${oldUid} → ${newUid}`);

  // ── users/{uid} ──────────────────────────────────────────────────────────
  const userSnap = await db.collection('users').doc(oldUid).get();
  if (userSnap.exists()) {
    const data = userSnap.data();
    // Remap friends array to new UIDs
    const friends = (data.friends ?? []).map((f) => uidMap[f] ?? f);
    await db.collection('users').doc(newUid).set({ ...data, uid: newUid, friends });
    await db.collection('users').doc(oldUid).delete();
    console.log(`    users: moved`);
  }

  // ── days/{uid}/entries ────────────────────────────────────────────────────
  const dayCount = await copySubcollection(
    db.collection('days').doc(oldUid),
    db.collection('days').doc(newUid),
    'entries',
    { uid: newUid }
  );
  if (dayCount > 0) {
    await deleteSubcollection(db.collection('days').doc(oldUid), 'entries');
    await db.collection('days').doc(oldUid).delete().catch(() => {});
    console.log(`    days: moved ${dayCount} entries`);
  }

  // ── customTasks/{uid}/tasks ───────────────────────────────────────────────
  const taskCount = await copySubcollection(
    db.collection('customTasks').doc(oldUid),
    db.collection('customTasks').doc(newUid),
    'tasks',
    { uid: newUid }
  );
  if (taskCount > 0) {
    await deleteSubcollection(db.collection('customTasks').doc(oldUid), 'tasks');
    await db.collection('customTasks').doc(oldUid).delete().catch(() => {});
    console.log(`    customTasks: moved ${taskCount} tasks`);
  }

  // ── friendRequests/{uid}/incoming ─────────────────────────────────────────
  const frSnap = await db.collection('friendRequests').doc(oldUid).collection('incoming').get();
  if (!frSnap.empty) {
    let batch = db.batch();
    let count = 0;
    for (const docSnap of frSnap.docs) {
      const data = docSnap.data();
      const newFromUid = uidMap[data.fromUid] ?? data.fromUid;
      const newToUid = uidMap[data.toUid] ?? data.toUid;
      // Remap the document ID (which is the sender's UID) if needed
      const newDocId = uidMap[docSnap.id] ?? docSnap.id;
      batch.set(
        db.collection('friendRequests').doc(newUid).collection('incoming').doc(newDocId),
        { ...data, fromUid: newFromUid, toUid: newToUid }
      );
      batch.delete(docSnap.ref);
      count++;
      if (count === BATCH_SIZE) { await batch.commit(); batch = db.batch(); count = 0; }
    }
    if (count > 0) await batch.commit();
    await db.collection('friendRequests').doc(oldUid).delete().catch(() => {});
    console.log(`    friendRequests: moved ${frSnap.size} docs`);
  }
}

async function main() {
  // Get all current users from new project Auth
  console.log('Fetching current users from new project...');
  const listResult = await auth.listUsers();
  const emailToNewUid = {};
  for (const u of listResult.users) {
    if (u.email) emailToNewUid[u.email.toLowerCase()] = u.uid;
  }

  // Build old → new UID map
  const uidMap = {};
  const toMigrate = [];
  for (const [email, oldUid] of Object.entries(emailToOldUid)) {
    const newUid = emailToNewUid[email];
    if (!newUid) {
      console.log(`⚠  No new-project account found for ${email} — skipping (not signed in yet)`);
      continue;
    }
    if (oldUid === newUid) {
      console.log(`   ${email}: UID unchanged, skipping`);
      continue;
    }
    uidMap[oldUid] = newUid;
    toMigrate.push({ email, oldUid, newUid });
  }

  if (toMigrate.length === 0) {
    console.log('\nNothing to re-key.');
    return;
  }

  console.log(`\nRe-keying ${toMigrate.length} user(s):\n`);
  for (const { oldUid, newUid } of toMigrate) {
    await rekey(oldUid, newUid, uidMap);
  }

  console.log('\n✓ Re-key complete');
}

main().catch((err) => {
  console.error('Re-key failed:', err);
  process.exit(1);
});
