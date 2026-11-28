import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { BookingStateService } from './booking-state.service';
import { formatCalendarDate } from '../../core/config/date-time';

@Component({
  selector: 'app-booking-reviews',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="border-t border-outline-variant px-5 pt-6 pb-5">
      <h3 class="font-display text-lg font-semibold text-on-surface mb-4">Reseñas del negocio</h3>

      <!-- Existing reviews -->
      @if (state.reviews().length > 0) {
        <div class="flex flex-col gap-3 mb-5">
          @for (review of state.reviews(); track review.id) {
            <div class="rounded-2xl border border-outline-variant/30 bg-white/60 p-4">
              <div class="flex items-center gap-1 mb-2">
                @for (i of [1, 2, 3, 4, 5]; track i) {
                  <span
                    class="material-icons-round text-[0.9rem]"
                    [class.text-yellow-400]="i <= review.rating"
                    [class.text-outline]="i > review.rating"
                    aria-hidden="true"
                    >star</span
                  >
                }
              </div>
              @if (review.review) {
                <p class="text-sm text-on-surface">{{ review.review }}</p>
              }
              <time [attr.datetime]="review.createdAt" class="text-xs text-on-surface-variant mt-2 block">{{
                formatCalendarDate(review.createdAt)
              }}</time>
            </div>
          }
        </div>
      } @else {
        <p class="text-sm text-on-surface-variant mb-4">
          No hay reseñas aún. ¡Sé el primero en compartir tu experiencia!
        </p>
      }

      <!-- Leave a review -->
      <div class="rounded-2xl border border-primary-fixed bg-brand-soft-high p-4">
        <p class="text-sm font-semibold text-primary mb-3">Deja tu reseña</p>

        <!-- Star picker -->
        <div class="flex gap-2 mb-4" role="group" aria-label="Calificación">
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <button
              class="p-2 rounded-lg transition hover:bg-white/50"
              type="button"
              (click)="form().patchValue({ rating: i })"
              [class.bg-yellow-400/20]="i <= (form().get('rating')?.value || 0)"
              [attr.aria-label]="i + ' estrellas'"
              [attr.aria-pressed]="i === (form().get('rating')?.value || 0)"
            >
              <span
                class="material-icons-round text-[1.5rem]"
                [class.text-yellow-400]="i <= (form().get('rating')?.value || 0)"
                [class.text-outline]="i > (form().get('rating')?.value || 0)"
                >star</span
              >
            </button>
          }
        </div>

        <!-- Review text -->
        <label for="review-text" class="sr-only">Tu reseña (opcional)</label>
        <textarea
          id="review-text"
          class="form-input resize-none"
          formControlName="review"
          [formGroup]="form()"
          placeholder="Cuenta tu experiencia (opcional)"
          maxlength="500"
          rows="2"
        ></textarea>

        <!-- Submit -->
        <button
          class="btn-primary w-full mt-3 min-h-[44px]"
          type="button"
          [disabled]="(form().get('rating')?.value || 0) === 0 || state.submitting()"
          (click)="submitReview.emit()"
        >
          @if (state.submitting()) {
            <span class="material-icons-round animate-spin text-base">refresh</span>
          } @else {
            <span>Enviar reseña</span>
          }
        </button>
      </div>
    </div>
  `,
})
export class BookingReviewsComponent {
  readonly state = inject(BookingStateService);
  readonly formatCalendarDate = formatCalendarDate;
  readonly form = input.required<FormGroup>();
  readonly submitReview = output<void>();
}
