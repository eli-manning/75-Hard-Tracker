import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { sendExpoPush } from './push';

admin.initializeApp();
const db = admin.firestore();

export const onNudge = onDocumentCreated('nudges/{nudgeId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const { toUid, fromName } = data as { toUid: string; fromName: string };
  const userSnap = await db.doc(`users/${toUid}`).get();
  const token: string | undefined = userSnap.get('expoPushToken');
  if (!token) return;

  await sendExpoPush(token, '75 HARD', `${fromName} is nudging you! Go complete your tasks.`);
});

export const onFriendRequestAccepted = onDocumentUpdated(
  'friendRequests/{toUid}/incoming/{fromUid}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status === after.status) return;
    if (after.status !== 'accepted') return;

    const toUid = event.params.toUid;
    const fromUid = event.params.fromUid;

    // The person who sent the original request (toUid) should be notified
    // The accepter is fromUid
    const [senderSnap, accepterSnap] = await Promise.all([
      db.doc(`users/${toUid}`).get(),
      db.doc(`users/${fromUid}`).get(),
    ]);

    const token: string | undefined = senderSnap.get('expoPushToken');
    const accepterName: string = accepterSnap.get('displayName') ?? 'Someone';
    if (!token) return;

    await sendExpoPush(token, '75 HARD', `${accepterName} accepted your friend request!`);
  },
);
