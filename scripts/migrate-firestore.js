/**
 * Migrates all Firestore data from the source project to the destination project.
 *
 * Usage:
 *   node scripts/migrate-firestore.js <source-key.json> <dest-key.json>
 *
 * Both arguments are paths to service account JSON files downloaded from:
 *   Firebase Console → Project Settings → Service accounts → Generate new private key
 */

const admin = require('firebase-admin');
const path = require('path');

const [, , srcKeyPath, dstKeyPath] = process.argv;
if (!srcKeyPath || !dstKeyPath) {
  console.error('Usage: node scripts/migrate-firestore.js <source-key.json> <dest-key.json>');
  process.exit(1);
}

const srcApp = admin.initializeApp(
  { credential: admin.credential.cert(require(path.resolve(srcKeyPath))) },
  'source'
);
const dstApp = admin.initializeApp(
  { credential: admin.credential.cert(require(path.resolve(dstKeyPath))) },
  'dest'
);

const src = srcApp.firestore();
const dst = dstApp.firestore();

const BATCH_SIZE = 400; // Firestore max is 500 ops per batch

async function copyCollection(srcRef, dstRef, label) {
  const snap = await srcRef.get();
  if (snap.empty) return;

  let batch = dst.batch();
  let count = 0;
  let total = 0;

  for (const docSnap of snap.docs) {
    batch.set(dstRef.doc(docSnap.id), docSnap.data());
    count++;
    total++;

    if (count === BATCH_SIZE) {
      await batch.commit();
      console.log(`  ${label}: committed ${total} docs...`);
      batch = dst.batch();
      count = 0;
    }
  }

  if (count > 0) await batch.commit();
  console.log(`  ${label}: done (${total} docs)`);
}

async function migrate() {
  console.log('\n── users ───────────────────────────────────────');
  await copyCollection(src.collection('users'), dst.collection('users'), 'users');

  console.log('\n── customTasks ─────────────────────────────────');
  const userSnap = await src.collection('users').get();
  for (const userDoc of userSnap.docs) {
    const uid = userDoc.id;
    await copyCollection(
      src.collection('customTasks').doc(uid).collection('tasks'),
      dst.collection('customTasks').doc(uid).collection('tasks'),
      `customTasks/${uid}`
    );
  }

  console.log('\n── days ────────────────────────────────────────');
  for (const userDoc of userSnap.docs) {
    const uid = userDoc.id;
    await copyCollection(
      src.collection('days').doc(uid).collection('entries'),
      dst.collection('days').doc(uid).collection('entries'),
      `days/${uid}`
    );
  }

  console.log('\n── friendRequests ──────────────────────────────');
  const frSnap = await src.collection('friendRequests').get();
  for (const frDoc of frSnap.docs) {
    const uid = frDoc.id;
    await copyCollection(
      src.collection('friendRequests').doc(uid).collection('incoming'),
      dst.collection('friendRequests').doc(uid).collection('incoming'),
      `friendRequests/${uid}`
    );
  }

  console.log('\n✓ Migration complete');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
