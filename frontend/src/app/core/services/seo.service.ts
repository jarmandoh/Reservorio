import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

const CANONICAL_ORIGIN = 'https://reservorio.app';
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
      this.meta.removeTag("property='og:url'");
      this.removeCanonical();
      return;
    }

    const canonicalUrl = new URL(route, CANONICAL_ORIGIN).href;
    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: page.description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow, max-image-preview:large' });
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.setCanonical(canonicalUrl);
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
}
