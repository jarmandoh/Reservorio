import { Injectable, signal, computed } from '@angular/core';

const SESSION_KEY   = 'reservorio_unlocked';
const PIN_KEY       = 'reservorio_admin_pin';
const ADMIN_JWT     = 'reservorio_admin_jwt';
const OWNER_JWT     = 'reservorio_owner_jwt';
const DEFAULT_PIN   = '1234';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _unlocked = signal(sessionStorage.getItem(SESSION_KEY) === '1');
  readonly isUnlocked = computed(() => this._unlocked());
  readonly isOwnerUnlocked = computed(() => !!this.getOwnerToken());

  get storedPin(): string {
    return localStorage.getItem(PIN_KEY) ?? DEFAULT_PIN;
  }

  login(pin: string): boolean {
    if (pin === this.storedPin) {
      sessionStorage.setItem(SESSION_KEY, '1');
      this._unlocked.set(true);
      return true;
    }
    return false;
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(ADMIN_JWT);
    this._unlocked.set(false);
  }

  changePin(current: string, next: string): boolean {
    if (current !== this.storedPin)  return false;
    if (!/^\d{4}$/.test(next))        return false;
    localStorage.setItem(PIN_KEY, next);
    return true;
  }

  // ── Admin JWT ─────────────────────────────────────────────────────────

  getAdminToken(): string | null {
    const token = sessionStorage.getItem(ADMIN_JWT);
    return this.isTokenValid(token) ? token : null;
  }

  setAdminToken(token: string): void {
    sessionStorage.setItem(ADMIN_JWT, token);
  }

  clearAdminToken(): void {
    sessionStorage.removeItem(ADMIN_JWT);
  }

  getOwnerToken(): string | null {
    const token = sessionStorage.getItem(OWNER_JWT);
    return this.isTokenValid(token) ? token : null;
  }

  setOwnerToken(token: string): void {
    sessionStorage.setItem(OWNER_JWT, token);
  }

  clearOwnerToken(): void {
    sessionStorage.removeItem(OWNER_JWT);
  }

  getOwnerPayload(): { ownerId?: string; role?: string; [key: string]: unknown } | null {
    return this.decodeToken(this.getOwnerToken());
  }

  // ── Business JWT ──────────────────────────────────────────────────────

  getBusinessToken(businessId: string): string | null {
    const token = sessionStorage.getItem(`biz_jwt_${businessId}`);
    return this.isTokenValid(token) ? token : null;
  }

  setBusinessToken(businessId: string, token: string): void {
    sessionStorage.setItem(`biz_jwt_${businessId}`, token);
  }

  clearBusinessToken(businessId: string): void {
    sessionStorage.removeItem(`biz_jwt_${businessId}`);
  }

  isBusinessUnlocked(businessId: string): boolean {
    return !!this.getBusinessToken(businessId);
  }

  // ── JWT helper ────────────────────────────────────────────────────────

  private decodeToken(token: string | null): { [key: string]: unknown } | null {
    if (!token) return null;
    try {
      const [, payload] = token.split('.');
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  private isTokenValid(token: string | null): boolean {
    if (!token) return false;
    try {
      const payload = this.decodeToken(token);
      return typeof payload?.['exp'] === 'number' && payload['exp'] * 1000 > Date.now();
    } catch { return false; }
  }
}
