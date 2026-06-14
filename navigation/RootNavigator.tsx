import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { usePrefsStore } from '@/store/usePrefsStore';
import { MainTabs } from './MainTabs';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { AudioToursScreen } from '@/screens/AudioToursScreen';
import { BookingsScreen } from '@/screens/BookingsScreen';
import { AudioPlayerScreen } from '@/screens/AudioPlayerScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const onboarded = usePrefsStore((s) => s.onboarded);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!onboarded ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <Stack.Group>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="AudioTours"
            component={AudioToursScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Bookings"
            component={BookingsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="AudioPlayer"
            component={AudioPlayerScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
