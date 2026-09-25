import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-pin-auth-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-dvh bg-surface flex flex-col items-center justify-center p-6">
      <div class="w-full max-w-sm flex flex-col gap-6">
        <ng-content select="[header]"></ng-content>

        @if (errorMessage) {
          <div
            class="flex gap-3 p-4 rounded-xl text-sm bg-error-container text-error-on-container border border-error/40"
          >
            <span class="material-icons-round text-base mt-0.5">error_outline</span>
            <p>{{ errorMessage }}</p>
          </div>
        }

        <form [formGroup]="formGroup" (ngSubmit)="submit.emit()" class="card flex flex-col gap-4">
          <ng-content></ng-content>

          <button type="submit" class="btn-primary w-full" [disabled]="isSubmitDisabled || loading">
            @if (loading) {
              <span class="material-icons-round text-base animate-spin">refresh</span>
              {{ loadingLabel }}
            } @else {
              {{ submitLabel }}
            }
          </button>
        </form>

        @if (footerLabel) {
          <button
            type="button"
            class="text-sm text-on-surface-variant hover:text-primary transition"
            (click)="footerAction.emit()"
          >
            {{ footerLabel }}
          </button>
        }

        @if (backLabel) {
          <button
            type="button"
            class="flex items-center justify-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition"
            (click)="backAction.emit()"
          >
            <span class="material-icons-round text-base">arrow_back</span>
            {{ backLabel }}
          </button>
        }
      </div>
    </div>
  `,
})
export class PinAuthCardComponent {
  @Input() formGroup!: FormGroup;
  @Input() loading = false;
  @Input() submitLabel = 'Entrar';
  @Input() loadingLabel = 'Verificando…';
  @Input() isSubmitDisabled = false;
  @Input() errorMessage: string | null = null;
  @Input() footerLabel = '';
  @Input() backLabel = '';

  @Output() submit = new EventEmitter<void>();
  @Output() footerAction = new EventEmitter<void>();
  @Output() backAction = new EventEmitter<void>();
}
