import { Redirect } from 'expo-router';
import { usePrefsStore } from '@/store/usePrefsStore';
import { OnboardingScreen } from '@/screens/OnboardingScreen';

export default function Onboarding() {
  const onboarded = usePrefsStore((s) => s.onboarded);
  if (onboarded) return <Redirect href="/home" />;
  return <OnboardingScreen />;
}
