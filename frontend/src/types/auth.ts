export type AuthProvider = 'credentials' | 'google' | 'microsoft' | 'github';

export type MFAMethod = 'totp' | 'sms' | 'email' | 'webauthn';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  organizationId: string;
  organizationName: string;
  mfaEnabled: boolean;
  mfaMethods: MFAMethod[];
  preferences: UserPreferences;
  createdAt: string;
  lastLoginAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationPreferences;
  defaultModel: string;
  sidebarCollapsed: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  browser: boolean;
  meetingReminders: boolean;
  documentUpdates: boolean;
  agentCompletions: boolean;
}

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  organizationName?: string;
  inviteToken?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  password: string;
  confirmPassword: string;
}
