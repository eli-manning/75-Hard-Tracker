import { ReactNode } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, shadows } from '../lib/theme';
import { getImageSource } from '../lib/imageMap';

interface ChallengeItemProps {
  label: string;
  icon?: string;        // path like '/images/workout1.png'
  completed: boolean;
  readOnly: boolean;
  children?: ReactNode;
  onToggle?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  onNudge?: () => void;
  nudgedAlready?: boolean;
}

export function ChallengeItem({
  label,
  icon,
  completed,
  readOnly,
  children,
  onToggle,
  disabled,
  disabledReason,
  onNudge,
  nudgedAlready,
}: ChallengeItemProps) {
  const isDisabled = readOnly || disabled;
  const iconSource = icon ? getImageSource(icon) : undefined;

  const content = (
    <View style={[
      styles.card,
      completed ? styles.cardDone : styles.cardDefault,
    ]}>
      <View style={styles.row}>
        {/* Pixel checkbox */}
        <View style={[
          styles.checkbox,
          completed ? styles.checkboxDone : styles.checkboxEmpty,
          isDisabled && !completed && styles.checkboxDisabled,
        ]}>
          {completed && (
            <Svg width={12} height={10} viewBox="0 0 12 10" fill="none">
              <Path d="M1 5l3 3 7-7" stroke="#0c1018" strokeWidth={2.5} strokeLinecap="square" />
            </Svg>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.labelRow}>
            <Text style={[
              styles.label,
              completed && styles.labelDone,
              completed && styles.labelStrike,
            ]}>
              {label}
            </Text>
            {iconSource !== undefined && (
              <Image
                source={iconSource}
                style={[styles.icon, completed && styles.iconDone]}
                resizeMode="contain"
              />
            )}
          </View>
          {disabled && disabledReason && (
            <Text style={styles.disabledReason}>{disabledReason}</Text>
          )}
          {children && <View style={styles.children}>{children}</View>}
        </View>

        {onNudge && !completed && (
          <TouchableOpacity
            onPress={onNudge}
            disabled={nudgedAlready}
            style={[styles.nudgeBtn, nudgedAlready && styles.nudgeBtnDone]}
          >
            <Text style={[styles.nudgeBtnText, nudgedAlready && styles.nudgeBtnTextDone]}>
              {nudgedAlready ? 'NUDGED' : 'NUDGE'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (isDisabled || !onToggle) {
    return content;
  }

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderWidth: 2,
    ...shadows.pixel,
  },
  nudgeBtn: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  nudgeBtnDone: {
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  nudgeBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 5,
    color: colors.accent,
  },
  nudgeBtnTextDone: {
    color: colors.textMuted,
  },
  cardDefault: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardDone: {
    borderColor: colors.green,
    backgroundColor: colors.greenLight,
    ...shadows.glowGreen,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  checkboxEmpty: {
    borderColor: colors.textMuted,
    backgroundColor: 'transparent',
  },
  checkboxDone: {
    borderColor: colors.green,
    backgroundColor: colors.green,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  checkboxDisabled: {
    opacity: 0.4,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  label: {
    fontFamily: fonts.vt323,
    fontSize: 20,
    color: colors.text,
    letterSpacing: 0.4,
  },
  labelDone: {
    color: colors.green,
    opacity: 0.7,
  },
  labelStrike: {
    textDecorationLine: 'line-through',
  },
  icon: {
    width: 28,
    height: 28,
    flexShrink: 0,
  },
  iconDone: {
    opacity: 0.3,
  },
  disabledReason: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.textMuted,
    marginTop: 3,
  },
  children: {
    marginTop: 8,
  },
});
