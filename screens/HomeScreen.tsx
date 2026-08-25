import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import type { Href } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Cloud,
  CloudLightning,
  CloudRain,
  Sun,
  Umbrella,
  MapPin,
  Compass,
  CalendarRange,
  Headphones,
  Ticket,
  ChevronRight,
  Shirt,
  Droplets,
  Clock,
  Tag as TagIcon,
  X,
  Settings,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import {
  Screen,
  AppText,
  Card,
  Tag,
  Button,
  FeatureIcon,
  SectionHeader,
  SkeletonCard,
  EmptyState,
} from "@/components";
import { colors, spacing, radius, SCREEN_PADDING } from "@/theme";
import { usePrefsStore } from "@/store/usePrefsStore";
import { usePlanStore } from "@/store/usePlanStore";
import { useWeatherStore } from "@/store/useWeatherStore";
import { CATEGORY_META } from "@/utils/categories";
import { getTripInfo, cityName } from "@/utils/trip";
import { to12h, formatDuration } from "@/utils/time";
import { useFakeLoading } from "@/hooks/useFakeLoading";
import type { ItineraryItem } from "@/types";
import type { WeatherCondition } from "@/services/weather";

/** Hero gradient — the design's 135deg accent ramp, recolored to the green palette. */
const HERO_GRADIENT = [colors.primary, "#2F8F55"] as const;
const ON_HERO = "rgba(255,255,255,0.88)";
const ON_HERO_DIM = "rgba(255,255,255,0.80)";
const HERO_TILE = "rgba(255,255,255,0.18)";
const HERO_CIRCLE = "rgba(255,255,255,0.22)";

const CONDITION_ICON: Record<WeatherCondition, LucideIcon> = {
  sunny: Sun,
  clouds: Cloud,
  rain: CloudRain,
  thunder: CloudLightning,
};

/** Local knowledge rows from the design's "Local rules of thumb" list (KL). */
const TIPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Shirt,
    title: "Cover up at temples and mosques",
    body: "Shoulders and knees. Robes are lent free at Batu Caves and the National Mosque.",
  },
  {
    icon: Droplets,
    title: "Drink bottled, eat busy",
    body: "Tap water is treated but not loved. A queue is the best hygiene rating there is.",
  },
  {
    icon: Clock,
    title: "Plan around 4-6pm rain",
    body: "Storms are short and daily. Keep an indoor stop free in that window.",
  },
  {
    icon: TagIcon,
    title: "Tipping is not expected",
    body: "Most bills already include 10% service and 6% tax.",
  },
];

