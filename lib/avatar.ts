import { UserProfile } from './types';

const CUSTOM_AVATARS: Record<string, string> = {
  'eli@themannings.com': '/avatars/eli.png',
  'rocketeloise@rocketmail.com': '/avatars/rocket.png',
};

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
