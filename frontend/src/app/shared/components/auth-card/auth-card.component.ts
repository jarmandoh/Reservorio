import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-surface flex items-center justify-center p-6">
      <div class="w-full max-w-md bg-white rounded-3xl shadow-soft p-8">
        <div class="mb-6 text-center">
          <h1 class="font-display text-2xl font-bold">{{ title }}</h1>
          @if (subtitle) {
            <p class="text-sm text-on-surface-variant mt-2">{{ subtitle }}</p>
          }
        </div>

        <form [formGroup]="formGroup" (ngSubmit)="submit.emit()" class="space-y-4">
          <ng-content></ng-content>

          @if (errorMessage) {
            <div class="rounded-2xl border border-error/30 bg-error-container p-3 text-sm text-error">
              {{ errorMessage }}
            </div>
          }

          <button type="submit" class="btn-primary w-full" [disabled]="isSubmitDisabled || loading">
            @if (loading) {
              <span class="material-icons-round text-base animate-spin">refresh</span>
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

  @Output() submit = new EventEmitter<void>();
  @Output() footerAction = new EventEmitter<void>();
}
