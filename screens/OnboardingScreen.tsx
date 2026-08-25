import React, { useEffect, useState } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  Landmark,
  Utensils,
  Mountain,
  Waves,
  Compass,
  MapPin,
  Search,
  Minus,
  Plus,
  Check,
  X,
  Sparkles,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText, Button, Card, FilterChip } from '@/components';
import { DateField } from '@/components/DateField';
import { colors, spacing, radius, SCREEN_PADDING } from '@/theme';
import { usePrefsStore } from '@/store/usePrefsStore';
import { usePlanStore } from '@/store/usePlanStore';
import type { BudgetRange, Interest } from '@/types';
import { formatShortDate } from '@/utils/date';

const BUDGETS: { key: BudgetRange; label: string; range: string }[] = [
  { key: 'budget', label: 'Budget', range: 'Under $80 / day' },
  { key: 'mid', label: 'Mid-range', range: '$80 - $200 / day' },
  { key: 'luxury', label: 'Luxury', range: '$200+ / day' },
];

const INTERESTS: { key: Interest; label: string; icon: LucideIcon }[] = [
  { key: 'culture', label: 'Culture', icon: Landmark },
  { key: 'food', label: 'Food', icon: Utensils },
  { key: 'adventure', label: 'Adventure', icon: Mountain },
  { key: 'relaxation', label: 'Relaxation', icon: Waves },
];

const MIN_DAYS = 1;
const MAX_DAYS = 14;

