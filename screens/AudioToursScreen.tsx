import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Headphones, Clock, Languages, Play, MapPin } from 'lucide-react-native';
import { BackHeader, AppText, Card, FeatureIcon, SkeletonCard } from '@/components';
import { colors, spacing, radius, fonts, SCREEN_PADDING } from '@/theme';
import { audioTours } from '@/mock';
import { formatDuration } from '@/utils/time';
import { useFakeLoading } from '@/hooks/useFakeLoading';
import type { AudioTour } from '@/types';
import type { AppNavProp } from '@/navigation/types';

export function AudioToursScreen() {
  const navigation = useNavigation<AppNavProp>();
  const loading = useFakeLoading();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackHeader title="Audio Tours" subtitle={`${audioTours.length} self-guided tours in Lisbon`} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {loading ? (
          <View style={{ gap: spacing.md }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {audioTours.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                onPress={() => navigation.navigate('AudioPlayer', { tourId: tour.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TourCard({ tour, onPress }: { tour: AudioTour; onPress: () => void }) {
  return (
    <Card onPress={onPress}>
      <View style={styles.head}>
        <FeatureIcon icon={Headphones} />
        <View style={styles.headText}>
          <AppText variant="cardTitle" numberOfLines={2}>
            {tour.title}
          </AppText>
          <AppText variant="caption">Narrated by {tour.narrator}</AppText>
        </View>
        <View style={styles.priceTag}>
          <AppText style={styles.price}>${tour.price}</AppText>
        </View>
      </View>

      <AppText variant="body" numberOfLines={2} style={styles.desc}>
        {tour.description}
      </AppText>

      <View style={styles.metaRow}>
        <View style={styles.meta}>
          <Clock size={14} color={colors.textMuted} />
          <AppText variant="caption">{formatDuration(tour.durationMin)}</AppText>
        </View>
        <View style={styles.meta}>
          <Languages size={14} color={colors.textMuted} />
          <AppText variant="caption">{tour.language}</AppText>
        </View>
        <View style={styles.meta}>
          <MapPin size={14} color={colors.textMuted} />
          <AppText variant="caption">{tour.stops.length} stops</AppText>
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.8} style={styles.playBtn} onPress={onPress}>
        <Play size={16} color={colors.white} fill={colors.white} />
        <AppText style={styles.playText}>Play preview</AppText>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxl },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headText: { flex: 1, gap: spacing.xs },
  priceTag: {
    backgroundColor: colors.mint,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  price: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.primary },
  desc: { color: colors.body, marginTop: spacing.md },
  metaRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    height: 44,
    borderRadius: radius.lg,
    marginTop: spacing.base,
  },
  playText: { fontFamily: fonts.jakartaSemiBold, fontSize: 14, color: colors.white },
});
