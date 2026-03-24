import apiClient from './client';

import type {
  AuthResponse,
  LoginCredentials,
  PasswordResetConfirm,
  PasswordResetRequest,
  RegisterPayload,
  User,
} from '@/types';

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}

export async function register(payload: RegisterPayload, inviteToken?: string): Promise<AuthResponse> {
  const url = inviteToken ? `/auth/register?invite=${encodeURIComponent(inviteToken)}` : '/auth/register';
  const { data } = await apiClient.post<AuthResponse>(url, payload);
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}

export async function logout(): Promise<void> {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    await apiClient.post('/auth/logout', { refreshToken });
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}

export async function refreshToken(token: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/refresh', {
    refreshToken: token,
  });
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
}

export async function requestPasswordReset(payload: PasswordResetRequest): Promise<void> {
  await apiClient.post('/auth/password-reset/request', payload);
}

export async function confirmPasswordReset(payload: PasswordResetConfirm): Promise<void> {
  await apiClient.post('/auth/password-reset/confirm', payload);
}

export async function updateProfile(payload: Partial<User>): Promise<User> {
  const { data } = await apiClient.patch<User>('/auth/me', payload);
  return data;
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiClient.post('/auth/change-password', payload);
}