const QUICK_ACTIONS: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  href: Href;
}[] = [
  {
    icon: Compass,
    label: "Explore",
    value: "Discover",
    note: "Food, culture and hidden corners near you.",
    href: "/discover",
  },
  {
    icon: CalendarRange,
    label: "Itinerary",
    value: "My Plan",
    note: "Reorder stops, swap them, see the route.",
    href: "/plan",
  },
  {
    icon: Headphones,
    label: "Listen",
    value: "Audio Tours",
    note: "Narrated walks you can start on the spot.",
    href: "/audio-tours",
  },
  {
    icon: Ticket,
    label: "Reserved",
    value: "Bookings",
    note: "Tables, tickets and transfers in one place.",
    href: "/bookings",
  },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const loading = useFakeLoading();

  const prefs = usePrefsStore();
  const days = usePlanStore((s) => s.days);

  const trip = useMemo(() => getTripInfo(prefs), [prefs]);
  const todayIdx = Math.min(trip.dayIndex, days.length - 1);
  const today = days[todayIdx];
  const todayItems = today?.items ?? [];
  const totalStops = useMemo(
    () => days.reduce((n, d) => n + d.items.length, 0),
    [days],
  );

  const [weatherDismissed, setWeatherDismissed] = useState(false);
  const loadWeather = useWeatherStore((s) => s.load);
  const weather = useWeatherStore((s) => s.data);

  useEffect(() => {
    if (prefs.destination) loadWeather(prefs.destination, prefs.durationDays);
  }, [prefs.destination, prefs.durationDays, loadWeather]);

  // The hero is dark, so the status bar goes light while Home is focused.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("dark");
    }, []),
  );

  const rainy = weather
    ? weather.todayRainChance > 50 ||
      weather.current.condition === "rain" ||
      weather.current.condition === "thunder"
    : false;
  const showWeather = !weatherDismissed && rainy;
  const weatherTitle =
    weather?.current.condition === "thunder"
      ? "Thunderstorms likely"
      : "Rain likely today";
  const weatherDetail = weather
    ? `${weather.todayRainChance}% chance of rain, ${Math.round(
        weather.current.tempC,
      )}°C now. Swap outdoor plans for an indoor pick?`
    : "";

  const onWeatherSwap = () => {
    setWeatherDismissed(true);
    router.push("/plan");
  };

  const nowIcon = weather ? CONDITION_ICON[weather.current.condition] : Sun;
  const firstStop = todayItems[0];

  return (
    <Screen scroll padded={false} edges={[]}>
      {/* Hero */}
      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroText}>
            <AppText style={styles.heroGreeting}>{greeting()}</AppText>
            <AppText variant="screenTitle" style={styles.heroTitle}>
              {cityName(prefs.destination)}
            </AppText>
            <AppText style={styles.heroStatus}>
              {trip.statusLabel} · {days.length} days planned · {totalStops} stops
            </AppText>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.heroCircle}
            onPress={() => router.push("/profile")}
          >
            <Settings size={20} color={colors.white} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <View style={styles.statRow}>
          <StatTile
            icon={nowIcon}
            label="Now"
            value={weather ? `${Math.round(weather.current.tempC)}°C` : "--"}
          />
          <StatTile
            icon={Umbrella}
            label="Rain today"
            value={weather ? `${weather.todayRainChance}%` : "--"}
          />
          <StatTile
            icon={MapPin}
            label="Today"
            value={`${todayItems.length} stops`}
          />
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Rain banner */}
        {showWeather && (
          <Card style={styles.banner}>
            <View style={styles.bannerRow}>
              <FeatureIcon icon={CloudRain} size={36} />
              <View style={styles.bannerBody}>
                <AppText variant="bodyStrong">{weatherTitle}</AppText>
                <AppText style={styles.bannerText}>{weatherDetail}</AppText>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.bannerCta}
                  onPress={onWeatherSwap}
                >
                  <AppText style={styles.bannerCtaText}>Smart swap it</AppText>
                  <ChevronRight
                    size={15}
                    color={colors.primary}
                    strokeWidth={2.4}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setWeatherDismissed(true)}
                style={styles.bannerClose}
              >
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Today's plan */}
        <View style={styles.section}>
          <SectionHeader
            title="Today's plan"
            subtitle={
              today ? `${today.label} · ${todayItems.length} stops` : undefined
            }
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
            <View>
              {todayItems.slice(0, 4).map((item, idx, arr) => (
                <TimelineRow
                  key={item.id}
                  item={item}
                  last={idx === arr.length - 1}
                  onPress={() => router.push("/plan")}
                />
              ))}
            </View>
          )}
        </View>

        {/* Day-ready CTA */}
        {!loading && firstStop ? (
          <Card style={styles.cta}>
            <View style={styles.ctaRow}>
              <View style={styles.ctaText}>
                <AppText variant="cardTitle" style={styles.ctaTitle}>
                  Your day {todayIdx + 1} is ready
                </AppText>
                <AppText style={styles.ctaSub}>
                  {todayItems.length} stops, starting {to12h(firstStop.time)} at{" "}
                  {firstStop.title}.
                </AppText>
              </View>
              <Button
                label="Open"
                fullWidth={false}
                style={styles.ctaButton}
                onPress={() => router.push("/plan")}
              />
            </View>
          </Card>
        ) : null}

        {/* Quick actions */}
        <View style={styles.section}>
          <SectionHeader
            title="Jump back in"
            subtitle="Everything you need while you're on the ground."
          />
          <View style={styles.grid}>
            {QUICK_ACTIONS.map((a) => (
              <ActionCard
                key={a.value}
                icon={a.icon}
                label={a.label}
                value={a.value}
                note={a.note}
                onPress={() => router.push(a.href)}
              />
            ))}
          </View>
        </View>

        {/* Local knowledge */}
        <View style={styles.section}>
          <SectionHeader title="Local rules of thumb" />
          <Card style={styles.tipCard} noPadding>
            {TIPS.map((t, idx) => (
              <TipRow key={t.title} {...t} last={idx === TIPS.length - 1} />
            ))}
          </Card>
        </View>
      </View>
    </Screen>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statTile}>
      <View style={styles.statLabelRow}>
        <Icon size={13} color={ON_HERO_DIM} strokeWidth={2.2} />
        <AppText style={styles.statLabel} numberOfLines={1}>
          {label}
        </AppText>
      </View>
      <AppText style={styles.statValue}>{value}</AppText>
    </View>
  );
}

