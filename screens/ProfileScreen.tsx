import React, { useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
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
  Wallet,
  Heart,
  CalendarDays,
  Compass,
  Plus,
  Check,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import {
  Screen,
  AppText,
  Card,
  FeatureIcon,
  Button,
  SectionHeader,
} from "@/components";
import { colors, spacing, radius, fonts, shadows, hairline } from "@/theme";
import { usePrefsStore } from "@/store/usePrefsStore";
import { usePlanStore } from "@/store/usePlanStore";
import { useTripsStore } from "@/store/useTripsStore";
import { audioTours } from "@/mock";
import { formatDateRange } from "@/utils/date";
import { cityName } from "@/utils/trip";
import type { BudgetRange, Trip } from "@/types";

const BUDGET_LABEL: Record<Exclude<BudgetRange, null>, string> = {
  budget: "Budget",
  mid: "Mid-range",
  luxury: "Luxury",
};

const INTEREST_LABEL: Record<string, string> = {
  culture: "Culture",
  food: "Food",
  adventure: "Adventure",
  relaxation: "Relaxation",
};

export function ProfileScreen() {
  const router = useRouter();
  const prefs = usePrefsStore();
  const editPreferences = usePrefsStore((s) => s.editPreferences);
  const resetPrefs = usePrefsStore((s) => s.reset);
  const days = usePlanStore((s) => s.days);
  const resetPlan = usePlanStore((s) => s.resetPlan);

  const trips = useTripsStore((s) => s.trips);
  const activeTripId = useTripsStore((s) => s.activeTripId);
  const saveActiveSnapshot = useTripsStore((s) => s.saveActiveSnapshot);
  const switchTrip = useTripsStore((s) => s.switchTrip);
  const startNewTrip = useTripsStore((s) => s.startNewTrip);
  const deleteTrip = useTripsStore((s) => s.deleteTrip);
  const resetTrips = useTripsStore((s) => s.resetAll);

  // Keep the active trip's saved snapshot fresh whenever this screen is
  // viewed, so its row in the list reflects any swaps/reorders since the
  // last switch — without needing to sync on every plan edit elsewhere.
  useFocusEffect(
    useCallback(() => {
      if (activeTripId) saveActiveSnapshot();
    }, [activeTripId, saveActiveSnapshot]),
  );

  const sortedTrips = [...trips].sort((a, b) => b.updatedAt - a.updatedAt);

  const totalStops = days.reduce((n, d) => n + d.items.length, 0);

  const onReset = () => {
    Alert.alert(
      "Reset app data?",
      "This clears every trip, your preferences, and restarts onboarding.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            resetPlan();
            resetPrefs();
            resetTrips();
          },
        },
      ],
    );
  };

  const onDeleteTrip = (trip: Trip) => {
    Alert.alert(
      `Delete ${cityName(trip.destination)}?`,
      "This trip's itinerary can't be recovered.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteTrip(trip.id) },
      ],
    );
  };

  const soon = () =>
    Alert.alert("Coming soon", "This is a demo screen for the MVP.");

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
              {cityName(prefs.destination)} -{" "}
              {formatDateRange(prefs.startDate, prefs.endDate)}
            </AppText>
          </View>
        </View>
      </Card>

      {/* Stats */}
      <View style={styles.statRow}>
        <Stat value={prefs.durationDays} label="Days" />
        <Stat value={totalStops} label="Stops" />
        <Stat value={audioTours.length} label="Tours" />
      </View>

      {/* Trips */}
      <View style={styles.section}>
        <SectionHeader
          title="Trips"
          actionLabel="+ New trip"
          onActionPress={startNewTrip}
        />
        {sortedTrips.length === 0 ? (
          <Card style={styles.tripRow} onPress={() => router.push("/plan")}>
            <FeatureIcon icon={Compass} />
            <View style={styles.tripText}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {cityName(prefs.destination)}
              </AppText>
              <AppText variant="caption" style={styles.tripSub}>
                {formatDateRange(prefs.startDate, prefs.endDate)} ·{" "}
                {totalStops} stops
              </AppText>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </Card>
        ) : (
          <View style={styles.tripList}>
            {sortedTrips.map((trip) => (
              <TripRow
                key={trip.id}
                trip={trip}
                active={trip.id === activeTripId}
                onPress={() => switchTrip(trip.id)}
                onDelete={() => onDeleteTrip(trip)}
              />
            ))}
          </View>
        )}
        <Button
          label="Edit trip details"
          variant="secondary"
          icon={Pencil}
          onPress={editPreferences}
          style={styles.editTripBtn}
        />
      </View>

      {/* Trip preferences */}
      <View style={styles.section}>
        <SectionHeader title="Trip preferences" />
        <Card noPadding>
          <MenuRow
            icon={Wallet}
            label="Budget"
            value={prefs.budget ? BUDGET_LABEL[prefs.budget] : "Not set"}
            onPress={editPreferences}
          />
          <MenuRow
            icon={Heart}
            label="Interests"
            value={
              prefs.interests.length
                ? prefs.interests.map((i) => INTEREST_LABEL[i] ?? i).join(", ")
                : "Not set"
            }
            onPress={editPreferences}
          />
          <MenuRow
            icon={CalendarDays}
            label="Duration"
            value={`${prefs.durationDays} ${prefs.durationDays === 1 ? "day" : "days"}`}
            onPress={editPreferences}
            last
          />
        </Card>
      </View>

      {/* Menu */}
      <View style={styles.section}>
        <SectionHeader title="Explore" />
        <Card noPadding>
          <MenuRow
            icon={Headphones}
            label="Audio tours"
            onPress={() => router.push("/audio-tours")}
          />
          <MenuRow
            icon={Ticket}
            label="Bookings"
            onPress={() => router.push("/bookings")}
          />
          <MenuRow
            icon={Bookmark}
            label="Saved places"
            onPress={() => router.push("/discover")}
            last
          />
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

      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.reset}
        onPress={onReset}
      >
        <Trash2 size={18} color={colors.alert} strokeWidth={2.2} />
        <AppText style={styles.resetText}>Reset app data</AppText>
      </TouchableOpacity>

      <AppText variant="caption" center style={styles.version}>
        Navigate the Moment - MVP v1.0
      </AppText>
    </Screen>
  );
}

