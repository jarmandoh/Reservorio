import { Component, OnInit, OnDestroy, signal, computed, inject, DestroyRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { interval, Subscription, switchMap, startWith, catchError, of, fromEvent } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { AuthService } from '../../core/services/auth.service';
import { DEFAULT_CURRENCY, formatCurrency } from '../../core/config/currency';
import { isAllowedCheckoutRedirect } from '../../core/config/checkout-url';
import { IdempotencyAttempt, clearIdempotencyAttempt, idempotencyAttempt } from '../../core/config/idempotency-key';
import { formatTime24 } from '../../core/config/time';
import type { BookingStep, ConfirmedBooking, BookingProgress } from './booking.types';

import { BookingStateService } from './booking-state.service';
import { BookingStep1ServiceComponent } from './steps/booking-step1-service.component';
import { BookingStep2SlotComponent } from './steps/booking-step2-slot.component';
import { BookingStep3FormComponent } from './steps/booking-step3-form.component';
import { BookingStep4ConfirmationComponent } from './steps/booking-step4-confirmation.component';
import { BookingReviewsComponent } from './booking-reviews.component';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BookingStep1ServiceComponent,
    BookingStep2SlotComponent,
    BookingStep3FormComponent,
    BookingStep4ConfirmationComponent,
    BookingReviewsComponent,
  ],
  providers: [BookingStateService],
  template: `
    <div
      class="booking-shell min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(26,115,232,0.26),_transparent_32%),linear-gradient(180deg,#040814_0%,#091324_52%,#0c1628_100%)] text-white"
      [class.booking-embedded]="embedded"
    >
      <div class="booking-container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div
          class="booking-layout grid gap-8 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start lg:gap-12"
        >
          <!-- ── Left panel: hero + steps (hidden in embedded mode) ── -->
          @if (!embedded) {
            <section
              class="order-2 lg:order-1 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-6"
            >
              <div class="flex flex-col justify-center gap-8 lg:min-h-full">
                <!-- Headline -->
                <div class="space-y-5">
                  <span
                    class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-light backdrop-blur-sm"
                  >
                    <span class="material-icons-round text-[0.9rem]">bolt</span>
                    Reserva sin esperas
                  </span>
                  <h1 class="font-display text-4xl font-bold leading-[1.05] text-balance sm:text-5xl lg:text-[3.5rem]">
                    Agenda tu cita en minutos.
                    <span class="mt-1 block text-brand-sky">Rápido, claro y al instante.</span>
                  </h1>
                  <p class="max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                    Elige tu servicio, revisa la disponibilidad y deja tus datos para pedir la reserva en un flujo
                    simple.
                  </p>
                </div>

                <!-- Step guide list -->
                <ol class="flex flex-col">
                  @for (item of instructionItems; track item.order; let last = $last) {
                    <li class="relative flex gap-4" [class.pb-7]="!last" [class.pb-1]="last">
                      @if (!last) {
                        <span
                          class="absolute left-4 top-9 h-[calc(100%-2.25rem)] w-px bg-gradient-to-b from-white/25 to-transparent"
                          aria-hidden="true"
                        ></span>
                      }
                      <span
                        class="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold text-white backdrop-blur-sm transition"
                        [class.border]="state.step() < item.stepValue"
                        [class.border-white/20]="state.step() < item.stepValue"
                        [class.bg-white/10]="state.step() < item.stepValue"
                        [class.bg-primary]="state.step() >= item.stepValue"
                        [class.border-primary]="state.step() >= item.stepValue"
                      >
                        @if (state.step() > item.stepValue) {
                          <span class="material-icons-round text-[0.85rem]">check</span>
                        } @else {
                          {{ item.order }}
                        }
                      </span>
                      <div class="pt-0.5">
                        <p
                          class="font-display text-base font-semibold text-white"
                          [class.opacity-50]="state.step() < item.stepValue"
                        >
                          {{ item.title }}
                        </p>
                        <p
                          class="mt-1 text-sm leading-6 text-slate-300"
                          [class.opacity-50]="state.step() < item.stepValue"
                        >
                          {{ item.description }}
                        </p>
                      </div>
                    </li>
                  }
                </ol>

                <!-- Tip -->
                <div
                  class="flex items-start gap-3 rounded-2xl border-l-2 border-brand-sky/60 bg-white/[0.07] px-4 py-3.5 backdrop-blur-sm sm:max-w-xl"
                >
                  <span class="material-icons-round mt-0.5 flex-shrink-0 text-brand-light">lightbulb</span>
                  <p class="text-sm leading-6 text-slate-200">
                    <span class="font-semibold text-white">Puedes volver atrás en cualquier momento.</span>
                    Ajusta el servicio o el horario sin perder lo que ya completaste.
                  </p>
                </div>
              </div>
            </section>
          }

          <!-- ── Right panel: booking card ── -->
          <section class="order-1 flex justify-center lg:order-2 lg:justify-end">
            <div
              class="booking-card-shell w-full max-w-[430px] rounded-[2.1rem] border border-white/10 bg-white/5 p-3 shadow-[0_32px_80px_rgba(0,0,0,0.45)] backdrop-blur-md"
            >
              <div
                class="overflow-hidden rounded-[1.8rem] border border-primary-fixed/20 bg-surface-lowest text-on-surface shadow-soft"
              >
                <!-- Card header -->
                <header
                  class="border-b border-white/10 bg-gradient-to-br from-brand-strong via-primary to-primary-container px-5 py-4 text-white"
                >
                  <div class="flex items-center gap-3">
                    <!-- Back / done icon -->
                    @if (!embedded) {
                      @if (state.step() < 4) {
                        <button
                          class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/15"
                          (click)="goBack()"
                          aria-label="Volver al paso anterior"
                        >
                          <span class="material-icons-round text-[1.15rem]">arrow_back</span>
                        </button>
                      } @else {
                        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                          <span class="material-icons-round text-[1.15rem]">check</span>
                        </div>
                      }
                    }

                    <!-- Business info -->
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <p class="truncate text-sm font-semibold">{{ state.business()?.name ?? 'Reserva tu cita' }}</p>
                        @if (state.business()?.verified) {
                          <span
                            class="material-icons-round text-[0.9rem] text-green-400 flex-shrink-0"
                            title="Negocio verificado"
                            >verified</span
                          >
                        }
                      </div>
                      <div class="flex items-center gap-2 mt-0.5">
                        <p class="text-xs text-white/80">Reserva online</p>
                        @if (state.ratingStats()?.averageRating && state.ratingStats()!.averageRating > 0) {
                          <div class="flex items-center gap-1 text-xs bg-white/10 px-2 py-0.5 rounded-full">
                            <span class="material-icons-round text-[0.7rem] text-yellow-300">star</span>
                            <span class="text-white/90">{{
                              (state.ratingStats()?.averageRating || 0).toFixed(1)
                            }}</span>
                          </div>
                        }
                      </div>
                    </div>

                    <!-- Refresh button -->
                    @if (state.step() < 4) {
                      <button
                        class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/15"
                        (click)="startPolling()"
                        aria-label="Actualizar disponibilidad"
                        [disabled]="state.loading()"
                      >
                        <span class="material-icons-round text-[1.15rem]" [class.animate-spin]="state.loading()"
                          >refresh</span
                        >
                      </button>
                    }
                  </div>

                  @if (embedded) {
                    <div class="booking-modal-summary" aria-label="Resumen de tu reserva">
                      <div class="booking-modal-steps" aria-label="Progreso de la reserva">
                        @for (item of bookingSteps; track item.value) {
                          <div
                            class="booking-modal-step"
                            [class.is-complete]="state.step() > item.value"
                            [class.is-current]="state.step() === item.value"
                            [attr.aria-current]="state.step() === item.value ? 'step' : null"
                          >
                            <span class="booking-modal-step-icon material-icons-round" aria-hidden="true">
                              {{ state.step() > item.value ? 'check' : item.icon }}
                            </span>
                            <span class="booking-modal-step-label">{{ item.label }}</span>
                          </div>
                        }
                      </div>

                      <div class="booking-selection-card">
                        <div class="booking-selection-item">
                          <span class="material-icons-round" aria-hidden="true">spa</span>
                          <div>
                            <span class="booking-selection-label">Servicio</span>
                            <strong>{{ state.selectedService() || 'Por elegir' }}</strong>
                          </div>
                        </div>
                        <div class="booking-selection-divider" aria-hidden="true"></div>
                        <div class="booking-selection-item">
                          <span class="material-icons-round" aria-hidden="true">schedule</span>
                          <div>
                            <span class="booking-selection-label">Horario</span>
                            <strong class="booking-selection-time">{{
                              formatTime24(state.selectedSlot()?.franja) || 'Por elegir'
                            }}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  } @else {
                    <!-- Progress bar -->
                    <div class="mt-4">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                          Paso {{ state.step() }} de 4
                        </span>
                        <span class="text-xs font-medium text-white/60">
                          {{
                            state.step() === 1
                              ? 'Servicio'
                              : state.step() === 2
                                ? 'Horario'
                                : state.step() === 3
                                  ? 'Datos'
                                  : 'Confirmación'
                          }}
                        </span>
                      </div>
                      <!-- Step dots -->
                      <div class="flex gap-1.5 mb-2">
                        @for (s of [1, 2, 3, 4]; track s) {
                          <div
                            class="h-1.5 flex-1 rounded-full transition-all duration-300"
                            [class.bg-white]="s <= state.step()"
                            [class.bg-white/25]="s > state.step()"
                          ></div>
                        }
                      </div>
                    </div>
                  }
                </header>

                <!-- ── Step content ── -->
                <div class="flex flex-col">
                  @if (state.step() === 1) {
                    <app-booking-step1-service (repeatLast)="repeatLastService()" (retryServices)="loadServices()" />
                  }

                  @if (state.step() === 2) {
                    <app-booking-step2-slot
                      [showSelectedSlotSummary]="!embedded"
                      (changeService)="goToStep(1)"
                      (retry)="startPolling()"
                    />
                  }

                  @if (state.step() === 3) {
                    <app-booking-step3-form
                      [form]="bookingForm"
                      [isAuthenticated]="isCustomerAuthenticated()"
                      [verified]="state.business()?.verified ?? false"
                      [reviewCount]="state.reviews().length"
                      [cancellationPolicy]="state.business()?.cancellationPolicy"
                      [showBookingSummary]="!embedded"
                      (editService)="goToStep(1)"
                      (editSlot)="goToStep(2)"
                      (goToAuth)="goToCustomerAuth()"
                      (submitForm)="submit()"
                    />
                  }

                  @if (state.step() === 4) {
                    <app-booking-step4-confirmation (startCheckout)="startCheckout()" (newBooking)="resetFlow()" />
                    <app-booking-reviews [form]="reviewForm" (submitReview)="submitReview()" />
                  }

                  <!-- ── Sticky bottom CTA (steps 1-3) ── -->
                  @if (state.step() < 4) {
                    <div class="border-t border-outline-variant/20 bg-white px-5 py-4">
                      <button
                        class="btn-primary w-full min-h-[56px] text-base"
                        [disabled]="state.submitting()"
                        (click)="handleNext()"
                        [attr.aria-label]="nextLabel()"
                      >
                        @if (state.submitting()) {
                          <span class="material-icons-round animate-spin text-base">refresh</span>
                          <span>Enviando...</span>
                        } @else {
                          <span>{{ nextLabel() }}</span>
                          <span class="material-icons-round text-base">arrow_forward</span>
                        }
                      </button>
                    </div>
                  }
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .booking-embedded {
        min-height: 0 !important;
        height: auto;
        background: transparent !important;
      }
      .booking-embedded .booking-container {
        max-width: none;
        padding: 0;
      }
      .booking-embedded .booking-layout {
        display: block;
        min-height: 0;
      }
      .booking-embedded .booking-card-shell {
        max-width: none;
        padding: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        backdrop-filter: none;
      }
      .booking-embedded .booking-modal-summary {
        margin-top: 1rem;
      }
      .booking-embedded .booking-modal-steps {
        position: relative;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.35rem;
      }
      .booking-embedded .booking-modal-steps::before {
        position: absolute;
        top: 0.9rem;
        right: 10%;
        left: 10%;
        z-index: 0;
        height: 1px;
        background: rgba(255, 255, 255, 0.22);
        content: '';
      }
      .booking-embedded .booking-modal-step {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35rem;
        color: rgba(255, 255, 255, 0.58);
        font-size: 0.62rem;
        font-weight: 650;
        text-align: center;
      }
      .booking-embedded .booking-modal-step-icon {
        display: grid;
        width: 1.85rem;
        height: 1.85rem;
        place-items: center;
        border: 1px solid rgba(255, 255, 255, 0.24);
        border-radius: 0.68rem;
        background: #195b9e;
        box-shadow: 0 0 0 4px #1671d6;
        font-size: 0.95rem;
        transition:
          transform 180ms ease,
          background 180ms ease,
          color 180ms ease;
      }
      .booking-embedded .booking-modal-step.is-current {
        color: white;
      }
      .booking-embedded .booking-modal-step.is-current .booking-modal-step-icon {
        border-color: rgba(255, 255, 255, 0.7);
        background: white;
        box-shadow:
          0 0 0 4px #1671d6,
          0 0 0 7px rgba(186, 224, 255, 0.24);
        color: #0757aa;
        transform: translateY(-2px);
      }
      .booking-embedded .booking-modal-step.is-complete {
        color: rgba(231, 247, 255, 0.9);
      }
      .booking-embedded .booking-modal-step.is-complete .booking-modal-step-icon {
        border-color: rgba(190, 247, 224, 0.45);
        background: #08755f;
        color: white;
      }
      .booking-embedded .booking-selection-card {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
        align-items: center;
        gap: 0.65rem;
        margin-top: 1rem;
        padding: 0.75rem;
        border: 1px solid rgba(213, 238, 255, 0.24);
        border-radius: 1rem;
        background: rgba(4, 37, 76, 0.3);
        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.1) inset;
      }
      .booking-embedded .booking-selection-item {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.55rem;
      }
      .booking-embedded .booking-selection-item > .material-icons-round {
        display: grid;
        width: 1.9rem;
        height: 1.9rem;
        flex: 0 0 auto;
        place-items: center;
        border-radius: 0.65rem;
        background: rgba(255, 255, 255, 0.14);
        color: #c3e4ff;
        font-size: 1rem;
      }
      .booking-embedded .booking-selection-item div {
        min-width: 0;
      }
      .booking-embedded .booking-selection-label {
        display: block;
        margin-bottom: 0.08rem;
        color: rgba(228, 243, 255, 0.63);
        font-size: 0.58rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .booking-embedded .booking-selection-item strong {
        display: block;
        overflow: hidden;
        color: white;
        font-size: 0.75rem;
        font-weight: 650;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .booking-embedded .booking-selection-time {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-variant-numeric: tabular-nums;
      }
      .booking-embedded .booking-selection-divider {
        width: 1px;
        height: 2.4rem;
        background: rgba(219, 238, 255, 0.2);
      }
      @media (prefers-reduced-motion: reduce) {
        .booking-embedded * {
          scroll-behavior: auto !important;
        }
      }
      @media (max-width: 390px) {
        .booking-embedded .booking-modal-step-label {
          font-size: 0.55rem;
        }
        .booking-embedded .booking-selection-card {
          gap: 0.45rem;
          padding: 0.65rem;
        }
        .booking-embedded .booking-selection-item strong {
          font-size: 0.68rem;
        }
      }
    `,
  ],
})
export class BookingComponent implements OnInit, OnDestroy {
  // ── DI ────────────────────────────────────────────────────────────────
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly realtime = inject(RealtimeService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = inject(BookingStateService);
  readonly formatTime24 = formatTime24;
  readonly bookingSteps = [
    { value: 1, label: 'Servicio', icon: 'spa' },
    { value: 2, label: 'Horario', icon: 'schedule' },
    { value: 3, label: 'Datos', icon: 'person' },
    { value: 4, label: 'Listo', icon: 'task_alt' },
  ];

  // ── Idempotency ────────────────────────────────────────────────────────
  private reservationAttempt: IdempotencyAttempt | null = null;
  private paymentAttempt: IdempotencyAttempt | null = null;
  private pendingBookingProgress: BookingProgress | null = null;

  // ── Inputs ─────────────────────────────────────────────────────────────
  @Input() businessIdOverride = '';
  @Input() initialServiceName = '';
  @Input() embedded = false;

  businessId = '';

  // ── Forms ──────────────────────────────────────────────────────────────
  readonly bookingForm = this.fb.group({
    cliente: ['', [Validators.required, Validators.minLength(2)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9+\s\-]{7,15}$/)]],
    notas: [''],
    dataConsent: [false, [Validators.requiredTrue]],
  });

  readonly reviewForm = this.fb.group({
    rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    review: ['', [Validators.maxLength(500)]],
  });

  // ── Computed ───────────────────────────────────────────────────────────
  readonly isCustomerAuthenticated = computed(() => this.auth.isCustomerUnlocked());

  readonly nextLabel = computed(() => {
    const s = this.state.step();
    if (s === 1) return this.state.selectedService() ? 'Continuar al horario' : 'Selecciona un servicio';
    if (s === 2) return this.state.selectedSlot() ? 'Continuar con tus datos' : 'Selecciona un horario';
    if (s === 3) return 'Confirmar reserva';
    return '';
  });

  private readonly bookingFormValid = signal(false);

  // ── Polling ────────────────────────────────────────────────────────────
  private readonly POLL_MS = 15_000;
  private pollSub?: Subscription;

  readonly instructionItems = [
    {
      order: '01',
      stepValue: 1,
      title: 'Elige qué quieres reservar',
      description: 'Selecciona el servicio y avanza al siguiente paso.',
    },
    {
      order: '02',
      stepValue: 2,
      title: 'Escoge el mejor horario',
      description: 'Revisa la disponibilidad y toma la franja que mejor te sirva.',
    },
    {
      order: '03',
      stepValue: 3,
      title: 'Confirma en un momento',
      description: 'Deja tus datos, revisa el resumen y envía la reserva.',
    },
  ] as const;

  // ── Lifecycle ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.businessId = this.businessIdOverride || this.route.snapshot.params['businessId'] || '';
    this.restoreBookingProgress();

    // Sync form validity to signal
    this.bookingForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.bookingFormValid.set(this.bookingForm.valid));

    this.loadLastBooking();
    this.setupVisibilityPause();

    // Load business metadata
    this.api
      .getBusinesses()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(list => {
        const found = list.find(b => b.id === this.businessId);
        if (!found) {
          location.replace('/');
          return;
        }
        this.state.business.set(found);
      });

    this.api.trackBusinessView(this.businessId).subscribe();
    this.loadServices();
    this.loadReviews();
    this.loadRatingStats();
    this.startPolling();
    this.setupRealtime();
    this.prefillFromCustomer();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  // ── Data loading ──────────────────────────────────────────────────────

  loadServices(): void {
    this.state.servicesLoading.set(true);
    this.state.servicesError.set(null);
    this.api
      .getBusinessServices(this.businessId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          const names = data.map(s => (typeof s === 'string' ? s : s.nombre));
          this.state.services.set(names);
          this.state.servicePrices.set(
            Object.fromEntries(
              data
                .filter(s => typeof s !== 'string' && Number.isFinite(s.precio) && s.precio !== null)
                .map(s => [s.nombre, Number(s.precio)])
            )
          );
          this.applyBookingProgress();
          if (this.initialServiceName && names.includes(this.initialServiceName)) {
            this.state.selectedService.set(this.initialServiceName);
            if (this.embedded) this.goToStep(2);
          }
          this.state.servicesLoading.set(false);
        },
        error: err => {
          this.state.servicesError.set(err.message);
          this.state.services.set([]);
          this.state.servicesLoading.set(false);
        },
      });
  }

  loadReviews(): void {
    this.api
      .getReviews(this.businessId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => this.state.reviews.set(data),
        error: () => this.state.reviews.set([]),
      });
  }

  loadRatingStats(): void {
    this.api
      .getAverageRating(this.businessId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => this.state.ratingStats.set(data),
        error: () => this.state.ratingStats.set(null),
      });
  }

  startPolling(): void {
    if (typeof document !== 'undefined' && document.hidden) return;
    this.pollSub?.unsubscribe();
    this.pollSub = interval(this.POLL_MS)
      .pipe(
        startWith(0),
        switchMap(() => {
          this.state.loading.set(true);
          this.state.error.set(null);
          return this.api.getBusinessAvailability(this.businessId);
        })
      )
      .subscribe({
        next: data => {
          this.state.reservations.set(data);
          this.applyBookingProgress();
          this.state.loading.set(false);
        },
        error: err => {
          this.state.error.set(err.message);
          this.state.loading.set(false);
        },
      });
  }

  // ── Navigation ────────────────────────────────────────────────────────

  goToStep(s: BookingStep): void {
    if (s === 3) this.prefillFromLastBooking();
    this.state.step.set(s);
    // Scroll the booking card into view on mobile
    if (typeof window !== 'undefined') {
      const el = document.querySelector('.booking-card-shell');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  goBack(): void {
    const s = this.state.step();
    if (s > 1) this.goToStep((s - 1) as BookingStep);
    else this.router.navigate(['/']);
  }

  handleNext(): void {
    const s = this.state.step();
    if (s === 1) {
      if (!this.state.selectedService()) {
        this.toast.show('Selecciona un servicio para continuar.', 'default');
        return;
      }
      this.goToStep(2);
    } else if (s === 2) {
      if (!this.state.selectedSlot()) {
        this.toast.show('Elige un horario disponible para continuar.', 'default');
        return;
      }
      if (!this.isCustomerAuthenticated()) {
        this.toast.error('Debes iniciar sesión para reservar. Redirigiendo...');
        this.goToCustomerAuth();
        return;
      }
      this.goToStep(3);
    } else if (s === 3) {
      this.submit();
    }
  }

  goToCustomerAuth(): void {
    const service = this.state.selectedService();
    const slot = this.state.selectedSlot();
    if (service && slot) {
      try {
        sessionStorage.setItem(this.bookingProgressKey(), JSON.stringify({ service, slotRowIndex: slot._rowIndex }));
      } catch {
        /* storage blocked */
      }
    }
    this.router.navigate(['/customer/login'], { queryParams: { redirect: `/booking/${this.businessId}` } });
  }

  // ── Booking submission ────────────────────────────────────────────────

  submit(): void {
    if (!this.isCustomerAuthenticated()) {
      this.toast.error('Debes estar registrado para hacer una reserva.');
      this.goToCustomerAuth();
      return;
    }
    this.bookingForm.markAllAsTouched();
    if (this.bookingForm.invalid || !this.state.selectedSlot() || !this.state.selectedService()) {
      this.state.submitAttempted.set(true);
      this.toast.error(this.missingBookingInformationMessage());
      return;
    }

    const { cliente, telefono, notas, dataConsent } = this.bookingForm.value;
    const payload: ConfirmedBooking = {
      franja: this.state.selectedSlot()!.franja,
      cliente: cliente!.trim(),
      telefono: telefono!.trim(),
      servicio: this.state.selectedService()!,
      notas: notas?.trim() ?? '',
    };

    const checkoutPayload = { ...payload, dataConsent: dataConsent === true };
    this.state.submitting.set(true);
    this.reservationAttempt = idempotencyAttempt(`reservation:${this.businessId}`, this.reservationAttempt, {
      businessId: this.businessId,
      payload: checkoutPayload,
    });

    this.api
      .createBusinessCheckout(this.businessId, checkoutPayload, this.reservationAttempt.key)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: checkout => {
          clearIdempotencyAttempt(`reservation:${this.businessId}`, this.reservationAttempt);
          const selected = this.state.selectedSlot();
          if (selected) {
            this.state.reservations.set(
              this.state
                .reservations()
                .map(row => (row._rowIndex === selected._rowIndex ? { ...row, disponibilidad: 'Reservado' } : row))
            );
          }
          this.state.confirmed.set(payload);
          this.state.reservationId.set(checkout.data?.bookingId ?? '');
          this.state.customerId.set(checkout.data?.customerId ?? '');
          this.state.paymentDetailsOpen.set(false);
          this.rememberBooking(payload);
          this.toast.success('¡Reserva enviada con éxito! Ya está lista para pagar o confirmar.');
          this.goToStep(4);
          this.state.submitting.set(false);
        },
        error: err => {
          this.toast.error(err?.message ?? 'La franja seleccionada ya no está disponible. Elige otra opción.');
          this.startPolling();
          this.state.submitting.set(false);
        },
      });
  }

  private missingBookingInformationMessage(): string {
    const missing: string[] = [];
    if (!this.state.selectedService()) missing.push('servicio');
    if (!this.state.selectedSlot()) missing.push('horario');
    if (this.bookingForm.controls.cliente.invalid) missing.push('nombre');
    if (this.bookingForm.controls.telefono.invalid) missing.push('teléfono');
    if (this.bookingForm.controls.dataConsent.invalid) missing.push('aceptación de la política de privacidad');
    return missing.length
      ? `Completa la información obligatoria: ${missing.join(', ')}.`
      : 'Revisa la información de tu reserva antes de continuar.';
  }

  // ── Payment ───────────────────────────────────────────────────────────

  startCheckout(): void {
    const booking = this.state.confirmed();
    if (!booking) return;
    const bookingId = this.state.reservationId();
    const customerId = this.state.customerId();
    if (!bookingId || !customerId) {
      this.toast.error('No se pudo preparar el checkout; vuelve a intentar la reserva.');
      return;
    }

    this.state.paymentLoading.set(true);
    this.state.checkoutInstructions.set(null);
    const providerId = this.businessId;
    const baseAmount = this.state.serviceMeta(booking.servicio).priceNumber;
    const amount = this.state.depositActive() ? Math.round(baseAmount * 0.3) : baseAmount;
    const method = this.state.paymentMethod();
    const successUrl = `${window.location.origin}/payment/success?bookingId=${encodeURIComponent(bookingId)}&providerId=${encodeURIComponent(providerId)}&customerId=${encodeURIComponent(customerId)}`;
    const cancelUrl = `${window.location.origin}/payment/cancel?bookingId=${encodeURIComponent(bookingId)}&providerId=${encodeURIComponent(providerId)}&customerId=${encodeURIComponent(customerId)}`;

    const checkoutPayload = {
      bookingId,
      providerId,
      customerId,
      amount,
      currency: DEFAULT_CURRENCY,
      method,
      deposit: this.state.depositActive(),
      successUrl,
      cancelUrl,
    };
    this.paymentAttempt = idempotencyAttempt(`payment:${bookingId}`, this.paymentAttempt, checkoutPayload);

    this.api
      .createCheckoutSession({ ...checkoutPayload }, this.paymentAttempt.key, this.auth.getCustomerToken() ?? '')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          clearIdempotencyAttempt(`payment:${bookingId}`, this.paymentAttempt);
          this.state.paymentLoading.set(false);
          const data = result.data;
          if (data?.checkoutUrl && isAllowedCheckoutRedirect(data.checkoutUrl)) {
            window.location.href = data.checkoutUrl;
            return;
          }
          if (data?.instructions) {
            this.state.checkoutInstructions.set(data.instructions);
            this.toast.success(
              method === 'transfer'
                ? 'Transferencia registrada: completa el pago con los datos indicados.'
                : 'Pago en efectivo registrado: paga al completar el servicio.'
            );
            return;
          }
          this.toast.success('Reserva registrada; el pago quedará listo para completar después.');
        },
        error: err => {
          this.state.paymentLoading.set(false);
          this.toast.error(err?.message ?? 'No se pudo iniciar el pago en este momento');
        },
      });
  }

  // ── Reviews ───────────────────────────────────────────────────────────

  submitReview(): void {
    const rating = this.reviewForm.get('rating')?.value || 0;
    if (rating === 0) return;
    this.state.submitting.set(true);
    this.api
      .createReview(this.businessId, {
        rating,
        review: this.reviewForm.get('review')?.value?.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('¡Gracias por tu reseña!');
          this.reviewForm.reset({ rating: 0, review: '' });
          this.loadReviews();
          this.loadRatingStats();
          this.state.submitting.set(false);
        },
        error: err => {
          this.toast.error(err?.message ?? 'Error al enviar reseña');
          this.state.submitting.set(false);
        },
      });
  }

  // ── Reset ─────────────────────────────────────────────────────────────

  resetFlow(): void {
    this.state.resetFlow();
    this.bookingForm.reset();
    this.reviewForm.reset({ rating: 0, review: '' });
    this.pollSub?.unsubscribe();
    this.loadServices();
    this.loadReviews();
    this.loadRatingStats();
    this.startPolling();
  }

  // ── Repeat last service ───────────────────────────────────────────────

  repeatLastService(): void {
    const last = this.state.lastBooking();
    if (!last) return;
    if (!this.state.services().includes(last.servicio)) {
      this.toast.error('Ese servicio ya no está disponible actualmente.');
      return;
    }
    this.state.selectedService.set(last.servicio);
    this.state.serviceFilter.set('all');
    const slot = this.state.reservations().find(r => r.franja === last.franja && !this.state.isTaken(r));
    if (slot) this.state.selectedSlot.set(slot);
    this.goToStep(2);
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private prefillFromCustomer(): void {
    if (!this.isCustomerAuthenticated()) return;
    const token = this.auth.getCustomerToken();
    const payload = this.auth.getCustomerPayload();
    if (!token || !payload?.customerId) return;
    this.api
      .getCustomerMe(token)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null))
      )
      .subscribe(customer => {
        if (!customer) return;
        const patch: Record<string, string> = {};
        if (customer.name && !this.bookingForm.get('cliente')?.value) patch['cliente'] = customer.name;
        if (customer.phone && !this.bookingForm.get('telefono')?.value) patch['telefono'] = customer.phone;
        if (Object.keys(patch).length) this.bookingForm.patchValue(patch);
      });
  }

  private setupRealtime(): void {
    this.realtime
      .connect(this.businessId, this.auth.getCustomerToken() ?? '')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(evt => {
        if (evt.event === 'booking_created' || evt.event === 'booking_updated') {
          const data = evt.data as { providerId?: string };
          if (!data?.providerId || data.providerId === this.businessId) {
            this.api.getBusinessAvailability(this.businessId).subscribe(d => this.state.reservations.set(d));
          }
        }
      });
  }

  private setupVisibilityPause(): void {
    if (typeof document === 'undefined') return;
    fromEvent(document, 'visibilitychange')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (document.hidden) this.pollSub?.unsubscribe();
        else this.startPolling();
      });
  }

  private lastBookingKey = () => `reservorio_last_booking_${this.businessId}`;
  private bookingProgressKey = () => `reservorio_booking_progress_${this.businessId}`;

  private loadLastBooking(): void {
    try {
      const raw = localStorage.getItem(this.lastBookingKey());
      if (raw) this.state.lastBooking.set(JSON.parse(raw));
    } catch {
      /* storage unavailable */
    }
  }

  private rememberBooking(booking: ConfirmedBooking): void {
    try {
      localStorage.setItem(
        this.lastBookingKey(),
        JSON.stringify({
          servicio: booking.servicio,
          franja: booking.franja,
          cliente: booking.cliente,
          telefono: booking.telefono,
        })
      );
    } catch {
      /* storage unavailable */
    }
  }

  private prefillFromLastBooking(): void {
    const last = this.state.lastBooking();
    if (!last) return;
    if (!this.bookingForm.get('cliente')?.value && last.cliente) {
      this.bookingForm.patchValue({ cliente: last.cliente });
    }
    if (!this.bookingForm.get('telefono')?.value && last.telefono) {
      this.bookingForm.patchValue({ telefono: last.telefono });
    }
  }

  private restoreBookingProgress(): void {
    try {
      const raw = sessionStorage.getItem(this.bookingProgressKey());
      if (!raw) return;
      sessionStorage.removeItem(this.bookingProgressKey());
      const progress = JSON.parse(raw) as Partial<BookingProgress>;
      if (typeof progress.service === 'string' && Number.isInteger(progress.slotRowIndex)) {
        this.pendingBookingProgress = { service: progress.service, slotRowIndex: progress.slotRowIndex };
      }
    } catch {
      /* storage unavailable */
    }
  }

  private applyBookingProgress(): void {
    const progress = this.pendingBookingProgress;
    if (!progress || !this.state.services().includes(progress.service)) return;
    const slot = this.state
      .reservations()
      .find(row => row._rowIndex === progress.slotRowIndex && !this.state.isTaken(row));
    if (!slot) return;
    this.state.selectedService.set(progress.service);
    this.state.selectedSlot.set(slot);
    this.pendingBookingProgress = null;
    this.goToStep(2);
  }
}
