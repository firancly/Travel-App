import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, StyleSheet, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { MapPin, Plus, Check, Clock } from "lucide-react-native";
import {
  ScreenHeader,
  FilterChip,
  MapMarker,
  AppText,
  Button,
  Tag,
  Rating,
  SheetHandle,
} from "@/components";
import { colors, spacing, radius, fonts, SCREEN_PADDING } from "@/theme";
import { mutedMapStyle } from "@/theme";
import { places } from "@/mock";
import { usePlanStore } from "@/store/usePlanStore";
import { CATEGORY_META, CATEGORY_ORDER } from "@/utils/categories";
import { formatDuration } from "@/utils/time";
import type { Place, PlaceCategory } from "@/types";

const KL_REGION: Region = {
  latitude: 3.15,
  longitude: 101.702,
  latitudeDelta: 0.075,
  longitudeDelta: 0.06,
};

export function DiscoverScreen() {
  const mapRef = useRef<MapView>(null);
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["42%"], []);

  const [active, setActive] = useState<PlaceCategory[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);

  const addPlaceToPlan = usePlanStore((s) => s.addPlaceToPlan);
  const days = usePlanStore((s) => s.days);
  const [addedDay, setAddedDay] = useState<number | null>(null);

  const filtered = useMemo(
    () =>
      active.length
        ? places.filter((p) => active.includes(p.category))
        : places,
    [active],
  );

  const toggle = (cat: PlaceCategory) =>
    setActive((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );

  const onSelect = useCallback((place: Place) => {
    setSelected(place);
    setAddedDay(null);
    sheetRef.current?.present();
    mapRef.current?.animateToRegion(
      {
        latitude: place.latitude - 0.012, // bias up so the pin sits above the sheet
        longitude: place.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      350,
    );
  }, []);

  const inPlan = selected
    ? days.some((d) => d.items.some((i) => i.placeId === selected.id))
    : false;

  const onAdd = () => {
    if (!selected) return;
    const day = addPlaceToPlan(selected);
    setAddedDay(day);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Discover"
        subtitle={`${filtered.length} curated spots near you`}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsRow}
      >
        <FilterChip
          label="All"
          selected={active.length === 0}
          onPress={() => setActive([])}
        />
        {CATEGORY_ORDER.map((cat) => (
          <FilterChip
            key={cat}
            label={CATEGORY_META[cat].label}
            icon={CATEGORY_META[cat].icon}
            selected={active.includes(cat)}
            onPress={() => toggle(cat)}
          />
        ))}
      </ScrollView>

      <View style={styles.mapWrap}>
        {Platform.OS === "web" ? (
          <View style={styles.webFallback}>
            <MapPin size={28} color={colors.primary} />
            <AppText variant="body" center style={{ marginTop: spacing.sm }}>
              Map preview is available on the iOS and Android apps.
            </AppText>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
            customMapStyle={mutedMapStyle}
            initialRegion={KL_REGION}
            showsCompass={false}
            toolbarEnabled={false}
          >
            {filtered.map((place) => (
              <Marker
                key={place.id}
                coordinate={{
                  latitude: place.latitude,
                  longitude: place.longitude,
                }}
                onPress={() => onSelect(place)}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <MapMarker selected={selected?.id === place.id} />
              </Marker>
            ))}
          </MapView>
        )}
      </View>

      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        handleComponent={SheetHandle}
        onDismiss={() => setSelected(null)}
        backgroundStyle={styles.sheetBg}
      >
        <BottomSheetView style={styles.sheetContent}>
          {selected && (
            <>
              <View style={styles.sheetHead}>
                https://github.com/Rabieulawal/pitstop/pull/4
                <View style={styles.sheetTitleWrap}>
                  <AppText variant="cardTitle" style={styles.sheetTitle}>
                    {selected.name}
                  </AppText>
                  <View style={styles.sheetMeta}>
                    <Rating
                      rating={selected.rating}
                      reviews={selected.reviews}
                    />
                    <AppText variant="caption">- {selected.priceLevel}</AppText>
                  </View>
                </View>
                <Tag
                  label={CATEGORY_META[selected.category].label}
                  icon={CATEGORY_META[selected.category].icon}
                />
              </View>

              <View style={styles.sheetDuration}>
                <Clock size={14} color={colors.textMuted} />
                <AppText variant="caption">
                  Suggested visit {formatDuration(selected.durationMin)}
                </AppText>
              </View>

              <AppText variant="body" style={styles.sheetDesc}>
                {selected.description}
              </AppText>

              <Button
                label={
                  addedDay != null
                    ? `Added to Day ${addedDay}`
                    : inPlan
                      ? "Already in your plan"
                      : "Add to Plan"
                }
                icon={addedDay != null || inPlan ? Check : Plus}
                onPress={onAdd}
                disabled={addedDay != null || inPlan}
                style={styles.sheetBtn}
              />
            </>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  chipsRow: { flexGrow: 0 },
  chips: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: spacing.base,
  },
  mapWrap: { flex: 1, overflow: "hidden" },
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mint,
    padding: spacing.xl,
  },
  sheetBg: { borderRadius: radius.xl },
  sheetContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sheetTitleWrap: { flex: 1, gap: spacing.xs },
  sheetTitle: { fontSize: 18 },
  sheetMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sheetDuration: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  sheetDesc: { color: colors.body },
  sheetBtn: { marginTop: spacing.sm },
});
