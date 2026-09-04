import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Utensils,
  Ticket,
  Bus,
  Plus,
  Minus,
  X,
  CalendarClock,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import {
  BackHeader,
  AppText,
  Card,
  FeatureIcon,
  Button,
  StatusBadge,
  DateField,
  EmptyState,
  SkeletonCard,
} from "@/components";
import { colors, spacing, radius, fonts, SCREEN_PADDING } from "@/theme";
import { bookings as seedBookings } from "@/mock";
import { formatDateLabel } from "@/utils/date";
import { useFakeLoading } from "@/hooks/useFakeLoading";
import type { Booking, BookingCategory } from "@/types";

const TABS: { key: BookingCategory; label: string; icon: LucideIcon }[] = [
  { key: "restaurants", label: "Restaurants", icon: Utensils },
  { key: "activities", label: "Activities", icon: Ticket },
  { key: "transport", label: "Transport", icon: Bus },
];

const ICON_FOR: Record<BookingCategory, LucideIcon> = {
  restaurants: Utensils,
  activities: Ticket,
  transport: Bus,
};

export function BookingsScreen() {
  const loading = useFakeLoading();
  const [tab, setTab] = useState<BookingCategory>("restaurants");
  const [list, setList] = useState<Booking[]>(seedBookings);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(
    () => list.filter((b) => b.category === tab),
    [list, tab],
  );
  const tabLabel = TABS.find((t) => t.key === tab)!.label;

  const addBooking = (b: Booking) => setList((prev) => [b, ...prev]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <BackHeader title="Bookings" subtitle="Manage your reservations" />

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <TouchableOpacity
              key={t.key}
              activeOpacity={0.85}
              onPress={() => setTab(t.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <t.icon
                size={16}
                color={active ? colors.white : colors.textSecondary}
                strokeWidth={2.2}
              />
              <AppText style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {loading ? (
          <View style={{ gap: spacing.md }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={`No ${tabLabel.toLowerCase()} yet`}
            message="Create your first booking to see it here."
            ctaLabel="Book now"
            onCtaPress={() => setModalOpen(true)}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {filtered.map((b) => (
              <Card key={b.id}>
                <View style={styles.cardRow}>
                  <FeatureIcon icon={ICON_FOR[b.category]} />
                  <View style={styles.cardBody}>
                    <AppText variant="cardTitle" numberOfLines={1}>
                      {b.name}
                    </AppText>
                    <AppText
                      variant="body"
                      numberOfLines={1}
                      style={styles.detail}
                    >
                      {b.detail}
                    </AppText>
                    <View style={styles.dateRow}>
                      <CalendarClock size={13} color={colors.textMuted} />
                      <AppText variant="caption">{b.dateTime}</AppText>
                    </View>
                  </View>
                  <StatusBadge status={b.status} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={`Book a ${tabLabel.replace(/s$/, "").toLowerCase()}`}
          icon={Plus}
          onPress={() => setModalOpen(true)}
        />
      </View>

      <BookingModal
        visible={modalOpen}
        category={tab}
        categoryLabel={tabLabel}
        onClose={() => setModalOpen(false)}
        onSubmit={addBooking}
      />
    </SafeAreaView>
  );
}

let modalCounter = 0;

function BookingModal({
  visible,
  category,
  categoryLabel,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  category: BookingCategory;
  categoryLabel: string;
  onClose: () => void;
  onSubmit: (b: Booking) => void;
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [party, setParty] = useState(2);

  const reset = () => {
    setName("");
    setDate(null);
    setParty(2);
  };

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({
      id: `usr-${Date.now().toString(36)}-${modalCounter++}`,
      category,
      name: name.trim(),
      detail: `Party of ${party}`,
      dateTime: date ? formatDateLabel(date) : "Date to confirm",
      status: "Pending",
      partySize: party,
    });
    reset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHead}>
            <AppText variant="sectionHeader">
              New {categoryLabel.replace(/s$/, "")} booking
            </AppText>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <AppText variant="label" style={styles.fieldLabel}>
            Name
          </AppText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Who is the booking for?"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            returnKeyType="done"
          />

          <AppText variant="label" style={styles.fieldLabel}>
            Date
          </AppText>
          <DateField value={date} onChange={setDate} />

          <AppText variant="label" style={styles.fieldLabel}>
            Party size
          </AppText>
          <View style={styles.stepper}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.stepBtn}
              onPress={() => setParty((p) => Math.max(1, p - 1))}
            >
              <Minus size={18} color={colors.primary} strokeWidth={2.4} />
            </TouchableOpacity>
            <AppText style={styles.stepValue}>{party}</AppText>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.stepBtn}
              onPress={() => setParty((p) => Math.min(20, p + 1))}
            >
              <Plus size={18} color={colors.primary} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalActions}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={onClose}
              style={styles.flex1}
            />
            <Button
              label="Confirm"
              onPress={submit}
              disabled={!name.trim()}
              style={styles.flex2}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: spacing.base,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontWeight: "500", fontSize: 12, color: colors.textSecondary },
  tabTextActive: { color: colors.white },
  content: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxl },
  cardRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardBody: { flex: 1, gap: spacing.xs },
  detail: { color: colors.textSecondary },
  dateRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  footer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  // Modal
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.sheetHandle,
    alignSelf: "center",
    marginBottom: spacing.base,
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.base,
  },
  modalClose: { padding: spacing.xs },
  fieldLabel: { marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    height: 52,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    fontWeight: "500",
    fontSize: 15,
    color: colors.textPrimary,
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    fontWeight: "700",
    fontSize: 20,
    color: colors.textPrimary,
    minWidth: 28,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
});
