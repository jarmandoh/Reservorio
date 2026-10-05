import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { adminGuard } from './admin.guard';
import { businessGuard } from './business.guard';
import { customerGuard } from './customer.guard';
import { ownerGuard } from './owner.guard';

describe('route guards', () => {
  let auth: {
    purgeInvalidTokens: ReturnType<typeof vi.fn>;
    isUnlocked: ReturnType<typeof vi.fn>;
    getAdminToken: ReturnType<typeof vi.fn>;
    isOwnerUnlocked: ReturnType<typeof vi.fn>;
    isCustomerUnlocked: ReturnType<typeof vi.fn>;
    isBusinessUnlocked: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = {
      purgeInvalidTokens: vi.fn().mockReturnValue([]),
      isUnlocked: vi.fn().mockReturnValue(false),
      getAdminToken: vi.fn().mockReturnValue(null),
      isOwnerUnlocked: vi.fn().mockReturnValue(false),
      isCustomerUnlocked: vi.fn().mockReturnValue(false),
      isBusinessUnlocked: vi.fn().mockReturnValue(false),
    };
    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('redirects unauthenticated admin users to the admin login', () => {
    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/jh-login']);
  });

  it('allows admin users with a valid JWT', () => {
    auth.getAdminToken.mockReturnValue('admin-token');

    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated owners to owner login', () => {
    const result = TestBed.runInInjectionContext(() =>
      ownerGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/owner/login']);
  });

  it('redirects unauthenticated customers to customer login', () => {
    const result = TestBed.runInInjectionContext(() =>
      customerGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/customer/login']);
  });

  it('redirects business users to the login for the requested business', () => {
    const route = { params: { businessId: 'business-7' } } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() => businessGuard(route, {} as RouterStateSnapshot));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/business', 'business-7', 'login']);
  });

  it('returns to home when an invalid session token was purged', () => {
    auth.purgeInvalidTokens.mockReturnValue(['reservorio_customer_jwt']);

    const result = TestBed.runInInjectionContext(() =>
      customerGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
