import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { OfflineService } from './offline.service';

describe('ApiService', () => {
  const apiUrl = environment.apiUrl;
  let service: ApiService;
  let http: HttpTestingController;
  let offline: OfflineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
    offline = TestBed.inject(OfflineService);
  });

  afterEach(() => {
    http.verify();
    offline.clearAll();
    offline.online.set(navigator.onLine);
  });

  it('maps service data from the API response', () => {
    let services: string[] | undefined;
    service.getServices().subscribe(result => (services = result));

    const request = http.expectOne(`${apiUrl}/services`);
    expect(request.request.method).toBe('GET');
    request.flush({ data: ['Corte', 'Consulta'] });

    expect(services).toEqual(['Corte', 'Consulta']);
  });

  it('sends owner credentials and returns the server error message', () => {
    let error: Error | undefined;
    service.loginOwner('owner@example.com', 'secret').subscribe({
      error: value => (error = value),
    });

    const request = http.expectOne(`${apiUrl}/auth/owner/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'owner@example.com', password: 'secret' });
    request.flush({ message: 'Cuenta bloqueada' }, { status: 423, statusText: 'Locked' });

    expect(error?.message).toBe('Cuenta bloqueada');
  });

  it('serializes search filters as query parameters', () => {
    let businesses: unknown[] | undefined;
    service.getBusinesses({ q: 'café', category: 'Salud', location: '' }).subscribe(result => (businesses = result));

    const request = http.expectOne(req => req.url === `${apiUrl}/businesses`);
    expect(request.request.params.get('q')).toBe('café');
    expect(request.request.params.get('category')).toBe('Salud');
    expect(request.request.params.has('location')).toBe(false);
    request.flush({ data: [{ id: 'business-1' }] });

    expect(businesses).toEqual([{ id: 'business-1' }]);
  });

  it('maps an empty response payload to an empty service list', () => {
    let services: string[] | undefined;
    service.getServices().subscribe(result => (services = result));

    http.expectOne(`${apiUrl}/services`).flush({});

    expect(services).toEqual([]);
  });

  it('serves cached business data when offline without making a request', () => {
    const cached: [] = [];
    offline.write('businesses:', cached);
    offline.online.set(false);
    let businesses: unknown[] | undefined;

    service.getBusinesses().subscribe(result => (businesses = result));

    expect(businesses).toEqual(cached);
    http.expectNone(`${apiUrl}/businesses`);
  });

  it('does not replace an online server error with stale cached data', () => {
    const cached: [] = [];
    offline.write('businesses:', cached);
    offline.online.set(true);
    let error: Error | undefined;

    service.getBusinesses().subscribe({ error: value => (error = value) });
    http.expectOne(`${apiUrl}/businesses`).flush('unavailable', { status: 503, statusText: 'Unavailable' });

    expect(error?.message).toBe('HTTP 503');
  });

  it('does not serve a cached authenticated business profile while offline', () => {
    const cached = { id: 'private-1', name: 'Stale private data' };
    offline.write('business:private-1', cached);
    offline.online.set(false);
    let business: unknown;

    service.getBusinessById('private-1', 'test-token').subscribe(result => (business = result));

    const request = http.expectOne(`${apiUrl}/businesses/private-1`);
    request.flush({ data: { id: 'private-1', name: 'Current business data' } });
    expect(business).toEqual({ id: 'private-1', name: 'Current business data' });
  });

  it('does not serve cached availability while offline', () => {
    offline.write('availability:business-1', [{ id: 'old-slot' }]);
    offline.online.set(false);
    let availability: unknown;

    service.getBusinessAvailability('business-1').subscribe(result => (availability = result));

    http.expectOne(`${apiUrl}/businesses/business-1/availability`).flush({ data: [{ id: 42 }] });
    expect(availability).toEqual([{ id: 42, _rowIndex: 42 }]);
  });

  it('expires offline cache entries after one hour', () => {
    offline.write('businesses:', [{ id: 'business-1' }]);
    localStorage.setItem(
      'reservorio_offline_v1:businesses:',
      JSON.stringify({ data: [{ id: 'business-1' }], savedAt: Date.now() - 60 * 60 * 1000 - 1 })
    );

    expect(offline.read('businesses:')).toBeNull();
    expect(localStorage.getItem('reservorio_offline_v1:businesses:')).toBeNull();
  });
});
