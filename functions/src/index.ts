import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { sendPush } from './push';

admin.initializeApp();
const db = admin.firestore();

export const onFriendRequestReceived = onDocumentCreated(
  'friendRequests/{toUid}/incoming/{fromUid}',
  async (event) => {
    const toUid = event.params.toUid;
    const fromUid = event.params.fromUid;

    const [recipientSnap, senderSnap] = await Promise.all([
      db.doc(`users/${toUid}`).get(),
      db.doc(`users/${fromUid}`).get(),
    ]);

    const recipientData = recipientSnap.data();
    if (!recipientData) return;
    if (recipientData.notifAllEnabled === false) return;
    if (recipientData.notifFriendRequestsEnabled === false) return;

    const senderName: string = senderSnap.get('displayName') ?? 'Someone';

    await sendPush(
      recipientData.expoPushToken,
      recipientData.fcmWebToken,
      '75 HARD',
      `${senderName} sent you a friend request!`,
    );
  },
);

export const onNudge = onDocumentCreated('nudges/{nudgeId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const { toUid, fromName, message } = data as { toUid: string; fromName: string; message?: string };
  const userSnap = await db.doc(`users/${toUid}`).get();
  const userData = userSnap.data();
  if (!userData) return;

  if (userData.notifAllEnabled === false) return;
  if (userData.notifNudgesEnabled === false) return;

  const body = message ? `${fromName}: ${message}` : `${fromName} is nudging you! Go complete your tasks.`;
  await sendPush(userData.expoPushToken, userData.fcmWebToken, '75 HARD', body);
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

    const [senderSnap, accepterSnap] = await Promise.all([
      db.doc(`users/${toUid}`).get(),
      db.doc(`users/${fromUid}`).get(),
    ]);

    const senderData = senderSnap.data();
    if (!senderData) return;

    if (senderData.notifAllEnabled === false) return;
    if (senderData.notifFriendRequestsEnabled === false) return;

    const accepterName: string = accepterSnap.get('displayName') ?? 'Someone';

    await sendPush(
      senderData.expoPushToken,
      senderData.fcmWebToken,
      '75 HARD',
      `${accepterName} accepted your friend request!`,
    );
  },
);
