"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onFriendRequestAccepted = exports.deleteCrew = exports.leaveCrew = exports.kickMember = exports.joinCrew = exports.triggerCrewEvaluation = exports.onNudge = exports.onFriendRequestReceived = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const push_1 = require("./push");
admin.initializeApp();
const db = admin.firestore();
exports.onFriendRequestReceived = (0, firestore_1.onDocumentCreated)('friendRequests/{toUid}/incoming/{fromUid}', async (event) => {
    var _a;
    const toUid = event.params.toUid;
    const fromUid = event.params.fromUid;
    const [recipientSnap, senderSnap] = await Promise.all([
        db.doc(`users/${toUid}`).get(),
        db.doc(`users/${fromUid}`).get(),
    ]);
    const recipientData = recipientSnap.data();
    if (!recipientData)
        return;
    if (recipientData.notifAllEnabled === false)
        return;
    if (recipientData.notifFriendRequestsEnabled === false)
        return;
    const senderName = (_a = senderSnap.get('displayName')) !== null && _a !== void 0 ? _a : 'Someone';
    await (0, push_1.sendPush)(recipientData.expoPushToken, recipientData.fcmWebToken, senderName, 'Sent you a friend request!');
});
exports.onNudge = (0, firestore_1.onDocumentCreated)('nudges/{nudgeId}', async (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    const { toUid, fromUid, fromName, message, taskKey } = data;
    if (!fromUid || !toUid)
        return;
    const today = new Date().toISOString().slice(0, 10); // UTC "YYYY-MM-DD"
    const cooldownKey = `${toUid}_${taskKey !== null && taskKey !== void 0 ? taskKey : 'default'}`;
    const senderRef = db.doc(`users/${fromUid}`);
    const cooldownRef = db.doc(`users/${fromUid}/nudgeCooldowns/${cooldownKey}`);
    let shouldSend = false;
    try {
        await db.runTransaction(async (tx) => {
            var _a, _b, _c;
            const [senderSnap, cooldownSnap] = await Promise.all([
                tx.get(senderRef),
                tx.get(cooldownRef),
            ]);
            const sender = senderSnap.data();
            if (!sender)
                return;
            // Per-target cooldown: same sender + same target+task within 3 hours
            if (cooldownSnap.exists) {
                const exp = cooldownSnap.data().expiresAt.toDate();
                if (exp > new Date())
                    return; // still cooling down — skip silently
            }
            // Daily reset
            let nudgesRemaining = (_a = sender.nudgesRemaining) !== null && _a !== void 0 ? _a : 5;
            let purchasedNudgesToday = (_b = sender.purchasedNudgesToday) !== null && _b !== void 0 ? _b : 0;
            if (sender.nudgeResetDate !== today) {
                nudgesRemaining = 5;
                purchasedNudgesToday = 0;
            }
            // Quota check and profile update
            const profileUpdate = { nudgeResetDate: today };
            if (nudgesRemaining > 0) {
                profileUpdate.nudgesRemaining = nudgesRemaining - 1;
                profileUpdate.purchasedNudgesToday = purchasedNudgesToday;
                shouldSend = true;
            }
            else if (purchasedNudgesToday < 5 && ((_c = sender.totalPoints) !== null && _c !== void 0 ? _c : 0) >= 10) {
                profileUpdate.nudgesRemaining = 0;
                profileUpdate.purchasedNudgesToday = purchasedNudgesToday + 1;
                profileUpdate.totalPoints = admin.firestore.FieldValue.increment(-10);
                shouldSend = true;
            }
            else {
                return; // rate limited — no cooldown set, no profile update
            }
            const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 3 * 60 * 60 * 1000));
            tx.set(cooldownRef, { expiresAt });
            tx.update(senderRef, profileUpdate);
        });
    }
    catch (e) {
        console.error('[onNudge] rate-limit transaction failed:', e);
        return;
    }
    // Always delete the nudge doc — used only as a trigger, no need to persist
    await event.data.ref.delete().catch(() => { });
    if (!shouldSend)
        return;
    const userSnap = await db.doc(`users/${toUid}`).get();
    const userData = userSnap.data();
    if (!userData)
        return;
    if (userData.notifAllEnabled === false)
        return;
    if (userData.notifNudgesEnabled === false)
        return;
    const body = message !== null && message !== void 0 ? message : 'Go complete your tasks!';
    await (0, push_1.sendPush)(userData.expoPushToken, userData.fcmWebToken, fromName, body);
});
// ── Crew Cloud Functions ──────────────────────────────────────────────────────
const REGION = 'us-west2';
async function evaluateCrewCompletion(crewId, date) {
    var _a, _b, _c, _d;
    const crewRef = db.doc(`crews/${crewId}`);
    const crewSnap = await crewRef.get();
    if (!crewSnap.exists)
        return;
    const crew = crewSnap.data();
    // Idempotency: already processed today
    if (crew.lastSummaryDate === date)
        return;
    const yesterday = (() => {
        const d = new Date(`${date}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() - 1);
        return d.toISOString().slice(0, 10);
    })();
    // Fetch all member day entries and profiles in parallel
    const members = (_a = crew.members) !== null && _a !== void 0 ? _a : [];
    const memberData = await Promise.all(members.map(async (uid) => {
        var _a, _b, _c, _d;
        const [daySnap, userSnap, prevDaySnap] = await Promise.all([
            db.doc(`days/${uid}/entries/${date}`).get(),
            db.doc(`users/${uid}`).get(),
            db.doc(`days/${uid}/entries/${yesterday}`).get(),
        ]);
        const displayName = (_a = userSnap.get('displayName')) !== null && _a !== void 0 ? _a : uid.slice(0, 8);
        const entry = daySnap.exists ? daySnap.data() : null;
        // Member is inactive if no entry exists for today or yesterday
        const inactive = !entry && !prevDaySnap.exists;
        let completed = false;
        if (entry && !inactive) {
            const crewTasksCompleted = (_b = entry.crewTasksCompleted) !== null && _b !== void 0 ? _b : [];
            const customTasks = (_c = crew.customCrewTasks) !== null && _c !== void 0 ? _c : [];
            const customOk = customTasks.every((t) => crewTasksCompleted.includes(t.id));
            completed = !!entry.allCoreCompleted && customOk;
        }
        return {
            uid,
            displayName,
            completed,
            points: (_d = entry === null || entry === void 0 ? void 0 : entry.dailyPoints) !== null && _d !== void 0 ? _d : 0,
            inactive,
        };
    }));
    const activeMembers = memberData.filter((m) => !m.inactive);
    if (activeMembers.length === 0)
        return;
    // Not all active members are done yet — wait for more triggers
    if (!activeMembers.every((m) => m.completed))
        return;
    const mvp = activeMembers.reduce((best, m) => (m.points > best.points ? m : best), activeMembers[0]);
    const newStreak = ((_b = crew.crewStreak) !== null && _b !== void 0 ? _b : 0) + 1;
    const newLongest = Math.max((_c = crew.longestCrewStreak) !== null && _c !== void 0 ? _c : 0, newStreak);
    // Atomic write with idempotency re-check inside transaction
    await db.runTransaction(async (tx) => {
        const freshSnap = await tx.get(crewRef);
        if (freshSnap.get('lastSummaryDate') === date)
            return; // another invocation won the race
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
    const crewName = (_d = crew.name) !== null && _d !== void 0 ? _d : 'Your crew';
    const notifTitle = `${crewName} COMPLETE`;
    const notifBody = `Your whole crew finished today. ${mvp.displayName} led with ${mvp.points} pts. Streak: ${newStreak} days.`;
    const notifData = { type: 'crew_complete', crewId, date };
    await Promise.allSettled(members.map(async (uid) => {
        const uSnap = await db.doc(`users/${uid}`).get();
        const uData = uSnap.data();
        if (!uData || uData.notifAllEnabled === false)
            return;
        await (0, push_1.sendPush)(uData.expoPushToken, uData.fcmWebToken, notifTitle, notifBody, notifData);
    }));
}
// Called by the client when the current user's allCoreCompleted transitions to true.
// Evaluates whether the entire crew has completed today and, if so, records the
// summary and sends push notifications. Idempotent — safe to call multiple times.
exports.triggerCrewEvaluation = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    const { crewId, date } = request.data;
    if (!crewId || !date)
        throw new https_1.HttpsError('invalid-argument', 'crewId and date are required');
    const today = new Date().toISOString().slice(0, 10);
    if (date !== today)
        throw new https_1.HttpsError('invalid-argument', 'Can only evaluate today');
    await evaluateCrewCompletion(crewId, date);
    return { ok: true };
});
exports.joinCrew = (0, https_1.onCall)({ region: REGION }, async (request) => {
    var _a, _b, _c;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    const { joinCode } = request.data;
    if (!joinCode || typeof joinCode !== 'string' || !/^[A-Z0-9]{6}$/.test(joinCode)) {
        throw new https_1.HttpsError('invalid-argument', 'Join code must be exactly 6 alphanumeric characters');
    }
    const uid = request.auth.uid;
    // Rate limit: max 3 crew joins per hour
    const rateLimitRef = db.doc(`rateLimit/${uid}/crewJoins/window`);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(rateLimitRef);
        const now = Date.now();
        if (snap.exists) {
            const data = snap.data();
            if (now - data.windowStart < 60 * 60 * 1000) {
                if (data.count >= 3)
                    throw new https_1.HttpsError('resource-exhausted', 'Too many join attempts. Try again later.');
                tx.update(rateLimitRef, { count: data.count + 1 });
            }
            else {
                tx.set(rateLimitRef, { count: 1, windowStart: now });
            }
        }
        else {
            tx.set(rateLimitRef, { count: 1, windowStart: now });
        }
    });
    const userSnap = await db.doc(`users/${uid}`).get();
    const userData = userSnap.data();
    if (!userData)
        throw new https_1.HttpsError('not-found', 'User not found');
    if (((_a = userData.crews) !== null && _a !== void 0 ? _a : []).length >= 10) {
        throw new https_1.HttpsError('resource-exhausted', 'You are in the maximum number of crews (10)');
    }
    const crewQuery = await db.collection('crews').where('joinCode', '==', joinCode).limit(1).get();
    if (crewQuery.empty)
        throw new https_1.HttpsError('not-found', 'Invalid join code');
    const crewDoc = crewQuery.docs[0];
    const crewData = crewDoc.data();
    const crewId = crewDoc.id;
    if (((_b = crewData.members) !== null && _b !== void 0 ? _b : []).length >= 20) {
        throw new https_1.HttpsError('resource-exhausted', 'Crew is full (max 20 members)');
    }
    if (((_c = crewData.members) !== null && _c !== void 0 ? _c : []).includes(uid)) {
        throw new https_1.HttpsError('already-exists', 'You are already in this crew');
    }
    await db.runTransaction(async (tx) => {
        tx.update(crewDoc.ref, { members: admin.firestore.FieldValue.arrayUnion(uid) });
        tx.update(db.doc(`users/${uid}`), { crews: admin.firestore.FieldValue.arrayUnion(crewId) });
    });
    return { crewId, crewName: crewData.name };
});
exports.kickMember = (0, https_1.onCall)({ region: REGION }, async (request) => {
    var _a, _b;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    const { crewId, targetUid } = request.data;
    if (!crewId || !targetUid)
        throw new https_1.HttpsError('invalid-argument', 'crewId and targetUid are required');
    const crewRef = db.doc(`crews/${crewId}`);
    const crewSnap = await crewRef.get();
    if (!crewSnap.exists)
        throw new https_1.HttpsError('not-found', 'Crew not found');
    const crew = crewSnap.data();
    const callerUid = request.auth.uid;
    if (!((_a = crew.admins) !== null && _a !== void 0 ? _a : []).includes(callerUid))
        throw new https_1.HttpsError('permission-denied', 'Not an admin');
    if (targetUid === crew.creatorUid)
        throw new https_1.HttpsError('permission-denied', 'Cannot kick the creator');
    if (callerUid === targetUid)
        throw new https_1.HttpsError('invalid-argument', 'Cannot kick yourself — use leave instead');
    if (!((_b = crew.members) !== null && _b !== void 0 ? _b : []).includes(targetUid))
        throw new https_1.HttpsError('not-found', 'User is not in this crew');
    await db.runTransaction(async (tx) => {
        tx.update(crewRef, {
            members: admin.firestore.FieldValue.arrayRemove(targetUid),
            admins: admin.firestore.FieldValue.arrayRemove(targetUid),
        });
        tx.update(db.doc(`users/${targetUid}`), { crews: admin.firestore.FieldValue.arrayRemove(crewId) });
    });
    return { success: true };
});
exports.leaveCrew = (0, https_1.onCall)({ region: REGION }, async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    const { crewId } = request.data;
    if (!crewId)
        throw new https_1.HttpsError('invalid-argument', 'crewId is required');
    const crewRef = db.doc(`crews/${crewId}`);
    const crewSnap = await crewRef.get();
    if (!crewSnap.exists)
        throw new https_1.HttpsError('not-found', 'Crew not found');
    const crew = crewSnap.data();
    const uid = request.auth.uid;
    if (!((_a = crew.members) !== null && _a !== void 0 ? _a : []).includes(uid))
        throw new https_1.HttpsError('not-found', 'You are not in this crew');
    if (uid === crew.creatorUid)
        throw new https_1.HttpsError('permission-denied', 'Creator cannot leave — delete the crew instead');
    await db.runTransaction(async (tx) => {
        tx.update(crewRef, {
            members: admin.firestore.FieldValue.arrayRemove(uid),
            admins: admin.firestore.FieldValue.arrayRemove(uid),
        });
        tx.update(db.doc(`users/${uid}`), { crews: admin.firestore.FieldValue.arrayRemove(crewId) });
    });
    return { success: true };
});
exports.deleteCrew = (0, https_1.onCall)({ region: REGION }, async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    const { crewId } = request.data;
    if (!crewId)
        throw new https_1.HttpsError('invalid-argument', 'crewId is required');
    const crewRef = db.doc(`crews/${crewId}`);
    const crewSnap = await crewRef.get();
    if (!crewSnap.exists)
        throw new https_1.HttpsError('not-found', 'Crew not found');
    const crew = crewSnap.data();
    if (request.auth.uid !== crew.creatorUid)
        throw new https_1.HttpsError('permission-denied', 'Only the creator can delete the crew');
    const batch = db.batch();
    batch.delete(crewRef);
    for (const memberUid of ((_a = crew.members) !== null && _a !== void 0 ? _a : [])) {
        batch.update(db.doc(`users/${memberUid}`), { crews: admin.firestore.FieldValue.arrayRemove(crewId) });
    }
    await batch.commit();
    return { success: true };
});
exports.onFriendRequestAccepted = (0, firestore_1.onDocumentUpdated)('friendRequests/{toUid}/incoming/{fromUid}', async (event) => {
    var _a, _b, _c;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    if (before.status === after.status)
        return;
    if (after.status !== 'accepted')
        return;
    // toUid = the one who accepted; fromUid = the original sender to notify
    const accepterUid = event.params.toUid;
    const requesterUid = event.params.fromUid;
    const [requesterSnap, accepterSnap] = await Promise.all([
        db.doc(`users/${requesterUid}`).get(),
        db.doc(`users/${accepterUid}`).get(),
    ]);
    const requesterData = requesterSnap.data();
    if (!requesterData)
        return;
    if (requesterData.notifAllEnabled === false)
        return;
    if (requesterData.notifFriendRequestsEnabled === false)
        return;
    const accepterName = (_c = accepterSnap.get('displayName')) !== null && _c !== void 0 ? _c : 'Someone';
    await Promise.all([
        (0, push_1.sendPush)(requesterData.expoPushToken, requesterData.fcmWebToken, accepterName, 'Accepted your friend request!'),
        event.data.after.ref.delete(),
    ]);
});
//# sourceMappingURL=index.js.map