import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly _isAuthenticated = signal(false);
  private readonly _isOwnerAuthenticated = signal(false);
  private readonly _isAdminAuthenticated = signal(false);

  readonly isAuthenticated = computed(() => this._isAuthenticated());
  readonly isOwnerAuthenticated = computed(() => this._isOwnerAuthenticated());
  readonly isAdminAuthenticated = computed(() => this._isAdminAuthenticated());

  setAuthenticated(value: boolean): void {
    this._isAuthenticated.set(value);
  }

  setOwnerAuthenticated(value: boolean): void {
    this._isOwnerAuthenticated.set(value);
  }

  setAdminAuthenticated(value: boolean): void {
    this._isAdminAuthenticated.set(value);
  }

  reset(): void {
    this._isAuthenticated.set(false);
    this._isOwnerAuthenticated.set(false);
    this._isAdminAuthenticated.set(false);
  }
}
