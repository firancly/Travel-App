import { Redirect } from 'expo-router';

// Entry point — bounce to the tabs. The (tabs) layout redirects to
// /onboarding when the user hasn't completed setup yet.
export default function Index() {
  return <Redirect href="/home" />;
}
