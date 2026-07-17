import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  getItem(key: string, storage: 'local' | 'session' = 'session'): string | null {
    const target = storage === 'local' ? localStorage : sessionStorage;
    return target.getItem(key);
  }

  setItem(key: string, value: string, storage: 'local' | 'session' = 'session'): void {
    const target = storage === 'local' ? localStorage : sessionStorage;
    target.setItem(key, value);
  }

  removeItem(key: string, storage: 'local' | 'session' = 'session'): void {
    const target = storage === 'local' ? localStorage : sessionStorage;
    target.removeItem(key);
  }

  clear(storage: 'local' | 'session' = 'session'): void {
    const target = storage === 'local' ? localStorage : sessionStorage;
    target.clear();
  }
}
