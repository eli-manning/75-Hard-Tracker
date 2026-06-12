import { UserProfile } from './types';

// Format: "email1@example.com:/avatars/name1.png,email2@example.com:/avatars/name2.png"
function parseCustomAvatarMap(): Record<string, string> {
  const raw = process.env.EXPO_PUBLIC_CUSTOM_AVATAR_MAP ?? '';
  if (!raw.trim()) return {};
  const result: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const colonIdx = pair.indexOf(':');
    if (colonIdx < 0) continue;
    const email = pair.slice(0, colonIdx).trim().toLowerCase();
    const path = pair.slice(colonIdx + 1).trim();
    if (email && path) result[email] = path;
  }
  return result;
}

const CUSTOM_AVATARS = parseCustomAvatarMap();

export function generateSeed(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function getDiceBearUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/pixel-art/png?seed=${encodeURIComponent(seed)}`;
}

export function getAvatarUrl(profile: UserProfile): string {
  const custom = CUSTOM_AVATARS[profile.email?.toLowerCase() ?? ''];
  if (custom) return custom;
  return getDiceBearUrl(profile.dicebearSeed ?? profile.uid);
}

export function hasCustomAvatar(profile: UserProfile): boolean {
  return !!(CUSTOM_AVATARS[profile.email?.toLowerCase() ?? '']);
}
