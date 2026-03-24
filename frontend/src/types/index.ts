export * from './auth';
export * from './chat';
export * from './voice';
export * from './meetings';
export * from './knowledge';
export * from './search';
export * from './analytics';

// Shared utility types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
  statusCode: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
}
