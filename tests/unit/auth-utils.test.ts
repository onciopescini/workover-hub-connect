import { describe, it, expect } from '@jest/globals';

describe('Role-Based Access Control', () => {
  type UserRole = 'user' | 'host' | 'moderator' | 'admin';

  const hasRole = (userRoles: UserRole[], requiredRole: UserRole): boolean => {
    if (requiredRole === 'admin') {
      return userRoles.includes('admin');
    }
    if (requiredRole === 'moderator') {
      return userRoles.includes('admin') || userRoles.includes('moderator');
    }
    if (requiredRole === 'host') {
      return userRoles.includes('admin') || userRoles.includes('host');
    }
    return userRoles.includes(requiredRole);
  };

  it('admin has all permissions', () => {
    const adminRoles: UserRole[] = ['admin'];
    expect(hasRole(adminRoles, 'admin')).toBe(true);
    expect(hasRole(adminRoles, 'moderator')).toBe(true);
    expect(hasRole(adminRoles, 'host')).toBe(true);
    expect(hasRole(adminRoles, 'user')).toBe(true);
  });

  it('moderator has moderator and user permissions', () => {
    const modRoles: UserRole[] = ['moderator'];
    expect(hasRole(modRoles, 'moderator')).toBe(true);
    expect(hasRole(modRoles, 'user')).toBe(true);
    expect(hasRole(modRoles, 'admin')).toBe(false);
  });

  it('host has host and user permissions', () => {
    const hostRoles: UserRole[] = ['host'];
    expect(hasRole(hostRoles, 'host')).toBe(true);
    expect(hasRole(hostRoles, 'user')).toBe(true);
    expect(hasRole(hostRoles, 'admin')).toBe(false);
  });

  it('user has only user permissions', () => {
    const userRoles: UserRole[] = ['user'];
    expect(hasRole(userRoles, 'user')).toBe(true);
    expect(hasRole(userRoles, 'host')).toBe(false);
    expect(hasRole(userRoles, 'moderator')).toBe(false);
    expect(hasRole(userRoles, 'admin')).toBe(false);
  });

  it('handles multiple roles correctly', () => {
    const multiRoles: UserRole[] = ['user', 'host', 'moderator'];
    expect(hasRole(multiRoles, 'user')).toBe(true);
    expect(hasRole(multiRoles, 'host')).toBe(true);
    expect(hasRole(multiRoles, 'moderator')).toBe(true);
    expect(hasRole(multiRoles, 'admin')).toBe(false);
  });
});

describe('Authentication State', () => {
  interface AuthState {
    isAuthenticated: boolean;
    user: { id: string; email: string } | null;
    roles: string[];
  }

  const isAuthenticated = (state: AuthState): boolean => {
    return state.isAuthenticated && state.user !== null;
  };

  it('validates authenticated state', () => {
    const authState: AuthState = {
      isAuthenticated: true,
      user: { id: '123', email: 'test@example.com' },
      roles: ['user']
    };
    expect(isAuthenticated(authState)).toBe(true);
  });

  it('invalidates unauthenticated state', () => {
    const unauthState: AuthState = {
      isAuthenticated: false,
      user: null,
      roles: []
    };
    expect(isAuthenticated(unauthState)).toBe(false);
  });

  it('requires both flag and user', () => {
    const invalidState: AuthState = {
      isAuthenticated: true,
      user: null,
      roles: []
    };
    expect(isAuthenticated(invalidState)).toBe(false);
  });
});
