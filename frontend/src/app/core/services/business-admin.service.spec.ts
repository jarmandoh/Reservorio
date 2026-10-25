import { TestBed } from '@angular/core/testing';
import { BusinessAdminService } from './business-admin.service';

describe('BusinessAdminService', () => {
  let service: BusinessAdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BusinessAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
