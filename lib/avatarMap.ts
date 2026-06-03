const avatarRequireMap: Record<string, number> = {
  '/avatars/eli.png': require('../assets/avatars/eli.png'),
  '/avatars/rocket.png': require('../assets/avatars/rocket.png'),
  '/avatars/default.png': require('../assets/avatars/default.png'),
};

// Portrait sprites: aspect ratio (width/height) — used to top-crop to show head
export const AVATAR_PORTRAIT_RATIO: Record<string, number> = {
  '/avatars/eli.png': 1536 / 2730,
  '/avatars/rocket.png': 1792 / 2390,
};

export function getAvatarSource(url: string): { uri: string } | number {
  if (avatarRequireMap[url]) return avatarRequireMap[url];
  return { uri: url }; // DiceBear URLs
}
