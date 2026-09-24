import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Customer, CustomerHistoryBooking } from '../../core/models/reservation.model';

@Component({
  selector: 'app-customer-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-surface p-4 sm:p-6">
      <div class="max-w-3xl mx-auto space-y-6">

        <header class="flex items-center justify-between gap-3">
          <button class="btn-tertiary btn-sm flex items-center gap-1.5" type="button" (click)="goHome()">
            <span class="material-icons-round text-base">arrow_back</span>
            Inicio
          </button>
          <div class="flex items-center gap-2">
            @if (customer()) {
              <h1 class="font-display text-xl font-bold">Mi historial</h1>
            }
            <button class="btn-tertiary btn-sm flex items-center gap-1.5" type="button" (click)="logout()">
              <span class="material-icons-round text-base">logout</span>
              <span class="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        @if (loading()) {
          <div class="card p-5 space-y-4">
            <div class="skeleton h-16 rounded-xl"></div>
            <div class="skeleton h-24 rounded-xl"></div>
            <div class="skeleton h-24 rounded-xl"></div>
          </div>
        } @else if (error()) {
          <div class="card p-6 flex flex-col items-center gap-4 text-center">
            <p class="text-error">{{ error() }}</p>
            <button class="btn-primary" type="button" (click)="goHome()">Volver al inicio</button>
          </div>
        } @else if (customer(); as c) {
          <!-- Profile -->
          <section class="card p-5 flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary text-white font-display text-lg font-bold shrink-0">
              {{ initials(c.name) }}
            </div>
            <div class="min-w-0">
              <h2 class="font-display text-lg font-bold">{{ c.name }}</h2>
              <p class="text-sm text-on-surface-variant truncate">{{ c.email }}</p>
              @if (c.phone) {
                <p class="text-sm text-on-surface-variant">{{ c.phone }}</p>
              }
            </div>
          </section>

          <!-- GDPR -->
          <section class="card p-5 space-y-3">
            <div class="flex items-center gap-2">
              <span class="material-icons-round text-primary">shield</span>
              <h3 class="font-medium">Mis datos (RGPD)</h3>
            </div>
            <p class="text-sm text-on-surface-variant">
              Descarga una copia completa de tus datos o elimina tu cuenta (los datos se anonimizan de forma permanente).
              Consulta la <a routerLink="/privacy" class="font-semibold text-primary underline">política de privacidad</a>.
            </p>
            <div class="flex flex-col sm:flex-row gap-2">
              <button class="btn-secondary btn-sm flex items-center gap-1.5" type="button"
                      (click)="exportData()" [disabled]="gdprBusy()">
                <span class="material-icons-round text-base">{{ exporting() ? 'refresh' : 'download' }}</span>
                {{ exporting() ? 'Descargando...' : 'Exportar mis datos' }}
              </button>
              <button class="btn-danger btn-sm flex items-center gap-1.5" type="button"
                      (click)="deleteData()" [disabled]="gdprBusy()">
                <span class="material-icons-round text-base">delete_outline</span>
                {{ deleting() ? 'Eliminando...' : 'Eliminar mi cuenta' }}
              </button>
            </div>
          </section>

          <!-- Bookings -->
          @if (bookings().length === 0) {
            <section class="card p-8 flex flex-col items-center gap-3 text-center">
              <span class="material-icons-round text-5xl text-outline">event_available</span>
              <p class="font-medium">Aún no tienes reservas</p>
              <p class="text-sm text-on-surface-variant">Cuando reserves en algún negocio, tu historial aparecerá aquí.</p>
              <button class="btn-primary" type="button" (click)="goHome()">Explorar negocios</button>
            </section>
          } @else {
            <section class="flex flex-col gap-3">
              @for (b of bookings(); track b.id) {
                <article class="card p-4 sm:p-5">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="material-icons-round text-primary text-base">store</span>
                        <h3 class="font-medium truncate">{{ b.businessName || 'Negocio' }}</h3>
                      </div>
                      <p class="text-sm text-on-surface-variant mt-1">{{ b.serviceId || 'Servicio' }}</p>
                      <p class="text-sm mt-1 flex items-center gap-2">
                        <span class="material-icons-round text-base text-on-surface-variant">schedule</span>
                        {{ formatDate(b.date) }} · {{ b.slot }}
                      </p>
                    </div>
                    <span class="badge" [ngClass]="statusCss(b.status)">{{ statusLabel(b.status) }}</span>
                  </div>

                  @if (b.paymentStatus) {
                    <div class="flex flex-wrap items-center gap-2 mt-3 rounded-xl bg-surface-low px-3 py-2 text-sm">
                      <span class="material-icons-round text-base text-on-surface-variant">payments</span>
                      <span>{{ paymentLabel(b) }}</span>
                    </div>
                  }

                  <button class="btn-secondary btn-sm mt-4 flex items-center gap-1.5" type="button"
                          (click)="bookAgain(b)">
                    <span class="material-icons-round text-base">add_circle_outline</span>
                    Reservar de nuevo
                  </button>
                </article>
              }
            </section>

            @if (total() != null && total()! > pageSize()) {
              <nav class="flex items-center justify-between gap-3" aria-label="Paginación del historial">
                <button class="btn-tertiary btn-sm flex items-center gap-1.5" type="button"
                        [disabled]="page() <= 1 || changingPage()" (click)="goToPage(page() - 1)">
                  <span class="material-icons-round text-base">chevron_left</span>
                  Anterior
                </button>
                <span class="text-sm text-on-surface-variant">Página {{ page() }} de {{ totalPages() }}</span>
                <button class="btn-tertiary btn-sm flex items-center gap-1.5" type="button"
                        [disabled]="page() >= totalPages() || changingPage()" (click)="goToPage(page() + 1)">
                  Siguiente
                  <span class="material-icons-round text-base">chevron_right</span>
                </button>
              </nav>
            }
          }
        }
      </div>
    </div>
  `,
})
export class CustomerHistoryComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly customer = signal<Customer | null>(null);
  readonly bookings = signal<CustomerHistoryBooking[]>([]);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly total = signal<number | null>(null);
  readonly changingPage = signal(false);
  readonly exporting = signal(false);
  readonly deleting = signal(false);

  readonly gdprBusy = computed(() => this.exporting() || this.deleting());

  private token: string | null = null;
  private customerId: string | null = null;

  private readonly statusInfo = { pending: 'Pendiente', confirmed: 'Confirmado', completed: 'Completado', cancelled: 'Cancelado' };

  readonly totalPages = computed(() => {
    const t = this.total();
    const ps = this.pageSize();
    return t != null && ps > 0 ? Math.max(1, Math.ceil(t / ps)) : 1;
  });

  ngOnInit(): void {
    this.token = this.auth.getCustomerToken();
    this.customerId = this.auth.getCustomerPayload()?.customerId as string | undefined ?? null;

    if (!this.token || !this.customerId) {
      this.auth.clearCustomerToken();
      this.router.navigate(['/customer/login']);
      return;
    }

    this.loadHistory(this.page());
  }

  loadHistory(page: number): void {
    const token = this.token;
    const customerId = this.customerId;
    if (!token || !customerId) return;

    this.loading.set(true);
    this.error.set(null);

    this.api.getCustomerHistory(customerId, token, page, this.pageSize()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
          this.router.navigate(['/customer/login']);
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

  initials(name?: string): string {
    return (name ?? '')
      .trim()
      .split(/\s+/)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  formatDate(date: string): string {
    if (!date) return '';
    const [y, m, d] = date.split('-');
    return y && m && d ? `${d}/${m}/${y}` : date;
  }

  statusCss(status: string): string {
    if (status === 'pending') return 'badge-pending';
    if (status === 'cancelled') return 'badge-reserved';
    return 'badge-confirmed';
  }

  statusLabel(status: string): string {
    return this.statusInfo[status as keyof typeof this.statusInfo] ?? status;
  }

  paymentLabel(b: CustomerHistoryBooking): string {
    const amount = b.paymentAmount != null
      ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: b.paymentCurrency ?? 'EUR' }).format(b.paymentAmount)
      : '';
    const status = b.paymentStatus === 'paid' ? 'Pagado'
      : b.paymentStatus === 'pending' ? 'Pago pendiente'
      : b.paymentStatus === 'refunded' ? 'Reembolsado'
      : b.paymentStatus === 'failed' ? 'Pago fallido'
      : '';
    return [status, amount].filter(Boolean).join(' · ');
  }

  bookAgain(b: CustomerHistoryBooking): void {
    this.router.navigate(['/booking', b.providerId]);
  }

  exportData(): void {
    const token = this.token;
    const customerId = this.customerId;
    if (!token || !customerId) return;

    this.exporting.set(true);
    this.api.exportCustomerData(customerId, token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        this.exporting.set(false);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mis-datos-reservorio-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success('Datos exportados.');
      },
      error: (err: HttpErrorResponse) => {
        this.exporting.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo exportar tus datos.');
      },
    });
  }

  deleteData(): void {
    const token = this.token;
    const customerId = this.customerId;
    if (!token || !customerId) return;
    if (!window.confirm(
      '¿Seguro que quieres eliminar tu cuenta?\n\n' +
      'Tus datos personales se anonimizarán de forma permanente. ' +
      'Este proceso no se puede deshacer.'
    )) return;

    this.deleting.set(true);
    this.api.deleteCustomer(customerId, token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.deleting.set(false);
        this.auth.clearCustomerToken();
        this.toast.success('Cuenta eliminada. Tus datos han sido anonimizados.');
        this.router.navigate(['/']);
      },
      error: (err: HttpErrorResponse) => {
        this.deleting.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo eliminar tu cuenta.');
      },
    });
  }

  logout(): void {
    this.auth.clearCustomerToken();
    this.router.navigate(['/']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}