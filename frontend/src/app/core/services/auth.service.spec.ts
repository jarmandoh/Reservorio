import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

describe('AuthService auth flows', () => {
  let service: AuthService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    sessionStorage.clear();
    api = jasmine.createSpyObj<ApiService>('ApiService', ['loginOwner']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: api }
      ]
    });

    service = TestBed.inject(AuthService);
  });

  it('stores the owner token after a successful login', (done) => {
    api.loginOwner.and.returnValue(of({ data: { token: 'owner-token' } } as any));

    service.loginOwner('owner@example.com', 'secret123').subscribe({
      next: () => {
        expect(sessionStorage.getItem('reservorio_owner_jwt')).toBe('owner-token');
        done();
      },
      error: done.fail
    });
  });
});
