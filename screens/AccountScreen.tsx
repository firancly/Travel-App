import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Mail, Lock, User as UserIcon } from "lucide-react-native";
import { AppText, Button, BackHeader } from "@/components";
import { colors, spacing, radius, SCREEN_PADDING } from "@/theme";
import { useAuthStore } from "@/store/useAuthStore";
import { useTripsStore } from "@/store/useTripsStore";

type Mode = "signup" | "login";

export function AccountScreen() {
  const router = useRouter();
  const signup = useAuthStore((s) => s.signup);
  const login = useAuthStore((s) => s.login);
  const migrateLocalTrips = useTripsStore((s) => s.migrateLocalTrips);
  const syncFromServer = useTripsStore((s) => s.syncFromServer);

  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    email.trim().length > 0 &&
    password.length >= 8 &&
    (mode === "login" || name.trim().length > 0);

  const onSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "signup") {
        await signup(name.trim(), email.trim(), password);
        await migrateLocalTrips();
      } else {
        await login(email.trim(), password);
        await syncFromServer();
      }
      router.back();
    } catch (e: any) {
      setError(String(e?.message ?? "Something went wrong"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <BackHeader
        title={mode === "signup" ? "Create an account" : "Log in"}
        subtitle={
          mode === "signup"
            ? "Save your trips and edit them anywhere."
            : "Welcome back."
        }
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.tabRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setMode("signup");
                setError(null);
              }}
              style={[styles.tab, mode === "signup" && styles.tabActive]}
            >
              <AppText
                style={[styles.tabText, mode === "signup" && styles.tabTextActive]}
              >
                Sign up
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setMode("login");
                setError(null);
              }}
              style={[styles.tab, mode === "login" && styles.tabActive]}
            >
              <AppText
                style={[styles.tabText, mode === "login" && styles.tabTextActive]}
              >
                Log in
              </AppText>
            </TouchableOpacity>
          </View>

          {mode === "signup" ? (
            <View style={styles.field}>
              <AppText variant="label" style={styles.fieldLabel}>
                Name
              </AppText>
              <View style={styles.inputWrap}>
                <UserIcon size={18} color={colors.textMuted} strokeWidth={2.2} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>
          ) : null}

          <View style={styles.field}>
            <AppText variant="label" style={styles.fieldLabel}>
              Email
            </AppText>
            <View style={styles.inputWrap}>
              <Mail size={18} color={colors.textMuted} strokeWidth={2.2} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.field}>
            <AppText variant="label" style={styles.fieldLabel}>
              Password
            </AppText>
            <View style={styles.inputWrap}>
              <Lock size={18} color={colors.textMuted} strokeWidth={2.2} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={onSubmit}
              />
            </View>
          </View>

          {error ? <AppText style={styles.error}>{error}</AppText> : null}

          <Button
            label={mode === "signup" ? "Create account" : "Log in"}
            onPress={onSubmit}
            disabled={!canSubmit}
            loading={submitting}
            style={styles.cta}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.xl,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: colors.white },
  tabText: { fontWeight: "600", fontSize: 14, color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  field: { marginBottom: spacing.lg },
  fieldLabel: { marginBottom: spacing.sm },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    height: 48,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  input: { flex: 1, fontWeight: "500", fontSize: 15, color: colors.textPrimary },
  error: {
    color: colors.alert,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  cta: { marginTop: spacing.sm },
});
