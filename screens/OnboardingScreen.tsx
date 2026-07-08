import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PiggyBank,
  Wallet,
  Gem,
  Landmark,
  Utensils,
  Mountain,
  Waves,
  Check,
  Compass,
  MapPin,
  Sparkles,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText, Button, FeatureIcon } from '@/components';
import { DateField } from '@/components/DateField';
import { colors, spacing, radius, fonts, SCREEN_PADDING } from '@/theme';
import { usePrefsStore } from '@/store/usePrefsStore';
import { usePlanStore } from '@/store/usePlanStore';
import type { BudgetRange, Interest } from '@/types';
import { formatDateRange } from '@/utils/date';

const BUDGETS: { key: BudgetRange; label: string; sub: string; icon: LucideIcon }[] = [
  { key: 'budget', label: 'Budget', sub: 'Under $80 / day', icon: PiggyBank },
  { key: 'mid', label: 'Mid-range', sub: '$80 - $200 / day', icon: Wallet },
  { key: 'luxury', label: 'Luxury', sub: '$200+ / day', icon: Gem },
];

const INTERESTS: { key: Interest; label: string; icon: LucideIcon }[] = [
  { key: 'culture', label: 'Culture', icon: Landmark },
  { key: 'food', label: 'Food', icon: Utensils },
  { key: 'adventure', label: 'Adventure', icon: Mountain },
  { key: 'relaxation', label: 'Relaxation', icon: Waves },
];

const DURATIONS = [2, 3, 5, 7, 10];

const STEP_TITLES = ['Your travel style', 'Where & when', "You're all set"];
const STEP_SUBTITLES = [
  'Tell us how you like to travel so we can tune your plan.',
  'Pick your destination and start date.',
  'Review your trip and dive in.',
];

