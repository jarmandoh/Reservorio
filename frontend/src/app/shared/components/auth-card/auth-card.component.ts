import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-surface flex items-center justify-center p-6 relative overflow-hidden">
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.8]"
        style="background-image: url('assets/imgs/comercio.jpg'); background-repeat: no-repeat; background-size: cover; background-position: center;"
      ></div>
      <div class="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
      <div
        class="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary-container/10 blur-3xl"
      ></div>
      <div class="relative z-10 w-full max-w-md bg-white/95 backdrop-blur rounded-3xl shadow-soft p-8">
        <div class="mb-6 text-center">
          <h1 class="font-display text-2xl font-bold">{{ title }}</h1>
          @if (subtitle) {
            <p class="text-sm text-on-surface-variant mt-2">{{ subtitle }}</p>
          }
        </div>

        <form [formGroup]="formGroup" (ngSubmit)="formSubmit.emit()" class="space-y-4">
          <ng-content></ng-content>

          @if (errorMessage) {
            <div
              class="rounded-2xl border border-error/30 bg-error-container p-3 text-sm text-error"
              id="auth-error"
              role="alert"
              aria-live="assertive"
            >
              {{ errorMessage }}
            </div>
          }

          <button
            type="submit"
            class="btn-primary w-full"
            [disabled]="isSubmitDisabled || loading"
            [attr.aria-busy]="loading"
          >
            @if (loading) {
              <span class="material-icons-round text-base animate-spin" aria-hidden="true">refresh</span>
              {{ loadingLabel }}
            } @else {
              {{ submitLabel }}
            }
          </button>
        </form>

        @if (footerText || footerActionLabel) {
          <div class="mt-6 text-center text-sm text-on-surface-variant">
            {{ footerText }}
            @if (footerActionLabel) {
              <button class="text-primary font-semibold" type="button" (click)="footerAction.emit()">
                {{ footerActionLabel }}
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class AuthCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() formGroup!: FormGroup;
  @Input() submitLabel = 'Continuar';
  @Input() loadingLabel = 'Cargando…';
  @Input() loading = false;
  @Input() isSubmitDisabled = false;
  @Input() errorMessage: string | null = null;
  @Input() footerText = '';
  @Input() footerActionLabel = '';

  @Output() formSubmit = new EventEmitter<void>();
  @Output() footerAction = new EventEmitter<void>();
}
