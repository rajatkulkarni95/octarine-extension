import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { applyTheme, setupThemeListener } from './settings';

// Mock webextension-polyfill - settings uses browser storage
vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
      },
    },
  },
}));

describe('settings', () => {
  describe('applyTheme', () => {
    beforeEach(() => {
      // Reset document classes
      document.documentElement.classList.remove('dark');
    });

    afterEach(() => {
      document.documentElement.classList.remove('dark');
    });

    it('should add dark class when mode is "dark"', () => {
      applyTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class when mode is "light"', () => {
      document.documentElement.classList.add('dark');
      applyTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should respect system preference when mode is "system" and prefers dark', () => {
      // Mock matchMedia to return dark preference
      const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      vi.stubGlobal('matchMedia', mockMatchMedia);
      
      applyTheme('system');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      
      vi.unstubAllGlobals();
    });

    it('should respect system preference when mode is "system" and prefers light', () => {
      const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      vi.stubGlobal('matchMedia', mockMatchMedia);
      
      applyTheme('system');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      
      vi.unstubAllGlobals();
    });
  });

  describe('setupThemeListener', () => {
    let mockAddEventListener: ReturnType<typeof vi.fn>;
    let mockRemoveEventListener: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      document.documentElement.classList.remove('dark');
      mockAddEventListener = vi.fn();
      mockRemoveEventListener = vi.fn();
    });

    afterEach(() => {
      document.documentElement.classList.remove('dark');
      vi.unstubAllGlobals();
    });

    it('should not set up listener when mode is "dark"', () => {
      const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      }));
      
      vi.stubGlobal('matchMedia', mockMatchMedia);
      
      const cleanup = setupThemeListener('dark');
      
      // Should not add event listener for non-system modes
      expect(mockAddEventListener).not.toHaveBeenCalled();
      
      // Cleanup should be a no-op function
      cleanup();
    });

    it('should not set up listener when mode is "light"', () => {
      const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      }));
      
      vi.stubGlobal('matchMedia', mockMatchMedia);
      
      const cleanup = setupThemeListener('light');
      
      expect(mockAddEventListener).not.toHaveBeenCalled();
      cleanup();
    });

    it('should set up listener when mode is "system"', () => {
      const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      }));
      
      vi.stubGlobal('matchMedia', mockMatchMedia);
      
      const cleanup = setupThemeListener('system');
      
      // Should add event listener for system mode
      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      
      // Cleanup should remove the listener
      cleanup();
      expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should apply theme changes when system preference changes', () => {
      let capturedHandler: ((e: MediaQueryListEvent) => void) | null = null;
      
      const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn().mockImplementation((event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            capturedHandler = handler;
          }
        }),
        removeEventListener: vi.fn(),
      }));
      
      vi.stubGlobal('matchMedia', mockMatchMedia);
      
      setupThemeListener('system');
      
      // Simulate system changing to dark mode
      expect(capturedHandler).not.toBeNull();
      capturedHandler!({ matches: true } as MediaQueryListEvent);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      
      // Simulate system changing to light mode
      capturedHandler!({ matches: false } as MediaQueryListEvent);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should return a cleanup function', () => {
      const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      }));
      
      vi.stubGlobal('matchMedia', mockMatchMedia);
      
      const cleanup = setupThemeListener('system');
      
      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });
});

// Test loadSettings, saveSettings, updateSetting separately since they require async/browser mocks
describe('settings storage functions', () => {
  // These tests would require more complex mocking of the browser API
  // The functions are primarily wrappers around browser.storage.local
  // For comprehensive testing, integration tests or E2E tests would be more appropriate
  
  it('should have loadSettings, saveSettings, and updateSetting exported', async () => {
    const settings = await import('./settings');
    expect(typeof settings.loadSettings).toBe('function');
    expect(typeof settings.saveSettings).toBe('function');
    expect(typeof settings.updateSetting).toBe('function');
  });
});
