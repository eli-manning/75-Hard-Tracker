const imageMap: Record<string, number> = {
  '/images/workout1.png': require('../assets/images/workout1.png'),
  '/images/workout2.png': require('../assets/images/workout2.png'),
  '/images/diet.png': require('../assets/images/diet.png'),
  '/images/water.png': require('../assets/images/water.png'),
  '/images/reading.png': require('../assets/images/reading.png'),
  '/images/camera.png': require('../assets/images/camera.png'),
};

export function getImageSource(path: string): number | undefined {
  return imageMap[path];
}
