import { apiClient } from './client';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  adminUsers: number;
}

export interface Role {
  value: string;
  label: string;
  description: string;
}

export interface InviteUserPayload {
  name: string;
  email: string;
  role: string;
  password?: string;
}

export interface UpdateUserPayload {
  name?: string;
  role?: string;
  is_active?: boolean;
}

export async function getUserStats(): Promise<AdminStats> {
  const res = await apiClient.get<AdminStats>('/admin/users/stats');
  return res.data;
}

export async function listUsers(params?: {
  search?: string;
  role?: string;
  page?: number;
  page_size?: number;
}): Promise<AdminUser[]> {
  const res = await apiClient.get<AdminUser[]>('/admin/users', { params });
  return res.data;
}

export async function inviteUser(payload: InviteUserPayload): Promise<AdminUser> {
  const res = await apiClient.post<AdminUser>('/admin/users', payload);
  return res.data;
}

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<AdminUser> {
  const res = await apiClient.patch<AdminUser>(`/admin/users/${userId}`, payload);
  return res.data;
}

export async function deleteUser(userId: string): Promise<void> {
  await apiClient.delete(`/admin/users/${userId}`);
}

export async function listRoles(): Promise<Role[]> {
  const res = await apiClient.get<Role[]>('/admin/roles');
  return res.data;
}

export interface InviteLink {
  id: string;
  token: string;
  email: string | null;
  role: string;
  inviteUrl: string;
  expiresAt: string;
  createdAt: string;
  used: boolean;
}

export interface CreateInvitePayload {
  email?: string;
  role?: string;
}

export async function createInviteLink(payload: CreateInvitePayload): Promise<InviteLink> {
  const res = await apiClient.post<InviteLink>('/admin/invites', payload);
  return res.data;
}

export async function listInviteLinks(): Promise<InviteLink[]> {
  const res = await apiClient.get<InviteLink[]>('/admin/invites');
  return res.data;
}

export async function revokeInviteLink(id: string): Promise<void> {
  await apiClient.delete(`/admin/invites/${id}`);
}
