import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

describe('AuthService auth flows', () => {
  let service: AuthService;
  let loginOwnerSpy: ReturnType<typeof vi.fn>;
  let api: ApiService;

  beforeEach(() => {
    sessionStorage.clear();
    loginOwnerSpy = vi.fn();
    api = { loginOwner: loginOwnerSpy } as unknown as ApiService;

    TestBed.configureTestingModule({
      providers: [AuthService, { provide: ApiService, useValue: api }],
    });

    service = TestBed.inject(AuthService);
  });

  it('stores the owner token after a successful login', () => {
    loginOwnerSpy.mockReturnValue(of({ data: { token: 'owner-token' } } as any));

    service.loginOwner('owner@example.com', 'secret123').subscribe();

    expect(sessionStorage.getItem('reservorio_owner_jwt')).toBe('owner-token');
  });

  it('returns an unexpired stored owner token', () => {
    const token = createToken(Date.now() / 1000 + 60);
    sessionStorage.setItem('reservorio_owner_jwt', token);

    expect(service.getOwnerToken()).toBe(token);
  });

  it('removes an expired customer token from local storage', () => {
    localStorage.setItem('reservorio_customer_jwt', createToken(Date.now() / 1000 - 60));

    expect(service.getCustomerToken()).toBeNull();
    expect(localStorage.getItem('reservorio_customer_jwt')).toBeNull();
  });

  it('clears a previous owner token and propagates login errors', () => {
    sessionStorage.setItem('reservorio_owner_jwt', createToken(Date.now() / 1000 + 60));
    const loginError = new Error('Credenciales incorrectas');
    loginOwnerSpy.mockReturnValue(throwError(() => loginError));
    const errorHandler = vi.fn();

    service.loginOwner('owner@example.com', 'incorrect').subscribe({ error: errorHandler });

    expect(sessionStorage.getItem('reservorio_owner_jwt')).toBeNull();
    expect(errorHandler).toHaveBeenCalledWith(loginError);
  });
});

function createToken(exp: number): string {
  const payload = btoa(JSON.stringify({ exp })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${payload}.signature`;
}
