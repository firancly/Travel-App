import 'react-native-gesture-handler';
import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '@/theme';
import { usePrefsStore } from '@/store/usePrefsStore';

// Keep the native splash up until persisted state is ready (system font — no font loading).
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = usePrefsStore((s) => s._hydrated);
  const ready = hydrated;

  const onLayoutRoot = useCallback(async () => {
    if (ready) await SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRoot}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.screen },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="audio-tours" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="bookings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="audio-player" options={{ animation: 'slide_from_bottom' }} />
          </Stack>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
