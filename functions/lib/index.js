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
exports.onFriendRequestAccepted = exports.onNudge = exports.onFriendRequestReceived = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
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
    const toUid = event.params.toUid;
    const fromUid = event.params.fromUid;
    const [senderSnap, accepterSnap] = await Promise.all([
        db.doc(`users/${toUid}`).get(),
        db.doc(`users/${fromUid}`).get(),
    ]);
    const senderData = senderSnap.data();
    if (!senderData)
        return;
    if (senderData.notifAllEnabled === false)
        return;
    if (senderData.notifFriendRequestsEnabled === false)
        return;
    const accepterName = (_c = accepterSnap.get('displayName')) !== null && _c !== void 0 ? _c : 'Someone';
    await (0, push_1.sendPush)(senderData.expoPushToken, senderData.fcmWebToken, accepterName, 'Accepted your friend request!');
});
//# sourceMappingURL=index.js.map