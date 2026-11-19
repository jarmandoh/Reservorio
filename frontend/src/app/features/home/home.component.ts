import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  signal,
  computed,
  inject,
  ElementRef,
  NgZone,
  ChangeDetectionStrategy,
  HostListener,
  ViewChild,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Business } from '../../core/models/business.model';
import { BusinessPage } from '../../core/services/api.service';
import { CategoryFiltersComponent, HomeFilters } from './category-filters/category-filters.component';
import { BusinessCardComponent } from './business-card/business-card.component';
import { Categoria } from '../../core/models/categorias.model';

// Fallback estático mientras no haya datos en la API
const FALLBACK_BUSINESSES: Business[] = [
  /* {
    id: 'spaperros',
    name: 'Spaperros',
    category: 'Salud & Bienestar',
    description: 'Agenda tu cita con facilidad. Selecciona la franja horaria que mejor se adapte a tu día.',
    location: 'Bogotá, CO',
    rating: 4.8,
    reviews: 124,
    tags: ['Consultas', 'Bienestar', 'Online'],
    available: 0,
    total: 0,
    routePath: '/booking/spaperros',
    gradient: 'linear-gradient(135deg,#005bbf,#1a73e8)',
    icon: 'event_available',
    active: true,
  }, */
];

const DEFAULT_CATEGORIES = ['Salud & Bienestar', 'Belleza', 'Fitness', 'Educación', 'Restaurantes'];

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, CategoryFiltersComponent, BusinessCardComponent],
  template: `
    <div class="min-h-screen bg-surface flex flex-col">
      <!-- ══ HERO ═══════════════════════════════════════════════════════ -->
      <header class="home-hero relative overflow-hidden text-white">
        <div class="hero-grid-pattern" aria-hidden="true"></div>
        <div class="relative max-w-6xl mx-auto px-5 pt-5 pb-12 sm:px-8 sm:pt-6 sm:pb-16">
          <nav class="flex items-center justify-between mb-12 sm:mb-14" aria-label="Navegación principal">
            <div class="g-nav-logo flex items-center gap-2">
              <div class="hero-logo-mark w-8 h-8 rounded-lg flex items-center justify-center">
                <span class="material-icons-round text-base">
                  <img src="assets/icons/icon-192.png" alt="Resérvame" class="w-full h-full object-contain" />
                </span>
              </div>
              <span class="font-display font-bold text-lg tracking-tight">Miveci</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="relative">
                @if (accountDisplayName()) {
                  <button
                    class="g-nav-btn flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition max-w-[180px]"
                    (click)="goAccount()"
                    [attr.aria-label]="'Cuenta de ' + accountDisplayName()"
                    title="{{ accountDisplayName() }}"
                  >
                    <span class="material-icons-round text-base">account_circle</span>
                    <span class="hidden sm:inline truncate">{{ accountDisplayName() }}</span>
                  </button>
                } @else {
                  <button
                    class="g-nav-btn flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition"
                    (click)="toggleAccountMenu($event)"
                    [attr.aria-expanded]="showAccountMenu()"
                    aria-label="Mi cuenta"
                    #accountMenuTrigger
                  >
                    <span class="material-icons-round text-base">account_circle</span>
                    <span class="hidden sm:inline">Mi cuenta</span>
                    <span class="material-icons-round text-sm">{{
                      showAccountMenu() ? 'expand_less' : 'expand_more'
                    }}</span>
                  </button>
                  @if (showAccountMenu()) {
                    <div
                      #accountMenu
                      class="account-menu absolute right-0 mt-2 w-60 rounded-2xl bg-white shadow-soft border border-outline-variant/30 py-1 z-20 overflow-hidden"
                    >
                      <button
                        type="button"
                        class="flex items-center gap-3 w-full px-4 py-3 text-sm text-left text-on-surface hover:bg-surface-low transition"
                        (click)="goCustomerLogin()"
                      >
                        <span class="material-icons-round text-base text-primary">person</span>
                        <span class="flex flex-col items-start">
                          <span class="font-semibold">Usuario</span>
                          <span class="text-xs text-on-surface-variant">Historial y reservas</span>
                        </span>
                      </button>
                      <div class="mx-2 border-t border-outline-variant/20"></div>
                      <button
                        type="button"
                        class="flex items-center gap-3 w-full px-4 py-3 text-sm text-left text-on-surface hover:bg-surface-low transition"
                        (click)="goOwnerAuth()"
                      >
                        <span class="material-icons-round text-base text-primary">store</span>
                        <span class="flex flex-col items-start">
                          <span class="font-semibold">Negocio</span>
                          <span class="text-xs text-on-surface-variant">Panel de negocio</span>
                        </span>
                      </button>
                    </div>
                  }
                }
              </div>
            </div>
          </nav>

          <div class="hero-layout">
            <div class="hero-copy">
              <p class="hero-eyebrow">
                <span class="hero-eyebrow-dot" aria-hidden="true"></span>
                Negocios locales, a tu manera
              </p>
              <h1 class="hero-title font-display">
                Descubre negocios.
                <span>Reserva tu momento.</span>
              </h1>
              <p class="hero-description">
                Explora negocios, conoce sus servicios y reserva un horario desde un mismo lugar, sin complicaciones.
              </p>

              <div class="hero-actions">
                <a class="hero-primary-action" href="#explorar">
                  Explorar negocios
                  <span class="material-icons-round" aria-hidden="true">arrow_downward</span>
                </a>
                <a class="hero-business-action" routerLink="/propietario/auth">
                  ¿Tienes un negocio?
                  <span>Empieza aquí</span>
                  <span class="material-icons-round" aria-hidden="true">arrow_forward</span>
                </a>
              </div>

              <div class="hero-categories" aria-label="Explora por categoría">
                @for (category of categories().slice(1, 4); track category) {
                  <a class="hero-category-chip" href="#explorar" (click)="selectCategory(category)">
                    {{ category }}
                    <span class="material-icons-round" aria-hidden="true">north_east</span>
                  </a>
                }
              </div>
            </div>

            <div class="hero-art" aria-hidden="true">
              <div class="hero-art-orbit"></div>
              <div class="hero-floating-label">
                <span class="material-icons-round">category</span>
                Elige por categoría
              </div>
              <div class="hero-booking-card">
                <div class="hero-card-heading">
                  <div>
                    <span class="hero-card-overline">RESERVAR, MÁS FÁCIL</span>
                    <p class="hero-card-title font-display">Tu tiempo, bien agendado.</p>
                  </div>
                  <span class="hero-calendar-icon material-icons-round">event_available</span>
                </div>
                <div class="hero-booking-steps">
                  <div class="hero-booking-step">
                    <span class="hero-step-number">01</span>
                    <span class="material-icons-round hero-step-icon">travel_explore</span>
                    <span class="hero-step-copy"><strong>Descubre</strong><small>Negocios y servicios</small></span>
                  </div>
                  <div class="hero-booking-step">
                    <span class="hero-step-number">02</span>
                    <span class="material-icons-round hero-step-icon">design_services</span>
                    <span class="hero-step-copy"><strong>Elige</strong><small>Lo que necesitas</small></span>
                  </div>
                  <div class="hero-booking-step">
                    <span class="hero-step-number">03</span>
                    <span class="material-icons-round hero-step-icon">calendar_month</span>
                    <span class="hero-step-copy"><strong>Reserva</strong><small>Cuando te convenga</small></span>
                    <span class="material-icons-round hero-step-check">check_circle</span>
                  </div>
                </div>
                <div class="hero-card-footer">
                  <span class="material-icons-round">touch_app</span>
                  Todo desde un solo lugar
                </div>
              </div>
              <div class="hero-floating-icon">
                <span class="material-icons-round">calendar_today</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div
        id="explorar"
        class="hero-discovery-anchor sticky top-0 z-10 bg-surface/95 backdrop-blur-md border-b border-outline-variant/20"
      >
        <div class="max-w-4xl mx-auto px-4 py-3">
          <app-category-filters
            [categories]="categories()"
            [filters]="filters"
            [searchQuery]="searchQuery"
            (searchQueryChange)="onSearchQueryChange($event)"
            (filtersChange)="onFiltersChange($event)"
            (clearAll)="clearAllFilters()"
          />
        </div>
      </div>

      <!-- ══ CONTENT ══════════════════════════════════════════════════ -->
      <div class="flex-1 max-w-4xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        <!-- Section header -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-display font-semibold text-xl">
              @if (searchQuery) {
                Resultados para "{{ searchQuery }}"
              } @else if (filters.category !== 'Todos') {
                {{ filters.category }}
              } @else {
                Negocios disponibles
              }
            </h2>
            <p class="text-sm text-on-surface-variant mt-0.5">
              @if (displayedBusinesses().length) {
                {{ displayedBusinesses().length }} negocio{{ displayedBusinesses().length !== 1 ? 's' : '' }} visibles
              } @else if (searchQuery || hasActiveFilters()) {
                No hay resultados con esta combinación. Prueba cambiar o limpiar los filtros.
              } @else {
                {{ displayedBusinesses().length }} resultado{{ displayedBusinesses().length !== 1 ? 's' : '' }}
              }
            </p>
          </div>
          <button type="button" class="btn-tertiary btn-sm gap-1.5" (click)="resetFilters()">
            <span class="material-icons-round text-base">tune</span>
            Filtros
          </button>
        </div>

        <!-- Loading skeleton -->
        @if (loading()) {
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            @for (i of [1, 2]; track i) {
              <div class="skeleton rounded-2xl h-52"></div>
            }
          </div>
        }

        <!-- Empty state -->
        @if (!loading() && !displayedBusinesses().length && !hasMore()) {
          <div class="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div class="w-20 h-20 rounded-full bg-surface-low flex items-center justify-center">
              <span class="material-icons-round text-4xl text-outline">search_off</span>
            </div>
            <h3 class="font-display font-semibold text-xl">Sin resultados</h3>
            <p class="text-sm text-on-surface-variant max-w-xs">
              @if (searchQuery || hasActiveFilters()) {
                Prueba con otra ubicación o cambia los filtros aplicados.
              } @else {
                No se encontraron negocios disponibles. Intenta más tarde.
              }
            </p>
          </div>
        }
        @if (!loading() && !displayedBusinesses().length && hasMore()) {
          <p class="text-center text-sm text-on-surface-variant" role="status">
            Buscando más negocios que coincidan con tus filtros…
          </p>
        }

        <!-- Business cards -->
        @if (!loading() && displayedBusinesses().length) {
          <div class="business-grid">
            @for (negocio of displayedBusinesses(); track negocio.id; let index = $index) {
              <app-business-card [business]="negocio" [animationIndex]="index % 12" />
            }
          </div>
        }

        @if (!loading() && loadingMore()) {
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2" role="status" aria-label="Cargando más negocios">
            <div class="skeleton h-56 rounded-2xl"></div>
            <div class="hidden h-56 rounded-2xl skeleton sm:block"></div>
          </div>
        }
        @if (loadMoreError()) {
          <div class="flex items-center justify-center gap-3 py-3" role="alert">
            <span class="text-sm text-on-surface-variant">No se pudieron cargar más negocios.</span>
            <button class="btn-tertiary btn-sm" type="button" (click)="retryLoadingMore()">Reintentar</button>
          </div>
        }
        @if (!loading() && !hasMore() && displayedBusinesses().length) {
          <p class="end-of-results" role="status">
            Has llegado al final · {{ displayedBusinesses().length }} negocios visibles
          </p>
        }
        <div #loadMoreSentinel class="load-more-sentinel" aria-hidden="true"></div>

        <!-- Bottom padding for mobile -->
        <div class="h-4"></div>
      </div>

      <!-- ══ FOOTER ══════════════════════════════════════════════════ -->
      <footer class="bg-surface-lowest border-t border-outline-variant/30 py-6 px-6 text-center">
        <p class="text-xs text-outline">Resérvame © 2026 · Tu agenda, siempre a mano</p>
        <div class="mt-3 flex flex-wrap items-center justify-center gap-3">
          <a routerLink="/terms" class="btn-tertiary btn-sm inline-flex items-center gap-1.5">
            <span class="material-icons-round text-base">gavel</span>
            Términos y condiciones
          </a>
          <a routerLink="/privacy" class="btn-tertiary btn-sm inline-flex items-center gap-1.5">
            <span class="material-icons-round text-base">shield</span>
            Política de tratamiento de datos
          </a>
        </div>
      </footer>
    </div>
  `,
  styles: [
    `
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .home-hero {
        isolation: isolate;
        background:
          radial-gradient(ellipse at 82% 55%, rgba(84, 177, 255, 0.28), transparent 33%),
          radial-gradient(ellipse at 10% 110%, rgba(255, 204, 102, 0.12), transparent 35%),
          linear-gradient(118deg, #062746 0%, #074b7e 57%, #12629c 100%);
      }

      .hero-grid-pattern {
        position: absolute;
        inset: 0;
        z-index: -1;
        pointer-events: none;
        opacity: 0.18;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.13) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.13) 1px, transparent 1px);
        background-size: 56px 56px;
        mask-image: linear-gradient(90deg, transparent, #000 38%, #000);
      }

      .hero-logo-mark {
        background: rgba(255, 255, 255, 0.2);
      }

      .hero-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.08fr) minmax(18rem, 0.92fr);
        align-items: center;
        gap: clamp(2rem, 6vw, 5rem);
      }

      .hero-copy {
        max-width: 43rem;
      }

      .hero-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.65rem;
        margin: 0 0 1.35rem;
        padding: 0.55rem 0.85rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 999px;
        color: #e4f2ff;
        background: rgba(255, 255, 255, 0.08);
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.07em;
        text-transform: uppercase;
      }

      .hero-eyebrow-dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background: #ffda7c;
        box-shadow: 0 0 0 4px rgba(255, 218, 124, 0.16);
      }

      .hero-title {
        margin: 0;
        color: #fff;
        font-size: clamp(2.6rem, 4.1vw, 3.85rem);
        font-weight: 800;
        letter-spacing: -0.055em;
        line-height: 1.01;
      }

      .hero-title span {
        display: block;
        margin-top: 0.12em;
        color: #ffda7c;
      }

      .hero-description {
        max-width: 34rem;
        margin: 1.45rem 0 0;
        color: rgba(239, 247, 255, 0.82);
        font-size: clamp(1rem, 1.3vw, 1.125rem);
        line-height: 1.75;
      }

      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 1.1rem 1.5rem;
        margin-top: 1.8rem;
      }

      .hero-primary-action,
      .hero-business-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.65rem;
        border-radius: 999px;
        text-decoration: none;
        transition:
          transform 160ms ease,
          background-color 160ms ease,
          box-shadow 160ms ease;
      }

      .hero-primary-action {
        min-height: 3.25rem;
        padding: 0.8rem 1.25rem;
        color: #092b4b;
        background: #ffda7c;
        box-shadow: 0 8px 24px rgba(3, 25, 45, 0.22);
        font-size: 0.95rem;
        font-weight: 800;
      }

      .hero-primary-action:hover {
        transform: translateY(-2px);
        background: #ffe6a5;
        box-shadow: 0 12px 28px rgba(3, 25, 45, 0.28);
      }

      .hero-primary-action .material-icons-round {
        font-size: 1.1rem;
      }

      .hero-business-action {
        justify-content: flex-start;
        gap: 0.38rem;
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.85rem;
      }

      .hero-business-action span:nth-child(2) {
        color: #fff;
        font-weight: 700;
      }

      .hero-business-action .material-icons-round {
        margin-left: 0.1rem;
        font-size: 1rem;
        transition: transform 160ms ease;
      }

      .hero-business-action:hover .material-icons-round {
        transform: translateX(3px);
      }

      .hero-primary-action:focus-visible,
      .hero-business-action:focus-visible,
      .hero-category-chip:focus-visible {
        outline: 3px solid #fff;
        outline-offset: 4px;
      }

      .hero-categories {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        margin-top: 2rem;
      }

      .hero-category-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        min-height: 2.35rem;
        padding: 0.45rem 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 999px;
        color: #eef7ff;
        background: rgba(255, 255, 255, 0.08);
        font-size: 0.78rem;
        font-weight: 600;
        text-decoration: none;
        transition:
          background-color 160ms ease,
          border-color 160ms ease,
          transform 160ms ease;
      }

      .hero-category-chip:hover {
        transform: translateY(-1px);
        border-color: rgba(255, 218, 124, 0.65);
        background: rgba(255, 255, 255, 0.15);
      }

      .hero-category-chip .material-icons-round {
        color: #ffda7c;
        font-size: 0.9rem;
      }

      .hero-art {
        position: relative;
        display: grid;
        min-height: 22rem;
        place-items: center;
      }

      .hero-art-orbit {
        position: absolute;
        width: min(28rem, 110%);
        aspect-ratio: 1;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 50%;
        background: radial-gradient(circle, rgba(130, 200, 255, 0.14), transparent 67%);
      }

      .hero-booking-card {
        position: relative;
        z-index: 1;
        width: min(100%, 25rem);
        padding: 1.55rem;
        border: 1px solid rgba(255, 255, 255, 0.72);
        border-radius: 1.65rem;
        color: #16344f;
        background: #fff;
        box-shadow: 0 28px 80px rgba(0, 23, 45, 0.28);
        transform: rotate(1.2deg);
      }

      .hero-card-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding-bottom: 1.15rem;
      }

      .hero-card-overline {
        color: #638099;
        font-size: 0.63rem;
        font-weight: 800;
        letter-spacing: 0.13em;
      }

      .hero-card-title {
        max-width: 14rem;
        margin: 0.35rem 0 0;
        color: #102b46;
        font-size: 1.35rem;
        font-weight: 800;
        letter-spacing: -0.04em;
        line-height: 1.15;
      }

      .hero-calendar-icon {
        display: grid;
        width: 2.75rem;
        height: 2.75rem;
        flex: 0 0 auto;
        place-items: center;
        border-radius: 0.9rem;
        color: #0c5d96;
        background: #e9f5ff;
        font-size: 1.45rem;
      }

      .hero-booking-steps {
        padding: 0.1rem 0;
        border-top: 1px solid #e8eef3;
      }

      .hero-booking-step {
        display: grid;
        grid-template-columns: 2rem 2.25rem minmax(0, 1fr) 1.2rem;
        align-items: center;
        gap: 0.65rem;
        min-height: 4.15rem;
        border-bottom: 1px solid #e8eef3;
      }

      .hero-step-number {
        color: #8ca0b0;
        font-size: 0.69rem;
        font-weight: 800;
        letter-spacing: 0.04em;
      }

      .hero-step-icon {
        display: grid;
        width: 2.15rem;
        height: 2.15rem;
        place-items: center;
        border-radius: 0.7rem;
        color: #0b5b91;
        background: #edf6fc;
        font-size: 1.15rem;
      }

      .hero-step-copy {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .hero-step-copy strong {
        color: #17364f;
        font-size: 0.8rem;
      }

      .hero-step-copy small {
        color: #72889a;
        font-size: 0.7rem;
      }

      .hero-step-check {
        color: #21836c;
        font-size: 1.15rem;
      }

      .hero-card-footer {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 1rem;
        padding: 0.7rem 0.8rem;
        border-radius: 0.8rem;
        color: #245c79;
        background: #eff8fc;
        font-size: 0.72rem;
        font-weight: 700;
      }

      .hero-card-footer .material-icons-round {
        color: #0e6b9f;
        font-size: 1rem;
      }

      .hero-floating-label,
      .hero-floating-icon {
        position: absolute;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        box-shadow: 0 12px 32px rgba(0, 26, 48, 0.2);
      }

      .hero-floating-label {
        top: 5%;
        right: -0.4rem;
        gap: 0.45rem;
        padding: 0.7rem 0.95rem;
        border: 1px solid rgba(255, 255, 255, 0.8);
        border-radius: 999px;
        color: #143550;
        background: #fff;
        font-size: 0.75rem;
        font-weight: 800;
        transform: rotate(3deg);
      }

      .hero-floating-label .material-icons-round {
        color: #0c70a8;
        font-size: 1rem;
      }

      .hero-floating-icon {
        bottom: 5%;
        left: 0;
        width: 3.3rem;
        height: 3.3rem;
        justify-content: center;
        border: 4px solid rgba(255, 255, 255, 0.4);
        border-radius: 1.1rem;
        color: #173752;
        background: #ffda7c;
        transform: rotate(-8deg);
      }

      .hero-floating-icon .material-icons-round {
        font-size: 1.45rem;
      }

      .hero-discovery-anchor {
        scroll-margin-top: 5rem;
      }

      .g-nav-btn {
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(8px);
        transition:
          background-color 160ms ease,
          transform 160ms ease;
      }

      .g-nav-btn:hover {
        background: rgba(255, 255, 255, 0.25);
      }

      .g-nav-btn:active {
        transform: scale(0.98);
      }

      @media (max-width: 767px) {
        .hero-layout {
          grid-template-columns: minmax(0, 1fr);
          gap: 1.1rem;
        }

        .hero-art {
          min-height: 21rem;
          margin: 0 0.5rem;
        }
      }

      @media (max-width: 420px) {
        .hero-title {
          font-size: clamp(2.5rem, 12vw, 3.2rem);
        }

        .hero-actions {
          align-items: flex-start;
          flex-direction: column;
          gap: 1rem;
        }

        .hero-art {
          min-height: 20rem;
          margin: 0;
        }

        .hero-booking-card {
          padding: 1.15rem;
          border-radius: 1.35rem;
        }

        .hero-floating-label {
          top: 0;
          right: 0;
        }

        .hero-floating-icon {
          bottom: 0;
          left: 0;
        }
      }

      .business-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        align-items: stretch;
        gap: 1rem;
      }

      .load-more-sentinel {
        height: 1px;
        width: 100%;
      }

      .end-of-results {
        padding: 0.75rem 0;
        color: var(--color-outline, #64748b);
        text-align: center;
        font-size: 0.75rem;
      }

      @media (max-width: 639px) {
        .business-grid {
          grid-template-columns: minmax(0, 1fr);
        }
      }

      .account-menu {
        animation: account-menu-enter 160ms ease-out both;
      }

      @keyframes account-menu-enter {
        from {
          opacity: 0;
          transform: translateY(-0.5rem) scale(0.98);
          transform-origin: top right;
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `,
  ],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private zone = inject(NgZone);
  private sub?: Subscription;
  private searchReloadTimer?: ReturnType<typeof setTimeout>;
  private filterReloadTimer?: ReturnType<typeof setTimeout>;
  private intersectionObserver?: IntersectionObserver;
  @ViewChild('loadMoreSentinel') private loadMoreSentinel?: ElementRef<HTMLElement>;

  // ── Cuenta: dropdown y nombre cuando está logueado ────────────────────
  readonly showAccountMenu = signal(false);
  private readonly accountMenuTriggerRef = viewChild<ElementRef<HTMLButtonElement>>('accountMenuTrigger');
  readonly customerName = signal<string | null>(null);
  readonly ownerName = signal<string | null>(null);
  readonly businessName = signal<string | null>(null);
  readonly accountDisplayName = computed(() => this.customerName() || this.ownerName() || this.businessName());

  businesses: Business[] = [];
  readonly categories = signal(['Todos', ...DEFAULT_CATEGORIES]);
  private categoryTaxonomy: Categoria[] = [];
  searchQuery = '';
  filters: HomeFilters = { category: 'Todos', location: '' };
  readonly onlyVerified = signal(false);
  readonly minRating = signal(0);
  readonly businessesError = signal(false);
  sortBy: 'featured' | 'rating' | 'name' = 'featured';
  readonly loading = signal(true);
  readonly negocioLoading = signal(false);
  readonly loadingMore = signal(false);
  readonly hasMore = signal(false);
  readonly loadMoreError = signal(false);
  readonly totalBusinessCount = signal(0);
  private currentPage = 1;
  private readonly PAGE_SIZE = 12;

  filtered(): Business[] {
    const q = this.searchQuery.toLowerCase();
    return this.businesses.filter(negocio => {
      const selectedCategory = this.selectedCategoryTaxonomy();
      const selectedProfession = selectedCategory?.children?.find(
        profession => profession.id === this.filters.professionCategoryId
      );
      const matchCat =
        this.filters.category === 'Todos' ||
        (selectedProfession
          ? negocio.professionCategoryId === selectedProfession.id ||
            this.normalizeTaxonomyName(negocio.profession) === this.normalizeTaxonomyName(selectedProfession.name)
          : selectedCategory
            ? negocio.categoryId === selectedCategory.id ||
              this.normalizeTaxonomyName(negocio.category) === this.normalizeTaxonomyName(selectedCategory.name) ||
              (selectedCategory.children ?? []).some(
                profession =>
                  this.normalizeTaxonomyName(negocio.category) === this.normalizeTaxonomyName(profession.name) ||
                  this.normalizeTaxonomyName(negocio.profession) === this.normalizeTaxonomyName(profession.name)
              )
            : negocio.category === this.filters.category);
      const matchLocation =
        !this.filters.location || negocio.location.toLowerCase().includes(this.filters.location.toLowerCase());
      const matchVerified = !this.onlyVerified() || negocio.verified === true;
      const matchRating = negocio.rating >= this.minRating();
      const matchQ =
        !q ||
        negocio.name.toLowerCase().includes(q) ||
        negocio.description.toLowerCase().includes(q) ||
        negocio.location.toLowerCase().includes(q) ||
        negocio.tags.some(t => t.toLowerCase().includes(q)) ||
        negocio.category.toLowerCase().includes(q) ||
        (negocio.profession ?? '').toLowerCase().includes(q);
      return matchCat && matchLocation && matchVerified && matchRating && matchQ;
    });
  }

  displayedBusinesses(): Business[] {
    const businesses = this.filtered();
    return this.sortBy === 'featured'
      ? businesses.sort((left, right) => this.openPriority(left) - this.openPriority(right))
      : businesses;
  }

  ngOnInit(): void {
    this.loadBusinesses();
    this.loadCategories();
    this.loadAccountName();
  }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined' || !this.loadMoreSentinel) return;
    this.intersectionObserver = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          this.zone.run(() => this.loadMoreBusinesses());
        }
      },
      { rootMargin: '420px 0px', threshold: 0 }
    );
    this.intersectionObserver.observe(this.loadMoreSentinel.nativeElement);
  }

  selectCategory(category: string): void {
    if (this.filters.category === category && !this.filters.professionCategoryId) return;
    const selected = this.categoryTaxonomy.find(item => item.name === category);
    this.filters = {
      ...this.filters,
      category,
      categoryId: selected?.id,
      professionCategoryId: undefined,
    };
    this.loadBusinesses();
  }

  onFiltersChange(filters: HomeFilters): void {
    const categoryChanged = filters.category !== this.filters.category;
    const locationChanged = filters.location !== this.filters.location;
    const selected = categoryChanged ? this.categoryTaxonomy.find(item => item.name === filters.category) : undefined;
    this.filters = {
      ...filters,
      categoryId: categoryChanged ? selected?.id : (filters.categoryId ?? this.filters.categoryId),
      professionCategoryId: categoryChanged
        ? undefined
        : (filters.professionCategoryId ?? this.filters.professionCategoryId),
    };
    if (categoryChanged) {
      if (this.filterReloadTimer) clearTimeout(this.filterReloadTimer);
      this.loadBusinesses();
    } else if (locationChanged) {
      if (this.filterReloadTimer) clearTimeout(this.filterReloadTimer);
      this.filterReloadTimer = setTimeout(() => this.loadBusinesses(), 350);
    }
  }

  selectProfession(profession: Categoria | null): void {
    if (this.filters.professionCategoryId === profession?.id) return;
    this.filters = { ...this.filters, professionCategoryId: profession?.id };
    this.loadBusinesses();
  }

  selectedCategoryTaxonomy(): Categoria | undefined {
    return this.categoryTaxonomy.find(category => category.id === this.filters.categoryId);
  }

  onSearchInput(event: Event): void {
    this.onSearchQueryChange((event.target as HTMLInputElement).value);
  }

  submitSearch(event: Event): void {
    event.preventDefault();
    if (this.searchReloadTimer) clearTimeout(this.searchReloadTimer);
    this.loadBusinesses();
  }

  onLocationInput(event: Event): void {
    this.filters = { ...this.filters, location: (event.target as HTMLInputElement).value };
    if (this.filterReloadTimer) clearTimeout(this.filterReloadTimer);
    this.filterReloadTimer = setTimeout(() => this.loadBusinesses(), 350);
  }

  onMinimumRatingChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.minRating.set([0, 4, 4.5].includes(value) ? value : 0);
    this.loadBusinesses();
  }

  onVerifiedChange(event: Event): void {
    this.onlyVerified.set((event.target as HTMLInputElement).checked);
    this.loadBusinesses();
  }

  onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.sortBy = value === 'rating' || value === 'name' ? value : 'featured';
    this.loadBusinesses();
  }

  clearAllFilters(): void {
    this.searchQuery = '';
    this.filters = { category: 'Todos', location: '' };
    this.onlyVerified.set(false);
    this.minRating.set(0);
    this.sortBy = 'featured';
    if (this.searchReloadTimer) clearTimeout(this.searchReloadTimer);
    if (this.filterReloadTimer) clearTimeout(this.filterReloadTimer);
    this.loadBusinesses();
  }

  hasActiveFilters(): boolean {
    return (
      !!this.searchQuery.trim() ||
      this.filters.category !== 'Todos' ||
      !!this.filters.location ||
      this.onlyVerified() ||
      this.minRating() > 0
    );
  }

  private isOpenNow(schedule?: string): boolean | null {
    if (!schedule) return null;
    const normalized = schedule
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const hours = normalized.match(/(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})/);
    if (!hours) return null;

    const weekdays = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
    const today = weekdays[new Date().getDay()];
    const dayText = normalized.slice(0, hours.index).trim();
    const dayTokens =
      dayText.match(/\b(dom|domingo|lun|lunes|mar|martes|mie|miercoles|jue|jueves|vie|viernes|sab|sabado)\b/g) ?? [];
    let dayIsIncluded = dayTokens.some(token => token.startsWith(today));
    const range = dayText.match(/\b(dom|lun|mar|mie|jue|vie|sab)\s*(?:a|al|-)\s*(dom|lun|mar|mie|jue|vie|sab)\b/);
    if (range) {
      const start = weekdays.indexOf(range[1]);
      const end = weekdays.indexOf(range[2]);
      const current = new Date().getDay();
      dayIsIncluded = start <= end ? current >= start && current <= end : current >= start || current <= end;
    }
    if (!dayIsIncluded) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const toMinutes = (value: string) => {
      const [hour, minute] = value.split(':').map(Number);
      return hour * 60 + minute;
    };
    const opening = toMinutes(hours[1]);
    const closing = toMinutes(hours[2]);
    return closing < opening
      ? currentMinutes >= opening || currentMinutes < closing
      : currentMinutes >= opening && currentMinutes < closing;
  }

  private openPriority(business: Business): number {
    const openNow = this.isOpenNow(business.schedule);
    return openNow === true ? 0 : openNow === null ? 1 : 2;
  }

  private loadCategories(): void {
    this.api
      .getCategoryTree()
      .pipe(catchError(() => of([])))
      .subscribe(list => {
        this.categoryTaxonomy = list;
        const names = list.map(category => category.name.trim()).filter(Boolean);
        const categories = ['Todos', ...new Set(names.length ? names : DEFAULT_CATEGORIES)];
        this.categories.set(categories);
        if (this.filters.category !== 'Todos' && !categories.includes(this.filters.category)) {
          this.filters = { ...this.filters, category: 'Todos', categoryId: undefined, professionCategoryId: undefined };
        }
      });
  }

  private normalizeTaxonomyName(value?: string): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.closeAccountMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.showAccountMenu()) return;
    this.closeAccountMenu();
    this.accountMenuTriggerRef()?.nativeElement.focus();
  }

  private loadAccountName(): void {
    this.customerName.set(null);
    this.ownerName.set(null);
    this.businessName.set(null);

    if (this.auth.isCustomerUnlocked()) {
      const token = this.auth.getCustomerToken();
      if (token) {
        this.api
          .getCustomerMe(token)
          .pipe(catchError(() => of(null)))
          .subscribe(customer => {
            if (customer?.name) this.customerName.set(customer.name);
            else {
              const payload = this.auth.decodeToken(token) as { customerId?: string } | null;
              this.customerName.set(payload?.customerId ? 'Usuario' : 'Mi cuenta');
            }
          });
      }
    } else if (this.auth.isOwnerUnlocked()) {
      const token = this.auth.getOwnerToken();
      if (token) {
        this.api
          .getOwnerMe(token)
          .pipe(catchError(() => of(null)))
          .subscribe(owner => {
            if (owner?.name) this.ownerName.set(owner.name);
            else this.ownerName.set('Negocio');
          });
      }
    } else {
      // Busca token de negocio (business-admin)
      try {
        let businessId: string | null = null;
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k?.startsWith('negocio_jwt_')) {
            const bid = k.replace('negocio_jwt_', '');
            if (this.auth.isBusinessUnlocked(bid)) {
              businessId = bid;
              break;
            }
          }
        }
        if (businessId) {
          const known = this.businesses.find(b => b.id === businessId);
          if (known) this.businessName.set(known.name);
          else {
            this.businessName.set('Negocio');
            this.api
              .getBusinesses()
              .pipe(catchError(() => of([])))
              .subscribe(list => {
                const found = list.find(b => b.id === businessId);
                if (found) this.businessName.set(found.name);
              });
          }
        }
      } catch {
        // ignore
      }
    }
  }

  loadBusinesses(): void {
    if (this.searchReloadTimer) clearTimeout(this.searchReloadTimer);
    if (this.filterReloadTimer) clearTimeout(this.filterReloadTimer);
    this.sub?.unsubscribe();
    this.businesses = [];
    this.currentPage = 1;
    this.totalBusinessCount.set(0);
    this.hasMore.set(false);
    this.loadingMore.set(false);
    this.loadMoreError.set(false);
    this.businessesError.set(false);
    this.loading.set(true);
    this.negocioLoading.set(true);
    this.fetchBusinessesPage(1, true);
  }

  loadMoreBusinesses(): void {
    if (!this.hasMore() || this.loading() || this.loadingMore() || this.loadMoreError()) return;
    this.fetchBusinessesPage(this.currentPage + 1, false);
  }

  retryLoadingMore(): void {
    this.loadMoreError.set(false);
    this.loadMoreBusinesses();
  }

  private fetchBusinessesPage(page: number, reset: boolean): void {
    if (reset) this.loading.set(true);
    else this.loadingMore.set(true);

    const query = {
      q: this.searchQuery,
      category: this.filters.categoryId
        ? undefined
        : this.filters.category !== 'Todos'
          ? this.filters.category
          : undefined,
      categoryId: this.filters.categoryId,
      professionCategoryId: this.filters.professionCategoryId,
      location: this.filters.location || undefined,
      verified: this.onlyVerified() ? true : undefined,
      minRating: this.minRating() || undefined,
      sortBy: this.sortBy === 'featured' ? undefined : this.sortBy,
      page,
      pageSize: this.PAGE_SIZE,
    };
    this.sub = this.api
      .getBusinessesPage(query)
      .pipe(
        catchError(() => {
          if (reset) this.businessesError.set(true);
          else this.loadMoreError.set(true);
          const fallback = reset ? FALLBACK_BUSINESSES : [];
          return of({
            businesses: fallback,
            total: reset ? fallback.length : this.totalBusinessCount(),
            page: reset ? page : this.currentPage,
            pageSize: this.PAGE_SIZE,
          } satisfies BusinessPage);
        })
      )
      .subscribe(result => {
        const nextBusinesses = reset ? result.businesses : [...this.businesses, ...result.businesses];
        this.businesses = nextBusinesses.filter(
          (business, index, list) => list.findIndex(item => item.id === business.id) === index
        );
        this.currentPage = result.page;
        this.totalBusinessCount.set(result.total);
        this.hasMore.set(this.businesses.length < result.total);
        this.loading.set(false);
        this.loadingMore.set(false);
        this.negocioLoading.set(false);
        this.updateAccountBusinessName();
        if (this.hasMore()) requestAnimationFrame(() => this.loadMoreIfNearViewport());
      });
  }

  private loadMoreIfNearViewport(): void {
    const sentinel = this.loadMoreSentinel?.nativeElement;
    if (!sentinel || !this.hasMore() || this.loading() || this.loadingMore() || this.loadMoreError()) return;
    if (sentinel.getBoundingClientRect().top <= window.innerHeight + 420) this.loadMoreBusinesses();
  }

  private updateAccountBusinessName(): void {
    if (this.businessName() !== 'Negocio') return;
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (!key?.startsWith('negocio_jwt_')) continue;
        const businessId = key.replace('negocio_jwt_', '');
        if (!this.auth.isBusinessUnlocked(businessId)) continue;
        const found = this.businesses.find(business => business.id === businessId);
        if (found) this.businessName.set(found.name);
        break;
      }
    } catch {
      // ignore
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.intersectionObserver?.disconnect();
    if (this.searchReloadTimer) clearTimeout(this.searchReloadTimer);
    if (this.filterReloadTimer) clearTimeout(this.filterReloadTimer);
  }

  onSearch(): void {
    if (this.searchReloadTimer) clearTimeout(this.searchReloadTimer);
    this.searchReloadTimer = setTimeout(() => this.loadBusinesses(), 300);
  }

  onSearchQueryChange(query: string): void {
    this.searchQuery = query;
    this.onSearch();
  }

  resetFilters(): void {
    this.clearAllFilters();
  }

  goToBooking(negocio: Business): void {
    this.router.navigate(['/booking', negocio.id]);
  }

  goCustomer(): void {
    this.router.navigate(['/dashboard']);
  }

  // ── Dropdown Mi cuenta ──────────────────────────────────────────────

  toggleAccountMenu(event: MouseEvent): void {
    event.stopPropagation();
    if (this.showAccountMenu()) this.closeAccountMenu();
    else this.openAccountMenu();
  }

  private openAccountMenu(): void {
    this.showAccountMenu.set(true);
  }

  closeAccountMenu(): void {
    if (!this.showAccountMenu()) return;
    this.showAccountMenu.set(false);
  }

  goCustomerLogin(): void {
    this.showAccountMenu.set(false);
    this.router.navigate(['/usuario/auth']);
  }

  goOwnerAuth(): void {
    this.showAccountMenu.set(false);
    this.router.navigate(['/propietario/auth']);
  }

  goCreateAccount(): void {
    this.showAccountMenu.set(false);
    this.router.navigate(['/account/create']);
  }

  goAccount(): void {
    // Redirige al panel correspondiente según la sesión activa
    if (this.customerName()) {
      this.router.navigate(['/usuario/dashboard']);
    } else if (this.ownerName()) {
      this.router.navigate(['/propietario/dashboard']);
    } else if (this.businessName()) {
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k?.startsWith('negocio_jwt_')) {
            const bid = k.replace('negocio_jwt_', '');
            if (this.auth.isBusinessUnlocked(bid)) {
              this.router.navigate(['/negocio', bid, 'admin']);
              return;
            }
          }
        }
      } catch {
        // ignore
      }
      this.router.navigate(['/propietario/dashboard']);
    }
  }
}
