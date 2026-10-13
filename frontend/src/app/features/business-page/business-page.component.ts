import { ChangeDetectionStrategy, Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Business } from '../../core/models/business.model';
import { CatalogProduct } from '../../core/models/catalog.model';
import { createWhatsAppOrderUrl } from '../storefront/storefront-order';
import { BusinessProductCardComponent } from './business-product-card.component';
import { BusinessServiceCardComponent, BusinessServiceItem } from './business-service-card.component';
import { ReservationManagerComponent } from './reservation-manager.component';

@Component({
  selector: 'app-business-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BusinessProductCardComponent,
    BusinessServiceCardComponent,
    ReservationManagerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="business-page">
      @if (loading()) {
        <div class="page-loading" role="status">
          <span class="material-icons-round">storefront</span>
          <p>Preparando la página del negocio…</p>
        </div>
      } @else if (errorMessage()) {
        <section class="page-error" role="alert">
          <span class="material-icons-round">store_mall_directory</span>
          <h1>No encontramos este negocio</h1>
          <p>{{ errorMessage() }}</p>
          <a routerLink="/">Volver al inicio</a>
        </section>
      } @else if (business(); as store) {
        <header class="business-nav" [class.is-scrolled]="headerScrolled()">
          <a class="back-link" routerLink="/" aria-label="Volver al inicio"
            ><span class="material-icons-round">arrow_back</span><span>Inicio</span></a
          >
          <a class="business-brand" [class.is-visible]="headerScrolled()" [attr.aria-hidden]="!headerScrolled()" href="#inicio" (click)="scrollToSection($event, 'inicio')">
            @if (store.logo) {
              <img [src]="store.logo" [alt]="'Logo de ' + store.name" />
            }
            <span>{{ store.name }}</span>
          </a>
          <a class="nav-contact" href="#contacto" (click)="scrollToSection($event, 'contacto')">Contacto</a>
        </header>

        <section
          id="inicio"
          class="business-hero"
          [style.background]="store.gradient || 'linear-gradient(135deg,#12335d,#2476b9)'"
        >
          @if (store.storeCoverImage) {
            <img class="hero-image" [src]="store.storeCoverImage" [alt]="'Espacio de ' + store.name" />
          }
          <div class="hero-shade"></div>
          <div class="hero-content">
            <div class="hero-labels">
              <span class="category-label">{{ store.category }}</span>
              @if (store.verified) {
                <span class="verified-label"><span class="material-icons-round">verified</span>Negocio verificado</span>
              }
            </div>
            <h1 class="hero-title" [class.title-transferred]="headerScrolled()">{{ store.name }}</h1>
            <p class="hero-description">
              {{
                store.description || 'Conoce sus servicios, productos y encuentra el momento perfecto para visitarlo.'
              }}
            </p>
            <div class="hero-details">
              @if (store.location) {
                <span><span class="material-icons-round">location_on</span>{{ store.location }}</span>
              }
              @if (store.schedule) {
                <span><span class="material-icons-round">schedule</span>{{ store.schedule }}</span>
              }
              @if (store.rating > 0) {
                <span
                  ><span class="material-icons-round star-icon">star</span>{{ store.rating | number: '1.1-1' }}
                  <small>({{ store.reviews }} reseñas)</small></span
                >
              }
            </div>
            <div class="hero-actions">
              @if (bookingEnabled()) {
                <button type="button" class="primary-action" (click)="openBooking()">
                  <span class="material-icons-round">event_available</span>Reservar una cita
                </button>
              }
              @if (store.whatsapp && contactUrl(store.whatsapp); as url) {
                <a class="secondary-action" [href]="url" target="_blank" rel="noopener noreferrer"
                  ><span class="material-icons-round">chat</span>Hablar por WhatsApp</a
                >
              }
            </div>
          </div>
        </section>

        <div class="business-content">
          @if (services().length || bookingEnabled()) {
            <section id="servicios" class="content-section services-section">
              <div class="section-heading">
                <div>
                  <p class="section-eyebrow">LO QUE HACEMOS</p>
                  <h2>Servicios</h2>
                </div>
                @if (bookingEnabled()) {
                  <span class="section-note"
                    ><span class="material-icons-round">event_available</span>Reserva online</span
                  >
                }
              </div>
              @if (services().length) {
                <div class="service-list">
                  @for (service of services(); track service.name) {
                    <app-business-service-card
                      [service]="service"
                      [contactUrl]="store.whatsapp ? contactUrl(store.whatsapp, service.name) : null"
                      (schedule)="openBooking($event)"
                    />
                  }
                </div>
              } @else {
                <div class="section-empty">
                  <span class="material-icons-round">design_services</span>
                  <p>Consulta los servicios y horarios disponibles al reservar.</p>
                </div>
              }
            </section>
          }

          <section id="productos" class="content-section products-section">
            <div class="section-heading">
              <div>
                <p class="section-eyebrow">HECHO O ELEGIDO CON CUIDADO</p>
                <h2>Productos</h2>
              </div>
              <span class="section-count"
                >{{ products().length }} {{ products().length === 1 ? 'producto' : 'productos' }}</span
              >
            </div>
            @if (products().length) {
              <div class="product-grid">
                @for (product of products(); track product.id) {
                  <app-business-product-card
                    [product]="product"
                    [contactUrl]="store.whatsapp ? contactUrl(store.whatsapp, product.name) : null"
                  />
                }
              </div>
            } @else {
              <div class="section-empty">
                <span class="material-icons-round">inventory_2</span>
                <p>Este negocio aún no ha publicado productos.</p>
              </div>
            }
          </section>

          <section class="about-section">
            <div class="about-mark" aria-hidden="true">R<span>·</span></div>
            <div>
              <p class="section-eyebrow">CERCA DE TI</p>
              <h2>Un negocio local,<br />una atención personal.</h2>
            </div>
            <p>
              {{ store.description || store.name + ' te espera para ofrecerte una experiencia cercana y sencilla.' }}
            </p>
          </section>

          <section id="contacto" class="contact-section" aria-labelledby="contact-heading">
            <div>
              <p class="section-eyebrow">CONTACTO · PLANEA TU VISITA</p>
              <h2 id="contact-heading">Estamos aquí para ayudarte.</h2>
              <p class="contact-intro">Encuentra cómo llegar, consulta los horarios o comunícate directamente con el negocio.</p>
            </div>
            <div class="contact-details">
              @if (store.location) {
                <p><span class="material-icons-round">location_on</span>{{ store.location }}</p>
              }
              @if (store.schedule) {
                <p><span class="material-icons-round">schedule</span>{{ store.schedule }}</p>
              }
              @if (store.phone) {
                <a [href]="'tel:' + store.phone"><span class="material-icons-round">call</span>{{ store.phone }}</a>
              }
              @if (store.whatsapp && contactUrl(store.whatsapp); as url) {
                <a [href]="url" target="_blank" rel="noopener noreferrer"
                  ><span class="material-icons-round">chat</span>Escribir por WhatsApp</a
                >
              }
            </div>
          </section>
        </div>

        <footer class="business-footer">
          <a routerLink="/">Reservorio</a><span>·</span><span>{{ store.name }}</span
          ><a routerLink="/privacy">Privacidad</a>
        </footer>
        @if (reservationOpen()) {
          <app-reservation-manager [businessId]="store.id" [serviceName]="selectedService()" (close)="closeBooking()" />
        }
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        --business-surface: #ffffff;
        --business-canvas: #f6f8fc;
        --business-ink: #172033;
        --business-muted: #667085;
        --business-border: #e7ebf0;
        --business-accent-soft: #edf6ff;
        color: var(--business-ink);
        font-family: 'Inter', system-ui, sans-serif;
      }
      :host-context(.dark) {
        --business-surface: #1a222d;
        --business-canvas: #111821;
        --business-ink: #e6e9ee;
        --business-muted: #b8bfc9;
        --business-border: #34404e;
        --business-accent-soft: #1b2c42;
      }
      .business-page {
        min-height: 100vh;
        background: var(--business-canvas);
        color: var(--business-ink);
      }
      .business-nav {
        position: sticky;
        z-index: 20;
        top: 0;
        display: grid;
        width: 100%;
        height: 4.5rem;
        margin-bottom: -4.5rem;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        padding: 0 clamp(1rem, 5vw, 4rem);
        color: white;
        border-bottom: 1px solid transparent;
        background: transparent;
        box-shadow: none;
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        transition: color 300ms ease, background 300ms ease, border-color 300ms ease, box-shadow 300ms ease, backdrop-filter 300ms ease;
      }
      .business-nav.is-scrolled {
        color: var(--business-ink);
        border-bottom-color: var(--business-border);
        background: color-mix(in srgb, var(--business-surface) 92%, transparent);
        box-shadow: 0 8px 28px rgba(20, 35, 55, 0.08);
        backdrop-filter: blur(20px) saturate(160%);
        -webkit-backdrop-filter: blur(20px) saturate(160%);
      }
      .business-nav a {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        color: inherit;
        font-size: 0.78rem;
        font-weight: 600;
        text-decoration: none;
      }
      .back-link .material-icons-round,
      .nav-contact .material-icons-round {
        font-size: 1rem;
      }
      .business-brand {
        justify-self: center;
        gap: 0.6rem !important;
        font-size: 0.9rem !important;
        max-width: min(48vw, 24rem);
        overflow: hidden;
        opacity: 0;
        pointer-events: none;
        text-overflow: ellipsis;
        transform: translateY(-0.55rem) scale(0.96);
        transition: opacity 300ms ease, transform 380ms cubic-bezier(0.2, 0.75, 0.25, 1);
        white-space: nowrap;
      }
      .business-brand.is-visible {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0) scale(1);
      }
      .business-brand img {
        width: 2.25rem;
        height: 2.25rem;
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 0.75rem;
        background: white;
        object-fit: cover;
      }
      .nav-contact {
        justify-self: end;
      }
      .business-nav.is-scrolled .business-brand img {
        border-color: var(--business-border);
      }
      .business-hero {
        position: relative;
        display: flex;
        min-height: min(660px, 88vh);
        align-items: center;
        overflow: hidden;
        padding: 7rem max(1.25rem, calc((100vw - 1160px) / 2)) 5rem;
        color: white;
        background-position: center;
        background-size: cover;
        isolation: isolate;
        border-radius: 0 0 2rem 2rem;
      }
      .hero-image,
      .hero-shade {
        position: absolute;
        z-index: -1;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      .hero-image {
        object-fit: cover;
      }
      .hero-shade {
        background:
          linear-gradient(90deg, rgba(6, 18, 35, 0.9) 0%, rgba(6, 18, 35, 0.72) 48%, rgba(6, 18, 35, 0.2) 100%),
          linear-gradient(0deg, rgba(6, 18, 35, 0.22), transparent 40%);
      }
      .hero-content {
        width: min(100%, 720px);
        animation: arrive 0.7s cubic-bezier(0.2, 0.7, 0.25, 1) both;
      }
      .hero-labels,
      .hero-details,
      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.65rem;
      }
      .category-label,
      .verified-label {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.4rem 0.65rem;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 999px;
        color: white;
        background: rgba(255, 255, 255, 0.12);
        font-size: 0.68rem;
        font-weight: 700;
        backdrop-filter: blur(8px);
      }
      .verified-label .material-icons-round {
        font-size: 0.9rem;
      }
      .hero-title {
        max-width: 14ch;
        margin: 1.2rem 0 0.7rem;
        font: 800 clamp(2.5rem, 7vw, 5.2rem)/0.98 'Manrope', 'Inter', system-ui, sans-serif;
        letter-spacing: -0.04em;
        transform-origin: left center;
        transition: opacity 320ms ease, transform 420ms cubic-bezier(0.2, 0.75, 0.25, 1);
      }
      .hero-title.title-transferred {
        opacity: 0.16;
        transform: translateY(-0.8rem) scale(0.97);
      }
      .hero-description {
        max-width: 570px;
        margin: 0;
        color: rgba(255, 255, 255, 0.82);
        font-size: clamp(0.92rem, 1.5vw, 1.08rem);
        line-height: 1.7;
      }
      .hero-details {
        margin-top: 1.2rem;
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.75rem;
        gap: 0.55rem 1.1rem;
      }
      .hero-details > span {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }
      .hero-details .material-icons-round {
        font-size: 1rem;
      }
      .hero-details small {
        color: rgba(255, 255, 255, 0.68);
      }
      .star-icon {
        color: #ffd46b;
      }
      .hero-actions {
        margin-top: 1.5rem;
      }
      .primary-action,
      .secondary-action {
        display: inline-flex;
        min-height: 2.9rem;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.7rem 1rem;
        border: 1px solid transparent;
        border-radius: 0.85rem;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
        transition:
          transform 0.2s,
          background 0.2s;
      }
      .primary-action {
        color: white;
        background: var(--color-primary, #005bbf);
      }
      .primary-action:hover {
        transform: translateY(-2px);
        background: #0871d2;
      }
      .secondary-action {
        border-color: rgba(255, 255, 255, 0.36);
        color: white;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(8px);
      }
      .secondary-action:hover {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.2);
      }
      .primary-action .material-icons-round,
      .secondary-action .material-icons-round {
        font-size: 1.1rem;
      }
      .business-content {
        width: min(100% - 2rem, 1120px);
        margin: 0 auto;
      }
      .content-section {
        padding: clamp(3.25rem, 7vw, 5.5rem) 0;
        scroll-margin-top: 5.5rem;
      }
      .section-heading {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.4rem;
      }
      .section-eyebrow {
        margin: 0 0 0.45rem;
        color: var(--color-primary, #005bbf);
        font-size: 0.63rem;
        font-weight: 800;
        letter-spacing: 0.16em;
      }
      .section-heading h2,
      .about-section h2,
      .contact-section h2 {
        margin: 0;
        color: var(--business-ink);
        font: 750 clamp(1.6rem, 3vw, 2.4rem)/1.08 'Manrope', 'Inter', system-ui, sans-serif;
        letter-spacing: -0.025em;
      }
      .section-note,
      .section-count {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        color: var(--business-muted);
        font-size: 0.72rem;
      }
      .section-note .material-icons-round {
        color: #28704a;
        font-size: 1rem;
      }
      .service-list {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.75rem;
      }
      .product-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
      }
      .section-empty {
        display: flex;
        min-height: 9rem;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        border: 1px dashed var(--business-border);
        border-radius: 1rem;
        color: var(--business-muted);
        text-align: center;
      }
      .section-empty .material-icons-round {
        color: #8ba3be;
        font-size: 1.6rem;
      }
      .section-empty p {
        margin: 0;
        padding: 0 1rem;
        font-size: 0.8rem;
      }
      .about-section {
        display: grid;
        grid-template-columns: auto 1fr 1fr;
        align-items: center;
        gap: clamp(1.25rem, 4vw, 3rem);
        padding: 3rem 0;
        border-top: 1px solid var(--business-border);
        border-bottom: 1px solid var(--business-border);
      }
      .about-mark {
        display: grid;
        width: 4rem;
        height: 4rem;
        place-content: center;
        border: 1px solid #cbd9e8;
        border-radius: 1.3rem;
        color: #315e91;
        font: 800 1.6rem 'Manrope', 'Inter', system-ui, sans-serif;
        text-align: center;
        transform: rotate(-5deg);
      }
      .about-mark span {
        color: #d18b54;
      }
      .about-section h2 {
        font-size: clamp(1.4rem, 2.8vw, 2.1rem);
      }
      .about-section > p {
        margin: 0;
        color: var(--business-muted);
        font-size: 0.88rem;
        line-height: 1.8;
      }
      .contact-section {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.85fr);
        align-items: center;
        gap: clamp(2rem, 6vw, 5rem);
        margin: 2rem 0 4rem;
        padding: clamp(2rem, 5vw, 3.5rem);
        scroll-margin-top: 5.5rem;
        border: 1px solid var(--business-border);
        border-radius: 1.5rem;
        background: var(--business-surface);
        box-shadow: 0 18px 48px rgba(20, 35, 55, 0.06);
      }
      .contact-intro {
        max-width: 28rem;
        margin: 0.9rem 0 0;
        color: var(--business-muted);
        font-size: 0.85rem;
        line-height: 1.7;
      }
      .contact-details {
        display: grid;
        gap: 0.7rem;
        color: var(--business-muted);
        font-size: 0.8rem;
      }
      .contact-details > p,
      .contact-details > a {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
        color: inherit;
        text-decoration: none;
      }
      .contact-details .material-icons-round {
        color: #3978ad;
        font-size: 1rem;
      }
      .business-footer {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        padding: 1.25rem;
        border-top: 1px solid var(--business-border);
        color: var(--business-muted);
        font-size: 0.7rem;
      }
      .business-footer a {
        color: #315e91;
        font-weight: 700;
        text-decoration: none;
      }
      .business-footer a:last-child {
        margin-left: 1rem;
      }
      .page-loading,
      .page-error {
        display: flex;
        min-height: 100vh;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: var(--business-muted);
        text-align: center;
      }
      .page-loading .material-icons-round,
      .page-error > .material-icons-round {
        color: #4c86b7;
        font-size: 2.2rem;
      }
      .page-error h1 {
        color: var(--business-ink);
        font-size: 2rem;
      }
      .page-error p {
        max-width: 34rem;
      }
      .page-error a {
        margin-top: 1rem;
        color: var(--color-primary);
        font-weight: 700;
      }
      @keyframes arrive {
        from {
          opacity: 0;
          transform: translateY(16px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @media (max-width: 760px) {
        .business-hero {
          min-height: 600px;
          min-height: min(650px, 88svh);
        }
        .service-list {
          grid-template-columns: minmax(0, 1fr);
        }
        .product-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .about-section {
          grid-template-columns: auto 1fr;
        }
        .about-section > p {
          grid-column: 2;
        }
        .contact-section {
          grid-template-columns: minmax(0, 1fr);
        }
      }
      @media (max-width: 480px) {
        .business-nav {
          grid-template-columns: auto 1fr auto;
          padding: 0 1rem;
        }
        .business-brand {
          font-size: 0.78rem !important;
        }
        .back-link span:last-child,
        .nav-contact {
          font-size: 0 !important;
        }
        .back-link .material-icons-round,
        .nav-contact .material-icons-round {
          font-size: 1.2rem !important;
        }
        .business-hero {
          min-height: 620px;
          padding-top: 6.5rem;
        }
        .hero-shade {
          background:
            linear-gradient(90deg, rgba(6, 18, 35, 0.84), rgba(6, 18, 35, 0.4)),
            linear-gradient(0deg, rgba(6, 18, 35, 0.38), transparent 65%);
        }
        .product-grid {
          gap: 0.65rem;
        }
        .about-section {
          grid-template-columns: 1fr;
        }
        .about-section > p {
          grid-column: auto;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .hero-content,
        .business-nav,
        .business-brand,
        .hero-title {
          transition-duration: 0.01ms;
        }
        .primary-action,
        .secondary-action {
          transition-duration: 0.01ms;
        }
      }
    `,
  ],
})
export class BusinessPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly business = signal<Business | null>(null);
  readonly products = signal<CatalogProduct[]>([]);
  readonly services = signal<BusinessServiceItem[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly reservationOpen = signal(false);
  readonly selectedService = signal('');
  readonly headerScrolled = signal(false);
  readonly bookingEnabled = computed(() => this.business()?.businessType === 'appointment');

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window === 'undefined') return;
    const scrolled = window.scrollY > 96;
    if (this.headerScrolled() !== scrolled) this.headerScrolled.set(scrolled);
  }

  scrollToSection(event: MouseEvent, sectionId: string): void {
    event.preventDefault();
    if (typeof document === 'undefined') return;
    const target = document.getElementById(sectionId);
    if (!target) return;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  ngOnInit(): void {
    const businessId = this.route.snapshot.paramMap.get('businessId');
    if (!businessId) {
      this.errorMessage.set('Falta el identificador del negocio en la dirección.');
      this.loading.set(false);
      return;
    }

    forkJoin({
      business: this.api.getPublicStorefront(businessId),
      products: this.api.getCatalogProducts(businessId).pipe(catchError(() => of([]))),
      services: this.api.getBusinessServices(businessId).pipe(catchError(() => of([]))),
    }).subscribe({
      next: result => {
        this.business.set(result.business);
        this.products.set(result.products.filter(product => product.active));
        this.services.set(
          result.services.map(name => ({
            name,
            requiresBooking: result.business.businessType === 'appointment',
          }))
        );
        this.loading.set(false);
      },
      error: error => {
        this.errorMessage.set(error?.message ?? 'No pudimos cargar la información de este negocio.');
        this.loading.set(false);
      },
    });
  }

  contactUrl(phone: string, subject?: string): string | null {
    const message = subject
      ? `Hola, quisiera más información sobre ${subject} en ${this.business()?.name ?? 'este negocio'}.`
      : `Hola, quisiera más información sobre ${this.business()?.name ?? 'este negocio'}.`;
    return createWhatsAppOrderUrl(phone, message);
  }

  openBooking(serviceName = ''): void {
    if (!this.bookingEnabled()) return;
    this.selectedService.set(serviceName);
    this.reservationOpen.set(true);
  }

  closeBooking(): void {
    this.reservationOpen.set(false);
    this.selectedService.set('');
  }
}
