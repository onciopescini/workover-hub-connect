import type { AuthState } from './auth-state.types';
import type { AuthMethods } from './auth-methods.types';

export interface AuthContextType extends AuthMethods {
  authState: AuthState;
}