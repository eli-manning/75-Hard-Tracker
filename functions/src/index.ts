import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
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

// ── Crew Cloud Functions ──────────────────────────────────────────────────────

const REGION = 'us-west2';


async function evaluateCrewCompletion(
  crewId: string,
  date: string,
): Promise<void> {
  const crewRef = db.doc(`crews/${crewId}`);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) return;

  const crew = crewSnap.data()!;

  // Idempotency: already processed today
  if (crew.lastSummaryDate === date) return;

  const yesterday = (() => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  // Fetch all member day entries and profiles in parallel
  const members: string[] = crew.members ?? [];
  const memberData = await Promise.all(
    members.map(async (uid) => {
      const [daySnap, userSnap, prevDaySnap] = await Promise.all([
        db.doc(`days/${uid}/entries/${date}`).get(),
        db.doc(`users/${uid}`).get(),
        db.doc(`days/${uid}/entries/${yesterday}`).get(),
      ]);

      const displayName: string = userSnap.get('displayName') ?? uid.slice(0, 8);
      const entry = daySnap.exists ? daySnap.data()! : null;

      // Member is inactive if no entry exists for today or yesterday
      const inactive = !entry && !prevDaySnap.exists;

      let completed = false;
      if (entry && !inactive) {
        const activeTasks: Record<string, boolean> = crew.activeTasks ?? {};
        const CORE_FIELD: Record<string, string> = {
          workout1: 'workoutOneCompleted',
          workout2: 'workoutTwoCompleted',
          diet: 'dietCompleted',
          water: 'waterCompleted',
          reading: 'readingCompleted',
          photo: 'photoCompleted',
        };
        const coreOk = Object.entries(activeTasks).every(
          ([key, required]) => !required || !!(entry as Record<string, unknown>)[CORE_FIELD[key]]
        );
        const crewTasksCompleted: string[] = entry.crewTasksCompleted ?? [];
        const customTasks: { id: string }[] = crew.customCrewTasks ?? [];
        const customOk = customTasks.every((t) => crewTasksCompleted.includes(t.id));
        completed = coreOk && customOk;
      }

      return {
        uid,
        displayName,
        completed,
        points: (entry?.dailyPoints as number) ?? 0,
        inactive,
      };
    })
  );

  const activeMembers = memberData.filter((m) => !m.inactive);
  if (activeMembers.length === 0) return;

  // Not all active members are done yet — wait for more triggers
  if (!activeMembers.every((m) => m.completed)) return;

  const mvp = activeMembers.reduce((best, m) => (m.points > best.points ? m : best), activeMembers[0]);
  const newStreak = ((crew.crewStreak as number) ?? 0) + 1;
  const newLongest = Math.max((crew.longestCrewStreak as number) ?? 0, newStreak);

  // Atomic write with idempotency re-check inside transaction
  await db.runTransaction(async (tx) => {
    const freshSnap = await tx.get(crewRef);
    if (freshSnap.get('lastSummaryDate') === date) return; // another invocation won the race

    const summaryRef = db.doc(`crews/${crewId}/summaries/${date}`);
    tx.set(summaryRef, {
      crewId,
      date,
      memberResults: memberData,
      streakSurvived: true,
      newStreak,
      mvpUid: mvp.uid,
      pushedAt: admin.firestore.Timestamp.now(),
    });

    tx.update(crewRef, {
      crewStreak: newStreak,
      longestCrewStreak: newLongest,
      lastStreakDate: date,
      lastSummaryDate: date,
    });
  });

  // Send push notifications to all members
  const crewName: string = crew.name ?? 'Your crew';
  const notifTitle = `${crewName} COMPLETE`;
  const notifBody = `Your whole crew finished today. ${mvp.displayName} led with ${mvp.points} pts. Streak: ${newStreak} days.`;
  const notifData = { type: 'crew_complete', crewId, date };

  await Promise.allSettled(
    members.map(async (uid) => {
      const uSnap = await db.doc(`users/${uid}`).get();
      const uData = uSnap.data();
      if (!uData || uData.notifAllEnabled === false) return;
      await sendPush(uData.expoPushToken, uData.fcmWebToken, notifTitle, notifBody, notifData);
    })
  );
}

// Called by the client when the current user's allCoreCompleted transitions to true.
// Evaluates whether the entire crew has completed today and, if so, records the
// summary and sends push notifications. Idempotent — safe to call multiple times.
export const triggerCrewEvaluation = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const { crewId, date } = request.data as { crewId: string; date: string };
  if (!crewId || !date) throw new HttpsError('invalid-argument', 'crewId and date are required');

  // Accept any YYYY-MM-DD date string — the idempotency guard in evaluateCrewCompletion
  // (lastSummaryDate) already prevents duplicate processing.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpsError('invalid-argument', 'date must be YYYY-MM-DD');
  }

  await evaluateCrewCompletion(crewId, date);
  return { ok: true };
});

