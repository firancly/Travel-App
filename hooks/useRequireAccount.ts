import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Gates an action behind having an account. If signed in, runs `action`
 * immediately. If not, pushes the account screen and does NOT run `action`
 * — the user retaps after signing in (no pending-action replay).
 */
export function useRequireAccount() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  return (action: () => void) => {
    if (token) {
      action();
      return;
    }
    router.push('/account');
  };
}