function TimelineRow({
  item,
  last,
  onPress,
}: {
  item: ItineraryItem;
  last: boolean;
  onPress: () => void;
}) {
  const meta = CATEGORY_META[item.category];
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timeCol}>
        <AppText style={styles.time}>{to12h(item.time)}</AppText>
        <AppText style={styles.dur}>{formatDuration(item.durationMin)}</AppText>
        {last ? null : <View style={styles.rail} />}
      </View>
      <Card style={styles.stopCard} onPress={onPress}>
        <View style={styles.stopTop}>
          <FeatureIcon icon={meta.icon} />
          <View style={styles.stopText}>
            <AppText
              variant="cardTitle"
              style={styles.stopTitle}
              numberOfLines={1}
            >
              {item.title}
            </AppText>
            {item.description ? (
              <AppText style={styles.stopDesc} numberOfLines={2}>
                {item.description}
              </AppText>
            ) : null}
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>
        <View style={styles.stopTags}>
          <Tag label={meta.label} icon={meta.icon} />
        </View>
      </Card>
    </View>
  );
}

function ActionCard({
  icon,
  label,
  value,
  note,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  onPress: () => void;
}) {
  return (
    <Card style={styles.actionCard} onPress={onPress}>
      <FeatureIcon icon={icon} size={32} />
      <AppText variant="label">{label}</AppText>
      <AppText style={styles.actionValue}>{value}</AppText>
      <AppText style={styles.actionNote}>{note}</AppText>
    </Card>
  );
}

function TipRow({
  icon: Icon,
  title,
  body,
  last,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  last: boolean;
}) {
  return (
    <View style={[styles.tipRow, last && styles.tipRowLast]}>
      <Icon size={17} color={colors.primary} strokeWidth={2.2} />
      <View style={styles.tipText}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText style={styles.tipBody}>{body}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Hero
  hero: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroText: { flex: 1, gap: spacing.xs },
  heroGreeting: { fontSize: 13, fontWeight: "500", color: ON_HERO },
  heroTitle: { color: colors.white },
  heroStatus: { fontSize: 13, fontWeight: "600", color: ON_HERO },
  heroCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: HERO_CIRCLE,
    alignItems: "center",
    justifyContent: "center",
  },
  statRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  statTile: {
    flex: 1,
    gap: spacing.xs,
    backgroundColor: HERO_TILE,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  statLabel: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
    color: ON_HERO_DIM,
  },
  statValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.white,
  },

  // Body
  body: { paddingHorizontal: SCREEN_PADDING, paddingTop: spacing.xl },
  section: { marginBottom: spacing.xl },

  // Rain banner
  banner: { borderRadius: radius.lg, marginBottom: spacing.lg },
  bannerRow: { flexDirection: "row", gap: spacing.md },
  bannerBody: { flex: 1, gap: spacing.xs },
  bannerText: { fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
  bannerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  bannerCtaText: { fontWeight: "600", fontSize: 12.5, color: colors.primary },
  bannerClose: { padding: spacing.xs },

  // Timeline
  timelineRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  timeCol: {
    width: 52,
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.base,
  },
  time: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  dur: { fontSize: 10.5, lineHeight: 13, color: colors.textMuted },
  rail: {
    flex: 1,
    width: 2,
    borderRadius: 1,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },
  stopCard: { flex: 1, borderRadius: radius.lg, gap: spacing.sm },
  stopTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  stopText: { flex: 1, gap: spacing.xs },
  stopTitle: { fontWeight: "700", fontSize: 15, lineHeight: 20 },
  stopDesc: { fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
  stopTags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },

  // Day-ready CTA
  cta: { borderRadius: radius.lg, marginBottom: spacing.xl },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  ctaText: { flex: 1, gap: spacing.xs },
  ctaTitle: { fontWeight: "700", fontSize: 15, lineHeight: 20 },
  ctaSub: { fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
  ctaButton: {
    height: 36,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
  },

  // Quick actions
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  actionCard: {
    width: "47.5%",
    flexGrow: 1,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  actionValue: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  actionNote: { fontSize: 12, lineHeight: 17, color: colors.textSecondary },

  // Tips
  tipCard: { borderRadius: radius.lg },
  tipRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tipRowLast: { borderBottomWidth: 0 },
  tipText: { flex: 1, gap: spacing.xs },
  tipBody: { fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
});
