import { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Animated } from 'react-native';

const STAR_COUNT = 90;

// Stable star positions computed once at module load
const stars = Array.from({ length: STAR_COUNT }, (_, i) => ({
  id: i,
  top:      Math.floor(Math.random() * 100),
  left:     Math.floor(Math.random() * 100),
  size:     Math.random() < 0.12 ? 3 : Math.random() < 0.35 ? 2 : 1,
  delay:    Math.random() * 5000,
  duration: 2500 + Math.random() * 4000,
}));

function NativeStarField() {
  const anims = useRef(stars.map(() => new Animated.Value(0.25))).current;

  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const star = stars[i];
      return Animated.loop(
        Animated.sequence([
          Animated.delay(star.delay),
          Animated.timing(anim, { toValue: 1,    duration: star.duration / 2, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.15, duration: star.duration / 2, useNativeDriver: true }),
        ])
      );
    });
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, styles.native]} pointerEvents="none">
      {stars.map((star, i) => (
        <Animated.View
          key={star.id}
          style={[
            styles.star,
            {
              top:          `${star.top}%` as any,
              left:         `${star.left}%` as any,
              width:        star.size,
              height:       star.size,
              borderRadius: star.size / 2,
              opacity:      anims[i],
            },
          ]}
        />
      ))}
    </View>
  );
}

function WebStarField() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const prevBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#03030f';

    const styleId = 'star-field-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; }
          50%       { opacity: 0.9; }
        }
        .sf-star {
          position: fixed;
          background: #ffffff;
          border-radius: 50%;
          animation: twinkle linear infinite;
          pointer-events: none;
        }
        #star-field-container {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
      `;
      document.head.appendChild(style);
    }

    const container = document.createElement('div');
    container.id = 'star-field-container';

    stars.forEach((star) => {
      const el = document.createElement('div');
      el.className = 'sf-star';
      el.style.top               = `${star.top}%`;
      el.style.left              = `${star.left}%`;
      el.style.width             = `${star.size}px`;
      el.style.height            = `${star.size}px`;
      el.style.animationDelay    = `${star.delay}ms`;
      el.style.animationDuration = `${star.duration}ms`;
      container.appendChild(el);
    });

    document.body.prepend(container);

    return () => {
      container.remove();
      document.body.style.backgroundColor = prevBg;
    };
  }, []);

  return null;
}

export function StarField() {
  if (Platform.OS === 'web') return <WebStarField />;
  return <NativeStarField />;
}

const styles = StyleSheet.create({
  native: { zIndex: 0 },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },
});
