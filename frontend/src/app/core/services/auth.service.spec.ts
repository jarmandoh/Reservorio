import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
});
