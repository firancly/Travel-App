import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Pencil,
  Headphones,
  Ticket,
  Bookmark,
  Bell,
  Shield,
  Info,
  Trash2,
  ChevronRight,
  MapPin,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Screen, AppText, Card, FeatureIcon, Button, SectionHeader } from '@/components';
import { colors, spacing, radius, fonts } from '@/theme';
import { usePrefsStore } from '@/store/usePrefsStore';
import { usePlanStore } from '@/store/usePlanStore';
import { audioTours } from '@/mock';
import { formatDateRange } from '@/utils/date';
import { cityName } from '@/utils/trip';

export function ProfileScreen() {
  const router = useRouter();
  const prefs = usePrefsStore();
  const editPreferences = usePrefsStore((s) => s.editPreferences);
  const resetPrefs = usePrefsStore((s) => s.reset);
  const days = usePlanStore((s) => s.days);
  const resetPlan = usePlanStore((s) => s.resetPlan);

  const totalStops = days.reduce((n, d) => n + d.items.length, 0);

  const onReset = () => {
    Alert.alert(
      'Reset app data?',
      'This clears your preferences and itinerary, and restarts onboarding.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetPlan();
            resetPrefs();
          },
        },
      ],
    );
  };

  const soon = () => Alert.alert('Coming soon', 'This is a demo screen for the MVP.');

  return (
    <Screen title="Profile">
      {/* Identity card */}
      <Card style={styles.identity}>
        <View style={styles.avatar}>
          <User size={28} color={colors.white} strokeWidth={2.2} />
        </View>
        <View style={styles.identityText}>
          <AppText variant="cardTitle">Traveler</AppText>
          <View style={styles.locRow}>
            <MapPin size={14} color={colors.textMuted} />
            <AppText variant="body" style={styles.loc}>
              {cityName(prefs.destination)} - {formatDateRange(prefs.startDate, prefs.endDate)}
            </AppText>
          </View>
        </View>
      </Card>

      {/* Stats */}
      <View style={styles.stats}>
        <Stat value={prefs.durationDays} label="Days" />
        <View style={styles.statDivider} />
        <Stat value={totalStops} label="Stops" />
        <View style={styles.statDivider} />
        <Stat value={audioTours.length} label="Tours" />
      </View>

      <Button label="Edit preferences" variant="secondary" icon={Pencil} onPress={editPreferences} />

      {/* Menu */}
      <View style={styles.section}>
        <SectionHeader title="Explore" />
        <Card noPadding>
          <MenuRow icon={Headphones} label="Audio tours" onPress={() => router.push('/audio-tours')} />
          <MenuRow icon={Ticket} label="Bookings" onPress={() => router.push('/bookings')} />
          <MenuRow icon={Bookmark} label="Saved places" onPress={() => router.push('/discover')} last />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Settings" />
        <Card noPadding>
          <MenuRow icon={Bell} label="Notifications" onPress={soon} />
          <MenuRow icon={Shield} label="Privacy & data" onPress={soon} />
          <MenuRow icon={Info} label="Help & support" onPress={soon} last />
        </Card>
      </View>

      <TouchableOpacity activeOpacity={0.8} style={styles.reset} onPress={onReset}>
        <Trash2 size={18} color={colors.alert} strokeWidth={2.2} />
        <AppText style={styles.resetText}>Reset app data</AppText>
      </TouchableOpacity>

      <AppText variant="caption" center style={styles.version}>
        Navigate the Moment - MVP v1.0
      </AppText>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="stat">{value}</AppText>
      <AppText variant="label">{label}</AppText>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.menuRow, !last && styles.menuDivider]}
    >
      <FeatureIcon icon={icon} size={36} />
      <AppText variant="bodyStrong" style={styles.menuLabel}>
        {label}
      </AppText>
      <ChevronRight size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: { flex: 1, gap: spacing.xs },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  loc: { color: colors.textSecondary, flex: 1 },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radius.xl,
    paddingVertical: spacing.base,
    marginVertical: spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  statDivider: { width: 1, height: 36, backgroundColor: colors.mintDeep },
  section: { marginTop: spacing.xl },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuLabel: { flex: 1 },
  reset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.base,
  },
  resetText: { fontFamily: fonts.interSemiBold, fontSize: 14, color: colors.alert },
  version: { marginTop: spacing.md },
});
