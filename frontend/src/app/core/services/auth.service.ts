import { Injectable, signal, computed } from '@angular/core';

const SESSION_KEY  = 'reservorio_unlocked';
const PIN_KEY      = 'reservorio_admin_pin';
const ADMIN_JWT    = 'reservorio_admin_jwt';
const DEFAULT_PIN  = '1234';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _unlocked = signal(sessionStorage.getItem(SESSION_KEY) === '1');
  readonly isUnlocked = computed(() => this._unlocked());

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

  private isTokenValid(token: string | null): boolean {
    if (!token) return false;
    try {
      const [, payload] = token.split('.');
      const data = JSON.parse(atob(payload));
      return typeof data.exp === 'number' && data.exp * 1000 > Date.now();
    } catch { return false; }
  }
}
