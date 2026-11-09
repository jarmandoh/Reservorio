import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { SupabaseAuthService } from './supabase-auth.service';

describe('AuthService auth flows', () => {
  let service: AuthService;
  let loginOwnerSpy: ReturnType<typeof vi.fn>;
  let api: ApiService;
  let supabaseAuth: {
    enabled: boolean;
    accessToken: ReturnType<typeof signal<string | null>>;
    initialized: ReturnType<typeof signal<boolean>>;
  };

  beforeEach(() => {
    sessionStorage.clear();
    loginOwnerSpy = vi.fn();
    api = { loginOwner: loginOwnerSpy } as unknown as ApiService;
    supabaseAuth = {
      enabled: false,
      accessToken: signal<string | null>(null),
      initialized: signal(true),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: api },
        { provide: SupabaseAuthService, useValue: supabaseAuth },
      ],
    });
  });

  it('stores the owner token after a successful login', () => {
    service = TestBed.inject(AuthService);
    loginOwnerSpy.mockReturnValue(of({ data: { token: 'owner-token' } } as any));

    service.loginOwner('owner@example.com', 'secret123').subscribe();

    expect(sessionStorage.getItem('reservorio_owner_jwt')).toBe('owner-token');
  });

  it('returns an unexpired stored owner token', () => {
    const token = createToken(Date.now() / 1000 + 60);
    sessionStorage.setItem('reservorio_owner_jwt', token);
    service = TestBed.inject(AuthService);

    expect(service.getOwnerToken()).toBe(token);
  });

  it('removes an expired customer token from local storage', () => {
    localStorage.setItem('reservorio_customer_jwt', createToken(Date.now() / 1000 - 60));
    service = TestBed.inject(AuthService);

    expect(service.getCustomerToken()).toBeNull();
    expect(localStorage.getItem('reservorio_customer_jwt')).toBeNull();
  });

  it('clears a previous owner token and propagates login errors', () => {
    sessionStorage.setItem('reservorio_owner_jwt', createToken(Date.now() / 1000 + 60));
    service = TestBed.inject(AuthService);
    const loginError = new Error('Credenciales incorrectas');
    loginOwnerSpy.mockReturnValue(throwError(() => loginError));
    const errorHandler = vi.fn();

    service.loginOwner('owner@example.com', 'incorrect').subscribe({ error: errorHandler });

    expect(sessionStorage.getItem('reservorio_owner_jwt')).toBeNull();
    expect(errorHandler).toHaveBeenCalledWith(loginError);
  });

  it('keeps the stored owner session until Supabase restores its persisted session', () => {
    const storedToken = createSupabaseToken(Date.now() / 1000 + 60);
    const refreshedToken = createSupabaseToken(Date.now() / 1000 + 120);
    sessionStorage.setItem('reservorio_owner_jwt', storedToken);
    supabaseAuth.initialized.set(false);

    service = TestBed.inject(AuthService);
    TestBed.flushEffects();

    expect(sessionStorage.getItem('reservorio_owner_jwt')).toBe(storedToken);

    supabaseAuth.accessToken.set(refreshedToken);
    supabaseAuth.initialized.set(true);
    TestBed.flushEffects();

    expect(sessionStorage.getItem('reservorio_owner_jwt')).toBe(refreshedToken);
  });

  it('clears a Supabase-backed owner token after initialization confirms there is no session', () => {
    const storedToken = createSupabaseToken(Date.now() / 1000 + 60);
    sessionStorage.setItem('reservorio_owner_jwt', storedToken);
    supabaseAuth.initialized.set(false);

    service = TestBed.inject(AuthService);
    TestBed.flushEffects();
    expect(sessionStorage.getItem('reservorio_owner_jwt')).toBe(storedToken);

    supabaseAuth.initialized.set(true);
    TestBed.flushEffects();

    expect(sessionStorage.getItem('reservorio_owner_jwt')).toBeNull();
  });
});

function createToken(exp: number): string {
  const payload = btoa(JSON.stringify({ exp })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${payload}.signature`;
}

function createSupabaseToken(exp: number): string {
  const payload = btoa(JSON.stringify({ exp, iss: 'https://project.supabase.co/auth/v1' }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${payload}.signature`;
}
