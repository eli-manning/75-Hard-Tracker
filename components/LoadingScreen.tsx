import { useEffect, useState, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform, Image } from 'react-native';
import { colors, fonts } from '../lib/theme';

const barFillGlow = Platform.OS === 'web'
  ? ({ boxShadow: `0 0 8px ${colors.accent}` } as any)
  : {
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 8,
    };

export function LoadingScreen({ showBar = true }: { showBar?: boolean }) {
  const [dots, setDots] = useState(0);
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const d = setInterval(() => setDots((n) => (n + 1) % 4), 500);
    Animated.timing(fillAnim, {
      toValue: 100,
      duration: 600,
      useNativeDriver: false,
    }).start();
    return () => clearInterval(d);
  }, []);

  const widthInterpolated = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Image
          source={require('../assets/images/crew-day_logo_transparent_bg.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      {showBar && (
        <View style={styles.bottomSection}>
          <View style={styles.barWrap}>
            <View style={styles.barTrack}>
              <Animated.View style={[styles.barFill, barFillGlow, { width: widthInterpolated }]} />
            </View>
            <Text style={styles.loadingText}>{'LOADING' + '.'.repeat(dots)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  logoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 220,
    height: 220,
  },
  bottomSection: {
    paddingBottom: 80,
    alignItems: 'center',
  },
  barWrap: {
    width: 220,
    gap: 10,
  },
  barTrack: {
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    height: 20,
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  loadingText: {
    fontFamily: fonts.pixel,
    fontSize: 8,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
