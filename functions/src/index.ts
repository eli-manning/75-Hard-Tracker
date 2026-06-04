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
      senderName,
      'Sent you a friend request!',
    );
  },
);

export const onNudge = onDocumentCreated('nudges/{nudgeId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const { toUid, fromUid, fromName, message, taskKey } = data as {
    toUid: string;
    fromUid: string;
    fromName: string;
    message?: string;
    taskKey?: string;
  };
  if (!fromUid || !toUid) return;

  const today = new Date().toISOString().slice(0, 10); // UTC "YYYY-MM-DD"
  const cooldownKey = `${toUid}_${taskKey ?? 'default'}`;
  const senderRef = db.doc(`users/${fromUid}`);
  const cooldownRef = db.doc(`users/${fromUid}/nudgeCooldowns/${cooldownKey}`);

  let shouldSend = false;

  try {
    await db.runTransaction(async (tx) => {
      const [senderSnap, cooldownSnap] = await Promise.all([
        tx.get(senderRef),
        tx.get(cooldownRef),
      ]);

      const sender = senderSnap.data();
      if (!sender) return;

      // Per-target cooldown: same sender + same target+task within 3 hours
      if (cooldownSnap.exists) {
        const exp = (cooldownSnap.data()!.expiresAt as admin.firestore.Timestamp).toDate();
        if (exp > new Date()) return; // still cooling down — skip silently
      }

      // Daily reset
      let nudgesRemaining = sender.nudgesRemaining ?? 5;
      let purchasedNudgesToday = sender.purchasedNudgesToday ?? 0;
      if (sender.nudgeResetDate !== today) {
        nudgesRemaining = 5;
        purchasedNudgesToday = 0;
      }

      // Quota check and profile update
      const profileUpdate: Record<string, unknown> = { nudgeResetDate: today };

      if (nudgesRemaining > 0) {
        profileUpdate.nudgesRemaining = nudgesRemaining - 1;
        profileUpdate.purchasedNudgesToday = purchasedNudgesToday;
        shouldSend = true;
      } else if (purchasedNudgesToday < 5 && (sender.totalPoints ?? 0) >= 10) {
        profileUpdate.nudgesRemaining = 0;
        profileUpdate.purchasedNudgesToday = purchasedNudgesToday + 1;
        profileUpdate.totalPoints = admin.firestore.FieldValue.increment(-10);
        shouldSend = true;
      } else {
        return; // rate limited — no cooldown set, no profile update
      }

      const expiresAt = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 3 * 60 * 60 * 1000)
      );
      tx.set(cooldownRef, { expiresAt });
      tx.update(senderRef, profileUpdate);
    });
  } catch (e) {
    console.error('[onNudge] rate-limit transaction failed:', e);
    return;
  }

  // Always delete the nudge doc — used only as a trigger, no need to persist
  await event.data!.ref.delete().catch(() => {});

  if (!shouldSend) return;

  const userSnap = await db.doc(`users/${toUid}`).get();
  const userData = userSnap.data();
  if (!userData) return;
  if (userData.notifAllEnabled === false) return;
  if (userData.notifNudgesEnabled === false) return;

  const body = message ?? 'Go complete your tasks!';
  await sendPush(userData.expoPushToken, userData.fcmWebToken, fromName, body);
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

    await Promise.all([
      sendPush(
        senderData.expoPushToken,
        senderData.fcmWebToken,
        accepterName,
        'Accepted your friend request!',
      ),
      event.data!.after.ref.delete(),
    ]);
  },
);
