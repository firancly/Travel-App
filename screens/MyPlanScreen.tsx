import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { GripVertical, RefreshCw, Clock, CalendarPlus, MapPin, CloudRain } from 'lucide-react-native';
import { ScreenHeader, AppText, Button, FeatureIcon, EmptyState, SkeletonCard, MapMarker } from '@/components';
import { colors, spacing, radius, fonts, shadows, hairline, mutedMapStyle, SCREEN_PADDING } from '@/theme';
import { usePlanStore } from '@/store/usePlanStore';
import { usePrefsStore } from '@/store/usePrefsStore';
import { useWeatherStore } from '@/store/useWeatherStore';
import { CATEGORY_META } from '@/utils/categories';
import { to12h, formatDuration } from '@/utils/time';
import { getItemCoords } from '@/utils/coords';
import { dateForDay, wetHoursForDate, rainProofReorder, hourOf } from '@/utils/rainProof';
import type { ItineraryItem } from '@/types';

type PlanView = 'list' | 'map';

export function MyPlanScreen() {
  const router = useRouter();
  const days = usePlanStore((s) => s.days);
  const reorderDayItems = usePlanStore((s) => s.reorderDayItems);
  const smartSwap = usePlanStore((s) => s.smartSwap);
  const generatePlan = usePlanStore((s) => s.generatePlan);
  const generating = usePlanStore((s) => s.generating);
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
  const [view, setView] = useState<PlanView>('list');
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
    return wetHoursForDate(weatherData.hourly, dateForDay(prefs.startDate, dayNumber));
  }, [weatherData, prefs.startDate, dayNumber]);

  const rainProofPlan = useMemo(
    () => (wetHours && wetHours.size > 0 ? rainProofReorder(items, wetHours) : null),
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
      setToast('Already rain-optimized.');
      return;
    }
    reorderDayItems(dayNumber, rainProofPlan);
    setToast('Moved outdoor stops to drier hours.');
  };

  // Plottable stops in plan order — numbering + the polyline both derive from this.
  const points = useMemo(
    () =>
      items
        .map((it) => ({ item: it, coord: getItemCoords(it) }))
        .filter((p): p is { item: ItineraryItem; coord: NonNullable<ReturnType<typeof getItemCoords>> } => !!p.coord),
    [items],
  );
  const coords = useMemo(() => points.map((p) => p.coord), [points]);

  const mapRef = useRef<MapView>(null);
  useEffect(() => {
    if (view !== 'map') return;
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

  const renderItem = ({ item, drag, isActive }: RenderItemParams<ItineraryItem>) => (
    <ScaleDecorator activeScale={1.03}>
      <PlanRow
        item={item}
        drag={drag}
        isActive={isActive}
        isWet={!!wetHours && wetHours.has(hourOf(item.time))}
        onSwap={() => smartSwap(dayNumber, item.id)}
      />
    </ScaleDecorator>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="My Plan"
        subtitle={day?.label}
        rightIcon={RefreshCw}
        onRightPress={regenerate}
      />

      {/* Day selector */}
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
            </TouchableOpacity>
          );
        })}
      </View>

      {!generating && items.length > 0 && (
        <View style={styles.segmentRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setView('list')}
            style={[styles.segment, view === 'list' && styles.segmentActive]}
          >
            <AppText style={[styles.segmentText, view === 'list' && styles.segmentTextActive]}>
              List
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setView('map')}
            style={[styles.segment, view === 'map' && styles.segmentActive]}
          >
            <AppText style={[styles.segmentText, view === 'map' && styles.segmentTextActive]}>
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
            label={rainProofPlan ? 'Rain-proof this day' : 'Already rain-optimized'}
            onPress={onRainProof}
            disabled={!rainProofPlan}
            style={styles.rainProofBtn}
          />
          {toast && (
            <View style={styles.toast}>
              <AppText variant="caption" style={styles.toastText}>
                {toast}
              </AppText>
            </View>
          )}
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
          onCtaPress={() => router.push('/discover')}
        />
      ) : view === 'map' ? (
        <View style={styles.mapWrap}>
          {Platform.OS === 'web' ? (
            <View style={styles.webFallback}>
              <MapPin size={26} color={colors.primary} />
              <AppText variant="caption" center style={{ marginTop: spacing.sm }}>
                Map view available on iOS / Android
              </AppText>
            </View>
          ) : points.length === 0 ? (
            <View style={styles.webFallback}>
              <MapPin size={26} color={colors.primary} />
              <AppText variant="caption" center style={{ marginTop: spacing.sm }}>
                No map data for this day
              </AppText>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              customMapStyle={mutedMapStyle}
              initialRegion={{
                latitude: coords[0].latitude,
                longitude: coords[0].longitude,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }}
            >
              {coords.length > 1 && (
                <Polyline coordinates={coords} strokeColor={colors.primary} strokeWidth={4} />
              )}
              {points.map((p, i) => (
                <Marker
                  key={p.item.id}
                  coordinate={p.coord}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <MapMarker number={i + 1} />
                </Marker>
              ))}
            </MapView>
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
                <Clock size={15} color={colors.primary} />
                <AppText variant="body" style={styles.summaryText}>
                  {items.length} stops - {formatDuration(totalMin)}
                </AppText>
              </View>
              <View style={styles.hintRow}>
                <GripVertical size={14} color={colors.grip} />
                <AppText variant="caption">Hold to reorder</AppText>
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function PlanRow({
  item,
  drag,
  isActive,
  isWet,
  onSwap,
}: {
  item: ItineraryItem;
  drag: () => void;
  isActive: boolean;
  isWet: boolean;
  onSwap: () => Promise<void>;
}) {
  const meta = CATEGORY_META[item.category];
  const [swapping, setSwapping] = useState(false);

  const handleSwap = async () => {
    if (swapping) return;
    setSwapping(true);
    await onSwap();
    setSwapping(false);
  };

  return (
    <View style={styles.rowWrap}>
      <View style={styles.timeCol}>
        <AppText style={styles.time}>{to12h(item.time)}</AppText>
        {isWet && (
          <View style={styles.wetBadge}>
            <CloudRain size={11} color={colors.alert} strokeWidth={2.4} />
          </View>
        )}
        <View style={styles.timeline} />
      </View>

      <View style={[styles.card, isActive && styles.cardActive]}>
        <FeatureIcon icon={meta.icon} />
        <View style={styles.cardBody}>
          <AppText variant="cardTitle" numberOfLines={1}>
            {item.title}
          </AppText>
          <AppText variant="body" numberOfLines={2} style={styles.desc}>
            {item.description}
          </AppText>
          <View style={styles.cardFooter}>
            <View style={styles.metaRow}>
              <Clock size={13} color={colors.textMuted} />
              <AppText variant="caption">{formatDuration(item.durationMin)}</AppText>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.swapBtn}
              onPress={handleSwap}
              disabled={swapping}
            >
              {swapping ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <RefreshCw size={14} color={colors.primary} strokeWidth={2.2} />
              )}
              <AppText style={styles.swapText}>
                {swapping ? 'Swapping…' : 'Smart swap'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onLongPress={drag}
          delayLongPress={120}
          style={styles.grip}
          hitSlop={8}
        >
          <GripVertical size={20} color={colors.grip} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  flex: { flex: 1 },
  dayRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: spacing.base,
  },
  dayPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dayPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontFamily: fonts.interMedium, fontSize: 14, color: colors.textSecondary },
  dayTextActive: { color: colors.white },
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: SCREEN_PADDING,
    marginBottom: spacing.base,
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  segmentActive: { backgroundColor: colors.white, ...shadows.card },
  segmentText: { fontFamily: fonts.interMedium, fontSize: 14, color: colors.textSecondary },
  segmentTextActive: { color: colors.primary },
  rainProofWrap: {
    marginHorizontal: SCREEN_PADDING,
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  rainProofBtn: { height: 44 },
  toast: {
    alignSelf: 'center',
    backgroundColor: colors.textPrimary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  toastText: { color: colors.white },
  mapWrap: {
    flex: 1,
    marginHorizontal: SCREEN_PADDING,
    marginBottom: spacing.xxl,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.mint,
  },
  webFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  listContent: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxl },
  skeletonWrap: { paddingHorizontal: SCREEN_PADDING, gap: spacing.md },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  summaryText: { color: colors.textPrimary, fontFamily: fonts.interSemiBold },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowWrap: { flexDirection: 'row', marginBottom: spacing.md },
  timeCol: { width: 56, alignItems: 'center' },
  time: { fontFamily: fonts.jakartaSemiBold, fontSize: 12, color: colors.primary },
  wetBadge: { marginTop: spacing.xs },
  timeline: {
    flex: 1,
    width: 2,
    backgroundColor: colors.mintDeep,
    marginTop: spacing.sm,
    borderRadius: 1,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.base,
    ...shadows.card,
    ...hairline,
  },
  cardActive: { borderColor: colors.primary },
  cardBody: { flex: 1, gap: spacing.xs },
  desc: { color: colors.body },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.mint,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  swapText: { fontFamily: fonts.interSemiBold, fontSize: 12, color: colors.primary },
  grip: { justifyContent: 'center', paddingLeft: spacing.xs },
});
