import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  MapPin,
} from "lucide-react-native";
import { BackHeader, AppText, Tag, MapMarker } from "@/components";
import {
  colors,
  spacing,
  radius,
  fonts,
  shadows,
  mutedMapStyle,
  SCREEN_PADDING,
} from "@/theme";
import { findAudioTour } from "@/mock";
import { formatDuration } from "@/utils/time";

function clock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function AudioPlayerScreen() {
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const tour = findAudioTour(tourId);
  const mapRef = useRef<MapView>(null);

  const totalSec = (tour?.durationMin ?? 0) * 60;
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);

  // Simulated playback clock.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= totalSec) {
          setPlaying(false);
          return totalSec;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing, totalSec]);

  const coords = useMemo(
    () =>
      tour?.stops.map((s) => ({
        latitude: s.latitude,
        longitude: s.longitude,
      })) ?? [],
    [tour],
  );

  useEffect(() => {
    if (coords.length > 1) {
      const t = setTimeout(
        () =>
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: false,
          }),
        400,
      );
      return () => clearTimeout(t);
    }
  }, [coords]);

  if (!tour) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <BackHeader title="Audio Tour" />
        <View style={styles.center}>
          <AppText variant="body">Tour not found.</AppText>
        </View>
      </SafeAreaView>
    );
  }

  const fraction = totalSec ? elapsed / totalSec : 0;
  const stopIndex = Math.min(
    tour.stops.length - 1,
    Math.floor(fraction * tour.stops.length),
  );
  const currentStop = tour.stops[stopIndex];

  const seekToStop = (index: number) => {
    const clamped = Math.max(0, Math.min(tour.stops.length - 1, index));
    setElapsed(Math.floor((clamped / tour.stops.length) * totalSec));
    setPlaying(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <BackHeader title="Now playing" />

      <View style={styles.mapCard}>
        {Platform.OS === "web" ? (
          <View style={styles.webFallback}>
            <MapPin size={26} color={colors.primary} />
            <AppText variant="caption" center style={{ marginTop: spacing.sm }}>
              Route map available on iOS / Android
            </AppText>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
            customMapStyle={mutedMapStyle}
            initialRegion={{
              latitude: coords[0]?.latitude ?? 3.147,
              longitude: coords[0]?.longitude ?? 101.7,
              latitudeDelta: 0.03,
              longitudeDelta: 0.03,
            }}
            scrollEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Polyline
              coordinates={coords}
              strokeColor={colors.primary}
              strokeWidth={4}
            />
            {tour.stops.map((s, i) => (
              <Marker
                key={s.name}
                coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <MapMarker selected={i === stopIndex} />
              </Marker>
            ))}
          </MapView>
        )}
      </View>

      <View style={styles.body}>
        <AppText variant="sectionHeader" numberOfLines={2}>
          {tour.title}
        </AppText>
        <AppText variant="body" style={styles.narrator}>
          Narrated by {tour.narrator}
        </AppText>

        <View style={styles.tags}>
          <Tag label={`$${tour.price}`} />
          <Tag label={tour.language} />
          <Tag label={formatDuration(tour.durationMin)} />
        </View>

        <View style={styles.stopRow}>
          <MapPin size={16} color={colors.primary} />
          <AppText
            variant="bodyStrong"
            numberOfLines={1}
            style={styles.stopText}
          >
            Stop {stopIndex + 1} of {tour.stops.length} - {currentStop.name}
          </AppText>
        </View>
      </View>

      {/* Progress + controls */}
      <View style={styles.controls}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(fraction * 100)}%` },
            ]}
          />
        </View>
        <View style={styles.times}>
          <AppText variant="caption">{clock(elapsed)}</AppText>
          <AppText variant="caption">{clock(totalSec)}</AppText>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.skip}
            onPress={() => seekToStop(stopIndex - 1)}
          >
            <SkipBack
              size={24}
              color={colors.textPrimary}
              fill={colors.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.playBig}
            onPress={() => setPlaying((p) => !p)}
          >
            {playing ? (
              <Pause size={28} color={colors.white} fill={colors.white} />
            ) : (
              <Play
                size={28}
                color={colors.white}
                fill={colors.white}
                style={{ marginLeft: 3 }}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.skip}
            onPress={() => seekToStop(stopIndex + 1)}
          >
            <SkipForward
              size={24}
              color={colors.textPrimary}
              fill={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  mapCard: {
    height: 260,
    marginHorizontal: SCREEN_PADDING,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.mint,
    ...shadows.card,
  },
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  body: {
    flex: 1,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  narrator: { color: colors.textSecondary },
  tags: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.mint,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  stopText: { flex: 1, color: colors.primary },
  controls: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.mintDeep,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  times: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  buttons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxl,
    marginTop: spacing.md,
  },
  skip: { padding: spacing.sm },
  playBig: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.floating,
  },
});
