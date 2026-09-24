import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { BusinessService } from './business.service';
import { OwnerBusinessService } from './owner-business.service';

describe('OwnerBusinessService', () => {
  let service: OwnerBusinessService;
  let auth: { getOwnerToken: ReturnType<typeof vi.fn> };
  let businessService: {
    createBusiness: ReturnType<typeof vi.fn>;
    updateBusiness: ReturnType<typeof vi.fn>;
    getOwnerBusinesses: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    auth = { getOwnerToken: vi.fn() };
    businessService = {
      createBusiness: vi.fn(),
      updateBusiness: vi.fn(),
      getOwnerBusinesses: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        OwnerBusinessService,
        { provide: AuthService, useValue: auth },
        { provide: BusinessService, useValue: businessService },
      ]
    });

    service = TestBed.inject(OwnerBusinessService);
  });

  it('crea un payload normalizado y delega la creación al BusinessService', () => {
    auth.getOwnerToken.mockReturnValue('owner-token');
    businessService.createBusiness.mockReturnValue(of({ ok: true } as any));

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
    }, null).subscribe();

    expect(businessService.createBusiness).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Mi negocio',
        category: 'Gastronomía',
        tags: ['café', 'brunch'],
        pin: '1234'
      }),
      'owner-token'
    );
  });
});