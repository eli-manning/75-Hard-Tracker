#!/usr/bin/env node
// Generates public/sw.js from public/sw.template.js, injecting Firebase config from env.
// Run before `expo export` or `expo start`.

const fs = require('fs');
const path = require('path');

// Load .env.local if present (for local dev)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

const required = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
}

const template = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'sw.template.js'),
  'utf8',
);

const output = template
  .replace('__FIREBASE_API_KEY__', process.env.EXPO_PUBLIC_FIREBASE_API_KEY)
  .replace('__FIREBASE_AUTH_DOMAIN__', process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN)
  .replace('__FIREBASE_PROJECT_ID__', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID)
  .replace('__FIREBASE_STORAGE_BUCKET__', process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET)
  .replace('__FIREBASE_MESSAGING_SENDER_ID__', process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)
  .replace('__FIREBASE_APP_ID__', process.env.EXPO_PUBLIC_FIREBASE_APP_ID);

fs.writeFileSync(path.join(__dirname, '..', 'public', 'sw.js'), output);
console.log('✓ public/sw.js generated');
