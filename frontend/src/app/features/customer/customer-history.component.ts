import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { formatCurrency } from '../../core/config/currency';
import { formatTime24 } from '../../core/config/time';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Customer, CustomerHistoryBooking } from '../../core/models/reservation.model';

type HistoryStatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

@Component({
  selector: 'app-customer-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6">
      <header class="flex flex-col gap-2 pb-2 border-b border-outline-variant/20">
        <h1 class="font-display text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">Historial de reservas</h1>
        <p class="text-sm text-on-surface-variant">Consulta el registro de tus citas pasadas y estados de pago.</p>
      </header>

      @if (loading()) {
        <div class="card p-6 space-y-4" role="status" aria-label="Cargando historial de reservas">
          <div class="skeleton h-10 w-64 rounded-xl"></div>
          <div class="skeleton h-24 rounded-2xl"></div>
          <div class="skeleton h-24 rounded-2xl"></div>
          <div class="skeleton h-24 rounded-2xl"></div>
        </div>
      } @else if (error()) {
        <div class="card p-8 flex flex-col items-center gap-4 text-center border-error/30 bg-error/5" role="alert">
          <div class="h-12 w-12 rounded-2xl bg-error/10 text-error flex items-center justify-center">
            <span class="material-icons-round text-2xl" aria-hidden="true">error_outline</span>
          </div>
          <div>
            <h2 class="font-display font-bold text-base text-on-surface">No se pudo cargar el historial</h2>
            <p class="text-sm text-on-surface-variant mt-1">{{ error() }}</p>
          </div>
          <button class="btn-primary min-h-[44px] px-5" type="button" (click)="loadHistory(page())">
            <span class="material-icons-round text-base" aria-hidden="true">refresh</span>
            Reintentar
          </button>
        </div>
      } @else {
        <!-- Filtros rápidos por estado de reserva -->
        <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado">
          @for (f of filterOptions; track f.id) {
            <button
              type="button"
              class="min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 inline-flex items-center gap-1.5"
              [class.bg-primary]="statusFilter() === f.id"
              [class.text-white]="statusFilter() === f.id"
              [class.border-primary]="statusFilter() === f.id"
              [class.bg-surface]="statusFilter() !== f.id"
              [class.text-on-surface-variant]="statusFilter() !== f.id"
              [class.border-outline-variant]="statusFilter() !== f.id"
              [class.hover:bg-surface-low]="statusFilter() !== f.id"
              [attr.aria-pressed]="statusFilter() === f.id"
              (click)="statusFilter.set(f.id)"
            >
              <span class="material-icons-round text-sm" aria-hidden="true">{{ f.icon }}</span>
              <span>{{ f.label }}</span>
              @if (f.id === 'all') {
                <span class="ml-1 opacity-70">({{ bookings().length }})</span>
              }
            </button>
          }
        </div>

        @if (filteredBookings().length === 0) {
          <section class="card p-8 sm:p-12 border border-outline-variant/30 flex flex-col items-center gap-4 text-center">
            <div class="h-16 w-16 rounded-3xl bg-surface-low text-on-surface-variant flex items-center justify-center mb-1" aria-hidden="true">
              <span class="material-icons-round text-3xl">event_busy</span>
            </div>
            @if (bookings().length === 0) {
              <div>
                <h3 class="font-display text-lg font-bold text-on-surface">Aún no tienes reservas registradas</h3>
                <p class="text-sm text-on-surface-variant max-w-md mt-1">
                  Cuando reserves citas en cualquier negocio, podrás ver aquí el comprobante y repetir el agendamiento.
                </p>
              </div>
              <a routerLink="/" class="btn-primary min-h-[44px] px-5 py-2.5 inline-flex items-center gap-2 text-sm font-semibold mt-2">
                <span class="material-icons-round text-base" aria-hidden="true">storefront</span>
                Explorar negocios
              </a>
            } @else {
              <div>
                <h3 class="font-display text-lg font-bold text-on-surface">No hay reservas con este filtro</h3>
                <p class="text-sm text-on-surface-variant max-w-md mt-1">
                  Prueba cambiando el filtro de estado seleccionado.
                </p>
              </div>
              <button
                type="button"
                class="btn-secondary min-h-[44px] px-4 py-2 text-sm font-semibold"
                (click)="statusFilter.set('all')"
              >
                Ver todas las reservas
              </button>
            }
          </section>
        } @else {
          <section class="space-y-3.5" aria-label="Lista de reservas">
            @for (b of filteredBookings(); track b.id) {
              <article class="card p-4 sm:p-5 border border-outline-variant/30 shadow-xs hover:border-primary/40 transition-colors">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="material-icons-round text-primary text-base" aria-hidden="true">store</span>
                      <h3 class="font-display font-bold text-base text-on-surface truncate">{{ b.businessName || 'Negocio' }}</h3>
                    </div>
                    <p class="text-sm font-semibold text-primary mt-1 flex items-center gap-1.5">
                      <span class="material-icons-round text-base" aria-hidden="true">spa</span>
                      <span>{{ b.serviceId || 'Servicio' }}</span>
                    </p>
                    <p class="text-sm text-on-surface-variant mt-1 flex items-center gap-2">
                      <span class="material-icons-round text-base opacity-70" aria-hidden="true">schedule</span>
                      <span>{{ formatDate(b.date) }} · {{ formatTime24(b.slot) }}</span>
                    </p>
                  </div>
                  <span class="badge inline-flex items-center gap-1.5 px-3 py-1 font-semibold text-xs rounded-full" [ngClass]="statusCss(b.status)">
                    <span class="material-icons-round text-sm" aria-hidden="true">{{ statusIcon(b.status) }}</span>
                    <span>{{ statusLabel(b.status) }}</span>
                  </span>
                </div>

                @if (b.paymentStatus || b.paymentAmount != null) {
                  <div class="flex flex-wrap items-center gap-2 mt-3.5 pt-3 border-t border-outline-variant/20 rounded-xl bg-surface-low px-3 py-2 text-xs sm:text-sm">
                    <span class="material-icons-round text-base text-primary" aria-hidden="true">payments</span>
                    <span class="font-medium">{{ paymentLabel(b) }}</span>
                  </div>
                }

                <div class="mt-4 pt-1 flex items-center justify-between gap-3">
                  <button
                    class="btn-secondary min-h-[44px] px-4 py-2 flex items-center gap-1.5 text-sm font-semibold rounded-xl"
                    type="button"
                    (click)="bookAgain(b)"
                    [attr.aria-label]="'Reservar de nuevo en ' + (b.businessName || 'el negocio')"
                  >
                    <span class="material-icons-round text-base" aria-hidden="true">add_circle_outline</span>
                    <span>Reservar de nuevo</span>
                  </button>
                  @if (b.notes) {
                    <span class="text-xs text-on-surface-variant italic truncate max-w-xs" title="{{ b.notes }}">
                      "{{ b.notes }}"
                    </span>
                  }
                </div>
              </article>
            }
          </section>

          <!-- Paginación accesible -->
          @if (total() != null && total()! > pageSize()) {
            <nav class="flex items-center justify-between gap-3 pt-4 border-t border-outline-variant/30" aria-label="Paginación del historial">
              <button
                class="btn-tertiary min-h-[44px] px-4 py-2 flex items-center gap-1.5 text-sm font-semibold rounded-xl"
                type="button"
                [disabled]="page() <= 1 || changingPage()"
                (click)="goToPage(page() - 1)"
                aria-label="Página anterior"
              >
                <span class="material-icons-round text-base" aria-hidden="true">chevron_left</span>
                <span>Anterior</span>
              </button>
              <span class="text-sm text-on-surface-variant font-medium">
                Página {{ page() }} de {{ totalPages() }}
              </span>
              <button
                class="btn-tertiary min-h-[44px] px-4 py-2 flex items-center gap-1.5 text-sm font-semibold rounded-xl"
                type="button"
                [disabled]="page() >= totalPages() || changingPage()"
                (click)="goToPage(page() + 1)"
                aria-label="Página siguiente"
              >
                <span>Siguiente</span>
                <span class="material-icons-round text-base" aria-hidden="true">chevron_right</span>
              </button>
            </nav>
          }
        }
      }
    </div>
  `,
})
export class CustomerHistoryComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly customer = signal<Customer | null>(null);
  readonly bookings = signal<CustomerHistoryBooking[]>([]);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly total = signal<number | null>(null);
  readonly changingPage = signal(false);
  readonly statusFilter = signal<HistoryStatusFilter>('all');

  readonly filterOptions = [
    { id: 'all' as const, label: 'Todas', icon: 'list' },
    { id: 'pending' as const, label: 'Pendientes', icon: 'schedule' },
    { id: 'confirmed' as const, label: 'Confirmadas', icon: 'check_circle' },
    { id: 'completed' as const, label: 'Completadas', icon: 'task_alt' },
    { id: 'cancelled' as const, label: 'Canceladas', icon: 'cancel' },
  ];

  private token: string | null = null;
  private customerId: string | null = null;

  readonly totalPages = computed(() => {
    const t = this.total();
    const ps = this.pageSize();
    return t != null && ps > 0 ? Math.max(1, Math.ceil(t / ps)) : 1;
  });

  readonly filteredBookings = computed(() => {
    const list = this.bookings();
    const f = this.statusFilter();
    if (f === 'all') return list;
    return list.filter(b => b.status === f);
  });

  ngOnInit(): void {
    this.token = this.auth.getCustomerToken();
    this.customerId = (this.auth.getCustomerPayload()?.customerId as string | undefined) ?? null;

    if (!this.token) {
      this.auth.clearCustomerToken();
      void this.router.navigate(['/usuario/auth']);
      return;
    }

    if (this.customerId) {
      this.loadHistory(this.page());
      return;
    }

    this.api
      .getCustomerMe(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: customer => {
          this.customerId = customer.id;
          this.customer.set(customer);
          this.loadHistory(this.page());
        },
        error: () => {
          this.auth.clearCustomerToken();
          void this.router.navigate(['/usuario/auth']);
        },
      });
  }

  loadHistory(page: number): void {
    const token = this.token;
    const customerId = this.customerId;
    if (!token || !customerId) return;

    this.loading.set(true);
    this.error.set(null);

    this.api
      .getCustomerHistory(customerId, token, page, this.pageSize())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.customer.set(data.customer);
          this.bookings.set(data.bookings);
          this.page.set(page);
          this.total.set(data.meta?.total ?? data.bookings.length);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          if (err instanceof HttpErrorResponse && err.status === 401) {
            this.auth.clearCustomerToken();
            void this.router.navigate(['/usuario/auth']);
            return;
          }
          this.error.set(err.error?.message ?? 'No se pudo cargar tu historial.');
        },
      });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.changingPage.set(true);
    this.loadHistory(page);
    this.changingPage.set(false);
  }

  formatDate(date: string): string {
    if (!date) return '';
    const [y, m, d] = date.split('-');
    return y && m && d ? `${d}/${m}/${y}` : date;
  }

  formatTime24(slot: string): string {
    return formatTime24(slot);
  }

  statusCss(status: string): string {
    if (status === 'pending') return 'bg-amber-50 text-amber-900 border border-amber-200';
    if (status === 'cancelled') return 'bg-red-50 text-red-900 border border-red-200';
    if (status === 'completed') return 'bg-blue-50 text-blue-900 border border-blue-200';
    return 'bg-emerald-50 text-emerald-900 border border-emerald-200';
  }

  statusIcon(status: string): string {
    if (status === 'pending') return 'schedule';
    if (status === 'cancelled') return 'cancel';
    if (status === 'completed') return 'task_alt';
    return 'check_circle';
  }

  statusLabel(status: string): string {
    if (status === 'pending') return 'Pendiente';
    if (status === 'confirmed') return 'Confirmado';
    if (status === 'completed') return 'Completado';
    if (status === 'cancelled') return 'Cancelado';
    return status;
  }

  paymentLabel(b: CustomerHistoryBooking): string {
    const amount = b.paymentAmount != null ? formatCurrency(b.paymentAmount, b.paymentCurrency ?? undefined) : '';
    const status =
      b.paymentStatus === 'paid'
        ? 'Pagado'
        : b.paymentStatus === 'pending'
          ? 'Pago pendiente'
          : b.paymentStatus === 'refunded'
            ? 'Reembolsado'
            : b.paymentStatus === 'failed'
              ? 'Pago fallido'
              : '';
    return [status, amount].filter(Boolean).join(' · ');
  }

  bookAgain(b: CustomerHistoryBooking): void {
    void this.router.navigate(['/booking', b.providerId]);
  }
}
