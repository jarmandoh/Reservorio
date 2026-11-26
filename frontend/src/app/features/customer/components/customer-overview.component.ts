import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Customer, CustomerHistoryBooking } from '../../../core/models/reservation.model';
import { CustomerActiveReservationsComponent } from './customer-active-reservations.component';

@Component({
  selector: 'app-customer-overview',
  standalone: true,
  imports: [RouterLink, CustomerActiveReservationsComponent],
  template: `
    <div class="space-y-6">
      <!-- Encabezado con bienvenida y acción principal -->
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-outline-variant/20">
        <div>
          <h1 class="font-display text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            Hola{{ greetingName() }} 👋
          </h1>
          <p class="text-sm text-on-surface-variant mt-1">
            Gestiona tus citas programadas y vuelve a reservar en tus negocios preferidos.
          </p>
        </div>
        <div class="flex items-center gap-2.5 shrink-0">
          <a
            routerLink="/"
            class="btn-primary min-h-[44px] px-4 py-2 inline-flex items-center gap-2 shadow-sm text-sm font-semibold"
          >
            <span class="material-icons-round text-lg" aria-hidden="true">add</span>
            <span>Nueva reserva</span>
          </a>
        </div>
      </header>

      @if (loading()) {
        <!-- Skeletons con dimensiones idénticas a los componentes reales para evitar CLS -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4" role="status" aria-label="Cargando resumen del panel">
          <div class="card p-5 space-y-3">
            <div class="skeleton h-5 w-24 rounded-md"></div>
            <div class="skeleton h-8 w-16 rounded-md"></div>
          </div>
          <div class="card p-5 space-y-3">
            <div class="skeleton h-5 w-24 rounded-md"></div>
            <div class="skeleton h-8 w-16 rounded-md"></div>
          </div>
          <div class="card p-5 space-y-3">
            <div class="skeleton h-5 w-24 rounded-md"></div>
            <div class="skeleton h-8 w-16 rounded-md"></div>
          </div>
        </div>
        <div class="card p-6 space-y-4">
          <div class="skeleton h-20 rounded-xl"></div>
          <div class="skeleton h-20 rounded-xl"></div>
        </div>
      } @else if (error()) {
        <!-- Estado de error accesible con botón de reintento -->
        <div class="card p-8 flex flex-col items-center gap-4 text-center border-error/30 bg-error/5" role="alert">
          <div class="h-12 w-12 rounded-2xl bg-error/10 text-error flex items-center justify-center">
            <span class="material-icons-round text-2xl" aria-hidden="true">error_outline</span>
          </div>
          <div>
            <h2 class="font-display font-bold text-base text-on-surface">No se pudo cargar la información</h2>
            <p class="text-sm text-on-surface-variant mt-1 max-w-md">{{ error() }}</p>
          </div>
          <button class="btn-primary min-h-[44px] px-5" type="button" (click)="load()">
            <span class="material-icons-round text-base" aria-hidden="true">refresh</span>
            Reintentar
          </button>
        </div>
      } @else {
        <!-- Tarjetas de métricas y resumen rápido -->
        <section class="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Resumen de actividad">
          <div class="card p-4 sm:p-5 border border-outline-variant/30 flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Próximas citas</p>
              <p class="font-display text-2xl sm:text-3xl font-bold text-primary mt-1">{{ upcoming().length }}</p>
              <p class="text-xs text-on-surface-variant mt-0.5">
                {{ upcoming().length === 1 ? '1 reserva activa' : upcoming().length + ' reservas activas' }}
              </p>
            </div>
            <div class="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0" aria-hidden="true">
              <span class="material-icons-round text-2xl">event_available</span>
            </div>
          </div>

          <a
            routerLink="/usuario/dashboard/historial"
            class="card p-4 sm:p-5 border border-outline-variant/30 hover:border-primary/40 transition-colors flex items-center justify-between gap-3 group"
          >
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total historial</p>
              <p class="font-display text-2xl sm:text-3xl font-bold text-on-surface mt-1">{{ bookings().length }}</p>
              <p class="text-xs text-primary font-medium mt-0.5 group-hover:underline flex items-center gap-1">
                Ver historial completo
                <span class="material-icons-round text-sm" aria-hidden="true">arrow_forward</span>
              </p>
            </div>
            <div class="h-12 w-12 rounded-2xl bg-surface-low text-on-surface-variant group-hover:text-primary flex items-center justify-center shrink-0 transition-colors" aria-hidden="true">
              <span class="material-icons-round text-2xl">history</span>
            </div>
          </a>

          <a
            routerLink="/usuario/dashboard/favoritos"
            class="card p-4 sm:p-5 border border-outline-variant/30 hover:border-primary/40 transition-colors flex items-center justify-between gap-3 group"
          >
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Favoritos</p>
              <p class="font-display text-2xl sm:text-3xl font-bold text-on-surface mt-1">{{ favoritesCount() }}</p>
              <p class="text-xs text-primary font-medium mt-0.5 group-hover:underline flex items-center gap-1">
                Ver mis favoritos
                <span class="material-icons-round text-sm" aria-hidden="true">arrow_forward</span>
              </p>
            </div>
            <div class="h-12 w-12 rounded-2xl bg-surface-low text-on-surface-variant group-hover:text-primary flex items-center justify-center shrink-0 transition-colors" aria-hidden="true">
              <span class="material-icons-round text-2xl">favorite_border</span>
            </div>
          </a>
        </section>

        <!-- Sección de reservas activas -->
        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="font-display text-lg sm:text-xl font-bold text-on-surface">Reservas activas</h2>
              <p class="text-xs sm:text-sm text-on-surface-variant">Citas pendientes de atención y confirmadas.</p>
            </div>
            @if (upcoming().length > 0) {
              <span class="badge badge-info font-medium text-xs px-2.5 py-0.5">
                {{ upcoming().length }} activa{{ upcoming().length === 1 ? '' : 's' }}
              </span>
            }
          </div>

          <app-customer-active-reservations [reservations]="upcoming()" />
        </section>

        <!-- Accesos rápidos / Enlaces a otras secciones -->
        <section class="card p-5 border border-outline-variant/30 bg-surface-low/50">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="font-display font-semibold text-base text-on-surface">¿Necesitas revisar tus citas pasadas?</h3>
              <p class="text-xs sm:text-sm text-on-surface-variant mt-0.5">
                Accede a los comprobantes, estados de pago y referencias de todas tus reservas previas.
              </p>
            </div>
            <a
              routerLink="/usuario/dashboard/historial"
              class="btn-secondary min-h-[44px] px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold shrink-0"
            >
              <span class="material-icons-round text-base" aria-hidden="true">receipt_long</span>
              Consultar historial
            </a>
          </div>
        </section>
      }
    </div>
  `,
})
export class CustomerOverviewComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly customer = signal<Customer | null>(null);
  readonly bookings = signal<CustomerHistoryBooking[]>([]);

  readonly greetingName = computed(() => {
    const name = this.customer()?.name;
    return name ? `, ${name.split(' ')[0]}` : '';
  });

  readonly upcoming = computed(() =>
    this.bookings().filter(b => b.status === 'pending' || b.status === 'confirmed')
  );

  readonly favoritesCount = computed(() => {
    try {
      const id = (this.auth.getCustomerPayload()?.customerId as string | undefined) ?? 'me';
      const raw = localStorage.getItem(`customer:${id}:favorites`);
      return raw ? (JSON.parse(raw) as unknown[]).length : 0;
    } catch {
      return 0;
    }
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const token = this.auth.getCustomerToken();
    const customerId = (this.auth.getCustomerPayload()?.customerId as string | undefined) ?? this.customer()?.id;
    if (!token) {
      this.auth.clearCustomerToken();
      void this.router.navigate(['/usuario/auth']);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const fetchHistory = (id: string) => {
      this.api
        .getCustomerHistory(id, token, 1, 30)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: data => {
            this.customer.set(data.customer);
            this.bookings.set(data.bookings);
            this.loading.set(false);
          },
          error: err => {
            this.loading.set(false);
            if (err instanceof HttpErrorResponse && err.status === 401) {
              this.auth.clearCustomerToken();
              void this.router.navigate(['/usuario/auth']);
              return;
            }
            this.error.set(err.error?.message ?? 'No se pudo cargar tu panel.');
          },
        });
    };

    if (customerId) {
      fetchHistory(customerId);
      return;
    }

    this.api
      .getCustomerMe(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: customer => {
          this.customer.set(customer);
          fetchHistory(customer.id);
        },
        error: () => {
          this.auth.clearCustomerToken();
          void this.router.navigate(['/usuario/auth']);
        },
      });
  }
}
