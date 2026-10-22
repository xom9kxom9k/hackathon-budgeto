export interface AuthUser {
  id: string;
  email: string;
}

export type AuthStatus = 'unknown' | 'loading' | 'authenticated' | 'anonymous';
