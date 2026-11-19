import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingStateService } from '../booking-state.service';

@Component({
  selector: 'app-booking-step1-service',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-5 px-5 py-5">
      <!-- Step header -->
      <div class="rounded-2xl border border-primary-fixed bg-brand-soft-high p-4">
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Paso 1 de 4</p>
        <h2 class="mt-2 font-display text-2xl font-semibold text-on-surface">Elige tu servicio</h2>
        <p class="mt-1 text-sm text-on-surface-variant">Empieza por el servicio que quieres agendar.</p>
      </div>

      <!-- Repeat last booking shortcut -->
      @if (state.lastBooking() && !state.servicesLoading() && state.services().includes(state.lastBooking()!.servicio)) {
        <button
          type="button"
          class="btn-tertiary btn-sm w-full justify-start gap-2 border border-dashed border-primary/40"
          (click)="repeatLast.emit()"
        >
          <span class="material-icons-round text-base">history</span>
          Repetir tu última reserva ({{ state.lastBooking()!.servicio }})
        </button>
      }

      <!-- Loading skeletons -->
      @if (state.servicesLoading()) {
        <div class="flex flex-col gap-3" role="status" aria-live="polite" aria-label="Cargando servicios">
          <div class="skeleton h-20 rounded-2xl"></div>
          <div class="skeleton h-20 rounded-2xl"></div>
          <div class="skeleton h-20 rounded-2xl"></div>
        </div>
      }

      <!-- Error state -->
      @if (state.servicesError() && !state.servicesLoading()) {
        <div class="rounded-2xl bg-error-container p-5" role="alert">
          <div class="flex items-start gap-3 text-error-on-container">
            <span class="material-icons-round mt-0.5">warning</span>
            <div>
              <p class="font-semibold">No se pudieron cargar los servicios</p>
              <p class="mt-1 text-sm">{{ state.servicesError() }}</p>
              <button type="button" class="btn-secondary btn-sm mt-4" (click)="retryServices.emit()">
                Reintentar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Services list -->
      @if (!state.servicesLoading() && !state.servicesError()) {
        @if (state.services().length) {
          <div class="space-y-3">
            <!-- Filter chips -->
            <div class="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filtrar servicios">
              @for (filter of filters; track filter.id) {
                <button
                  type="button"
                  class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                  [class.border-primary]="state.serviceFilter() === filter.id"
                  [class.bg-primary]="state.serviceFilter() === filter.id"
                  [class.text-white]="state.serviceFilter() === filter.id"
                  [class.border-outline-variant]="state.serviceFilter() !== filter.id"
                  [class.bg-white]="state.serviceFilter() !== filter.id"
                  [class.text-on-surface-variant]="state.serviceFilter() !== filter.id"
                  [attr.aria-pressed]="state.serviceFilter() === filter.id"
                  (click)="state.serviceFilter.set(filter.id)"
                >{{ filter.label }}</button>
              }
            </div>

            <!-- Service cards -->
            <div class="flex flex-col gap-2.5" role="listbox" aria-label="Servicios disponibles">
              @for (svc of state.visibleServices(); track svc) {
                <button
                  type="button"
                  role="option"
                  class="w-full rounded-2xl border p-4 text-left transition duration-150"
                  [class.border-primary]="state.selectedService() === svc"
                  [class.bg-brand-soft-high]="state.selectedService() === svc"
                  [class.ring-1]="state.selectedService() === svc"
                  [class.ring-primary]="state.selectedService() === svc"
                  [class.shadow-card]="state.selectedService() === svc"
                  [class.border-outline-variant]="state.selectedService() !== svc"
                  [class.bg-white]="state.selectedService() !== svc"
                  [class.hover:border-primary/50]="state.selectedService() !== svc"
                  [class.hover:bg-surface-low]="state.selectedService() !== svc"
                  [attr.aria-selected]="state.selectedService() === svc"
                  (click)="state.selectedService.set(svc)"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex min-w-0 items-center gap-3">
                      <!-- Icon -->
                      <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-container text-white">
                        <span class="material-icons-round text-[1.1rem]">{{ state.serviceIcon(svc) }}</span>
                      </div>
                      <div class="min-w-0">
                        <p class="truncate font-display text-base font-semibold text-on-surface">{{ svc }}</p>
                        <p class="text-xs leading-5 text-on-surface-variant">{{ state.serviceMeta(svc).summary }}</p>
                      </div>
                    </div>
                    <!-- Check indicator -->
                    <span
                      class="material-icons-round flex-shrink-0 text-primary transition-all duration-200"
                      [class.opacity-0]="state.selectedService() !== svc"
                      [class.scale-75]="state.selectedService() !== svc"
                      [class.opacity-100]="state.selectedService() === svc"
                      [class.scale-100]="state.selectedService() === svc"
                    >check_circle</span>
                  </div>

                  <!-- Service meta chips -->
                  <div class="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-on-surface-variant">
                    <span class="inline-flex items-center gap-1">
                      <span class="material-icons-round text-[0.95rem] text-primary">payments</span>
                      {{ state.serviceMeta(svc).price }}
                    </span>
                    <span class="inline-flex items-center gap-1">
                      <span class="material-icons-round text-[0.95rem] text-primary">schedule</span>
                      {{ state.serviceMeta(svc).duration }}
                    </span>
                    <span class="inline-flex items-center gap-1">
                      <span class="material-icons-round text-[0.95rem] text-primary">bolt</span>
                      {{ state.serviceMeta(svc).availability }}
                    </span>
                  </div>
                </button>
              }
            </div>
          </div>
        } @else {
          <!-- Empty state -->
          <div class="rounded-2xl border border-dashed border-outline-variant bg-surface-low p-8 text-center">
            <span class="material-icons-round text-[3rem] text-outline">category</span>
            <p class="mt-3 font-display text-lg font-semibold text-on-surface">Aún no hay servicios cargados</p>
            <p class="mt-1 text-sm text-on-surface-variant">Cuando el negocio configure sus servicios aparecerán aquí.</p>
          </div>
        }
      }
    </div>
  `,
})
export class BookingStep1ServiceComponent {
  readonly state = inject(BookingStateService);
  readonly repeatLast = output<void>();
  readonly retryServices = output<void>();

  readonly filters = [
    { id: 'all' as const, label: 'Todos' },
    { id: 'popular' as const, label: 'Populares' },
    { id: 'quick' as const, label: 'Rápidos' },
    { id: 'premium' as const, label: 'Premium' },
  ];
}
