/**
 * Safe storage utility with error handling and SSR support
 * Prevents crashes when localStorage/sessionStorage is unavailable
 */

import { STORAGE_KEYS as APP_STORAGE_KEYS } from '@/lib/constants';

type StorageType = 'local' | 'session';

const isStorageAvailable = (type: StorageType): boolean => {
  try {
    const storage = type === 'local' ? window.localStorage : window.sessionStorage;
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

class SafeStorage {
  private type: StorageType;
  private fallbackStore: Map<string, string>;
  private isAvailable: boolean;

  constructor(type: StorageType) {
    this.type = type;
    this.fallbackStore = new Map();
    this.isAvailable = typeof window !== 'undefined' && isStorageAvailable(type);
  }

  private getStorage() {
    if (!this.isAvailable) return null;
    return this.type === 'local' ? window.localStorage : window.sessionStorage;
  }

  getItem(key: string): string | null {
    try {
      const storage = this.getStorage();
      if (storage) {
        return storage.getItem(key);
      }
      return this.fallbackStore.get(key) || null;
    } catch {
      return this.fallbackStore.get(key) || null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.setItem(key, value);
      }
      // Always store in fallback as backup
      this.fallbackStore.set(key, value);
    } catch {
      // Use fallback when storage fails (e.g., quota exceeded)
      this.fallbackStore.set(key, value);
    }
  }

  removeItem(key: string): void {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.removeItem(key);
      }
      this.fallbackStore.delete(key);
    } catch {
      this.fallbackStore.delete(key);
    }
  }

  clear(): void {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.clear();
      }
      this.fallbackStore.clear();
    } catch {
      this.fallbackStore.clear();
    }
  }

  // JSON helpers with type safety
  getJSON<T>(key: string, defaultValue: T): T {
    try {
      const item = this.getItem(key);
      if (!item) return defaultValue;
      
      const parsed = JSON.parse(item);
      return parsed as T;
    } catch {
      return defaultValue;
    }
  }

  setJSON<T>(key: string, value: T): void {
    try {
      this.setItem(key, JSON.stringify(value));
    } catch {
      // Silently fail - data will be lost but app continues
    }
  }

  /**
   * Check if a key exists in storage
   */
  has(key: string): boolean {
    return this.getItem(key) !== null;
  }

  /**
   * Get storage size in bytes (approximate)
   */
  getSize(): number {
    const storage = this.getStorage();
    if (!storage) return 0;
    
    let size = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        const value = storage.getItem(key);
        if (value) {
          size += key.length + value.length;
        }
      }
    }
    return size * 2; // UTF-16 = 2 bytes per character
  }
}

// Export singleton instances
export const localStorage = new SafeStorage('local');
export const sessionStorage = new SafeStorage('session');

// Re-export storage keys from constants
export const STORAGE_KEYS = APP_STORAGE_KEYS;
