import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Customer } from '../../core/models/reservation.model';

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="space-y-6 max-w-3xl">
      <header>
        <h1 class="font-display text-2xl sm:text-3xl font-bold tracking-tight">Mi perfil</h1>
        <p class="text-sm text-on-surface-variant">Datos de tu cuenta de usuario y derechos de privacidad (RGPD).</p>
      </header>

      @if (loading()) {
        <div class="space-y-4" aria-busy="true" aria-label="Cargando perfil">
          <div class="card p-6 space-y-4">
            <div class="flex items-center gap-4">
              <div class="skeleton w-16 h-16 rounded-2xl shrink-0"></div>
              <div class="space-y-2 flex-1">
                <div class="skeleton h-6 w-48 rounded-lg"></div>
                <div class="skeleton h-4 w-32 rounded-lg"></div>
              </div>
            </div>
          </div>
          <div class="card p-6 space-y-3">
            <div class="skeleton h-6 w-40 rounded-lg"></div>
            <div class="skeleton h-4 w-full rounded-lg"></div>
            <div class="skeleton h-10 w-44 rounded-xl"></div>
          </div>
        </div>
      } @else if (error()) {
        <div class="card p-8 flex flex-col items-center gap-4 text-center border-l-4 border-error" role="alert">
          <div class="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center">
            <span class="material-icons-round text-2xl" aria-hidden="true">error_outline</span>
          </div>
          <div class="space-y-1">
            <h2 class="font-display font-semibold text-lg text-on-surface">No pudimos cargar tu perfil</h2>
            <p class="text-sm text-error">{{ error() }}</p>
          </div>
          <button class="btn-primary min-h-[44px] px-5 py-2.5 rounded-xl font-medium" type="button" (click)="load()">
            Reintentar
          </button>
        </div>
      } @else if (customer(); as c) {
        <!-- Tarjeta de información personal -->
        <section class="card p-6 border border-outline/10 space-y-4" aria-labelledby="profile-info-heading">
          <div class="flex flex-col sm:flex-row sm:items-center gap-4">
            <div
              class="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary text-white font-display text-xl font-bold shrink-0 shadow-sm"
              aria-hidden="true"
            >
              {{ initials(c.name || c.email) }}
            </div>
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h2 id="profile-info-heading" class="font-display text-xl font-bold text-on-surface truncate">
                  {{ c.name || c.email }}
                </h2>
                <span class="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  <span class="material-icons-round text-xs" aria-hidden="true">verified</span>
                  Cliente verificado
                </span>
              </div>
              <p class="text-sm text-on-surface-variant flex items-center gap-1.5 truncate">
                <span class="material-icons-round text-sm" aria-hidden="true">mail</span>
                {{ c.email }}
              </p>
              @if (c.phone) {
                <p class="text-sm text-on-surface-variant flex items-center gap-1.5">
                  <span class="material-icons-round text-sm" aria-hidden="true">phone</span>
                  {{ c.phone }}
                </p>
              }
            </div>
          </div>
        </section>

        <!-- Privacidad y RGPD -->
        <section class="card p-6 border border-outline/10 space-y-4" aria-labelledby="privacy-heading">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span class="material-icons-round text-xl" aria-hidden="true">shield</span>
            </div>
            <h3 id="privacy-heading" class="font-display text-base font-bold text-on-surface">
              Privacidad y control de datos (RGPD)
            </h3>
          </div>

          <p class="text-sm text-on-surface-variant leading-relaxed">
            Tienes pleno control sobre tu información. Puedes descargar una copia completa de tus datos personales o solicitar la eliminación definitiva de tu cuenta (los registros se anonimizan de forma permanente).
            Para más información, consulta nuestra
            <a routerLink="/privacy" class="font-medium text-primary underline underline-offset-2 hover:text-primary/80">política de privacidad</a>.
          </p>

          <div class="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              class="btn-secondary min-h-[44px] px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
              type="button"
              (click)="exportData()"
              [disabled]="gdprBusy()"
              [attr.aria-busy]="exporting()"
            >
              @if (exporting()) {
                <span class="material-icons-round text-base animate-spin" aria-hidden="true">sync</span>
                <span>Exportando tus datos...</span>
              } @else {
                <span class="material-icons-round text-base" aria-hidden="true">download</span>
                <span>Descargar copia de mis datos</span>
              }
            </button>

            <button
              class="min-h-[44px] px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-sm text-error bg-error/10 hover:bg-error/20 transition-colors"
              type="button"
              (click)="openDeleteConfirmModal()"
              [disabled]="gdprBusy()"
              [attr.aria-busy]="deleting()"
            >
              <span class="material-icons-round text-base" aria-hidden="true">delete_forever</span>
              <span>Eliminar mi cuenta</span>
            </button>
          </div>
        </section>
      }

      <!-- Modal accesible de confirmación para eliminar cuenta -->
      @if (showDeleteModal()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-desc"
          (click)="onBackdropClick($event)"
        >
          <div class="card max-w-md w-full p-6 space-y-5 bg-surface text-on-surface shadow-xl rounded-2xl border border-outline/20">
            <div class="flex items-center gap-3 text-error">
              <div class="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                <span class="material-icons-round text-2xl" aria-hidden="true">warning</span>
              </div>
              <h2 id="delete-dialog-title" class="font-display text-lg font-bold">
                ¿Eliminar tu cuenta?
              </h2>
            </div>

            <p id="delete-dialog-desc" class="text-sm text-on-surface-variant leading-relaxed">
              Tus datos personales y reservas históricas se anonimizarán de forma permanente e irreversible.
              No podrás recuperar el acceso con este correo electrónico.
            </p>

            <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
              <button
                type="button"
                class="btn-secondary min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium"
                (click)="closeDeleteConfirmModal()"
                [disabled]="deleting()"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold text-white bg-error hover:bg-error/90 flex items-center justify-center gap-2 shadow-sm transition-colors"
                (click)="confirmDeleteAccount()"
                [disabled]="deleting()"
                [attr.aria-busy]="deleting()"
              >
                @if (deleting()) {
                  <span class="material-icons-round text-base animate-spin" aria-hidden="true">sync</span>
                  <span>Eliminando cuenta...</span>
                } @else {
                  <span class="material-icons-round text-base" aria-hidden="true">delete</span>
                  <span>Sí, eliminar permanentemente</span>
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CustomerProfileComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly customer = signal<Customer | null>(null);
  readonly exporting = signal(false);
  readonly deleting = signal(false);
  readonly showDeleteModal = signal(false);
  readonly gdprBusy = computed(() => this.exporting() || this.deleting());

  private token: string | null = null;
  private customerId: string | null = null;

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (this.showDeleteModal() && !this.deleting()) {
      this.closeDeleteConfirmModal();
    }
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.token = this.auth.getCustomerToken();
    this.customerId = (this.auth.getCustomerPayload()?.customerId as string | undefined) ?? null;
    if (!this.token) {
      this.auth.clearCustomerToken();
      void this.router.navigate(['/usuario/auth']);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.api
      .getCustomerMe(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: customer => {
          this.customer.set(customer);
          this.customerId = customer.id;
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          if (err instanceof HttpErrorResponse && err.status === 401) {
            this.auth.clearCustomerToken();
            void this.router.navigate(['/usuario/auth']);
            return;
          }
          this.error.set(err.error?.message ?? 'No se pudo cargar tu perfil.');
        },
      });
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

  exportData(): void {
    const token = this.token;
    const customerId = this.customerId;
    if (!token || !customerId) return;

    this.exporting.set(true);
    this.api
      .exportCustomerData(customerId, token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.exporting.set(false);
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `mis-datos-miveci-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          this.toast.success('Datos exportados exitosamente.');
        },
        error: (err: HttpErrorResponse) => {
          this.exporting.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo exportar tus datos.');
        },
      });
  }

  openDeleteConfirmModal(): void {
    this.showDeleteModal.set(true);
  }

  closeDeleteConfirmModal(): void {
    this.showDeleteModal.set(false);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.deleting()) {
      this.closeDeleteConfirmModal();
    }
  }

  confirmDeleteAccount(): void {
    const token = this.token;
    const customerId = this.customerId;
    if (!token || !customerId) return;

    this.deleting.set(true);
    this.api
      .deleteCustomer(customerId, token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.showDeleteModal.set(false);
          this.auth.clearCustomerToken();
          this.toast.success('Cuenta eliminada. Tus datos han sido anonimizados.');
          void this.router.navigate(['/']);
        },
        error: (err: HttpErrorResponse) => {
          this.deleting.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo eliminar tu cuenta.');
        },
      });
  }
}
