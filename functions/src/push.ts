import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

export async function sendExpoPush(to: string, title: string, body: string): Promise<void> {
  if (!to.startsWith('ExponentPushToken[')) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify({ to, title, body, sound: 'default' }),
  });
}

export async function sendFcmPush(token: string, title: string, body: string): Promise<void> {
  await admin.messaging().send({
    token,
    notification: { title, body },
    webpush: {
      notification: { icon: '/icon-192.png', badge: '/icon-192.png' },
    },
  });
}

export async function sendPush(
  expoPushToken: string | undefined,
  fcmWebToken: string | undefined,
  title: string,
  body: string,
): Promise<void> {
  // Prefer native Expo push; only fall back to FCM web push if no Expo token.
  // Sending both causes duplicates when a user has tokens from both native and PWA.
  if (expoPushToken) {
    await sendExpoPush(expoPushToken, title, body);
  } else if (fcmWebToken) {
    await sendFcmPush(fcmWebToken, title, body);
  }
}
