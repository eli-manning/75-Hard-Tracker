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
