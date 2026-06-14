import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { colors, radius, spacing, fonts } from '@/theme';

interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
}

export function FilterChip({ label, selected, onPress, icon: Icon }: FilterChipProps) {
  const fg = selected ? colors.white : colors.textSecondary;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.unselected]}
    >
      {Icon ? <Icon size={15} color={selected ? colors.white : colors.primary} strokeWidth={2.2} /> : null}
      <AppText style={[styles.text, { color: fg }]}>{label}</AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 36,
    paddingHorizontal: spacing.base,
    borderRadius: radius.pill,
  },
  selected: {
    backgroundColor: colors.primary,
  },
  unselected: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontFamily: fonts.interMedium,
    fontSize: 13,
  },
});
