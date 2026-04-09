import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';

expect.extend({
  toBeInTheDocument(received: unknown) {
    const pass = received instanceof Node && document.contains(received);
    return {
      pass,
      message: () =>
        pass
          ? 'Expected element not to be present in the document'
          : 'Expected element to be present in the document',
    };
  },
  toHaveClass(received: unknown, ...classNames: string[]) {
    const missingClasses =
      received instanceof Element
        ? classNames.filter((className) => !received.classList.contains(className))
        : classNames;
    const pass = received instanceof Element && missingClasses.length === 0;

    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to have classes: ${classNames.join(', ')}`
          : `Expected element to have classes: ${missingClasses.join(', ')}`,
    };
  },
  toBeDisabled(received: unknown) {
    const pass =
      received instanceof HTMLElement &&
      ('disabled' in received ? Boolean((received as HTMLButtonElement | HTMLInputElement).disabled) : false);

    return {
      pass,
      message: () =>
        pass ? 'Expected element not to be disabled' : 'Expected element to be disabled',
    };
  },
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/chat',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        image: null,
      },
    },
    status: 'authenticated',
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
