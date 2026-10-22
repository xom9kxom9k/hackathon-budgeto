export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  goals: string[];
  onboardingCompleted: boolean;
}

export type AuthStatus = 'unknown' | 'loading' | 'authenticated' | 'anonymous';
