import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingStateService } from '../booking-state.service';
import { formatTime24 } from '../../../core/config/time';

@Component({
  selector: 'app-booking-step2-slot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-5 px-5 py-5">
      <!-- Step header -->
      <div class="rounded-2xl border border-primary-fixed bg-brand-soft-high p-4">
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Paso 2 de 4</p>
        <h2 class="mt-2 font-display text-2xl font-semibold text-on-surface">Selecciona el horario</h2>
        <p class="mt-1 text-sm text-on-surface-variant">Escoge el horario disponible que mejor te funcione.</p>
      </div>

      <!-- Selected service summary (edit shortcut) -->
      <div class="flex items-center justify-between rounded-2xl border border-outline-variant bg-white px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
            <span class="material-icons-round text-[1.1rem]">{{ state.serviceIcon(state.selectedService()!) }}</span>
          </div>
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-outline">Servicio elegido</p>
            <p class="font-display font-semibold text-on-surface">{{ state.selectedService() }}</p>
          </div>
        </div>
        <button type="button" class="btn-tertiary btn-sm" (click)="changeService.emit()">Cambiar</button>
      </div>

      <!-- Loading skeletons -->
      @if (state.loading()) {
        <div class="grid grid-cols-3 gap-2" role="status" aria-live="polite" aria-label="Cargando horarios">
          @for (i of [1,2,3,4,5,6,7,8,9]; track i) {
            <div class="skeleton h-12 rounded-xl"></div>
          }
        </div>
      }

      <!-- Error state -->
      @if (state.error() && !state.loading()) {
        <div class="rounded-2xl bg-error-container p-5" role="alert">
          <div class="flex items-start gap-3 text-error-on-container">
            <span class="material-icons-round mt-0.5">warning</span>
            <div>
              <p class="font-semibold">No se pudo cargar la disponibilidad</p>
              <p class="mt-1 text-sm">{{ state.error() }}</p>
              <p class="mt-1 text-sm">Verifica que la hoja del negocio esté publicada.</p>
              <button type="button" class="btn-secondary btn-sm mt-4" (click)="retry.emit()">Reintentar</button>
            </div>
          </div>
        </div>
      }

      <!-- Slot grid (available = clickable tiles) -->
      @if (!state.loading() && !state.error()) {
        <div class="rounded-2xl border border-outline-variant bg-white p-4">
          <label class="form-label" for="slotSelect">Elige tu horario</label>
          @if (state.availableSlotsCount() > 0) {
            <!-- Visual tile grid -->
            <div class="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Franjas disponibles">
              @for (row of state.reservations(); track row._rowIndex) {
                @if (!state.isTaken(row)) {
                  <button
                    type="button"
                    class="rounded-xl border py-3 text-sm font-semibold transition"
                    [class.border-primary]="state.selectedSlot()?._rowIndex === row._rowIndex"
                    [class.bg-primary]="state.selectedSlot()?._rowIndex === row._rowIndex"
                    [class.text-white]="state.selectedSlot()?._rowIndex === row._rowIndex"
                    [class.border-outline-variant]="state.selectedSlot()?._rowIndex !== row._rowIndex"
                    [class.bg-white]="state.selectedSlot()?._rowIndex !== row._rowIndex"
                    [class.text-on-surface]="state.selectedSlot()?._rowIndex !== row._rowIndex"
                    [class.hover:border-primary/50]="state.selectedSlot()?._rowIndex !== row._rowIndex"
                    [class.hover:bg-brand-soft-high]="state.selectedSlot()?._rowIndex !== row._rowIndex"
                    [attr.aria-pressed]="state.selectedSlot()?._rowIndex === row._rowIndex"
                    (click)="state.selectedSlot.set(row)"
                  >{{ formatTime24(row.franja) }}</button>
                }
              }
            </div>

            <!-- Also offer a dropdown for accessibility / many slots -->
            @if (state.availableSlotsCount() > 9) {
              <div class="mt-3">
                <label class="form-label text-xs text-outline" for="slotSelectDropdown">O elige del listado</label>
                <select
                  id="slotSelectDropdown"
                  class="form-select w-full text-base mt-1"
                  [value]="state.selectedSlot()?._rowIndex ?? ''"
                  (change)="onDropdownSelect($event)"
                >
                  <option value="" disabled>Selecciona un horario disponible</option>
                  @for (row of state.reservations(); track row._rowIndex) {
                    @if (!state.isTaken(row)) {
                      <option [value]="row._rowIndex" [selected]="state.selectedSlot()?._rowIndex === row._rowIndex">
                        {{ formatTime24(row.franja) }}
                      </option>
                    }
                  }
                </select>
              </div>
            }
          } @else {
            <p class="rounded-2xl bg-surface-low px-4 py-6 text-center text-sm text-outline mt-2">
              No hay franjas disponibles por ahora.
            </p>
          }
        </div>

        <!-- Selected slot confirmation card -->
        @if (state.selectedSlot()) {
          <div class="rounded-2xl border border-primary/20 bg-brand-soft-high p-4">
            <p class="section-label">Horario seleccionado</p>
            <div class="flex items-center gap-3 mt-2">
              <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white">
                <span class="material-icons-round text-[1.1rem]">schedule</span>
              </div>
              <div>
                <p class="font-display text-lg font-semibold text-on-surface">{{ formatTime24(state.selectedSlot()!.franja) }}</p>
                <p class="text-sm text-on-surface-variant">Listo para continuar con tus datos</p>
              </div>
            </div>
            @if (state.selectedSlot()!.notas) {
              <p class="mt-3 text-sm text-on-surface-variant">{{ state.selectedSlot()!.notas }}</p>
            }
          </div>
        }
      }
    </div>
  `,
})
export class BookingStep2SlotComponent {
  readonly state = inject(BookingStateService);
  readonly formatTime24 = formatTime24;

  readonly changeService = output<void>();
  readonly retry = output<void>();

  onDropdownSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) { this.state.selectedSlot.set(null); return; }
    const row = this.state.reservations().find(r => String(r._rowIndex) === value);
    if (!row || this.state.isTaken(row)) { this.state.selectedSlot.set(null); return; }
    this.state.selectedSlot.set(row);
  }
}
