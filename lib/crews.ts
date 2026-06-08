export const CREW_ICONS = [
  { key: 'shield',    ion: 'shield-outline' },
  { key: 'flag',      ion: 'flag-outline' },
  { key: 'fire',      ion: 'flame-outline' },
  { key: 'bolt',      ion: 'flash-outline' },
  { key: 'star',      ion: 'star-outline' },
  { key: 'trophy',    ion: 'trophy-outline' },
  { key: 'crown',     ion: 'ribbon-outline' },
  { key: 'diamond',   ion: 'diamond-outline' },
  { key: 'rocket',    ion: 'rocket-outline' },
  { key: 'dumbbell',  ion: 'barbell-outline' },
  { key: 'mountain',  ion: 'triangle-outline' },
  { key: 'compass',   ion: 'compass-outline' },
  { key: 'swords',    ion: 'cut-outline' },
  { key: 'skull',     ion: 'skull-outline' },
  { key: 'heart',     ion: 'heart-outline' },
  { key: 'leaf',      ion: 'leaf-outline' },
  { key: 'water',     ion: 'water-outline' },
  { key: 'book',      ion: 'book-outline' },
  { key: 'camera',    ion: 'camera-outline' },
  { key: 'bike',      ion: 'bicycle-outline' },
  { key: 'walk',      ion: 'walk-outline' },
  { key: 'sun',       ion: 'sunny-outline' },
  { key: 'moon',      ion: 'moon-outline' },
  { key: 'infinite',  ion: 'infinite-outline' },
] as const;

export type CrewIconKey = typeof CREW_ICONS[number]['key'];

export function getCrewIconIon(key: string): string {
  return (CREW_ICONS.find((i) => i.key === key)?.ion ?? 'shield-outline') as string;
}
