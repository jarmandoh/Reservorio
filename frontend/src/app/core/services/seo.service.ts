import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Business } from '../models/business.model';

const CANONICAL_ORIGIN = 'https://reservorio.app';
const DEFAULT_SOCIAL_IMAGE = `${CANONICAL_ORIGIN}/assets/imgs/reservorio-logo.jpg`;
const PUBLIC_PAGES = new Map([
  [
    '/',
    {
      title: 'Reservorio · Reserva cita online en tus negocios favoritos',
      description:
        'Encuentra negocios locales, consulta disponibilidad y reserva tu cita online en minutos. Gratis y sin esperas.',
    },
  ],
  [
    '/privacy',
    {
      title: 'Política de privacidad · Reservorio',
      description:
        'Conoce qué datos personales trata Reservorio para gestionar tus reservas, pagos y notificaciones, y cómo ejercer tus derechos.',
    },
  ],
]);

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  updateForRoute(url: string): void {
    const route = this.normalizePath(url);
    const page = PUBLIC_PAGES.get(route);

    if (!page) {
      this.title.setTitle('Reservorio · Reservas online');
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
      this.clearSocialMetadata();
      this.removeStructuredData();
      this.removeCanonical();
      return;
    }

    const canonicalUrl = new URL(route, CANONICAL_ORIGIN).href;
    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: page.description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow, max-image-preview:large' });
    this.setSocialMetadata({ title: page.title, description: page.description, canonicalUrl });
    this.setCanonical(canonicalUrl);
    this.removeStructuredData();
  }

  updateForBusiness(business: Business, pageType: 'business' | 'store' = 'business'): void {
    const name = this.cleanText(business.name) || 'Negocio local';
    const category = this.cleanText(business.category);
    const location = this.cleanText(business.location);
    const pageLabel = pageType === 'store' ? 'Tienda online' : 'Reserva online';
    const route = `/${pageType === 'store' ? 'store' : 'business'}/${encodeURIComponent(business.id)}`;
    const canonicalUrl = new URL(route, CANONICAL_ORIGIN).href;
    const title = this.truncate(`${name} · ${pageLabel} | Reservorio`, 60);
    const description = this.truncate(
      `Conoce ${name}${category ? `, ${category.toLowerCase()}` : ''}${location ? ` en ${location}` : ''}. Consulta sus servicios, horarios y reserva online con Reservorio.`,
      158
    );
    const image = this.absoluteUrl(business.storeCoverImage || business.logo) || DEFAULT_SOCIAL_IMAGE;

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow, max-image-preview:large' });
    this.setSocialMetadata({ title, description, canonicalUrl, image, imageAlt: `Imagen de ${name}` });
    this.setCanonical(canonicalUrl);
    this.setStructuredData(business, canonicalUrl, name, description, image, pageType);
  }

  private normalizePath(url: string): string {
    const pathname = url.split(/[?#]/, 1)[0] || '/';
    const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    return normalized.toLowerCase();
  }

  private setCanonical(href: string): void {
    let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.append(canonical);
    }
    canonical.href = href;
  }

  private removeCanonical(): void {
    this.document.head.querySelector('link[rel="canonical"]')?.remove();
  }

  private setSocialMetadata(input: {
    title: string;
    description: string;
    canonicalUrl: string;
    image?: string;
    imageAlt?: string;
  }): void {
    const image = input.image || DEFAULT_SOCIAL_IMAGE;
    this.meta.updateTag({ property: 'og:title', content: input.title });
    this.meta.updateTag({ property: 'og:description', content: input.description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: input.canonicalUrl });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:image:alt', content: input.imageAlt || 'Reservorio' });
    this.meta.updateTag({ property: 'og:site_name', content: 'Reservorio' });
    this.meta.updateTag({ property: 'og:locale', content: 'es_CO' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: input.title });
    this.meta.updateTag({ name: 'twitter:description', content: input.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }

  private clearSocialMetadata(): void {
    for (const selector of [
      "property='og:title'",
      "property='og:description'",
      "property='og:type'",
      "property='og:url'",
      "property='og:image'",
      "property='og:image:alt'",
      "property='og:site_name'",
      "property='og:locale'",
      "name='twitter:card'",
      "name='twitter:title'",
      "name='twitter:description'",
      "name='twitter:image'",
    ]) {
      this.meta.removeTag(selector);
    }
  }

  private setStructuredData(
    business: Business,
    canonicalUrl: string,
    name: string,
    description: string,
    image: string,
    pageType: 'business' | 'store'
  ): void {
    const sameAs = [business.facebook, business.instagram, business.tiktok, business.linkedin]
      .map(value => this.absoluteUrl(value))
      .filter((value): value is string => Boolean(value));
    const businessSchema: Record<string, unknown> = {
      '@type': 'LocalBusiness',
      '@id': `${canonicalUrl}#business`,
      name,
      description,
      url: canonicalUrl,
      image,
      ...(business.logo ? { logo: this.absoluteUrl(business.logo) } : {}),
      ...(business.phone ? { telephone: business.phone } : {}),
      ...(business.location
        ? { address: { '@type': 'PostalAddress', addressLocality: this.cleanText(business.location) } }
        : {}),
      ...(business.rating > 0 && business.reviews > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: business.rating,
              reviewCount: business.reviews,
            },
          }
        : {}),
      ...(sameAs.length ? { sameAs } : {}),
      ...(pageType === 'store' ? { additionalType: 'https://schema.org/Store' } : {}),
    };
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        businessSchema,
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Reservorio', item: CANONICAL_ORIGIN + '/' },
            { '@type': 'ListItem', position: 2, name, item: canonicalUrl },
          ],
        },
      ],
    };
    let script = this.document.head.querySelector<HTMLScriptElement>('#dynamic-seo-jsonld');
    if (!script) {
      script = this.document.createElement('script');
      script.id = 'dynamic-seo-jsonld';
      script.type = 'application/ld+json';
      this.document.head.append(script);
    }
    script.textContent = JSON.stringify(jsonLd);
  }

  private removeStructuredData(): void {
    this.document.head.querySelector('#dynamic-seo-jsonld')?.remove();
  }

  private cleanText(value: string | undefined): string {
    return String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private truncate(value: string, maxLength: number): string {
    const clean = this.cleanText(value);
    if (clean.length <= maxLength) return clean;
    return `${clean.slice(0, maxLength - 1).trimEnd()}…`;
  }

  private absoluteUrl(value: string | undefined): string | null {
    const clean = this.cleanText(value);
    if (!clean) return null;
    try {
      return new URL(clean, CANONICAL_ORIGIN).href;
    } catch {
      return null;
    }
  }
}
