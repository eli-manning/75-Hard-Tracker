import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const SERVICE_ACCOUNT = '/Users/elimanning/Library/CloudStorage/Dropbox/Mac/Downloads/crew-day-firebase-adminsdk-fbsvc-830c4e8377.json';

initializeApp({ credential: cert(JSON.parse(readFileSync(SERVICE_ACCOUNT, 'utf8'))) });
const db = getFirestore();

(async () => {
  // Collection group query gets every entry document across all users
  const snap = await db.collectionGroup('entries').get();
  console.log(`Found ${snap.size} total entry documents`);

  const batch = db.batch();
  let patchCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    // Path is days/{uid}/entries/{date}
    const pathParts = doc.ref.path.split('/');
    const uid = pathParts[1];
    const date = pathParts[3];

    if (!data.date || !data.uid) {
      console.log(`  Patching ${doc.ref.path} (date=${data.date ?? 'missing'}, uid=${data.uid ?? 'missing'})`);
      batch.update(doc.ref, {
        ...(data.date ? {} : { date }),
        ...(data.uid  ? {} : { uid }),
      });
      patchCount++;

      // Firestore batches max 500 ops — flush and start a new one
      if (patchCount % 499 === 0) {
        await batch.commit();
        console.log(`  Committed batch of 499`);
      }
    }
  }

  if (patchCount % 499 !== 0) {
    await batch.commit();
  }

  console.log(`\nDone. Patched ${patchCount} entries.`);
  process.exit(0);
})();