const GEN_STEPS = [
  'Reading your interests',
  'Finding candidate stops',
  'Grouping them by neighbourhood',
  'Checking opening hours',
  'Adding travel time between stops',
];
const GEN_STEP_MS = 900;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** "In 5 days" / "Today" / "Tomorrow" for the Arriving card. */
function arrivalNote(iso: string | null): string {
  if (!iso) return 'Pick a date';
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round(
    (startOfDay(new Date(iso)) - startOfDay(new Date())) / MS_PER_DAY,
  );
  if (diff < 0) return 'In the past';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff} days`;
}

/** Country / region half of a "City, Country" string. */
function destinationNote(destination: string): string {
  const rest = destination.split(',').slice(1).join(',').trim();
  return rest || 'Tap the field above to change it';
}

export function OnboardingScreen() {
  const {
    budget,
    interests,
    durationDays,
    destination,
    startDate,
    setBudget,
    toggleInterest,
    setDuration,
    setDestination,
    setStartDate,
    completeOnboarding,
  } = usePrefsStore();

  const generatePlan = usePlanStore((s) => s.generatePlan);
  const generating = usePlanStore((s) => s.generating);

  const canGenerate = destination.trim().length > 0 && !!startDate;

  const onGenerate = async () => {
    if (!canGenerate || generating) return;
    await generatePlan({ destination, durationDays, budget, interests, startDate });
    completeOnboarding();
  };

  if (generating) return <GeneratingView />;

  const selectedBudget = BUDGETS.find((b) => b.key === budget);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Compass size={16} color={colors.white} strokeWidth={2.4} />
            </View>
            <AppText variant="label">Navigate the Moment</AppText>
          </View>

          <AppText variant="screenTitle" style={styles.title}>
            Where are we going?
          </AppText>
          <AppText style={styles.subtitle}>
            Answer these once. We&apos;ll handle the rest of the trip.
          </AppText>

          {/* City */}
          <AppText variant="label" style={styles.groupLabel}>
            City
          </AppText>
          <View style={styles.inputWrap}>
            <Search size={18} color={colors.textMuted} strokeWidth={2.2} />
            <TextInput
              value={destination}
              onChangeText={setDestination}
              placeholder="Search a city"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              returnKeyType="done"
            />
          </View>
          {destination.trim().length > 0 ? (
            <View style={styles.picked}>
              <View style={styles.pickedAvatar}>
                <MapPin size={16} color={colors.white} strokeWidth={2.2} />
              </View>
              <View style={styles.pickedText}>
                <AppText style={styles.pickedName} numberOfLines={1}>
                  {destination.split(',')[0].trim()}
                </AppText>
                <AppText style={styles.pickedNote} numberOfLines={1}>
                  {destinationNote(destination)}
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() => setDestination('')}
                hitSlop={8}
                style={styles.pickedClear}
              >
                <X size={16} color={colors.textMuted} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Days + arrival */}
          <View style={styles.pairRow}>
            <Card style={styles.pairCard}>
              <AppText variant="label">Days</AppText>
              <View style={styles.stepperRow}>
                <StepperButton
                  icon={Minus}
                  disabled={durationDays <= MIN_DAYS}
                  onPress={() => setDuration(Math.max(MIN_DAYS, durationDays - 1))}
                />
                <AppText style={styles.stepperValue}>{durationDays}</AppText>
                <StepperButton
                  icon={Plus}
                  disabled={durationDays >= MAX_DAYS}
                  onPress={() => setDuration(Math.min(MAX_DAYS, durationDays + 1))}
                />
              </View>
            </Card>

            <DateField
              value={startDate}
              onChange={setStartDate}
              renderTrigger={(open) => (
                <Card style={styles.pairCard} onPress={open}>
                  <AppText variant="label">Arriving</AppText>
                  <AppText style={styles.arriveDate}>
                    {startDate ? formatShortDate(startDate) : 'Set date'}
                  </AppText>
                  <AppText style={styles.arriveNote}>{arrivalNote(startDate)}</AppText>
                </Card>
              )}
            />
          </View>

          {/* Budget */}
          <AppText variant="label" style={styles.groupLabel}>
            Daily budget
          </AppText>
          <View style={styles.budgetRow}>
            {BUDGETS.map((b) => {
              const active = budget === b.key;
              return (
                <TouchableOpacity
                  key={b.key}
                  activeOpacity={0.85}
                  onPress={() => setBudget(b.key)}
                  style={[styles.budgetCard, active && styles.budgetCardActive]}
                >
                  <AppText style={[styles.budgetLabel, active && styles.budgetLabelActive]}>
                    {b.label}
                  </AppText>
                  <AppText style={styles.budgetRange}>{b.range}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
          <AppText style={styles.budgetTotal}>
            {selectedBudget
              ? `${selectedBudget.range} across ${durationDays} ${durationDays === 1 ? 'day' : 'days'}.`
              : 'Pick a range so the plan matches your spending.'}
          </AppText>

          {/* Interests */}
          <AppText variant="label" style={styles.groupLabel}>
            What you&apos;re into
          </AppText>
          <View style={styles.chipRow}>
            {INTERESTS.map((it) => (
              <FilterChip
                key={it.key}
                label={it.label}
                icon={it.icon}
                selected={interests.includes(it.key)}
                onPress={() => toggleInterest(it.key)}
              />
            ))}
          </View>

          <Button
            label="Plan with AI"
            icon={Sparkles}
            onPress={onGenerate}
            disabled={!canGenerate}
            style={styles.cta}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepperButton({
  icon: Icon,
  onPress,
  disabled,
}: {
  icon: LucideIcon;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[styles.stepperBtn, disabled && styles.stepperBtnDisabled]}
    >
      <Icon size={16} color={colors.primary} strokeWidth={2.4} />
    </TouchableOpacity>
  );
}

/** Full-screen progress view shown while the AI proxy builds the itinerary. */
function GeneratingView() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setStep((s) => Math.min(s + 1, GEN_STEPS.length - 1)),
      GEN_STEP_MS,
    );
    return () => clearInterval(id);
  }, []);

  const ring = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    ring.value = withRepeat(
      withTiming(1, { duration: 1900, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [ring, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ring.value * 0.5 }],
    opacity: 0.5 * (1 - ring.value),
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.07 }],
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.genWrap}>
        <View style={styles.genMarkWrap}>
          <Animated.View style={[styles.genRing, ringStyle]} />
          <Animated.View style={[styles.genMark, pulseStyle]}>
            <MapPin size={32} color={colors.primary} strokeWidth={2} />
          </Animated.View>
        </View>

        <View style={styles.genText}>
          <AppText style={styles.genTitle} center>
            Building your perfect day…
          </AppText>
          <AppText style={styles.genSub} center>
            Sequencing stops so you never cross the city twice.
          </AppText>
        </View>

        <View style={styles.genSteps}>
          {GEN_STEPS.map((label, i) => {
            const done = i < step;
            const reached = i <= step;
            return (
              <View key={label} style={[styles.genStep, { opacity: reached ? 1 : 0.32 }]}>
                <View style={[styles.genCheck, done && styles.genCheckDone]}>
                  <Check
                    size={12}
                    color={done ? colors.white : colors.textMuted}
                    strokeWidth={3}
                  />
                </View>
                <AppText style={styles.genStepText}>{label}</AppText>
              </View>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  brandMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginBottom: spacing.sm },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  groupLabel: { marginBottom: spacing.md },

  // City
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 48,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  input: { flex: 1, fontWeight: '500', fontSize: 15, color: colors.textPrimary },
  picked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.mint,
  },
  pickedAvatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickedText: { flex: 1, gap: 2 },
  pickedName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  pickedNote: { fontSize: 12.5, color: colors.textSecondary },
  pickedClear: { padding: spacing.xs },

  // Days + arrival
  pairRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  pairCard: { flex: 1, borderRadius: radius.lg, gap: spacing.md },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperValue: { fontSize: 26, lineHeight: 32, fontWeight: '700', color: colors.textPrimary },
  arriveDate: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: colors.textPrimary },
  arriveNote: { fontSize: 12.5, lineHeight: 16, color: colors.textSecondary },

  // Budget
  budgetRow: { flexDirection: 'row', gap: spacing.sm },
  budgetCard: {
    flex: 1,
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  budgetCardActive: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.mint,
  },
  budgetLabel: { fontSize: 13.5, fontWeight: '700', color: colors.textPrimary },
  budgetLabelActive: { color: colors.primary },
  budgetRange: { fontSize: 11.5, lineHeight: 15, color: colors.textSecondary },
  budgetTotal: {
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cta: { marginTop: spacing.xxl },

  // Generating
  genWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
    paddingHorizontal: spacing.xxl,
  },
  genMarkWrap: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  genRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.pill,
    backgroundColor: colors.mintDeep,
  },
  genMark: {
    width: 74,
    height: 74,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genText: { gap: spacing.sm },
  genTitle: { fontSize: 22, lineHeight: 29, fontWeight: '700', color: colors.textPrimary },
  genSub: { fontSize: 14.5, lineHeight: 22, color: colors.textSecondary },
  genSteps: { alignSelf: 'stretch', gap: spacing.md },
  genStep: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  genCheck: {
    width: 21,
    height: 21,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genCheckDone: { backgroundColor: colors.primary },
  genStepText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
});
