import { Component, DestroyRef, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { OwnerBusinessService } from '../../core/services/owner-business.service';
import { ToastService } from '../../core/services/toast.service';
import { Business } from '../../core/models/business.model';
import { BusinessFormComponent } from '../../shared/components/business-form/business-form.component';
import { BusinessListComponent } from '../../shared/components/business-list/business-list.component';

type OwnerSection =
  'dashboard' | 'businesses' | 'reservations' | 'services' | 'products' | 'analytics' | 'profile' | 'settings';

@Component({
  selector: 'app-owner-dashboard',
  imports: [CommonModule, ReactiveFormsModule, BusinessFormComponent, BusinessListComponent, RouterLink],
  template: `
    <div class="min-h-screen bg-surface">
      <!-- Top bar (mobile) -->
      <header
        class="lg:hidden sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-outline-variant/30 px-4 py-3 flex items-center justify-between"
      >
        <div class="flex items-center gap-2">
          <span class="material-icons-round text-primary text-2xl" aria-hidden="true">storefront</span>
          <span class="font-display font-bold text-lg">MiVeci</span>
        </div>
        <button class="btn-tertiary btn-sm" (click)="mobileMenuOpen.set(true)" aria-label="Abrir menú">
          <span class="material-icons-round text-base" aria-hidden="true">menu</span>
        </button>
      </header>

      <div
        class="lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ease-out"
        [class.opacity-100]="mobileMenuOpen()"
        [class.opacity-0]="!mobileMenuOpen()"
        [class.pointer-events-none]="!mobileMenuOpen()"
        [class.bg-black/50]="mobileMenuOpen()"
        [class.backdrop-blur-sm]="mobileMenuOpen()"
        (click)="mobileMenuOpen.set(false)"
      >
        <nav
          class="absolute left-0 top-0 h-full w-72 max-w-[80vw] bg-surface p-4 space-y-3 overflow-y-auto shadow-2xl transition-transform duration-300 ease-out"
          [class.translate-x-0]="mobileMenuOpen()"
          [class.-translate-x-full]="!mobileMenuOpen()"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-icons-round text-primary text-2xl" aria-hidden="true">storefront</span>
              <span class="font-display font-bold text-lg">MiVeci</span>
            </div>
            <button class="btn-ghost btn-sm" (click)="mobileMenuOpen.set(false)" aria-label="Cerrar men">
              <span class="material-icons-round text-base" aria-hidden="true">close</span>
            </button>
          </div>
          <ul class="space-y-1">
            @for (item of menuItems; track item.id) {
              <li>
                @if (item.action === 'logout') {
                  <button
                    type="button"
                    class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-error hover:bg-error/10 transition-colors"
                    (click)="logout(); mobileMenuOpen.set(false)"
                  >
                    <span class="material-icons-round text-base" aria-hidden="true">{{ item.icon }}</span>
                    <span>{{ item.label }}</span>
                  </button>
                } @else if (item.action === 'search') {
                  <button
                    type="button"
                    class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-on-surface hover:bg-surface-low transition-colors"
                    (click)="goHome(); mobileMenuOpen.set(false)"
                  >
                    <span class="material-icons-round text-base" aria-hidden="true">{{ item.icon }}</span>
                    <span>{{ item.label }}</span>
                  </button>
                } @else {
                  <button
                    type="button"
                    class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    [class.bg-primary/10]="activeSection() === item.id"
                    [class.text-primary]="activeSection() === item.id"
                    [class.text-on-surface]="activeSection() !== item.id"
                    (click)="setSection($any(item.id)); mobileMenuOpen.set(false)"
                  >
                    <span class="material-icons-round text-base" aria-hidden="true">{{ item.icon }}</span>
                    <span>{{ item.label }}</span>
                    @if (item.badge) {
                      <span
                        class="ml-auto text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant"
                        >{{ item.badge }}</span
                      >
                    }
                  </button>
                }
              </li>
            }
          </ul>
        </nav>
      </div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 grid gap-6 lg:grid-cols-[260px_1fr]">
        <!-- Sidebar (desktop) -->
        <aside class="hidden lg:block">
          <div class="sticky top-6 space-y-4">
            <div class="card p-5">
              <div class="flex items-center gap-3">
                <span class="grid place-items-center h-11 w-11 rounded-2xl bg-primary/10 text-primary">
                  <span class="material-icons-round" aria-hidden="true">storefront</span>
                </span>
                <div>
                  <p class="font-display font-bold text-base">MiVeci</p>
                  <p class="text-xs text-on-surface-variant">Panel del propietario</p>
                  <a routerLink="/" class="text-xs text-on-surface-variant hover:text-primary transition-colors"
                    >Ir al inicio</a
                  >
                </div>
              </div>
            </div>

            <nav class="card p-3" aria-label="Menú de propietario">
              <ul class="space-y-1">
                @for (item of menuItems; track item.id) {
                  <li>
                    @if (item.action === 'logout') {
                      <button
                        type="button"
                        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-error hover:bg-error/10 transition-colors"
                        (click)="logout()"
                      >
                        <span class="material-icons-round text-base" aria-hidden="true">{{ item.icon }}</span>
                        <span>{{ item.label }}</span>
                      </button>
                    } @else if (item.action === 'search') {
                      <button
                        type="button"
                        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-on-surface hover:bg-surface-low transition-colors"
                        (click)="goHome()"
                      >
                        <span class="material-icons-round text-base" aria-hidden="true">{{ item.icon }}</span>
                        <span>{{ item.label }}</span>
                      </button>
                    } @else {
                      <button
                        type="button"
                        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                        [class.bg-primary/10]="activeSection() === item.id"
                        [class.text-primary]="activeSection() === item.id"
                        [class.text-on-surface]="activeSection() !== item.id"
                        [class.hover:bg-surface-low]="activeSection() !== item.id"
                        (click)="setSection($any(item.id))"
                      >
                        <span class="material-icons-round text-base" aria-hidden="true">{{ item.icon }}</span>
                        <span>{{ item.label }}</span>
                        @if (item.badge) {
                          <span
                            class="ml-auto text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant"
                          >
                            {{ item.badge }}
                          </span>
                        }
                      </button>
                    }
                  </li>
                }
              </ul>
            </nav>

            <div class="card p-4 text-xs text-on-surface-variant space-y-1">
              <p class="font-semibold text-on-surface">Sugerencias para tu negocio</p>
              <ul class="space-y-1 list-disc list-inside">
                <li>Completa el perfil y el logo.</li>
                <li>Define horarios y servicios.</li>
                <li>Comparte tu enlace de reservas.</li>
              </ul>
            </div>
          </div>
        </aside>

        <!-- Main content -->
        <main id="main-content" role="main" class="space-y-6 min-w-0">
          <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="font-display text-2xl sm:text-3xl font-bold">{{ sectionTitle() }}</h1>
              <p class="text-sm text-on-surface-variant">{{ sectionSubtitle() }}</p>
            </div>
            <!-- @if (activeSection() === 'dashboard' || activeSection() === 'businesses') {
              <button class="btn-primary self-start" (click)="openCreateModal()">
                <span class="material-icons-round text-base" aria-hidden="true">add</span>
                Nuevo negocio
              </button>
            } -->
          </header>

          <!-- KPI row -->
          @if (activeSection() === 'dashboard') {
            <!-- <section class="grid gap-4 sm:grid-cols-3">
              <div class="card p-5">
                <div class="flex items-center gap-3">
                  <span class="grid place-items-center h-10 w-10 rounded-xl bg-primary/10 text-primary">
                    <span class="material-icons-round" aria-hidden="true">storefront</span>
                  </span>
                  <div>
                    <p class="text-xs text-on-surface-variant uppercase tracking-wide font-semibold">Negocios</p>
                    <p class="font-display text-2xl font-bold">{{ businesses().length }}</p>
                  </div>
                </div>
              </div>
              <div class="card p-5 opacity-60">
                <div class="flex items-center gap-3">
                  <span
                    class="grid place-items-center h-10 w-10 rounded-xl bg-surface-container text-on-surface-variant"
                  >
                    <span class="material-icons-round" aria-hidden="true">event_available</span>
                  </span>
                  <div>
                    <p class="text-xs text-on-surface-variant uppercase tracking-wide font-semibold">
                      Reservas (semana)
                    </p>
                    <p class="font-display text-2xl font-bold">—</p>
                  </div>
                </div>
                <p class="text-[11px] text-on-surface-variant mt-2">Próximamente</p>
              </div>
              <div class="card p-5 opacity-60">
                <div class="flex items-center gap-3">
                  <span
                    class="grid place-items-center h-10 w-10 rounded-xl bg-surface-container text-on-surface-variant"
                  >
                    <span class="material-icons-round" aria-hidden="true">payments</span>
                  </span>
                  <div>
                    <p class="text-xs text-on-surface-variant uppercase tracking-wide font-semibold">Ingresos (mes)</p>
                    <p class="font-display text-2xl font-bold">—</p>
                  </div>
                </div>
                <p class="text-[11px] text-on-surface-variant mt-2">Próximamente</p>
              </div>
            </section> -->

            <!-- Simple bar chart placeholder -->
            <!-- <section class="card p-5">
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-semibold text-lg">Reservas por día</h2>
                <span class="text-xs text-on-surface-variant">Últimos 7 días</span>
              </div>
              <div class="flex items-end gap-2 h-32" role="img" aria-label="Gráfico de reservas por día (próximamente)">
                @for (h of [30, 55, 40, 75, 60, 85, 50]; track $index) {
                  <div class="flex-1 flex flex-col items-center gap-1">
                    <div class="w-full rounded-t-md bg-primary/20 relative overflow-hidden" [style.height.%]="h">
                      <div class="absolute inset-x-0 bottom-0 bg-primary/60 rounded-t-md" [style.height.%]="h"></div>
                    </div>
                    <span class="text-[10px] text-on-surface-variant">{{
                      ['L', 'M', 'X', 'J', 'V', 'S', 'D'][$index]
                    }}</span>
                  </div>
                }
              </div>
              <p class="text-[11px] text-on-surface-variant mt-3 text-center">
                Datos de ejemplo — se conectarán a tus reservas reales próximamente.
              </p>
            </section> -->
          }

          <!-- Businesses list -->
          @if (activeSection() === 'dashboard' || activeSection() === 'businesses') {
            <section class="grid gap-4">
              @if (loading()) {
                <div class="card p-5 space-y-3" aria-busy="true" aria-live="polite">
                  @for (i of [1, 2, 3]; track i) {
                    <div class="skeleton h-16 rounded-xl"></div>
                  }
                </div>
              } @else if (!businesses().length) {
                <div class="card p-8 text-center space-y-3">
                  <span class="material-icons-round text-5xl text-on-surface-variant/40" aria-hidden="true"
                    >storefront</span
                  >
                  <h2 class="font-display text-xl font-semibold">Aún no tienes negocios</h2>
                  <p class="text-sm text-on-surface-variant max-w-sm mx-auto">
                    Crea tu primer negocio para empezar a recibir reservas y gestionar tu agenda.
                  </p>
                  <button class="btn-primary mt-2" (click)="openCreateModal()">
                    <span class="material-icons-round text-base" aria-hidden="true">add</span>
                    Crear mi primer negocio
                  </button>
                </div>
              } @else {
                <app-business-list
                  [businesses]="businesses()"
                  (view)="openBusiness($event)"
                  (edit)="editBusiness($event)"
                  (delete)="deleteBusiness($event)"
                  (promote)="promoteBusiness($event)"
                />
                <div class="flex justify-center pt-2">
                  @if (canCreateFree()) {
                    <button class="btn-primary" (click)="openCreateModal()">
                      <span class="material-icons-round text-base" aria-hidden="true">add</span>
                      Nuevo negocio (gratis)
                    </button>
                  } @else {
                    <button class="btn-secondary" (click)="openPaywall()">
                      <span class="material-icons-round text-base" aria-hidden="true">lock</span>
                      Nuevo negocio — requiere suscripción
                    </button>
                  }
                </div>
              }
            </section>
          }

          <!-- Placeholder sections for other menu items -->
          @if (activeSection() !== 'dashboard' && activeSection() !== 'businesses') {
            <div class="card p-8 text-center space-y-3">
              <span class="material-icons-round text-5xl text-on-surface-variant/40" aria-hidden="true">{{
                sectionIcon()
              }}</span>
              <h2 class="font-display text-xl font-semibold">{{ sectionTitle() }}</h2>
              <p class="text-sm text-on-surface-variant max-w-md mx-auto">
                Esta sección estará disponible próximamente. Por ahora puedes gestionar tus negocios desde "Mis
                negocios".
              </p>
              <button class="btn-tertiary" (click)="setSection('businesses')">Ir a Mis negocios</button>
            </div>
          }
        </main>
      </div>

      @if (showModal()) {
        <div
          class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-4 flex items-start justify-center overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="business-modal-title"
          (click)="closeModal()"
        >
          <div
            class="w-full max-w-2xl rounded-3xl bg-surface p-6 shadow-xl my-4 max-h-[90dvh] overflow-y-auto"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 id="business-modal-title" class="font-semibold text-xl">
                  {{ editingBusiness() ? 'Editar negocio' : 'Crear negocio' }}
                </h2>
                <p class="text-sm text-on-surface-variant">Usa tu cuenta de dueño para manejar tu negocio.</p>
              </div>
              <button class="btn-ghost" (click)="closeModal()" aria-label="Cerrar modal">✕</button>
            </div>

            <app-business-form
              [formGroup]="businessForm"
              submitLabel="Guardar negocio"
              [saving]="saving()"
              [isSubmitDisabled]="businessForm.invalid || saving()"
              (formSubmit)="saveBusiness()"
              (cancel)="closeModal()"
            />
          </div>
        </div>
      }
    </div>
  `,
})
export class OwnerDashboardComponent implements OnInit {
  private readonly ownerBusinessService = inject(OwnerBusinessService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  readonly businesses = signal<Business[]>([]);
  readonly loading = signal(true);
  readonly showModal = signal(false);
  readonly saving = signal(false);
  readonly editingBusiness = signal<Business | null>(null);
  readonly activeSection = signal<OwnerSection>('dashboard');
  readonly mobileMenuOpen = signal(false);
  readonly paywallOpen = signal(false);

  readonly menuItems: {
    id: OwnerSection | 'logout' | 'search';
    label: string;
    icon: string;
    badge?: string;
    action?: 'logout' | 'search';
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'businesses', label: 'Mis negocios', icon: 'storefront' },
    { id: 'search', label: 'Buscar negocios', icon: 'search', action: 'search' },
    { id: 'settings', label: 'Configuración', icon: 'settings' },
    { id: 'logout', label: 'Cerrar sesión', icon: 'logout', action: 'logout' },
  ];

  readonly sectionTitle = computed(() => {
    const map: Record<OwnerSection, string> = {
      dashboard: 'Dashboard',
      businesses: 'Mis negocios',
      reservations: 'Reservas',
      services: 'Servicios',
      products: 'Productos',
      analytics: 'Analytics',
      profile: 'Perfil del negocio',
      settings: 'Configuración',
    };
    return map[this.activeSection()];
  });

  readonly sectionSubtitle = computed(() => {
    const map: Record<OwnerSection, string> = {
      dashboard: 'Resumen de tu actividad y accesos rápidos.',
      businesses: 'Visualiza y administra tus negocios registrados.',
      reservations: 'Gestiona las reservas de tus negocios.',
      services: 'Administra los servicios que ofreces.',
      products: 'Gestiona el catálogo de productos.',
      analytics: 'Métricas y tendencias de tu negocio.',
      profile: 'Edita la información de tu negocio.',
      settings: 'Configuración, PIN y horarios.',
    };
    return map[this.activeSection()];
  });

  readonly sectionIcon = computed(() => {
    const item = this.menuItems.find(m => m.id === this.activeSection());
    return item?.icon ?? 'dashboard';
  });

  readonly canCreateFree = computed(() => this.businesses().length === 0);

  readonly businessForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    category: ['', Validators.required],
    categoryId: [null as number | null],
    professionCategoryId: [null as number | string | null],
    businessType: ['appointment' as 'appointment' | 'onsite_service' | 'no_appointments'],
    profession: [''],
    description: [''],
    department: ['', Validators.required],
    city: ['', Validators.required],
    location: ['', Validators.required],
    phone: [''],
    logo: [''],
    tags: '',
    facebook: [''],
    instagram: [''],
    tiktok: [''],
    whatsapp: [''],
    linkedin: [''],
    pin: ['', [Validators.required, Validators.minLength(4)]],
  });

  ngOnInit(): void {
    if (!this.auth.getOwnerToken()) {
      this.router.navigate(['/propietario/auth']);
      return;
    }

    this.ownerBusinessService
      .loadBusinesses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.businesses.set(list);
          this.loading.set(false);
        },
        error: () => {
          this.businesses.set([]);
          this.loading.set(false);
        },
      });
  }

  setSection(section: OwnerSection): void {
    this.activeSection.set(section);
  }

  openCreateModal(): void {
    if (!this.canCreateFree()) {
      this.paywallOpen.set(true);
      return;
    }
    this.editingBusiness.set(null);
    this.businessForm.reset({
      businessType: 'appointment',
      name: '',
      category: '',
      categoryId: null,
      professionCategoryId: null,
      profession: '',
      description: '',
      location: '',
      phone: '',
      logo: '',
      tags: '',
      facebook: '',
      instagram: '',
      tiktok: '',
      whatsapp: '',
      linkedin: '',
      pin: '',
    });
    this.showModal.set(true);
  }

  editBusiness(business: Business): void {
    this.editingBusiness.set(business);
    this.businessForm.patchValue({
      name: business.name,
      category: business.category,
      categoryId: business.categoryId ?? null,
      professionCategoryId: business.professionCategoryId ?? null,
      businessType: business.businessType ?? 'appointment',
      profession: business.profession ?? '',
      description: business.description ?? '',
      location: business.location ?? '',
      phone: business.phone ?? '',
      logo: business.logo ?? '',
      tags: Array.isArray(business.tags) ? business.tags.join(', ') : (business.tags ?? ''),
      facebook: business.facebook ?? '',
      instagram: business.instagram ?? '',
      tiktok: business.tiktok ?? '',
      whatsapp: business.whatsapp ?? '',
      linkedin: business.linkedin ?? '',
      pin: '',
    });
    this.showModal.set(true);
  }

  openBusiness(business: Business): void {
    if (!business.id) return;
    this.router.navigate(['/propietario/negocio', business.id]);
  }

  deleteBusiness(business: Business): void {
    const name = business.name ?? 'este negocio';
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
    // No hay endpoint de eliminación para propietarios aún; se informa al usuario.
    this.toast.error('La eliminación de negocios estará disponible próximamente.');
  }

  promoteBusiness(business: Business): void {
    this.toast.success(`Promoción de "${business.name}" disponible próximamente.`);
  }

  openPaywall(): void {
    this.paywallOpen.set(true);
  }

  goToSubscription(): void {
    this.paywallOpen.set(false);
    this.router.navigate(['/']);
  }

  saveBusiness(): void {
    if (this.businessForm.invalid) return;
    this.saving.set(true);
    const current = this.editingBusiness();
    const payload = this.businessForm.value as any;

    this.ownerBusinessService
      .saveBusiness(payload, current)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.reloadBusinesses();
        },
        error: () => {
          this.saving.set(false);
        },
      });
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingBusiness.set(null);
  }

  reloadBusinesses(): void {
    this.loading.set(true);
    this.ownerBusinessService
      .loadBusinesses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.businesses.set(list);
          this.loading.set(false);
        },
        error: () => {
          this.businesses.set([]);
          this.loading.set(false);
        },
      });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
