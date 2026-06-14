import 'react-native-gesture-handler';
import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { fontAssets, colors } from '@/theme';
import { usePrefsStore } from '@/store/usePrefsStore';
import { RootNavigator } from '@/navigation/RootNavigator';

// Keep the native splash up until fonts + persisted state are ready.
SplashScreen.preventAutoHideAsync();

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.screen,
    primary: colors.primary,
    card: colors.white,
    text: colors.textPrimary,
    border: colors.border,
  },
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const hydrated = usePrefsStore((s) => s._hydrated);
  const ready = (fontsLoaded || !!fontError) && hydrated;

  const onLayoutRoot = useCallback(async () => {
    if (ready) await SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRoot}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