function TripRow({
  trip,
  active,
  onPress,
  onDelete,
}: {
  trip: Trip;
  active: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const stops = trip.days.reduce((n, d) => n + d.items.length, 0);
  return (
    <Card
      style={[styles.tripRow, active && styles.tripRowActive]}
      onPress={active ? undefined : onPress}
    >
      <FeatureIcon
        icon={Compass}
        background={active ? colors.primary : colors.mint}
        color={active ? colors.white : colors.primary}
      />
      <View style={styles.tripText}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {cityName(trip.destination) || "Untitled trip"}
        </AppText>
        <AppText variant="caption" style={styles.tripSub}>
          {formatDateRange(trip.startDate, trip.endDate)} · {stops} stops
        </AppText>
      </View>
      {active ? (
        <View style={styles.activeTag}>
          <Check size={12} color={colors.primary} strokeWidth={2.6} />
          <AppText style={styles.activeTagText}>Active</AppText>
        </View>
      ) : (
        <>
          <TouchableOpacity onPress={onDelete} hitSlop={8} style={styles.tripDelete}>
            <Trash2 size={16} color={colors.textMuted} strokeWidth={2.2} />
          </TouchableOpacity>
          <ChevronRight size={18} color={colors.textMuted} />
        </>
      )}
    </Card>
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
  value,
  onPress,
  last,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
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
      {value ? (
        <AppText variant="caption" style={styles.menuValue} numberOfLines={1}>
          {value}
        </AppText>
      ) : null}
      <ChevronRight size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.base },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  identityText: { flex: 1, gap: spacing.xs },
  locRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  loc: { color: colors.textSecondary, flex: 1 },
  statRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    paddingVertical: spacing.base,
    ...shadows.card,
    ...hairline,
  },
  section: { marginTop: spacing.xl },

  // Current trip
  tripList: { gap: spacing.sm },
  tripRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  tripRowActive: { borderWidth: 1.5, borderColor: colors.primary },
  tripText: { flex: 1, gap: 2 },
  tripSub: { color: colors.textSecondary },
  tripDelete: { padding: spacing.xs },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  activeTagText: { fontWeight: "600", fontSize: 11.5, color: colors.primary },
  editTripBtn: { marginTop: spacing.md },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuLabel: { flex: 1 },
  menuValue: { maxWidth: 130 },
  reset: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.base,
  },
  resetText: { fontWeight: "600", fontSize: 14, color: colors.alert },
  version: { marginTop: spacing.md },
});
