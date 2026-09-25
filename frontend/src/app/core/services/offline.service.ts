import { Injectable, signal } from '@angular/core';

const CACHE_KEY_PREFIX = 'reservorio_offline_v1:';
const MAX_ENTRIES = 80;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

@Injectable({ providedIn: 'root' })
export class OfflineService {
  readonly online = signal<boolean>(isBrowser() ? navigator.onLine : true);

  private readonly pendingRetries = new Set<() => void>();

  constructor() {
    if (!isBrowser()) return;

    window.addEventListener('online', () => this.becomeOnline());
    window.addEventListener('offline', () => this.online.set(false));
  }

  private becomeOnline(): void {
    this.online.set(true);
    this.pendingRetries.forEach(fn => {
      try {
        fn();
      } catch (_error) {
        // no romper la reconexión
      }
    });
    this.pendingRetries.clear();
  }

  private keyFor(key: string): string {
    return `${CACHE_KEY_PREFIX}${key}`;
  }

  read<T>(key: string): T | null {
    if (!isBrowser()) return null;
    try {
      const raw = localStorage.getItem(this.keyFor(key));
      if (!raw) return null;
      const entry = JSON.parse(raw) as { data: T; savedAt: number };
      this.prune();
      return entry.data;
    } catch (_error) {
      return null;
    }
  }

  write<T>(key: string, data: T): void {
    if (!isBrowser()) return;
    try {
      const entry = { data, savedAt: Date.now() };
      localStorage.setItem(this.keyFor(key), JSON.stringify(entry));
      this.prune();
    } catch (_error) {
      // cuota llena; intentar limpiar y reintentar una vez
      try {
        this.clearAll();
        localStorage.setItem(this.keyFor(key), JSON.stringify({ data, savedAt: Date.now() }));
      } catch (_err2) {
        // almacenamiento no disponible
      }
    }
  }

  remove(key: string): void {
    if (!isBrowser()) return;
    try {
      localStorage.removeItem(this.keyFor(key));
    } catch (_error) {
      // ignorar
    }
  }

  onReconnected(callback: () => void): void {
    if (this.online()) {
      callback();
      return;
    }
    this.pendingRetries.add(callback);
  }

  private prune(): void {
    if (!isBrowser()) return;
    try {
      const keys: { key: string; savedAt: number }[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(CACHE_KEY_PREFIX)) continue;
        try {
          const entry = JSON.parse(localStorage.getItem(k) ?? '{}') as { savedAt?: number };
          keys.push({ key: k, savedAt: entry.savedAt ?? 0 });
        } catch (_error) {
          localStorage.removeItem(k);
        }
      }
      if (keys.length <= MAX_ENTRIES) return;
      keys.sort((a, b) => b.savedAt - a.savedAt);
      keys.slice(MAX_ENTRIES).forEach(k => localStorage.removeItem(k.key));
    } catch (_error) {
      // ignorar
    }
  }

  clearAll(): void {
    if (!isBrowser()) return;
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_KEY_PREFIX)) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch (_error) {
      // ignorar
    }
  }
}
