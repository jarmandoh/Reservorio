import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { BusinessService } from './business.service';
import { OwnerBusinessService } from './owner-business.service';

describe('OwnerBusinessService', () => {
  let service: OwnerBusinessService;
  let auth: jasmine.SpyObj<AuthService>;
  let businessService: jasmine.SpyObj<BusinessService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getOwnerToken']);
    businessService = jasmine.createSpyObj<BusinessService>('BusinessService', ['createBusiness', 'updateBusiness', 'getOwnerBusinesses']);

    TestBed.configureTestingModule({
      providers: [
        OwnerBusinessService,
        { provide: AuthService, useValue: auth },
        { provide: BusinessService, useValue: businessService },
      ]
    });

    service = TestBed.inject(OwnerBusinessService);
  });

  it('crea un payload normalizado y delega la creación al BusinessService', (done) => {
    auth.getOwnerToken.and.returnValue('owner-token');
    businessService.createBusiness.and.returnValue(of({ ok: true } as any));

    service.saveBusiness({
      name: 'Mi negocio',
      category: 'Gastronomía',
      description: 'Un lugar genial',
      location: 'Centro',
      phone: '555',
      logo: '',
      tags: 'café, brunch',
      facebook: '',
      instagram: '',
      tiktok: '',
      whatsapp: '',
      linkedin: '',
      pin: '1234'
    }, null).subscribe({
      next: () => {
        expect(businessService.createBusiness).toHaveBeenCalledWith(jasmine.objectContaining({
          name: 'Mi negocio',
          category: 'Gastronomía',
          tags: ['café', 'brunch'],
          pin: '1234'
        }), 'owner-token');
        done();
      },
      error: done.fail
    });
  });
});
