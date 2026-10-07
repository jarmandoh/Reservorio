import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  ElementRef,
  ChangeDetectionStrategy,
  HostListener,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Business } from '../../core/models/businesses.model';

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

const CATEGORIES = ['Todos', 'Salud & Bienestar', 'Belleza', 'Fitness', 'Educación', 'Restaurantes'];

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-surface flex flex-col">
      <!-- ══ HERO ═══════════════════════════════════════════════════════ -->
      <header
        class="relative overflow-hidden text-white bg-gradient-to-br from-brand-strong via-primary to-primary-container"
      >
        <!-- Decorative circles -->
        <div class="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10" style="background:white"></div>
        <div class="absolute -bottom-10 -left-16 w-48 h-48 rounded-full opacity-10" style="background:white"></div>

        <div class="relative max-w-4xl mx-auto px-6 pt-12 pb-10">
          <!-- Top nav -->
          <div class="flex items-center justify-between mb-10">
            <div class="g-nav-logo flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:rgba(255,255,255,.2)">
                <span class="material-icons-round text-base">calendar_month</span>
              </div>
              <span class="font-display font-bold text-lg tracking-tight">Resérvame</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="relative">
                @if (accountDisplayName()) {
                  <button
                    class="g-nav-btn flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition max-w-[180px]"
                    style="background:rgba(255,255,255,.15);backdrop-filter:blur(8px)"
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
                    style="background:rgba(255,255,255,.15);backdrop-filter:blur(8px)"
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
              Reserva en segundos,<br />
              <span class="text-primary-fixed-dim">vive sin esperas</span>
            </h1>
            <p class="g-sub text-base opacity-80 max-w-md">
              Encuentra negocios cerca de ti y agenda tu cita al instante.
            </p>
          </div>

          <!-- Search bar -->
          <div class="g-search grid gap-3 sm:grid-cols-[1fr_220px] max-w-3xl">
            <div class="relative">
              <span
                class="material-icons-round absolute left-4 top-1/2 -translate-y-1/2
                         text-primary text-[1.25rem] pointer-events-none"
                >search</span
              >
              <label class="sr-only" for="business-search">Busca por nombre, servicio o categoría</label>
              <input
                id="business-search"
                type="search"
                class="w-full bg-white text-on-surface rounded-2xl pl-12 pr-5 py-4
                     text-base shadow-soft placeholder:text-outline focus:outline-none
                     focus:ring-2 focus:ring-primary/40 transition"
                placeholder="Busca por nombre, servicio o categoría…"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearch()"
              />
            </div>
            <div class="relative">
              <span
                class="material-icons-round absolute left-4 top-1/2 -translate-y-1/2
                         text-primary text-[1.25rem] pointer-events-none"
                >place</span
              >
              <label class="sr-only" for="business-location">Filtra por ciudad o zona</label>
              <input
                id="business-location"
                type="text"
                class="w-full bg-white text-on-surface rounded-2xl pl-12 pr-5 py-4
                     text-base shadow-soft placeholder:text-outline focus:outline-none
                     focus:ring-2 focus:ring-primary/40 transition"
                placeholder="Filtra por ciudad o zona…"
                [(ngModel)]="locationQuery"
                (ngModelChange)="onSearch()"
              />
            </div>
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
        <div class="g-chips-inner max-w-4xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
          @for (cat of categories; track cat) {
            <button
              class="whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0"
              [style.background]="selectedCategory === cat ? '#005bbf' : ''"
              [style.color]="selectedCategory === cat ? '#fff' : ''"
              [class.bg-surface-low]="selectedCategory !== cat"
              [class.text-on-surface]="selectedCategory !== cat"
              [attr.aria-pressed]="selectedCategory === cat"
              (click)="selectCategory(cat)"
            >
              {{ cat }}
            </button>
          }
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
            @for (i of [1, 2]; track i) {
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
            @for (negocio of displayedBusinesses(); track negocio.id) {
              <a
                [routerLink]="['/booking', negocio.id]"
                class="g-card text-left bg-surface-lowest rounded-2xl shadow-card overflow-hidden
                     transition-all hover:-translate-y-0.5 hover:shadow-soft active:scale-[.98]
                     focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <!-- Card header gradient -->
                <div class="relative h-28 flex items-end p-5" [style.background]="negocio.gradient">
                  <div class="absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center bg-white/20">
                    <span class="material-icons-round text-white text-xl">{{ negocio.icon }}</span>
                  </div>
                  <!-- Available badge -->
                  <div
                    class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      [style.background]="negocio.available > 0 ? '#4ade80' : '#f87171'"
                    ></span>
                    @if (negocio.available > 0) {
                      {{ negocio.available }} disponible{{ negocio.available !== 1 ? 's' : '' }}
                    } @else {
                      Ver disponibilidad
                    }
                  </div>
                </div>

                <!-- Card body -->
                <div class="p-5 flex flex-col gap-3">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <h3 class="font-display font-bold text-lg leading-tight">{{ negocio.name }}</h3>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="material-icons-round text-outline text-sm">location_on</span>
                        <span class="text-xs text-on-surface-variant">{{ negocio.location }}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 flex-shrink-0">
                      <span class="material-icons-round text-amber-500 text-sm">star</span>
                      <span class="text-sm font-semibold">{{ negocio.rating }}</span>
                      <span class="text-xs text-outline">({{ negocio.reviews }})</span>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center gap-2">
                    @if (negocio.businessType === 'onsite_service') {
                      <span
                        class="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700"
                      >
                        <span class="material-icons-round text-[12px]">home_repair_service</span>
                        {{ negocio.profession }} · Servicio presencial
                      </span>
                    }
                    @if (negocio.verified) {
                      <span
                        class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700"
                      >
                        <span class="material-icons-round text-[12px]">verified</span>
                        Verificado
                      </span>
                    }
                    <span
                      class="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700"
                    >
                      <span class="material-icons-round text-[12px]">security</span>
                      Pago seguro
                    </span>
                    @if (negocio.cancellationPolicy) {
                      <span
                        class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700"
                      >
                        <span class="material-icons-round text-[12px]">info</span>
                        Cancelación clara
                      </span>
                    }
                  </div>

                  <p class="text-sm text-on-surface-variant leading-relaxed line-clamp-2">
                    {{ negocio.description }}
                  </p>

                  <!-- Tags -->
                  <div class="flex flex-wrap gap-1.5">
                    @for (tag of negocio.tags; track tag) {
                      <span class="service-tag">{{ tag }}</span>
                    }
                  </div>

                  <!-- CTA -->
                  <div class="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <span class="text-xs text-outline">
                      {{ negocio.businessType === 'onsite_service' ? negocio.profession : negocio.category }}
                    </span>
                    <div class="flex flex-wrap items-center gap-2">
                      <div class="flex items-center gap-1 text-primary text-sm font-semibold">
                        Reservar ahora
                        <span class="material-icons-round text-base">arrow_forward</span>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            }
          </div>
        }

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
export class HomeComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private sub?: Subscription;

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
  categories = CATEGORIES;
  searchQuery = '';
  locationQuery = '';
  selectedCategory = 'Todos';
  readonly loading = signal(true);
  readonly negocioLoading = signal(false);

  filtered(): Business[] {
    const q = this.searchQuery.toLowerCase();
    return this.businesses.filter(negocio => {
      const matchCat = this.selectedCategory === 'Todos' || negocio.category === this.selectedCategory;
      const matchQ =
        !q ||
        negocio.name.toLowerCase().includes(q) ||
        negocio.description.toLowerCase().includes(q) ||
        negocio.tags.some(t => t.toLowerCase().includes(q)) ||
        negocio.category.toLowerCase().includes(q) ||
        (negocio.profession ?? '').toLowerCase().includes(q);
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
    this.loadBusinesses();
    this.loadAccountName();
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
    this.negocioLoading.set(true);
    const query = {
      q: this.searchQuery,
      category: this.selectedCategory !== 'Todos' ? this.selectedCategory : undefined,
      location: this.locationQuery,
    };

    this.sub = this.api
      .getBusinesses(query)
      .pipe(catchError(() => of(FALLBACK_BUSINESSES)))
      .subscribe(list => {
        this.businesses = list.length ? list : [...FALLBACK_BUSINESSES];
        this.negocioLoading.set(false);
        this.loading.set(false);
        // Si hay sesión de negocio con nombre genérico, actualiza con el nombre real
        if (this.businessName() === 'Negocio') {
          try {
            for (let i = 0; i < sessionStorage.length; i++) {
              const k = sessionStorage.key(i);
              if (k?.startsWith('negocio_jwt_')) {
                const bid = k.replace('negocio_jwt_', '');
                if (this.auth.isBusinessUnlocked(bid)) {
                  const found = this.businesses.find(b => b.id === bid);
                  if (found) this.businessName.set(found.name);
                  break;
                }
              }
            }
          } catch {
            // ignore
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onSearch(): void {
    /* reactivo con computed */
  }

  selectCategory(cat: string): void {
    this.selectedCategory = cat;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = 'Todos';
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
