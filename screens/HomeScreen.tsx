import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import {
  CloudRain,
  Compass,
  CalendarRange,
  Headphones,
  Ticket,
  ChevronRight,
  Clock,
  X,
  Settings,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import {
  Screen,
  AppText,
  Card,
  FeatureIcon,
  SectionHeader,
  Button,
  SkeletonCard,
  EmptyState,
} from "@/components";
import { colors, spacing, radius, fonts } from "@/theme";
import { usePrefsStore } from "@/store/usePrefsStore";
import { usePlanStore } from "@/store/usePlanStore";
import { useWeatherStore } from "@/store/useWeatherStore";
import { CATEGORY_META } from "@/utils/categories";
import { getTripInfo, cityName } from "@/utils/trip";
import { to12h, formatDuration } from "@/utils/time";
import { useFakeLoading } from "@/hooks/useFakeLoading";
import type { ItineraryItem } from "@/types";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen() {
  const router = useRouter();
  const loading = useFakeLoading();

  const prefs = usePrefsStore();
  const days = usePlanStore((s) => s.days);

  const trip = useMemo(() => getTripInfo(prefs), [prefs]);
  const todayIdx = Math.min(trip.dayIndex, days.length - 1);
  const today = days[todayIdx];
  const todayItems = today?.items ?? [];

  const [weatherDismissed, setWeatherDismissed] = useState(false);
  const loadWeather = useWeatherStore((s) => s.load);
  const weather = useWeatherStore((s) => s.data);
  const weatherLoading = useWeatherStore((s) => s.loading);

  useEffect(() => {
    if (prefs.destination) loadWeather(prefs.destination, prefs.durationDays);
  }, [prefs.destination, prefs.durationDays, loadWeather]);

  const rainy = weather
    ? weather.todayRainChance > 50 || weather.current.condition === "rain" || weather.current.condition === "thunder"
    : false;
  const showWeather = !weatherDismissed && rainy;
  const weatherTitle = weather?.current.condition === "thunder" ? "Thunderstorms likely" : "Rain likely today";
  const weatherDetail = weather
    ? `${weather.todayRainChance}% chance of rain, ${Math.round(weather.current.tempC)}°C now. Swap outdoor plans for an indoor pick?`
    : "";

  const onWeatherSwap = () => {
    setWeatherDismissed(true);
    router.push("/plan");
  };

  return (
    <Screen scroll>
      {/* Greeting */}
      <View style={styles.greetingRow}>
        <View style={styles.greetingText}>
          <AppText variant="label" style={styles.hello}>
            {greeting()}
          </AppText>
          <AppText variant="screenTitle">{cityName(prefs.destination)}</AppText>
          <AppText variant="body" style={styles.status}>
            {trip.statusLabel}
          </AppText>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.avatarBtn}
          onPress={() => router.push("/profile")}
        >
          <Settings size={20} color={colors.primary} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* Weather banner */}
      {weatherLoading && !weather && !weatherDismissed && (
        <View style={styles.weatherSkeleton} />
      )}
      {showWeather && (
        <View style={styles.weather}>
          <View style={styles.weatherIcon}>
            <CloudRain size={22} color={colors.alert} strokeWidth={2.2} />
          </View>
          <View style={styles.weatherBody}>
            <AppText variant="bodyStrong" style={styles.weatherTitle}>
              {weatherTitle}
            </AppText>
            <AppText variant="body" style={styles.weatherText}>
              {weatherDetail}
            </AppText>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.weatherCta}
              onPress={onWeatherSwap}
            >
              <AppText style={styles.weatherCtaText}>Smart swap it</AppText>
              <ChevronRight
                size={16}
                color={colors.primary}
                strokeWidth={2.4}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => setWeatherDismissed(true)}
            style={styles.weatherClose}
          >
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Today's plan */}
      <View style={styles.section}>
        <SectionHeader
          title="Today's plan"
          actionLabel="View all"
          onActionPress={() => router.push("/plan")}
        />
        {loading ? (
          <View style={{ gap: spacing.md }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : todayItems.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="Nothing planned yet"
            message="Add places from Discover to build your day."
            ctaLabel="Discover places"
            onCtaPress={() => router.push("/discover")}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {todayItems.slice(0, 4).map((item) => (
              <TodayCard
                key={item.id}
                item={item}
                onPress={() => router.push("/plan")}
              />
            ))}
          </View>
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <SectionHeader title="Quick actions" />
        <View style={styles.actionsGrid}>
          <ActionTile
            icon={Compass}
            label="Discover"
            onPress={() => router.push("/discover")}
          />
          <ActionTile
            icon={CalendarRange}
            label="My Plan"
            onPress={() => router.push("/plan")}
          />
          <ActionTile
            icon={Headphones}
            label="Audio Tours"
            onPress={() => router.push("/audio-tours")}
          />
          <ActionTile
            icon={Ticket}
            label="Bookings"
            onPress={() => router.push("/bookings")}
          />
        </View>
      </View>
    </Screen>
  );
}

function TodayCard({
  item,
  onPress,
}: {
  item: ItineraryItem;
  onPress: () => void;
}) {
  const meta = CATEGORY_META[item.category];
  return (
    <Card onPress={onPress}>
      <View style={styles.todayRow}>
        <View style={styles.timeCol}>
          <AppText style={styles.time}>{to12h(item.time)}</AppText>
        </View>
        <FeatureIcon icon={meta.icon} />
        <View style={styles.todayText}>
          <AppText variant="cardTitle" numberOfLines={1}>
            {item.title}
          </AppText>
          <View style={styles.metaRow}>
            <Clock size={13} color={colors.textMuted} />
            <AppText variant="caption">
              {formatDuration(item.durationMin)}
            </AppText>
          </View>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </View>
    </Card>
  );
}

function ActionTile({
  icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.tile}
    >
      <FeatureIcon icon={icon} />
      <AppText variant="cardTitle">{label}</AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  greetingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  greetingText: { flex: 1, gap: spacing.xs },
  hello: { color: colors.textSecondary },
  status: { color: colors.primary, fontFamily: fonts.interSemiBold },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.md,
  },
  weather: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: "#FDECEA",
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.lg,
  },
  weatherSkeleton: {
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.mint,
    marginBottom: spacing.lg,
  },
  weatherIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: "#FAD9D5",
    alignItems: "center",
    justifyContent: "center",
  },
  weatherBody: { flex: 1, gap: spacing.xs },
  weatherTitle: { color: colors.alert },
  weatherText: { color: "#7C4A43" },
  weatherCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  weatherCtaText: {
    fontFamily: fonts.interSemiBold,
    fontSize: 13,
    color: colors.primary,
  },
  weatherClose: { padding: spacing.xs },
  section: { marginBottom: spacing.xl },
  todayRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  timeCol: { width: 56 },
  time: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 13,
    color: colors.primary,
  },
  todayText: { flex: 1, gap: spacing.xs },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: {
    width: "47.5%",
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
