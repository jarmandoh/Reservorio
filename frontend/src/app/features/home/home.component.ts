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
import { StatsBarComponent, StatsBarItem } from '../../shared/components/stats-bar/stats-bar.component';

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
      <header
        class="relative overflow-hidden text-white bg-gradient-to-br from-brand-strong via-primary to-primary-container"
      >
        <!-- Decorative circles -->
        <div
          class="hero-decoration hero-decoration-top absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10"
        ></div>
        <div
          class="hero-decoration hero-decoration-bottom absolute -bottom-10 -left-16 w-48 h-48 rounded-full opacity-10"
        ></div>

        <div class="relative max-w-4xl mx-auto px-6 pt-12 pb-10">
          <!-- Top nav -->
          <div class="flex items-center justify-between mb-10">
            <div class="g-nav-logo flex items-center gap-2">
              <div class="hero-logo-mark w-8 h-8 rounded-lg flex items-center justify-center">
                <span class="material-icons-round text-base">calendar_month</span>
              </div>
              <span class="font-display font-bold text-lg tracking-tight">Resérvame</span>
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
                        (click)="goOwnerLogin()"
                      >
                        <span class="material-icons-round text-base text-primary">store</span>
                        <span class="flex flex-col items-start">
                          <span class="font-semibold">Negocio</span>
                          <span class="text-xs text-on-surface-variant">Panel de negocio</span>
                        </span>
                      </button>
                      <div class="mx-2 border-t border-outline-variant/20"></div>
                      <button
                        type="button"
                        class="flex items-center gap-3 w-full px-4 py-3 text-sm text-left text-on-surface hover:bg-surface-low transition"
                        (click)="goCreateAccount()"
                      >
                        <span class="material-icons-round text-base text-primary">person_add</span>
                        <span class="flex flex-col items-start">
                          <span class="font-semibold">Crear cuenta</span>
                          <span class="text-xs text-on-surface-variant">Usuario o negocio</span>
                        </span>
                      </button>
                    </div>
                  }
                }
              </div>
            </div>
          </div>

          <!-- Hero text -->
          <div class="flex flex-col gap-3 mb-8">
            <h1 class="g-title font-display font-bold text-[2rem] sm:text-[2.75rem] leading-tight">
              Encuentra negocios y servicios,<br />
              <span class="text-primary-fixed-dim">cerca de ti...</span>
            </h1>
            <p class="g-sub text-base opacity-80 max-w-md">
              Reservas y agendamientos en segundos.
            </p>
          </div>

          <!-- <div class="mt-6">
            <app-stats-bar [stats]="heroStats()" />
          </div> -->
        </div>
      </header>

      <div class="sticky top-0 z-10 bg-surface/95 backdrop-blur-md border-b border-outline-variant/20">
        <div class="max-w-4xl mx-auto px-4 py-3">
          <app-category-filters
            [categories]="categories"
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
        <a routerLink="/privacy" class="btn-tertiary btn-sm mt-3 inline-flex items-center gap-1.5">
          <span class="material-icons-round text-base">shield</span>
          Política de privacidad
        </a>
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

      .hero-decoration {
        background: #fff;
      }

      .hero-logo-mark {
        background: rgba(255, 255, 255, 0.2);
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

  /** Intervalo de refresco en ms (30 seg) */
  private readonly POLL_MS = 30_000;

  // ── Cuenta: dropdown y nombre cuando está logueado ────────────────────
  readonly showAccountMenu = signal(false);
  private readonly accountMenuTriggerRef = viewChild<ElementRef<HTMLButtonElement>>('accountMenuTrigger');
  readonly customerName = signal<string | null>(null);
  readonly ownerName = signal<string | null>(null);
  readonly businessName = signal<string | null>(null);
  readonly accountDisplayName = computed(() => this.customerName() || this.ownerName() || this.businessName());

  businesses: Business[] = [];
  categories = ['Todos', ...DEFAULT_CATEGORIES];
  searchQuery = '';
  filters: HomeFilters = { category: 'Todos', location: '' };
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
      const matchCat = this.filters.category === 'Todos' || negocio.category === this.filters.category;
      const matchLocation =
        !this.filters.location || negocio.location.toLowerCase().includes(this.filters.location.toLowerCase());
      const matchQ =
        !q ||
        negocio.name.toLowerCase().includes(q) ||
        negocio.description.toLowerCase().includes(q) ||
        negocio.location.toLowerCase().includes(q) ||
        negocio.tags.some(t => t.toLowerCase().includes(q)) ||
        negocio.category.toLowerCase().includes(q) ||
        (negocio.profession ?? '').toLowerCase().includes(q);
      return matchCat && matchLocation && matchQ;
    });
  }

  displayedBusinesses(): Business[] {
    return this.filtered().sort((left, right) => this.openPriority(left) - this.openPriority(right));
  }

  totalAvailable(): number {
    return this.displayedBusinesses().reduce((sum, b) => sum + b.available, 0);
  }

  heroStats(): StatsBarItem[] {
    const visibleBusinesses = this.displayedBusinesses();
    const businessCount = this.totalBusinessCount() || visibleBusinesses.length;
    const highlyRated = visibleBusinesses.filter(business => business.rating >= 4).length;

    return [
      {
        icon: 'store',
        value: `${businessCount}`,
        label: 'negocios disponibles',
        detail: 'Encuentra una opción cerca de ti',
      },
      {
        icon: 'schedule',
        value: `${this.totalAvailable()}`,
        label: 'horarios libres',
        detail: 'Consulta disponibilidad en tiempo real',
      },
      {
        icon: 'star',
        value: `${highlyRated}`,
        label: 'negocios 4+ estrellas',
        detail: 'Calificados por la comunidad',
      },
      {
        icon: 'event_available',
        value: '24/7',
        label: 'reservas online',
        detail: 'Agenda cuando quieras',
      },
    ];
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

  onFiltersChange(filters: HomeFilters): void {
    const categoryChanged = filters.category !== this.filters.category;
    const locationChanged = filters.location !== this.filters.location;
    this.filters = filters;
    if (categoryChanged) {
      if (this.filterReloadTimer) clearTimeout(this.filterReloadTimer);
      this.loadBusinesses();
    } else if (locationChanged) {
      if (this.filterReloadTimer) clearTimeout(this.filterReloadTimer);
      this.filterReloadTimer = setTimeout(() => this.loadBusinesses(), 350);
    }
  }

  clearAllFilters(): void {
    this.searchQuery = '';
    this.filters = { category: 'Todos', location: '' };
    if (this.searchReloadTimer) clearTimeout(this.searchReloadTimer);
    if (this.filterReloadTimer) clearTimeout(this.filterReloadTimer);
    this.loadBusinesses();
  }

  hasActiveFilters(): boolean {
    return this.filters.category !== 'Todos' || !!this.filters.location;
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
      .getCategories()
      .pipe(catchError(() => of([])))
      .subscribe(list => {
        const names = list.map(category => category.name.trim()).filter(Boolean);
        this.categories = ['Todos', ...new Set(names.length ? names : DEFAULT_CATEGORIES)];
        if (this.filters.category !== 'Todos' && !this.categories.includes(this.filters.category)) {
          this.filters = { ...this.filters, category: 'Todos' };
        }
      });
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
      category: this.filters.category !== 'Todos' ? this.filters.category : undefined,
      location: this.filters.location || undefined,
      page,
      pageSize: this.PAGE_SIZE,
    };
    this.sub = this.api
      .getBusinessesPage(query)
      .pipe(
        catchError(() => {
          if (!reset) this.loadMoreError.set(true);
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
    this.searchQuery = '';
    this.filters = { category: 'Todos', location: '' };
    this.loadBusinesses();
  }

  goToBooking(negocio: Business): void {
    this.router.navigate(['/booking', negocio.id]);
  }

  goCustomer(): void {
    this.router.navigate(['/customer/history']);
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
    this.router.navigate(['/customer/login']);
  }

  goOwnerLogin(): void {
    this.showAccountMenu.set(false);
    this.router.navigate(['/owner/login']);
  }

  goCreateAccount(): void {
    this.showAccountMenu.set(false);
    this.router.navigate(['/account/create']);
  }

  goAccount(): void {
    // Redirige al panel correspondiente según la sesión activa
    if (this.customerName()) {
      this.router.navigate(['/customer/history']);
    } else if (this.ownerName()) {
      this.router.navigate(['/owner/dashboard']);
    } else if (this.businessName()) {
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k?.startsWith('negocio_jwt_')) {
            const bid = k.replace('negocio_jwt_', '');
            if (this.auth.isBusinessUnlocked(bid)) {
              this.router.navigate(['/business', bid, 'admin']);
              return;
            }
          }
        }
      } catch {
        // ignore
      }
      this.router.navigate(['/owner/dashboard']);
    }
  }
}
