import {
  Component, OnInit, OnDestroy, AfterViewInit, signal, computed, inject, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Business } from '../../core/models/reservation.model';
import gsap from 'gsap';

// Fallback estático mientras no haya datos en la API
const FALLBACK_BUSINESSES: Business[] = [
  {
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
  },
];

const CATEGORIES = ['Todos', 'Salud & Bienestar', 'Belleza', 'Fitness', 'Educación', 'Restaurantes'];

@Component({
    selector: 'app-home',
    imports: [CommonModule, FormsModule],
    template: `
  <div class="min-h-screen bg-surface flex flex-col">

    <!-- ══ HERO ═══════════════════════════════════════════════════════ -->
    <header class="relative overflow-hidden text-white"
            style="background:linear-gradient(145deg,#003e8a 0%,#005bbf 50%,#1a73e8 100%)">

      <!-- Decorative circles -->
      <div class="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10"
           style="background:white"></div>
      <div class="absolute -bottom-10 -left-16 w-48 h-48 rounded-full opacity-10"
           style="background:white"></div>

      <div class="relative max-w-4xl mx-auto px-6 pt-12 pb-10">

        <!-- Top nav -->
        <div class="flex items-center justify-between mb-10">
          <div class="g-nav-logo flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                 style="background:rgba(255,255,255,.2)">
              <span class="material-icons-round text-base">calendar_month</span>
            </div>
            <span class="font-display font-bold text-lg tracking-tight">Resérvame</span>
          </div>
          <button class="g-nav-btn flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition"
                  style="background:rgba(255,255,255,.15);backdrop-filter:blur(8px)"
                  (click)="goAdmin()">
            <span class="material-icons-round text-base">admin_panel_settings</span>
            <span class="hidden sm:inline">Admin</span>
          </button>
        </div>

        <!-- Hero text -->
        <div class="flex flex-col gap-3 mb-8">
          <h1 class="g-title font-display font-bold text-[2rem] sm:text-[2.75rem] leading-tight">
            Reserva en segundos,<br>
            <span style="color:#adc7ff">vive sin esperas</span>
          </h1>
          <p class="g-sub text-base opacity-80 max-w-md">
            Encuentra negocios cerca de ti y agenda tu cita al instante.
          </p>
        </div>

        <!-- Search bar -->
        <div class="g-search relative max-w-lg">
          <span class="material-icons-round absolute left-4 top-1/2 -translate-y-1/2
                       text-primary text-[1.25rem] pointer-events-none">search</span>
          <input
            type="search"
            class="w-full bg-white text-on-surface rounded-2xl pl-12 pr-5 py-4
                   text-base shadow-soft placeholder:text-outline focus:outline-none
                   focus:ring-2 focus:ring-primary/40 transition"
            placeholder="Busca por nombre, servicio o categoría…"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch()"
          />
        </div>

        <!-- Stats bar -->
        <div class="flex items-center gap-6 mt-6 text-sm opacity-75">
          <div class="g-stat flex items-center gap-1.5">
            <span class="material-icons-round text-base">store</span>
            <span>{{ displayedBusinesses().length }} negocio{{ displayedBusinesses().length !== 1 ? 's' : '' }}</span>
          </div>
          <div class="g-stat flex items-center gap-1.5">
            <span class="material-icons-round text-base">schedule</span>
            <span>{{ totalAvailable() }} franjas libres</span>
          </div>
          <div class="g-stat flex items-center gap-1.5">
            <span class="material-icons-round text-base">bolt</span>
            <span>Confirmación inmediata</span>
          </div>
        </div>

      </div>
    </header>

    <!-- ══ CATEGORY CHIPS ══════════════════════════════════════════ -->
    <div class="bg-surface-lowest border-b border-outline-variant/30 sticky top-0 z-10">
      <div class="g-chips-inner max-w-4xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto hide-scrollbar">
        @for (cat of categories; track cat) {
          <button
            class="whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0"
            [style.background]="selectedCategory === cat ? '#005bbf' : ''"
            [style.color]="selectedCategory === cat ? '#fff' : ''"
            [class.bg-surface-low]="selectedCategory !== cat"
            [class.text-on-surface]="selectedCategory !== cat"
            (click)="selectCategory(cat)">
            {{ cat }}
          </button>
        }
      </div>
    </div>

    <!-- ══ CONTENT ══════════════════════════════════════════════════ -->
    <main class="flex-1 max-w-4xl mx-auto w-full px-4 py-6 flex flex-col gap-6">

      <!-- Section header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-display font-semibold text-xl">
            @if (searchQuery) {
              Resultados para "{{ searchQuery }}"
            } @else if (selectedCategory !== 'Todos') {
              {{ selectedCategory }}
            } @else {
              Negocios disponibles
            }
          </h2>
          <p class="text-sm text-on-surface-variant mt-0.5">
            @if (filtered().length) {
              {{ filtered().length }} resultado{{ filtered().length !== 1 ? 's' : '' }}
            } @else if (searchQuery || selectedCategory !== 'Todos') {
              No se encontraron resultados exactos. Se muestran todos los negocios disponibles.
            } @else {
              {{ displayedBusinesses().length }} resultado{{ displayedBusinesses().length !== 1 ? 's' : '' }}
            }
          </p>
        </div>
        <button class="btn-tertiary btn-sm gap-1.5" (click)="resetFilters()">
          <span class="material-icons-round text-base">tune</span>
          Filtros
        </button>
      </div>

      <!-- Loading skeleton -->
      @if (loading()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          @for (i of [1,2]; track i) {
            <div class="skeleton rounded-2xl h-52"></div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && !businesses.length) {
        <div class="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div class="w-20 h-20 rounded-full bg-surface-low flex items-center justify-center">
            <span class="material-icons-round text-4xl text-outline">search_off</span>
          </div>
          <h3 class="font-display font-semibold text-xl">Sin resultados</h3>
          <p class="text-sm text-on-surface-variant max-w-xs">
            No se encontraron negocios disponibles. Intenta más tarde.
          </p>
        </div>
      }

      <!-- Business cards -->
      @if (!loading()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          @for (biz of displayedBusinesses(); track biz.id) {
            <div role="button" tabindex="0"
              class="g-card text-left bg-surface-lowest rounded-2xl shadow-card overflow-hidden
                     transition-all hover:-translate-y-0.5 hover:shadow-soft active:scale-[.98]
                     focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              (click)="goToBooking(biz)"
              (keydown.enter)="goToBooking(biz)"
              (keydown.space)="goToBooking(biz)">

              <!-- Card header gradient -->
              <div class="relative h-28 flex items-end p-5" [style.background]="biz.gradient">
                <div class="absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center"
                     style="background:rgba(255,255,255,.2)">
                  <span class="material-icons-round text-white text-xl">{{ biz.icon }}</span>
                </div>
                <!-- Available badge -->
                <div class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                     style="background:rgba(255,255,255,.2);backdrop-filter:blur(8px);color:#fff">
                  <span class="w-1.5 h-1.5 rounded-full"
                        [style.background]="biz.available > 0 ? '#4ade80' : '#f87171'"></span>
                  @if (biz.available > 0) {
                    {{ biz.available }} disponible{{ biz.available !== 1 ? 's' : '' }}
                  } @else {
                    Ver disponibilidad
                  }
                </div>
              </div>

              <!-- Card body -->
              <div class="p-5 flex flex-col gap-3">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h3 class="font-display font-bold text-lg leading-tight">{{ biz.name }}</h3>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <span class="material-icons-round text-outline text-sm">location_on</span>
                      <span class="text-xs text-on-surface-variant">{{ biz.location }}</span>
                    </div>
                  </div>
                  <!-- Rating -->
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <span class="material-icons-round text-[#f59e0b] text-sm">star</span>
                    <span class="text-sm font-semibold">{{ biz.rating }}</span>
                    <span class="text-xs text-outline">({{ biz.reviews }})</span>
                  </div>
                </div>

                <p class="text-sm text-on-surface-variant leading-relaxed line-clamp-2">
                  {{ biz.description }}
                </p>

                <!-- Tags -->
                <div class="flex flex-wrap gap-1.5">
                  @for (tag of biz.tags; track tag) {
                    <span class="service-tag">{{ tag }}</span>
                  }
                </div>

                <!-- CTA -->
                <div class="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                  <span class="text-xs text-outline">{{ biz.category }}</span>
                  <div class="flex flex-wrap items-center gap-2">
                    <button type="button"
                            class="btn-secondary btn-sm"
                            title="Ir al dashboard de negocio"
                            (click)="$event.stopPropagation(); goBusinessLogin(biz)">
                      Panel negocio
                    </button>
                    <div class="flex items-center gap-1 text-primary text-sm font-semibold">
                      Reservar ahora
                      <span class="material-icons-round text-base">arrow_forward</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Bottom padding for mobile -->
      <div class="h-4"></div>
    </main>

    <!-- ══ FOOTER ══════════════════════════════════════════════════ -->
    <footer class="bg-surface-lowest border-t border-outline-variant/30 py-6 px-6 text-center">
      <p class="text-xs text-outline">
        Resérvame © 2026 · Tu agenda, siempre a mano
      </p>
    </footer>

  </div>
  `,
    styles: [`
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  `]
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  private api    = inject(ApiService);
  private router = inject(Router);
  private sub?: Subscription;
  private elRef = inject(ElementRef);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private gsapCtx?: any;

  /** Intervalo de refresco en ms (30 seg) */
  private readonly POLL_MS = 30_000;

  businesses: Business[] = [];
  categories = CATEGORIES;
  searchQuery      = '';
  selectedCategory = 'Todos';
  readonly loading    = signal(true);
  readonly bizLoading = signal(false);

  filtered(): Business[] {
    const q = this.searchQuery.toLowerCase();
    return this.businesses.filter(biz => {
      const matchCat = this.selectedCategory === 'Todos' || biz.category === this.selectedCategory;
      const matchQ   = !q ||
        biz.name.toLowerCase().includes(q) ||
        biz.description.toLowerCase().includes(q) ||
        biz.tags.some(t => t.toLowerCase().includes(q)) ||
        biz.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }

  noSearchResults(): boolean {
    const hasActiveFilter = !!this.searchQuery || this.selectedCategory !== 'Todos';
    return hasActiveFilter && !this.filtered().length;
  }

  displayedBusinesses(): Business[] {
    return this.noSearchResults() ? this.businesses : this.filtered();
  }

  totalAvailable(): number {
    return this.displayedBusinesses().reduce((sum, b) => sum + b.available, 0);
  }

  ngOnInit(): void {
    this.sub = this.api.getBusinesses().pipe(
      
      catchError(() => of(FALLBACK_BUSINESSES))
    ).subscribe(list => {
      console.log('Fetched businesses:', list)
      this.businesses = list.length ? list : [...FALLBACK_BUSINESSES];
      
      this.loading.set(false);
      setTimeout(() => this.animateCards(), 50);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.gsapCtx?.revert();
  }

  ngAfterViewInit(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = this.elRef.nativeElement as HTMLElement;
    this.gsapCtx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo('.g-nav-logo',
            { x: -20, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.5 })
        .fromTo('.g-nav-btn',
            { x: 20, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.5 }, '<')
        .fromTo('.g-title',
            { y: 48, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.65 }, '-=0.2')
        .fromTo('.g-sub',
            { y: 24, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5 }, '-=0.35')
        .fromTo('.g-search',
            { y: 20, scale: 0.97, opacity: 0 },
            { y: 0, scale: 1, opacity: 1, duration: 0.5 }, '-=0.3')
        .fromTo('.g-stat',
            { y: 12, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.4, stagger: 0.08 }, '-=0.2')
        .fromTo('.g-chips-inner',
            { opacity: 0, y: 8 },
            { opacity: 1, y: 0, duration: 0.4 }, '-=0.1');
    }, root);
  }

  private animateCards(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = this.elRef.nativeElement as HTMLElement;
    const cards = root.querySelectorAll('.g-card');
    if (!cards.length) return;
    gsap.fromTo(cards,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, stagger: 0.12, ease: 'power3.out' });
  }

  onSearch(): void { /* reactivo con computed */ }

  selectCategory(cat: string): void {
    this.selectedCategory = cat;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = 'Todos';
  }

  goToBooking(biz: Business): void {
    this.router.navigate(['/booking', biz.id]);
  }

  goBusinessLogin(biz: Business): void {
    this.router.navigate(['/business', biz.id, 'login']);
  }

  goAdmin(): void {
    this.router.navigate(['/login']);
  }
}
