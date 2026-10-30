import { TestBed } from '@angular/core/testing';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;

  beforeEach(() => {
    document.head.querySelector('link[rel="canonical"]')?.remove();
    document.head.querySelector('#dynamic-seo-jsonld')?.remove();
    TestBed.configureTestingModule({ providers: [SeoService] });
    service = TestBed.inject(SeoService);
  });

  it('sets the canonical metadata for the home page and ignores query parameters', () => {
    service.updateForRoute('/?q=hair');

    expect(document.title).toContain('MiVeci');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://reservorio.app/');
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('index, follow');
    expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
      'https://reservorio.app/'
    );
  });

  it('sets canonical metadata for the privacy page', () => {
    service.updateForRoute('/privacy/');

    expect(document.title).toContain('Política de privacidad');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://reservorio.app/privacy'
    );
  });

  it('marks transactional routes noindex and removes their canonical URL', () => {
    service.updateForRoute('/booking/business-1?service=hair');

    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it('publishes business social metadata and schema markup', () => {
    service.updateForBusiness({
      id: 'business-1',
      name: 'Café Central',
      category: 'Cafetería',
      businessType: 'appointment',
      description: 'Café de especialidad',
      location: 'Bogotá',
      rating: 4.8,
      reviews: 12,
      tags: [],
      available: 0,
      total: 0,
      routePath: '/booking/business-1',
      gradient: '',
      icon: 'store',
    });

    expect(document.head.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('website');
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toContain(
      'reservorio-logo.jpg'
    );
    const schema = JSON.parse(document.head.querySelector('#dynamic-seo-jsonld')?.textContent ?? '{}');
    expect(schema['@graph'][0]).toMatchObject({ '@type': 'LocalBusiness', name: 'Café Central' });
    expect(schema['@graph'][1]['@type']).toBe('BreadcrumbList');
  });
});
