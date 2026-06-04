const avatarRequireMap: Record<string, number> = {
  '/avatars/eli.png': require('../assets/avatars/eli.png'),
  '/avatars/rocket.png': require('../assets/avatars/rocket.png'),
  '/avatars/default.png': require('../assets/avatars/default.png'),
};

// Portrait sprites: aspect ratio (width/height) — used to top-crop to show head
// (only needed for uncropped tall sprites; pre-cropped images use cover mode)
export const AVATAR_PORTRAIT_RATIO: Record<string, number> = {};

export function getAvatarSource(url: string): { uri: string } | number {
  if (avatarRequireMap[url]) return avatarRequireMap[url];
  return { uri: url }; // DiceBear URLs
}
