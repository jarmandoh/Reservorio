import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, AbstractControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookingStateService } from '../booking-state.service';
import { formatTime24 } from '../../../core/config/time';

@Component({
  selector: 'app-booking-step3-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex flex-col gap-0">
      <!-- Cancellation policy banner (outside card padding) -->
      @if (cancellationPolicy()) {
        <div class="mx-5 mt-5 rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <div class="flex items-start gap-2">
            <span class="material-icons-round text-amber-600 flex-shrink-0 text-base">info</span>
            <div>
              <p class="text-sm font-semibold text-amber-900">Política de Cancelación</p>
              <p class="text-xs text-amber-700 mt-1">{{ cancellationPolicy() }}</p>
            </div>
          </div>
        </div>
      }

      <div class="flex flex-col gap-5 px-5 py-5">
        <!-- Step header -->
        <div class="rounded-2xl border border-primary-fixed bg-brand-soft-high p-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Paso 3 de 4</p>
          <h2 class="mt-2 font-display text-2xl font-semibold text-on-surface">Completa tus datos</h2>
          <p class="mt-1 text-sm text-on-surface-variant">Déjanos tus datos para confirmar la solicitud contigo.</p>
        </div>

        <!-- Trust badges -->
        <div class="flex flex-wrap gap-2">
          @if (verified()) {
            <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
              <span class="material-icons-round text-[12px]">verified</span>Negocio verificado
            </span>
          }
          <span class="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700">
            <span class="material-icons-round text-[12px]">security</span>Pago seguro
          </span>
          @if (reviewCount() > 0) {
            <span class="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
              <span class="material-icons-round text-[12px]">star</span>
              {{ reviewCount() }} reseña{{ reviewCount() === 1 ? '' : 's' }}
            </span>
          }
        </div>

        <!-- Booking summary (service + slot) -->
        <div class="grid gap-3">
          <div class="rounded-2xl border border-outline-variant bg-white p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-outline">Servicio</p>
                <p class="mt-1 font-display text-lg font-semibold text-on-surface">{{ state.selectedService() }}</p>
              </div>
              <button type="button" class="btn-tertiary btn-sm" (click)="editService.emit()">Editar</button>
            </div>
          </div>
          <div class="rounded-2xl border border-outline-variant bg-white p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-outline">Horario</p>
                <p class="mt-1 font-display text-lg font-semibold text-on-surface">{{ formatTime24(state.selectedSlot()?.franja) }}</p>
              </div>
              <button type="button" class="btn-tertiary btn-sm" (click)="editSlot.emit()">Editar</button>
            </div>
          </div>
        </div>

        <!-- Auth wall (unauthenticated) -->
        @if (!isAuthenticated()) {
          <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-3">
            <div class="flex items-start gap-3">
              <span class="material-icons-round text-amber-600">lock</span>
              <div class="flex-1">
                <p class="text-sm font-semibold text-amber-900">Debes estar registrado para reservar</p>
                <p class="text-xs text-amber-700 mt-1">Inicia sesión o crea tu cuenta para confirmar esta reserva. Tus datos se precargarán.</p>
              </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-2">
              <button type="button" class="btn-primary btn-sm flex-1" (click)="goToAuth.emit()">Iniciar sesión</button>
              <button type="button" class="btn-secondary btn-sm flex-1" (click)="goToAuth.emit()">Crear cuenta</button>
            </div>
          </div>
        }

        <!-- Form -->
        <form
          [formGroup]="form()"
          class="flex flex-col gap-4"
          (ngSubmit)="submitForm.emit()"
          [attr.aria-describedby]="state.submitAttempted() && form().invalid ? 'booking-form-error' : null"
        >
          <!-- Global error banner -->
          @if (state.submitAttempted() && form().invalid) {
            <p id="booking-form-error" class="rounded-xl bg-error-container px-3 py-2 text-sm text-error-on-container" role="alert" aria-live="assertive">
              Revisa los campos señalados antes de continuar.
            </p>
          }

          <!-- Nombre -->
          <div>
            <label class="form-label" for="cliente">Tu nombre</label>
            <div class="icon-field">
              <span class="material-icons-round" aria-hidden="true">person</span>
              <input
                id="cliente"
                type="text"
                class="form-input min-h-[48px]"
                formControlName="cliente"
                placeholder="Ana García"
                autocomplete="name"
                required
                [attr.aria-invalid]="fieldInvalid('cliente') ? 'true' : null"
                [attr.aria-describedby]="fieldInvalid('cliente') ? 'cliente-error' : null"
              />
            </div>
            @if (fieldInvalid('cliente')) {
              <p id="cliente-error" class="mt-1 text-xs text-error" role="alert">Escribe tu nombre (mínimo 2 caracteres).</p>
            }
          </div>

          <!-- Teléfono -->
          <div>
            <label class="form-label" for="telefono">Tu teléfono</label>
            <div class="icon-field">
              <span class="material-icons-round" aria-hidden="true">phone</span>
              <input
                id="telefono"
                type="tel"
                class="form-input min-h-[48px]"
                formControlName="telefono"
                placeholder="300 123 4567"
                autocomplete="tel"
                required
                [attr.aria-invalid]="fieldInvalid('telefono') ? 'true' : null"
                [attr.aria-describedby]="fieldInvalid('telefono') ? 'telefono-error' : null"
              />
            </div>
            @if (fieldInvalid('telefono')) {
              <p id="telefono-error" class="mt-1 text-xs text-error" role="alert">Introduce un teléfono válido (7-15 dígitos).</p>
            }
          </div>

          <!-- Notas (optional) -->
          <div>
            <label class="form-label" for="notas">Notas adicionales <span class="text-outline font-normal">(opcional)</span></label>
            <textarea
              id="notas"
              class="form-input min-h-[80px] resize-none"
              formControlName="notas"
              placeholder="¿Alguna indicación especial?"
              maxlength="300"
              rows="3"
            ></textarea>
          </div>

          <!-- Data consent -->
          <label class="flex cursor-pointer items-start gap-3 rounded-2xl border border-outline-variant bg-white p-3">
            <input
              id="dataConsent"
              type="checkbox"
              formControlName="dataConsent"
              class="mt-0.5 h-5 w-5 accent-primary"
              required
              [attr.aria-invalid]="fieldInvalid('dataConsent') ? 'true' : null"
              [attr.aria-describedby]="fieldInvalid('dataConsent') ? 'data-consent-error' : null"
            />
            <span class="flex-1 text-xs leading-5 text-on-surface-variant">
              He leído y acepto la
              <a routerLink="/privacy" class="font-semibold text-primary underline">política de privacidad</a>
              y el tratamiento de mis datos para gestionar esta reserva.
            </span>
          </label>
          @if (fieldInvalid('dataConsent')) {
            <p id="data-consent-error" class="mt-1 text-xs text-error" role="alert">Debes aceptar la política de privacidad.</p>
          }

          <!-- Hint -->
          <div class="rounded-2xl border border-primary/15 bg-primary-fixed px-3 py-3 text-xs sm:text-sm text-primary">
            Completa y envía. El negocio confirmará tu reserva en minutos.
          </div>
        </form>
      </div>
    </div>
  `,
})
export class BookingStep3FormComponent {
  readonly state = inject(BookingStateService);
  readonly formatTime24 = formatTime24;

  // Inputs
  readonly form = input.required<FormGroup>();
  readonly isAuthenticated = input.required<boolean>();
  readonly verified = input(false);
  readonly reviewCount = input(0);
  readonly cancellationPolicy = input<string | undefined>(undefined);

  // Outputs
  readonly editService = output<void>();
  readonly editSlot = output<void>();
  readonly goToAuth = output<void>();
  readonly submitForm = output<void>();

  fieldInvalid(name: string): boolean {
    const ctrl = this.form().get(name) as AbstractControl | null;
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }
}
