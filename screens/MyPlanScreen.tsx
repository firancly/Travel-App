import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import {
  GripVertical,
  Clock,
  CalendarPlus,
  MapPin,
  CloudRain,
  Sparkles,
  ArrowLeftRight,
  Trash2,
  Undo2,
  Footprints,
  Car,
  TrainFront,
  Navigation,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import {
  ScreenHeader,
  AppText,
  Button,
  Card,
  Tag,
  FeatureIcon,
  EmptyState,
  SkeletonCard,
  MapMarker,
  SheetHandle,
} from "@/components";
import {
  colors,
  spacing,
  radius,
  shadows,
  mutedMapStyle,
  SCREEN_PADDING,
} from "@/theme";
import { usePlanStore } from "@/store/usePlanStore";
import { usePrefsStore } from "@/store/usePrefsStore";
import { useWeatherStore } from "@/store/useWeatherStore";
import { CATEGORY_META, CATEGORY_ORDER } from "@/utils/categories";
import { to12h, formatDuration } from "@/utils/time";
import { getItemCoords } from "@/utils/coords";
import {
  dateForDay,
  wetHoursForDate,
  rainProofReorder,
  hourOf,
} from "@/utils/rainProof";
import { fetchRoute, type Coords } from "@/services/routing";
import type { ItineraryItem } from "@/types";

type PlanView = "list" | "map";

// Amber warning tint, matching StatusBadge's "Pending" pair.
const WET_BG = "#FFF3DF";
const WET_FG = "#B7791F";

// Rough per-hop travel time by mode (minutes) — no live transit API, mirrors the design.
const MAP_MODES: { key: string; label: string; icon: LucideIcon; perHop: number }[] = [
  { key: "walk", label: "Walk", icon: Footprints, perHop: 19 },
  { key: "grab", label: "Grab", icon: Car, perHop: 11 },
  { key: "transit", label: "Transit", icon: TrainFront, perHop: 15 },
];

export function MyPlanScreen() {
  const router = useRouter();
  const days = usePlanStore((s) => s.days);
  const reorderDayItems = usePlanStore((s) => s.reorderDayItems);
  const getSwapCandidates = usePlanStore((s) => s.getSwapCandidates);
  const applySwap = usePlanStore((s) => s.applySwap);
  const removeItem = usePlanStore((s) => s.removeItem);
  const generatePlan = usePlanStore((s) => s.generatePlan);
  const generating = usePlanStore((s) => s.generating);
  const canUndo = usePlanStore((s) => s.canUndo);
  const undo = usePlanStore((s) => s.undo);
  const prefs = usePrefsStore();

  const regenerate = () => {
    if (generating) return;
    generatePlan({
      destination: prefs.destination,
      durationDays: prefs.durationDays,
      budget: prefs.budget,
      interests: prefs.interests,
      startDate: prefs.startDate,
    });
  };

  const [dayNumber, setDayNumber] = useState(days[0]?.day ?? 1);
  const [view, setView] = useState<PlanView>("list");
  const day = days.find((d) => d.day === dayNumber) ?? days[0];
  const items = day?.items ?? [];

  const totalMin = useMemo(
    () => items.reduce((sum, i) => sum + i.durationMin, 0),
    [items],
  );

  // Rain-proof: swap outdoor stops out of wet hours for indoor stops sitting in dry ones.
  const loadWeather = useWeatherStore((s) => s.load);
  const weatherData = useWeatherStore((s) => s.data);
  useEffect(() => {
    if (prefs.destination) loadWeather(prefs.destination, prefs.durationDays);
  }, [prefs.destination, prefs.durationDays, loadWeather]);

  const wetHours = useMemo(() => {
    if (!weatherData || !prefs.startDate) return null;
    return wetHoursForDate(
      weatherData.hourly,
      dateForDay(prefs.startDate, dayNumber),
    );
  }, [weatherData, prefs.startDate, dayNumber]);

  const rainProofPlan = useMemo(
    () =>
      wetHours && wetHours.size > 0 ? rainProofReorder(items, wetHours) : null,
    [items, wetHours],
  );
  const showRainProof = !!wetHours && wetHours.size > 0;

  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const onRainProof = () => {
    if (!rainProofPlan) {
      setToast("Already rain-optimized.");
      return;
    }
    reorderDayItems(dayNumber, rainProofPlan);
    setToast("Moved outdoor stops to drier hours.");
  };

  const onUndo = () => {
    undo();
    setToast("Reverted last change.");
  };

  // Swap-alternatives sheet: fetch up to 3 candidates for the tapped stop,
  // let the traveler pick one (or keep what they have).
  const swapSheetRef = useRef<BottomSheetModal>(null);
  const swapSnapPoints = useMemo(() => ["55%"], []);
  const [swapItemId, setSwapItemId] = useState<string | null>(null);
  const [swapLoadingId, setSwapLoadingId] = useState<string | null>(null);
  const [swapCandidates, setSwapCandidates] = useState<ItineraryItem[]>([]);
  const swapTarget = items.find((i) => i.id === swapItemId);

  const openSwap = async (itemId: string) => {
    if (swapLoadingId) return;
    setSwapLoadingId(itemId);
    const candidates = await getSwapCandidates(dayNumber, itemId);
    setSwapLoadingId(null);
    setSwapCandidates(candidates);
    setSwapItemId(itemId);
    swapSheetRef.current?.present();
  };

  const pickCandidate = (candidate: ItineraryItem) => {
    if (!swapItemId) return;
    applySwap(dayNumber, swapItemId, candidate);
    setToast(`Swapped in ${candidate.title.split(",")[0]}`);
    swapSheetRef.current?.dismiss();
  };

  // Plottable stops in plan order — numbering + the polyline both derive from this.
  const points = useMemo(
    () =>
      items
        .map((it) => ({ item: it, coord: getItemCoords(it) }))
        .filter(
          (
            p,
          ): p is {
            item: ItineraryItem;
            coord: NonNullable<ReturnType<typeof getItemCoords>>;
          } => !!p.coord,
        ),
    [items],
  );
  const coords = useMemo(() => points.map((p) => p.coord), [points]);

  // Map legend + transit-mode toggle + selected-stop detail card.
  const [mapMode, setMapMode] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  useEffect(() => setSelectedIdx(0), [dayNumber]);
  const selectedPoint = points[Math.min(selectedIdx, Math.max(0, points.length - 1))];
  const selectedMeta = selectedPoint
    ? CATEGORY_META[selectedPoint.item.category]
    : null;
  const activeMode = MAP_MODES[mapMode];
  const hops = Math.max(0, points.length - 1);

  const mapRef = useRef<MapView>(null);

  // Road-following polyline via OSRM; falls back to the straight line through `coords`
  // (set below) while it loads or if the free demo server errors/times out.
  const [routeCoords, setRouteCoords] = useState<Coords[] | null>(null);
  useEffect(() => {
    setRouteCoords(null);
    if (view !== "map" || coords.length < 2) return;
    let cancelled = false;
    fetchRoute(coords).then((result) => {
      if (!cancelled) setRouteCoords(result);
    });
    return () => {
      cancelled = true;
    };
  }, [view, dayNumber, coords]);

  useEffect(() => {
    if (view !== "map") return;
    if (coords.length === 1) {
      const t = setTimeout(
        () =>
          mapRef.current?.animateToRegion(
            { ...coords[0], latitudeDelta: 0.02, longitudeDelta: 0.02 },
            300,
          ),
        400,
      );
      return () => clearTimeout(t);
    }
    if (coords.length > 1) {
      const t = setTimeout(
        () =>
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
            animated: true,
          }),
        400,
      );
      return () => clearTimeout(t);
    }
  }, [view, dayNumber, coords]);

  const renderItem = ({
    item,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<ItineraryItem>) => {
    const idx = getIndex();
    return (
      <ScaleDecorator activeScale={1.03}>
        <PlanRow
          item={item}
          drag={drag}
          isActive={isActive}
          last={idx === items.length - 1}
          isWet={!!wetHours && wetHours.has(hourOf(item.time))}
          swapping={swapLoadingId === item.id}
          onOpenSwap={() => openSwap(item.id)}
          onRemove={() => removeItem(dayNumber, item.id)}
        />
      </ScaleDecorator>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="My Plan"
        subtitle={day?.label}
        right={
          <View style={styles.headerActions}>
            {canUndo ? (
              <Button variant="pill" icon={Undo2} label="Undo" onPress={onUndo} />
            ) : null}
            <Button
              variant="pill"
              icon={Sparkles}
              label={generating ? "Rebuilding…" : "Rebuild"}
              onPress={regenerate}
              disabled={generating}
            />
          </View>
        }
      />

      {/* Day selector — label over stop count, per the design's day pills. */}
      <View style={styles.dayRow}>
        {days.map((d) => {
          const active = d.day === dayNumber;
          return (
            <TouchableOpacity
              key={d.day}
              activeOpacity={0.85}
              onPress={() => setDayNumber(d.day)}
              style={[styles.dayPill, active && styles.dayPillActive]}
            >
              <AppText style={[styles.dayText, active && styles.dayTextActive]}>
                Day {d.day}
              </AppText>
              <AppText style={[styles.daySub, active && styles.daySubActive]}>
                {d.items.length} stops
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {!generating && items.length > 0 && (
        <View style={styles.segmentRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setView("list")}
            style={[styles.segment, view === "list" && styles.segmentActive]}
          >
            <AppText
              style={[
                styles.segmentText,
                view === "list" && styles.segmentTextActive,
              ]}
            >
              List
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setView("map")}
            style={[styles.segment, view === "map" && styles.segmentActive]}
          >
            <AppText
              style={[
                styles.segmentText,
                view === "map" && styles.segmentTextActive,
              ]}
            >
              Map
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      {!generating && items.length > 0 && showRainProof && (
        <View style={styles.rainProofWrap}>
          <Button
            variant="secondary"
            icon={CloudRain}
            label={
              rainProofPlan ? "Rain-proof this day" : "Already rain-optimized"
            }
            onPress={onRainProof}
            disabled={!rainProofPlan}
            style={styles.rainProofBtn}
          />
        </View>
      )}

      {generating ? (
        <View style={styles.skeletonWrap}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="This day is open"
          message="Head to Discover and add a few places to fill it in."
          ctaLabel="Discover places"
          onCtaPress={() => router.push("/discover")}
        />
      ) : view === "map" ? (
        <View style={styles.flex}>
          {points.length > 0 && Platform.OS !== "web" && (
            <View style={styles.modeRow}>
              {MAP_MODES.map((m, i) => {
                const active = i === mapMode;
                return (
                  <TouchableOpacity
                    key={m.key}
                    activeOpacity={0.85}
                    onPress={() => setMapMode(i)}
                    style={[styles.modeBtn, active && styles.modeBtnActive]}
                  >
                    <m.icon
                      size={14}
                      color={active ? colors.primary : colors.textSecondary}
                      strokeWidth={2.2}
                    />
                    <AppText
                      style={[
                        styles.modeText,
                        active && styles.modeTextActive,
                      ]}
                    >
                      {m.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.mapWrap}>
            {Platform.OS === "web" ? (
              <View style={styles.webFallback}>
                <MapPin size={26} color={colors.primary} />
                <AppText
                  variant="caption"
                  center
                  style={{ marginTop: spacing.sm }}
                >
                  Map view available on iOS / Android
                </AppText>
              </View>
            ) : points.length === 0 ? (
              <View style={styles.webFallback}>
                <MapPin size={26} color={colors.primary} />
                <AppText
                  variant="caption"
                  center
                  style={{ marginTop: spacing.sm }}
                >
                  No map data for this day
                </AppText>
              </View>
            ) : (
              <>
                <MapView
                  ref={mapRef}
                  style={StyleSheet.absoluteFill}
                  provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
                  customMapStyle={mutedMapStyle}
                  initialRegion={{
                    latitude: coords[0].latitude,
                    longitude: coords[0].longitude,
                    latitudeDelta: 0.03,
                    longitudeDelta: 0.03,
                  }}
                >
                  {coords.length > 1 && (
                    <Polyline
                      coordinates={routeCoords ?? coords}
                      strokeColor={colors.primary}
                      strokeWidth={4}
                    />
                  )}
                  {points.map((p, i) => (
                    <Marker
                      key={p.item.id}
                      coordinate={p.coord}
                      anchor={{ x: 0.5, y: 0.5 }}
                      onPress={() => setSelectedIdx(i)}
                    >
                      <MapMarker number={i + 1} selected={i === selectedIdx} />
                    </Marker>
                  ))}
                </MapView>
                <View style={styles.transitPill} pointerEvents="none">
                  <Navigation size={13} color={colors.primary} />
                  <AppText style={styles.transitPillText}>
                    {hops * activeMode.perHop} min moving · {activeMode.label}
                  </AppText>
                </View>
              </>
            )}
          </View>

          {points.length > 0 && Platform.OS !== "web" && selectedPoint && selectedMeta ? (
            <Card style={styles.detailCard}>
              <FeatureIcon icon={selectedMeta.icon} />
              <View style={styles.detailText}>
                <AppText variant="label">
                  Stop {selectedIdx + 1} · {selectedMeta.label}
                </AppText>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {selectedPoint.item.title}
                </AppText>
                <AppText
                  style={styles.detailDesc}
                  numberOfLines={2}
                >
                  {selectedPoint.item.description}
                </AppText>
                <AppText style={styles.detailLeg}>
                  {selectedIdx === 0
                    ? `First stop of the day · ${to12h(selectedPoint.item.time)}`
                    : `${activeMode.perHop} min by ${activeMode.label.toLowerCase()} from stop ${selectedIdx} · ${to12h(selectedPoint.item.time)}`}
                </AppText>
              </View>
            </Card>
          ) : null}

          {points.length > 0 && Platform.OS !== "web" && (
            <View style={styles.legendRow}>
              {CATEGORY_ORDER.map((cat) => {
                const m = CATEGORY_META[cat];
                return (
                  <View key={cat} style={styles.legendChip}>
                    <m.icon size={13} color={colors.primary} strokeWidth={2.2} />
                    <AppText style={styles.legendText}>{m.label}</AppText>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : (
        <DraggableFlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          onDragEnd={({ data }) => reorderDayItems(dayNumber, data)}
          containerStyle={styles.flex}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.summary}>
              <View style={styles.summaryItem}>
                <Clock size={14} color={colors.primary} strokeWidth={2.2} />
                <AppText style={styles.summaryText}>
                  {items.length} stops · {formatDuration(totalMin)}
                </AppText>
              </View>
              <View style={styles.hintRow}>
                <ArrowLeftRight size={13} color={colors.textMuted} />
                <AppText variant="caption">Hold to reorder</AppText>
              </View>
            </View>
          }
          ListFooterComponent={
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/discover")}
              style={styles.addStop}
            >
              <Sparkles size={16} color={colors.primary} strokeWidth={2.2} />
              <AppText style={styles.addStopText}>
                Add a stop for this day
              </AppText>
            </TouchableOpacity>
          }
        />
      )}

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <AppText style={styles.toastText}>{toast}</AppText>
        </View>
      ) : null}

      <BottomSheetModal
        ref={swapSheetRef}
        snapPoints={swapSnapPoints}
        handleComponent={SheetHandle}
        onDismiss={() => setSwapItemId(null)}
        backgroundStyle={styles.sheetBg}
      >
        <BottomSheetView style={styles.sheetContent}>
          <AppText variant="cardTitle" style={styles.sheetTitle}>
            {swapTarget ? `Somewhere else at ${to12h(swapTarget.time)}?` : ""}
          </AppText>
          <AppText style={styles.sheetSub}>
            Nearby, open then, and it keeps the rest of your day intact.
          </AppText>

          {swapCandidates.length === 0 ? (
            <AppText style={styles.sheetEmpty}>
              No nearby matches right now.
            </AppText>
          ) : (
            <View style={styles.sheetList}>
              {swapCandidates.map((c) => {
                const cMeta = CATEGORY_META[c.category];
                return (
                  <TouchableOpacity
                    key={c.id}
                    activeOpacity={0.85}
                    onPress={() => pickCandidate(c)}
                    style={styles.sheetOption}
                  >
                    <FeatureIcon icon={cMeta.icon} />
                    <View style={styles.sheetOptionText}>
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {c.title}
                      </AppText>
                      <AppText
                        variant="caption"
                        numberOfLines={2}
                        style={styles.sheetOptionDesc}
                      >
                        {c.description}
                      </AppText>
                      <AppText style={styles.sheetOptionMeta}>
                        {formatDuration(c.durationMin)} · {cMeta.label}
                      </AppText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Button
            label="Keep what I have"
            variant="secondary"
            onPress={() => swapSheetRef.current?.dismiss()}
            style={styles.sheetKeepBtn}
          />
        </BottomSheetView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

function PlanRow({
  item,
  drag,
  isActive,
  last,
  isWet,
  swapping,
  onOpenSwap,
  onRemove,
}: {
  item: ItineraryItem;
  drag: () => void;
  isActive: boolean;
  last: boolean;
  isWet: boolean;
  swapping: boolean;
  onOpenSwap: () => void;
  onRemove: () => void;
}) {
  const meta = CATEGORY_META[item.category];

  return (
    <View style={styles.rowWrap}>
      <View style={styles.timeCol}>
        <AppText style={styles.time}>{to12h(item.time)}</AppText>
        <AppText style={styles.dur}>{formatDuration(item.durationMin)}</AppText>
        {last ? null : <View style={styles.rail} />}
      </View>

      <Card style={[styles.card, isActive && styles.cardActive]}>
        <View style={styles.cardTop}>
          <FeatureIcon icon={meta.icon} />
          <View style={styles.cardBody}>
            <AppText
              variant="cardTitle"
              style={styles.cardTitle}
              numberOfLines={1}
            >
              {item.title}
            </AppText>
            <AppText style={styles.desc} numberOfLines={2}>
              {item.description}
            </AppText>
          </View>
          <TouchableOpacity
            onLongPress={drag}
            delayLongPress={120}
            style={styles.grip}
            hitSlop={8}
          >
            <GripVertical size={18} color={colors.grip} />
          </TouchableOpacity>
        </View>

        <View style={styles.badgeRow}>
          <Tag label={meta.label} icon={meta.icon} />
          {isWet ? (
            <Tag
              label="Wet hour"
              icon={CloudRain}
              background={WET_BG}
              color={WET_FG}
            />
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.footerBtn}
            onPress={onOpenSwap}
            disabled={swapping}
          >
            {swapping ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <ArrowLeftRight
                size={14}
                color={colors.primary}
                strokeWidth={2.2}
              />
            )}
            <AppText style={styles.swapText}>
              {swapping ? "Swapping…" : "Try somewhere else"}
            </AppText>
          </TouchableOpacity>
          <View style={styles.flex} />
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.footerBtn}
            onPress={onRemove}
          >
            <Trash2 size={14} color={colors.textMuted} strokeWidth={2.2} />
            <AppText style={styles.removeText}>Remove</AppText>
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  headerActions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  flex: { flex: 1 },

  // Swap sheet
  sheetBg: { borderRadius: radius.xl },
  sheetContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  sheetTitle: { fontSize: 18 },
  sheetSub: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  sheetEmpty: {
    color: colors.textMuted,
    paddingVertical: spacing.lg,
    textAlign: "center",
  },
  sheetList: { gap: spacing.sm },
  sheetOption: {
    flexDirection: "row",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  sheetOptionText: { flex: 1, gap: 2 },
  sheetOptionDesc: { color: colors.textSecondary },
  sheetOptionMeta: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.primary,
    marginTop: 2,
  },
  sheetKeepBtn: { marginTop: spacing.md },

  // Day pills
  dayRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: spacing.base,
  },
  dayPill: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dayPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: { fontWeight: "600", fontSize: 13, color: colors.textSecondary },
  dayTextActive: { color: colors.white },
  daySub: { fontSize: 10.5, lineHeight: 14, color: colors.textMuted },
  daySubActive: { color: "rgba(255,255,255,0.75)" },

  // List / map toggle
  segmentRow: {
    flexDirection: "row",
    marginHorizontal: SCREEN_PADDING,
    marginBottom: spacing.base,
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  segmentActive: { backgroundColor: colors.white, ...shadows.card },
  segmentText: { fontWeight: "500", fontSize: 14, color: colors.textSecondary },
  segmentTextActive: { color: colors.primary },

  rainProofWrap: {
    marginHorizontal: SCREEN_PADDING,
    marginBottom: spacing.base,
  },
  rainProofBtn: { height: 44 },

  // Toast
  toast: {
    position: "absolute",
    left: SCREEN_PADDING,
    right: SCREEN_PADDING,
    bottom: spacing.xl,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  toastText: { fontSize: 13, fontWeight: "500", color: colors.white },

  mapWrap: {
    flex: 1,
    marginHorizontal: SCREEN_PADDING,
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.mint,
  },
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },

  // Map mode toggle
  modeRow: {
    flexDirection: "row",
    marginHorizontal: SCREEN_PADDING,
    marginBottom: spacing.md,
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  modeBtnActive: { backgroundColor: colors.white, ...shadows.card },
  modeText: { fontWeight: "600", fontSize: 12.5, color: colors.textSecondary },
  modeTextActive: { color: colors.primary },

  // Transit pill (over the map)
  transitPill: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    ...shadows.card,
  },
  transitPillText: { fontWeight: "600", fontSize: 12, color: colors.textPrimary },

  // Selected-stop detail card
  detailCard: {
    flexDirection: "row",
    gap: spacing.md,
    marginHorizontal: SCREEN_PADDING,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
  },
  detailText: { flex: 1, gap: 3 },
  detailDesc: { fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
  detailLeg: { fontSize: 12, fontWeight: "500", color: colors.primary, marginTop: 2 },

  // Legend
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginHorizontal: SCREEN_PADDING,
    marginBottom: spacing.xxl,
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  legendText: { fontSize: 11.5, fontWeight: "500", color: colors.textSecondary },

  listContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: spacing.xxl,
  },
  skeletonWrap: { paddingHorizontal: SCREEN_PADDING, gap: spacing.md },

  // Summary bar
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    marginBottom: spacing.base,
  },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  summaryText: { fontSize: 12.5, fontWeight: "600", color: colors.textPrimary },
  hintRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },

  // Stop rows
  rowWrap: { flexDirection: "row", gap: spacing.md, paddingBottom: spacing.md },
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
  card: { flex: 1, borderRadius: radius.lg, gap: spacing.sm },
  cardActive: { borderColor: colors.primary },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  cardBody: { flex: 1, gap: spacing.xs },
  cardTitle: { fontWeight: "700", fontSize: 15, lineHeight: 20 },
  desc: { fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
  grip: { paddingLeft: spacing.xs, paddingTop: 2 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  swapText: { fontWeight: "600", fontSize: 12, color: colors.primary },
  removeText: { fontWeight: "600", fontSize: 12, color: colors.textMuted },

  // Add-stop
  addStop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.mintDeep,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    paddingVertical: spacing.base,
    marginTop: spacing.xs,
  },
  addStopText: { fontWeight: "600", fontSize: 13.5, color: colors.primary },
});
