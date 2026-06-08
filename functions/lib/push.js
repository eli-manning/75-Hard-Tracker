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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendExpoPush = sendExpoPush;
exports.sendFcmPush = sendFcmPush;
exports.sendPush = sendPush;
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
async function sendExpoPush(to, title, body, data) {
    if (!to.startsWith('ExponentPushToken['))
        return;
    await (0, node_fetch_1.default)('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(Object.assign({ to, title, body, sound: 'default' }, (data ? { data } : {}))),
    });
}
async function sendFcmPush(token, title, body, data) {
    await admin.messaging().send(Object.assign(Object.assign({ token, notification: { title, body } }, (data ? { data } : {})), { webpush: {
            notification: { icon: '/icon-192.png', badge: '/icon-192.png' },
        } }));
}
async function sendPush(expoPushToken, fcmWebToken, title, body, data) {
    // Prefer native Expo push; only fall back to FCM web push if no Expo token.
    // Sending both causes duplicates when a user has tokens from both native and PWA.
    if (expoPushToken) {
        await sendExpoPush(expoPushToken, title, body, data);
    }
    else if (fcmWebToken) {
        await sendFcmPush(fcmWebToken, title, body, data);
    }
}
//# sourceMappingURL=push.js.map