export function OnboardingScreen() {
  const [step, setStep] = useState(0);

  const {
    budget,
    interests,
    durationDays,
    destination,
    startDate,
    endDate,
    setBudget,
    toggleInterest,
    setDuration,
    setDestination,
    setStartDate,
    completeOnboarding,
  } = usePrefsStore();

  const generatePlan = usePlanStore((s) => s.generatePlan);
  const generating = usePlanStore((s) => s.generating);

  const step0Valid = budget !== null && interests.length > 0 && durationDays > 0;
  const step1Valid = destination.trim().length > 0 && !!startDate;
  const canAdvance = step === 0 ? step0Valid : step === 1 ? step1Valid : true;

  const onNext = async () => {
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
    // Final step: try to generate an AI plan (falls back to the sample plan on
    // failure or when no proxy URL is configured), then enter the app.
    await generatePlan({ destination, durationDays, budget, interests, startDate });
    completeOnboarding();
  };
  const onBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Brand + progress */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Compass size={18} color={colors.white} strokeWidth={2.4} />
            </View>
            <AppText style={styles.brand}>Navigate the Moment</AppText>
          </View>
          <View style={styles.progress}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.progressSeg, i <= step && styles.progressSegActive]}
              />
            ))}
          </View>
          <AppText variant="label" style={styles.stepCount}>
            Step {step + 1} of 3
          </AppText>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppText variant="screenTitle" style={styles.title}>
            {STEP_TITLES[step]}
          </AppText>
          <AppText variant="body" style={styles.subtitle}>
            {STEP_SUBTITLES[step]}
          </AppText>

          {step === 0 && (
            <View style={styles.section}>
              <AppText variant="label" style={styles.groupLabel}>
                Budget range
              </AppText>
              <View style={styles.stack}>
                {BUDGETS.map((b) => {
                  const active = budget === b.key;
                  return (
                    <TouchableOpacity
                      key={b.key}
                      activeOpacity={0.85}
                      onPress={() => setBudget(b.key)}
                      style={[styles.optionRow, active && styles.optionActive]}
                    >
                      <FeatureIcon icon={b.icon} />
                      <View style={styles.optionText}>
                        <AppText variant="cardTitle">{b.label}</AppText>
                        <AppText variant="body">{b.sub}</AppText>
                      </View>
                      {active ? <Check size={20} color={colors.primary} strokeWidth={2.6} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <AppText variant="label" style={[styles.groupLabel, styles.groupSpacer]}>
                Interests
              </AppText>
              <View style={styles.grid}>
                {INTERESTS.map((it) => {
                  const active = interests.includes(it.key);
                  return (
                    <TouchableOpacity
                      key={it.key}
                      activeOpacity={0.85}
                      onPress={() => toggleInterest(it.key)}
                      style={[styles.gridItem, active && styles.optionActive]}
                    >
                      <FeatureIcon
                        icon={it.icon}
                        background={active ? colors.primary : colors.mint}
                        color={active ? colors.white : colors.primary}
                      />
                      <AppText variant="cardTitle" style={styles.gridLabel}>
                        {it.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <AppText variant="label" style={[styles.groupLabel, styles.groupSpacer]}>
                Trip duration
              </AppText>
              <View style={styles.pillRow}>
                {DURATIONS.map((d) => {
                  const active = durationDays === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      activeOpacity={0.85}
                      onPress={() => setDuration(d)}
                      style={[styles.durationPill, active && styles.durationPillActive]}
                    >
                      <AppText
                        style={[styles.durationText, active && styles.durationTextActive]}
                      >
                        {d} days
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {step === 1 && (
            <View style={styles.section}>
              <AppText variant="label" style={styles.groupLabel}>
                Destination
              </AppText>
              <View style={styles.inputWrap}>
                <MapPin size={20} color={colors.primary} strokeWidth={2} />
                <TextInput
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="e.g. Kuala Lumpur, Malaysia"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  returnKeyType="done"
                />
              </View>

              <AppText variant="label" style={[styles.groupLabel, styles.groupSpacer]}>
                Start date
              </AppText>
              <DateField value={startDate} onChange={setStartDate} />

              {startDate ? (
                <View style={styles.hintRow}>
                  <Sparkles size={16} color={colors.primary} />
                  <AppText variant="body" style={styles.hint}>
                    {durationDays}-day trip - {formatDateRange(startDate, endDate)}
                  </AppText>
                </View>
              ) : null}
            </View>
          )}

          {step === 2 && (
            <View style={styles.section}>
              <View style={styles.reviewCard}>
                <ReviewRow label="Destination" value={destination || '-'} />
                <ReviewRow label="Dates" value={formatDateRange(startDate, endDate)} />
                <ReviewRow
                  label="Budget"
                  value={BUDGETS.find((b) => b.key === budget)?.label ?? '-'}
                />
                <ReviewRow label="Duration" value={`${durationDays} days`} />
                <ReviewRow
                  label="Interests"
                  value={
                    interests.length
                      ? interests
                          .map((i) => INTERESTS.find((x) => x.key === i)?.label)
                          .join(', ')
                      : '-'
                  }
                  last
                />
              </View>
              <View style={styles.welcomeRow}>
                <Sparkles size={18} color={colors.primary} />
                <AppText variant="body" style={styles.welcome}>
                  We curated recommendations, an itinerary and audio tours for your trip.
                </AppText>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 ? (
            <Button label="Back" variant="secondary" onPress={onBack} style={styles.backBtn} />
          ) : null}
          <Button
            label={step === 2 ? (generating ? 'Building your plan...' : 'Start exploring') : 'Continue'}
            onPress={onNext}
            disabled={!canAdvance || generating}
            loading={generating}
            style={styles.nextBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReviewRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.reviewRow, !last && styles.reviewDivider]}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="bodyStrong" style={styles.reviewValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.textPrimary },
  progress: { flexDirection: 'row', gap: spacing.sm },
  progressSeg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.mintDeep,
  },
  progressSegActive: { backgroundColor: colors.primary },
  stepCount: { color: colors.textSecondary },
  content: { paddingHorizontal: SCREEN_PADDING, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  title: { marginBottom: spacing.sm },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.xl },
  section: { gap: spacing.md },
  groupLabel: { marginBottom: spacing.xs },
  groupSpacer: { marginTop: spacing.lg },
  stack: { gap: spacing.md },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    padding: spacing.base,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.mint },
  optionText: { flex: 1, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItem: {
    width: '47.5%',
    flexGrow: 1,
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  gridLabel: {},
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  durationPill: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  durationPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  durationText: { fontFamily: fonts.interMedium, fontSize: 14, color: colors.textSecondary },
  durationTextActive: { color: colors.white },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 52,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  input: { flex: 1, fontFamily: fonts.interMedium, fontSize: 15, color: colors.textPrimary },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  hint: { color: colors.primary },
  reviewCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.base,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    gap: spacing.base,
  },
  reviewDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  reviewValue: { flexShrink: 1, textAlign: 'right' },
  welcomeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  welcome: { flex: 1, color: colors.textSecondary },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
});
