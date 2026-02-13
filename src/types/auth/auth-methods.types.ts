import type { Profile } from './auth-state.types';

export interface SignUpResult {
  needsEmailConfirmation: boolean;
}

export interface AuthMethods {
  signIn: (email: string, password: string, redirectTo?: string) => Promise<void>;
  signUp: (email: string, password: string, emailRedirectTo?: string) => Promise<SignUpResult>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}
