import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const SERVICE_ACCOUNT = '/Users/elimanning/Library/CloudStorage/Dropbox/Mac/Downloads/crew-day-firebase-adminsdk-fbsvc-830c4e8377.json';
const OLD_UID = 'yeNWuF24naYuADPJu9mkmtxXjUq2';
const NEW_UID = 'rq651qBc9oeTWx1mcBk9h3Wxh2t1';

initializeApp({ credential: cert(JSON.parse(readFileSync(SERVICE_ACCOUNT, 'utf8'))) });
const db = getFirestore();

async function copySubcollection(oldPath, newPath, uidField) {
  const snap = await db.collection(oldPath).get();
  if (snap.empty) { console.log(`  (empty) ${oldPath}`); return 0; }
  const batch = db.batch();
  snap.docs.forEach(d => {
    const data = { ...d.data(), ...(uidField ? { [uidField]: NEW_UID } : {}) };
    batch.set(db.collection(newPath).doc(d.id), data);
  });
  await batch.commit();
  console.log(`  copied ${snap.size} docs: ${oldPath} → ${newPath}`);
  return snap.size;
}

async function main() {
  console.log(`Migrating ${OLD_UID} → ${NEW_UID}\n`);

  // 1. User profile
  const oldProfile = await db.collection('users').doc(OLD_UID).get();
  if (!oldProfile.exists) {
    console.error('Old user profile not found — wrong project or UID?');
    process.exit(1);
  }
  const profileData = { ...oldProfile.data(), uid: NEW_UID };
  await db.collection('users').doc(NEW_UID).set(profileData, { merge: true });
  console.log('✓ user profile copied');

  // 2. Day entries
  await copySubcollection(`days/${OLD_UID}/entries`, `days/${NEW_UID}/entries`, 'uid');
  console.log('✓ day entries copied');

  // 3. Custom tasks
  await copySubcollection(`customTasks/${OLD_UID}/tasks`, `customTasks/${NEW_UID}/tasks`, 'uid');
  console.log('✓ custom tasks copied');

  // 4. Friend requests
  await copySubcollection(`friendRequests/${OLD_UID}/incoming`, `friendRequests/${NEW_UID}/incoming`, null);
  console.log('✓ friend requests copied');

  // 5. Update friends arrays in other users' profiles
  const usersSnap = await db.collection('users').get();
  const friendBatch = db.batch();
  let friendUpdates = 0;
  usersSnap.docs.forEach(d => {
    const friends = d.data().friends ?? [];
    if (friends.includes(OLD_UID)) {
      const updated = friends.map(f => f === OLD_UID ? NEW_UID : f);
      friendBatch.update(d.ref, { friends: updated });
      friendUpdates++;
    }
  });
  if (friendUpdates > 0) {
    await friendBatch.commit();
    console.log(`✓ updated friends array in ${friendUpdates} other user(s)`);
  } else {
    console.log('  no other users had old UID in friends array');
  }

  console.log('\nDone. Old data is untouched — delete manually once verified.');
}

main().catch(e => { console.error(e); process.exit(1); });