export const joinCrew = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const { joinCode } = request.data as { joinCode: string };

  if (!joinCode || typeof joinCode !== 'string' || !/^[A-Z0-9]{6}$/.test(joinCode)) {
    throw new HttpsError('invalid-argument', 'Join code must be exactly 6 alphanumeric characters');
  }

  const uid = request.auth.uid;

  // Rate limit: max 3 crew joins per hour
  const rateLimitRef = db.doc(`rateLimit/${uid}/crewJoins/window`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rateLimitRef);
    const now = Date.now();
    if (snap.exists) {
      const data = snap.data() as { count: number; windowStart: number };
      if (now - data.windowStart < 60 * 60 * 1000) {
        if (data.count >= 3) throw new HttpsError('resource-exhausted', 'Too many join attempts. Try again later.');
        tx.update(rateLimitRef, { count: data.count + 1 });
      } else {
        tx.set(rateLimitRef, { count: 1, windowStart: now });
      }
    } else {
      tx.set(rateLimitRef, { count: 1, windowStart: now });
    }
  });

  const userSnap = await db.doc(`users/${uid}`).get();
  const userData = userSnap.data();
  if (!userData) throw new HttpsError('not-found', 'User not found');
  if ((userData.crews ?? []).length >= 10) {
    throw new HttpsError('resource-exhausted', 'You are in the maximum number of crews (10)');
  }

  const crewQuery = await db.collection('crews').where('joinCode', '==', joinCode).limit(1).get();
  if (crewQuery.empty) throw new HttpsError('not-found', 'Invalid join code');

  const crewDoc = crewQuery.docs[0];
  const crewData = crewDoc.data();
  const crewId = crewDoc.id;

  if ((crewData.members ?? []).length >= 20) {
    throw new HttpsError('resource-exhausted', 'Crew is full (max 20 members)');
  }
  if ((crewData.members ?? []).includes(uid)) {
    throw new HttpsError('already-exists', 'You are already in this crew');
  }

  await db.runTransaction(async (tx) => {
    tx.update(crewDoc.ref, { members: admin.firestore.FieldValue.arrayUnion(uid) });
    tx.update(db.doc(`users/${uid}`), { crews: admin.firestore.FieldValue.arrayUnion(crewId) });
  });

  return { crewId, crewName: crewData.name };
});

export const kickMember = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const { crewId, targetUid } = request.data as { crewId: string; targetUid: string };
  if (!crewId || !targetUid) throw new HttpsError('invalid-argument', 'crewId and targetUid are required');

  const crewRef = db.doc(`crews/${crewId}`);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new HttpsError('not-found', 'Crew not found');

  const crew = crewSnap.data()!;
  const callerUid = request.auth.uid;

  if (!(crew.admins ?? []).includes(callerUid)) throw new HttpsError('permission-denied', 'Not an admin');
  if (targetUid === crew.creatorUid) throw new HttpsError('permission-denied', 'Cannot kick the creator');
  if (callerUid === targetUid) throw new HttpsError('invalid-argument', 'Cannot kick yourself — use leave instead');
  if (!(crew.members ?? []).includes(targetUid)) throw new HttpsError('not-found', 'User is not in this crew');

  await db.runTransaction(async (tx) => {
    tx.update(crewRef, {
      members: admin.firestore.FieldValue.arrayRemove(targetUid),
      admins: admin.firestore.FieldValue.arrayRemove(targetUid),
    });
    tx.update(db.doc(`users/${targetUid}`), { crews: admin.firestore.FieldValue.arrayRemove(crewId) });
  });

  return { success: true };
});

export const leaveCrew = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const { crewId } = request.data as { crewId: string };
  if (!crewId) throw new HttpsError('invalid-argument', 'crewId is required');

  const crewRef = db.doc(`crews/${crewId}`);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new HttpsError('not-found', 'Crew not found');

  const crew = crewSnap.data()!;
  const uid = request.auth.uid;

  if (!(crew.members ?? []).includes(uid)) throw new HttpsError('not-found', 'You are not in this crew');
  if (uid === crew.creatorUid) throw new HttpsError('permission-denied', 'Creator cannot leave — delete the crew instead');

  await db.runTransaction(async (tx) => {
    tx.update(crewRef, {
      members: admin.firestore.FieldValue.arrayRemove(uid),
      admins: admin.firestore.FieldValue.arrayRemove(uid),
    });
    tx.update(db.doc(`users/${uid}`), { crews: admin.firestore.FieldValue.arrayRemove(crewId) });
  });

  return { success: true };
});

export const deleteCrew = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const { crewId } = request.data as { crewId: string };
  if (!crewId) throw new HttpsError('invalid-argument', 'crewId is required');

  const crewRef = db.doc(`crews/${crewId}`);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new HttpsError('not-found', 'Crew not found');

  const crew = crewSnap.data()!;
  if (request.auth.uid !== crew.creatorUid) throw new HttpsError('permission-denied', 'Only the creator can delete the crew');

  const batch = db.batch();
  batch.delete(crewRef);
  for (const memberUid of (crew.members ?? [])) {
    batch.update(db.doc(`users/${memberUid}`), { crews: admin.firestore.FieldValue.arrayRemove(crewId) });
  }
  await batch.commit();

  return { success: true };
});

export const onFriendRequestAccepted = onDocumentUpdated(
  'friendRequests/{toUid}/incoming/{fromUid}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status === after.status) return;
    if (after.status !== 'accepted') return;

    // toUid = the one who accepted; fromUid = the original sender to notify
    const accepterUid = event.params.toUid;
    const requesterUid = event.params.fromUid;

    const [requesterSnap, accepterSnap] = await Promise.all([
      db.doc(`users/${requesterUid}`).get(),
      db.doc(`users/${accepterUid}`).get(),
    ]);

    const requesterData = requesterSnap.data();
    if (!requesterData) return;

    if (requesterData.notifAllEnabled === false) return;
    if (requesterData.notifFriendRequestsEnabled === false) return;

    const accepterName: string = accepterSnap.get('displayName') ?? 'Someone';

    await Promise.all([
      sendPush(
        requesterData.expoPushToken,
        requesterData.fcmWebToken,
        accepterName,
        'Accepted your friend request!',
      ),
      event.data!.after.ref.delete(),
    ]);
  },
);
