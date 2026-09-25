import { Component, OnInit, OnDestroy, signal, computed, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { interval, Subscription, switchMap, startWith, catchError, of, fromEvent } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { DEFAULT_CURRENCY, formatCurrency } from '../../core/config/currency';
import { Reservation, PaymentMethod, CheckoutInstructions } from '../../core/models/reservation.model';
import { Business, Review, RatingStats } from '../../core/models/businesses.model';

type Step = 1 | 2 | 3 | 4;

interface ConfirmedBooking {
  franja: string;
  cliente: string;
  telefono: string;
  servicio: string;
  notas: string;
}

@Component({
  selector: 'app-booking',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <div
      class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(26,115,232,0.26),_transparent_32%),linear-gradient(180deg,#040814_0%,#091324_52%,#0c1628_100%)] text-white"
    >
      <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div
          class="grid gap-8 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:gap-12"
        >
          <section class="flex flex-col justify-center gap-8 lg:pr-6">
            <div class="space-y-4">
              <p class="text-[11px] font-semibold uppercase tracking-[0.35em] text-brand-light">Reserva sin esperas</p>
              <h1 class="font-display text-4xl font-bold leading-none sm:text-5xl lg:text-6xl">
                Agenda tu cita en minutos.<br />
                <span class="text-brand-sky">Rapido, claro y al instante.</span>
              </h1>
              <p class="max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                Elige tu servicio, revisa la disponibilidad y deja tus datos para pedir la reserva en un flujo simple.
              </p>
            </div>

            <div class="grid gap-3 sm:max-w-xl">
              @for (item of instructionItems; track item.order) {
                <div class="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <div class="flex items-start gap-4">
                    <span class="pt-1 font-mono text-xs tracking-[0.28em] text-brand-light">{{ item.order }}</span>
                    <div>
                      <p class="font-display text-lg font-semibold text-white">{{ item.title }}</p>
                      <p class="mt-1 text-sm leading-6 text-slate-300">{{ item.description }}</p>
                    </div>
                  </div>
                </div>
              }
            </div>

            <div
              class="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(26,115,232,0.16),rgba(142,194,255,0.08))] p-5 backdrop-blur-sm sm:max-w-xl"
            >
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-light">Instrucciones</p>
              <p class="mt-3 text-sm leading-6 text-slate-200">
                Avanza paso a paso para reservar mas rapido. Si necesitas cambiar algo, vuelve atras y ajustalo sin
                empezar de nuevo.
              </p>
            </div>
          </section>

          <section class="flex justify-center lg:justify-end">
            <div
              class="w-full max-w-[430px] rounded-[2.1rem] border border-white/10 bg-white/5 p-3 shadow-[0_32px_80px_rgba(0,0,0,0.45)] backdrop-blur-md"
            >
              <div
                class="overflow-hidden rounded-[1.8rem] border border-primary-fixed/20 bg-surface-lowest text-on-surface shadow-soft"
              >
                <header
                  class="border-b border-white/10 bg-gradient-to-br from-brand-strong via-primary to-primary-container px-5 py-4 text-white"
                >
                  <div class="flex items-center gap-3">
                    @if (step() < 4) {
                      <button
                        class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/15"
                        (click)="goBack()"
                        aria-label="Volver"
                      >
                        <span class="material-icons-round text-[1.15rem]">arrow_back</span>
                      </button>
                    } @else {
                      <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                        <span class="material-icons-round text-[1.15rem]">check</span>
                      </div>
                    }

                    <div class="min-w-0 flex-1">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <p class="truncate text-sm font-semibold">{{ business()?.name ?? 'Reserva tu cita' }}</p>
                          @if (business()?.verified) {
                            <span
                              class="material-icons-round text-[0.9rem] text-green-500 flex-shrink-0"
                              title="Negocio verificado"
                              >verified</span
                            >
                          }
                        </div>
                        <div class="flex items-center gap-2 mt-0.5">
                          <p class="text-xs text-white/80">Reserva online</p>
                          @if (ratingStats()?.averageRating && ratingStats()!.averageRating > 0) {
                            <div class="flex items-center gap-1 text-xs bg-white/10 px-2 py-0.5 rounded">
                              @for (i of [1, 2, 3, 4, 5]; track i) {
                                <span
                                  class="material-icons-round text-[0.75rem]"
                                  [class.text-yellow-400]="i <= Math.round(ratingStats()!.averageRating)"
                                  [class.text-white/30]="i > Math.round(ratingStats()!.averageRating)"
                                >
                                  {{
                                    i <= Math.floor(ratingStats()!.averageRating)
                                      ? 'star'
                                      : i === Math.ceil(ratingStats()!.averageRating)
                                        ? 'star_half'
                                        : 'star_outline'
                                  }}
                                </span>
                              }
                              <span class="text-white/80 ml-0.5">{{
                                (ratingStats()?.averageRating || 0).toFixed(1)
                              }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    </div>

                    @if (step() < 4) {
                      <button
                        class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/15"
                        (click)="startPolling()"
                        aria-label="Actualizar"
                        [disabled]="loading()"
                      >
                        <span class="material-icons-round text-[1.15rem]" [class.animate-spin]="loading()"
                          >refresh</span
                        >
                      </button>
                    }
                  </div>

                  <div class="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
                    @for (item of bookingSteps; track item.value; let last = $last) {
                      <div class="flex items-center gap-2">
                        <div
                          class="flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold"
                          [class.bg-white]="step() >= item.value"
                          [class.text-primary]="step() >= item.value"
                          [class.border-white]="step() >= item.value"
                          [class.bg-transparent]="step() < item.value"
                          [class.text-white/70]="step() < item.value"
                          [class.border-white/25]="step() < item.value"
                        >
                          {{ item.value }}
                        </div>
                        <span
                          class="text-[11px] font-medium"
                          [class.text-white]="step() >= item.value"
                          [class.text-white/70]="step() < item.value"
                        >
                          {{ item.label }}
                        </span>
                        @if (!last) {
                          <div class="h-px w-4 bg-white/20"></div>
                        }
                      </div>
                    }
                  </div>
                </header>

                <div class="flex flex-col">
                  @if (step() === 1) {
                    <div class="flex flex-col gap-5 px-5 py-5">
                      <div class="rounded-2xl border border-primary-fixed bg-brand-soft-high p-4 text-primary">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.2em]">Paso 1</p>
                        <h2 class="mt-2 font-display text-2xl font-semibold text-on-surface">Elige tu servicio</h2>
                        <p class="mt-1 text-sm text-on-surface-variant">Empieza por el servicio que quieres agendar.</p>
                      </div>

                      @if (lastBooking() && !servicesLoading() && services().includes(lastBooking()!.servicio)) {
                        <button
                          type="button"
                          class="btn-tertiary btn-sm w-full justify-start gap-2 border border-dashed border-primary/40"
                          (click)="repeatLastService()"
                        >
                          <span class="material-icons-round text-base">history</span>
                          Repetir tu última reserva ({{ lastBooking()!.servicio }})
                        </button>
                      }

                      @if (servicesLoading()) {
                        <div class="flex flex-col gap-3">
                          <div class="skeleton h-20 rounded-2xl"></div>
                          <div class="skeleton h-20 rounded-2xl"></div>
                          <div class="skeleton h-20 rounded-2xl"></div>
                        </div>
                      }

                      @if (servicesError() && !servicesLoading()) {
                        <div class="rounded-2xl bg-error-container p-5">
                          <div class="flex items-start gap-3 text-error-on-container">
                            <span class="material-icons-round mt-0.5">warning</span>
                            <div>
                              <p class="font-semibold">No se pudieron cargar los servicios</p>
                              <p class="mt-1 text-sm">{{ servicesError() }}</p>
                              <button class="btn-secondary btn-sm mt-4" (click)="loadServices()">Reintentar</button>
                            </div>
                          </div>
                        </div>
                      }

                      @if (!servicesLoading() && !servicesError()) {
                        @if (services().length) {
                          <div class="space-y-3">
                            <div class="flex gap-2 overflow-x-auto pb-1">
                              <button
                                class="btn-tertiary btn-sm"
                                [class.btn-primary]="serviceFilter() === 'all'"
                                (click)="serviceFilter.set('all')"
                              >
                                Todos
                              </button>
                              <button
                                class="btn-tertiary btn-sm"
                                [class.btn-primary]="serviceFilter() === 'popular'"
                                (click)="serviceFilter.set('popular')"
                              >
                                Populares
                              </button>
                              <button
                                class="btn-tertiary btn-sm"
                                [class.btn-primary]="serviceFilter() === 'quick'"
                                (click)="serviceFilter.set('quick')"
                              >
                                Rapidos
                              </button>
                              <button
                                class="btn-tertiary btn-sm"
                                [class.btn-primary]="serviceFilter() === 'premium'"
                                (click)="serviceFilter.set('premium')"
                              >
                                Premium
                              </button>
                            </div>

                            <div class="flex flex-col gap-3">
                              @for (svc of visibleServices(); track svc) {
                                <button
                                  class="rounded-2xl border p-4 sm:p-4 text-left transition min-h-[72px] sm:min-h-[auto]"
                                  [class.border-primary]="selectedService() === svc"
                                  [class.bg-brand-soft-high]="selectedService() === svc"
                                  [class.shadow-card]="selectedService() === svc"
                                  [class.border-outline-variant]="selectedService() !== svc"
                                  [class.bg-white]="selectedService() !== svc"
                                  (click)="selectService(svc)"
                                >
                                  <div class="flex items-center justify-between gap-3">
                                    <div class="flex items-center gap-3">
                                      <div
                                        class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-container text-white"
                                      >
                                        <span class="material-icons-round text-[1.15rem]">content_cut</span>
                                      </div>
                                      <div>
                                        <p class="font-display text-base font-semibold text-on-surface">{{ svc }}</p>
                                        <p class="text-xs text-on-surface-variant">{{ serviceMeta(svc).summary }}</p>
                                      </div>
                                    </div>

                                    @if (selectedService() === svc) {
                                      <span class="material-icons-round text-primary">check_circle</span>
                                    }
                                  </div>

                                  <div class="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                                    <div class="rounded-xl bg-surface-container px-2 py-2">
                                      <p class="text-on-surface-variant">Desde</p>
                                      <p class="mt-1 font-display font-semibold text-on-surface">
                                        {{ serviceMeta(svc).price }}
                                      </p>
                                    </div>
                                    <div class="rounded-xl bg-surface-container px-2 py-2">
                                      <p class="text-on-surface-variant">Duración</p>
                                      <p class="mt-1 font-display font-semibold text-on-surface">
                                        {{ serviceMeta(svc).duration }}
                                      </p>
                                    </div>
                                    <div class="rounded-xl bg-surface-container px-2 py-2">
                                      <p class="text-on-surface-variant">Estado</p>
                                      <p class="mt-1 font-display font-semibold text-on-surface">
                                        {{ serviceMeta(svc).availability }}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              }
                            </div>
                          </div>
                        } @else {
                          <div
                            class="rounded-2xl border border-dashed border-outline-variant bg-surface-low p-8 text-center"
                          >
                            <span class="material-icons-round text-[3rem] text-outline">category</span>
                            <p class="mt-3 font-display text-lg font-semibold text-on-surface">
                              Aun no hay servicios cargados
                            </p>
                            <p class="mt-1 text-sm text-on-surface-variant">
                              Cuando el negocio configure sus servicios apareceran aqui.
                            </p>
                          </div>
                        }
                      }
                    </div>
                  }

                  @if (step() === 2) {
                    <div class="flex flex-col gap-5 px-5 py-5">
                      <div class="rounded-2xl border border-primary-fixed bg-brand-soft-high p-4">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Paso 2</p>
                        <h2 class="mt-2 font-display text-2xl font-semibold text-on-surface">Selecciona el horario</h2>
                        <p class="mt-1 text-sm text-on-surface-variant">
                          Escoge el horario disponible que mejor te funcione.
                        </p>
                      </div>

                      <div
                        class="flex items-center justify-between rounded-2xl border border-outline-variant bg-white px-4 py-3"
                      >
                        <div class="flex items-center gap-3">
                          <div
                            class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-fixed text-primary"
                          >
                            <span class="material-icons-round text-[1.1rem]">spa</span>
                          </div>
                          <div>
                            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-outline">Servicio</p>
                            <p class="font-display font-semibold text-on-surface">{{ selectedService() }}</p>
                          </div>
                        </div>
                        <button class="btn-tertiary btn-sm" (click)="goToStep(1)">Cambiar</button>
                      </div>

                      @if (loading()) {
                        <div class="grid grid-cols-3 gap-2">
                          @for (i of [1, 2, 3, 4, 5, 6, 7, 8, 9]; track i) {
                            <div class="skeleton h-12 rounded-xl"></div>
                          }
                        </div>
                      }

                      @if (error() && !loading()) {
                        <div class="rounded-2xl bg-error-container p-5">
                          <div class="flex items-start gap-3 text-error-on-container">
                            <span class="material-icons-round mt-0.5">warning</span>
                            <div>
                              <p class="font-semibold">No se pudo cargar la disponibilidad</p>
                              <p class="mt-1 text-sm">{{ error() }}</p>
                              <p class="mt-1 text-sm">Verifica que la hoja del negocio este publicada.</p>
                              <button class="btn-secondary btn-sm mt-4" (click)="startPolling()">Reintentar</button>
                            </div>
                          </div>
                        </div>
                      }

                      @if (!loading() && !error()) {
                        <div>
                          <div
                            class="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-primary-fixed px-3 py-2"
                          >
                            <div>
                              <p class="section-label">Horarios disponibles</p>
                              <p class="text-xs text-primary">
                                Actualización en tiempo real · {{ availableSlotsCount() }} libres /
                                {{ reservedSlotsCount() }} ocupadas
                              </p>
                            </div>
                            <button class="btn-tertiary btn-sm" type="button" (click)="startPolling()">
                              Actualizar
                            </button>
                          </div>
                          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            @for (row of reservations(); track row._rowIndex) {
                              <button
                                [class]="slotClass(row)"
                                [disabled]="isTaken(row)"
                                (click)="selectSlot(row)"
                                class="min-h-[56px] sm:min-h-[auto]"
                              >
                                <span class="block">{{ row.franja }}</span>
                                @if (isTaken(row)) {
                                  <span class="mt-1 block text-[10px] uppercase tracking-[0.12em] opacity-75"
                                    >Ocupado</span
                                  >
                                }
                              </button>
                            }

                            @if (!reservations().length) {
                              <p
                                class="col-span-3 rounded-2xl bg-surface-low px-4 py-6 text-center text-sm text-outline"
                              >
                                No hay franjas disponibles por ahora.
                              </p>
                            }
                          </div>
                        </div>

                        @if (selectedSlot()) {
                          <div class="rounded-2xl border border-primary/15 bg-brand-soft-high p-4">
                            <p class="section-label">Seleccion actual</p>
                            <div class="flex items-center gap-3">
                              <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white">
                                <span class="material-icons-round text-[1.1rem]">schedule</span>
                              </div>
                              <div>
                                <p class="font-display text-lg font-semibold text-on-surface">
                                  {{ selectedSlot()!.franja }}
                                </p>
                                <p class="text-sm text-on-surface-variant">Listo para continuar con tus datos</p>
                              </div>
                            </div>
                            @if (selectedSlot()!.notas) {
                              <p class="mt-3 text-sm text-on-surface-variant">{{ selectedSlot()!.notas }}</p>
                            }
                          </div>
                        }
                      }
                    </div>
                  }

                  @if (step() === 3) {
                    @if (business()?.cancellationPolicy) {
                      <div class="rounded-2xl border-l-4 border-l-orange-500 bg-orange-50 p-4">
                        <div class="flex items-center gap-2">
                          <span class="material-icons-round text-orange-600 flex-shrink-0">info</span>
                          <div>
                            <p class="text-sm font-semibold text-orange-900">Política de Cancelación</p>
                            <p class="text-xs text-deep-orange-700 mt-1">{{ business()!.cancellationPolicy }}</p>
                          </div>
                        </div>
                      </div>
                    }

                    <div class="rounded-2xl border border-green-500/30 bg-success-container p-4">
                      <div class="flex items-center gap-2">
                        <span class="material-icons-round text-success flex-shrink-0">security</span>
                        <div>
                          <p class="text-sm font-semibold text-success-on">Pago 100% Seguro</p>
                          <p class="text-xs text-success mt-1">Procesado con Stripe, encriptado y protegido por SSL</p>
                        </div>
                      </div>
                    </div>
                    <div class="flex flex-col gap-5 px-5 py-5">
                      <div class="rounded-2xl border border-primary-fixed bg-brand-soft-high p-4">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Paso 3</p>
                        <h2 class="mt-2 font-display text-2xl font-semibold text-on-surface">Completa tus datos</h2>
                        <p class="mt-1 text-sm text-on-surface-variant">
                          Dejanos tus datos para confirmar la solicitud contigo.
                        </p>
                      </div>

                      <div class="flex flex-wrap gap-2">
                        @if (business()?.verified) {
                          <span
                            class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"
                          >
                            <span class="material-icons-round text-[12px]">verified</span>
                            Negocio verificado
                          </span>
                        }
                        <span
                          class="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700"
                        >
                          <span class="material-icons-round text-[12px]">security</span>
                          Pago seguro
                        </span>
                        <span
                          class="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700"
                        >
                          <span class="material-icons-round text-[12px]">star</span>
                          {{ reviews().length || 0 }} reseña{{ reviews().length === 1 ? '' : 's' }}
                        </span>
                        @if (business()?.cancellationPolicy) {
                          <span
                            class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700"
                          >
                            <span class="material-icons-round text-[12px]">info</span>
                            Cancelación clara
                          </span>
                        }
                      </div>

                      <div class="grid gap-3 sm:grid-cols-2">
                        <div class="rounded-2xl border border-outline-variant bg-white p-4">
                          <div class="flex items-start justify-between gap-3">
                            <div>
                              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-outline">Servicio</p>
                              <p class="mt-1 font-display text-lg font-semibold text-on-surface">
                                {{ selectedService() }}
                              </p>
                            </div>
                            <button class="btn-tertiary btn-sm" (click)="goToStep(1)">Editar</button>
                          </div>
                        </div>

                        <div class="rounded-2xl border border-outline-variant bg-white p-4">
                          <div class="flex items-start justify-between gap-3">
                            <div>
                              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-outline">Horario</p>
                              <p class="mt-1 font-display text-lg font-semibold text-on-surface">
                                {{ selectedSlot()?.franja }}
                              </p>
                            </div>
                            <button class="btn-tertiary btn-sm" (click)="goToStep(2)">Editar</button>
                          </div>
                        </div>
                      </div>

                      <form [formGroup]="bookingForm" class="flex flex-col gap-3" (ngSubmit)="submit()">
                        <div>
                          <label class="form-label" for="cliente">Tu nombre</label>
                          <input
                            id="cliente"
                            type="text"
                            class="form-input min-h-[48px]"
                            formControlName="cliente"
                            placeholder="Ana Garcia"
                            autocomplete="name"
                          />
                          @if (fieldInvalid('cliente')) {
                            <p class="mt-1 text-xs text-error">Requerido</p>
                          }
                        </div>

                        <div>
                          <label class="form-label" for="telefono">Tu teléfono</label>
                          <input
                            id="telefono"
                            type="tel"
                            class="form-input min-h-[48px]"
                            formControlName="telefono"
                            placeholder="300 123 4567"
                            autocomplete="tel"
                          />
                          @if (fieldInvalid('telefono')) {
                            <p class="mt-1 text-xs text-error">7-15 dígitos</p>
                          }
                        </div>

                        <label
                          class="flex cursor-pointer items-start gap-3 rounded-2xl border border-outline-variant bg-white p-3"
                        >
                          <input
                            id="dataConsent"
                            type="checkbox"
                            formControlName="dataConsent"
                            class="mt-0.5 h-5 w-5 accent-primary"
                          />
                          <span class="flex-1 text-xs leading-5 text-on-surface-variant">
                            He leído y acepto la
                            <a routerLink="/privacy" class="font-semibold text-primary underline"
                              >política de privacidad</a
                            >
                            y el tratamiento de mis datos para gestionar esta reserva.
                          </span>
                        </label>
                        @if (fieldInvalid('dataConsent')) {
                          <p class="mt-1 text-xs text-error">Debes aceptar la política de privacidad</p>
                        }

                        <div
                          class="rounded-2xl border border-primary/15 bg-primary-fixed px-3 py-3 text-xs sm:text-sm text-primary"
                        >
                          Completa y envía. El negocio confirmará en minutos.
                        </div>
                      </form>
                    </div>
                  }

                  @if (step() === 4) {
                    <div class="flex flex-col gap-5 px-5 py-5">
                      <div
                        class="rounded-[1.75rem] bg-gradient-to-br from-primary to-primary-container p-6 text-center text-white"
                      >
                        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                          <span class="material-icons-round text-3xl">check_circle</span>
                        </div>
                        <h2 class="mt-4 font-display text-2xl font-semibold">Reserva registrada</h2>
                        <p class="mt-2 text-sm text-white/85">
                          Tu solicitud ya está creada y queda pendiente de confirmación por parte del negocio.
                        </p>
                      </div>

                      <div class="rounded-2xl border border-outline-variant bg-white p-5">
                        <div class="mb-4 flex items-center justify-between gap-3">
                          <p class="section-label">Estado de la reserva</p>
                          <span class="badge badge-info">Pendiente</span>
                        </div>

                        <div class="mt-2 flex flex-col gap-4 text-sm">
                          <div class="flex items-center justify-between gap-4">
                            <span class="text-on-surface-variant">Servicio</span>
                            <span class="service-tag">{{ confirmed()?.servicio }}</span>
                          </div>
                          <div class="h-px bg-outline-variant/30"></div>
                          <div class="flex items-center justify-between gap-4">
                            <span class="text-on-surface-variant">Horario</span>
                            <span class="font-semibold text-on-surface">{{ confirmed()?.franja }}</span>
                          </div>
                          <div class="h-px bg-outline-variant/30"></div>
                          <div class="flex items-center justify-between gap-4">
                            <span class="text-on-surface-variant">Cliente</span>
                            <span class="font-semibold text-on-surface">{{ confirmed()?.cliente }}</span>
                          </div>
                          <div class="h-px bg-outline-variant/30"></div>
                          <div class="flex items-center justify-between gap-4">
                            <span class="text-on-surface-variant">Telefono</span>
                            <span class="font-semibold text-on-surface">{{ confirmed()?.telefono }}</span>
                          </div>
                          @if (reservationId()) {
                            <div class="h-px bg-outline-variant/30"></div>
                            <div class="flex items-center justify-between gap-4">
                              <span class="text-on-surface-variant">Referencia</span>
                              <span class="font-semibold text-on-surface">{{ reservationId() }}</span>
                            </div>
                          }
                        </div>
                      </div>

                      <div class="rounded-2xl border border-primary/15 bg-primary-fixed px-4 py-4 text-sm text-primary">
                        La confirmación del negocio suele llegar en pocos minutos. Si quieres terminar antes, puedes
                        pagar ahora con un flujo seguro desde la misma reserva.
                      </div>

                      <div class="rounded-2xl border border-outline-variant bg-white p-5">
                        <p class="section-label">Método de pago</p>
                        <div class="grid grid-cols-2 gap-2">
                          @for (opt of paymentOptions; track opt.id) {
                            <button
                              type="button"
                              class="payment-option"
                              [class.selected]="paymentMethod() === opt.id"
                              (click)="paymentMethod.set(opt.id)"
                            >
                              <span class="material-icons-round text-primary flex-shrink-0">{{ opt.icon }}</span>
                              <span class="text-sm font-semibold whitespace-nowrap">{{ opt.label }}</span>
                            </button>
                          }
                        </div>

                        <label
                          class="mt-3 flex cursor-pointer items-center gap-3 rounded-xl bg-surface-low px-3 py-2.5"
                        >
                          <input
                            type="checkbox"
                            class="h-5 w-5 accent-primary"
                            [checked]="depositActive()"
                            (change)="depositActive.set(!depositActive())"
                          />
                          <span class="flex-1">
                            <span class="block text-sm font-semibold text-on-surface"
                              >Pagar ahora solo el anticipo</span
                            >
                            <span class="block text-xs text-on-surface-variant"
                              >30% del total para asegurar tu cita</span
                            >
                          </span>
                          <span class="text-sm font-bold text-primary">{{
                            depositActive() ? formatCurrency(dueAmount()) : '—'
                          }}</span>
                        </label>

                        <div
                          class="mt-4 flex items-center justify-between gap-3 rounded-xl border border-primary/15 bg-brand-soft-high px-3 py-2.5 text-sm"
                        >
                          <span class="text-on-surface-variant">Importe de hoy</span>
                          <span class="font-display text-lg font-bold text-primary">{{ formatCurrency(dueAmount()) }}</span>
                        </div>
                      </div>

                      @if (checkoutInstructions()) {
                        <div class="instructions-box">
                          <p class="mb-1 font-semibold text-primary">
                            {{ paymentMethod() === 'transfer' ? 'Instrucciones de transferencia' : 'Pago en efectivo' }}
                          </p>
                          @if (paymentMethod() === 'transfer' && checkoutInstructions()!.iban) {
                            <div class="flex flex-col gap-1 text-sm">
                              <p>
                                <span class="text-on-surface-variant">Beneficiario: </span
                                >{{ checkoutInstructions()!.beneficiary }}
                              </p>
                              <p>
                                <span class="text-on-surface-variant">IBAN: </span
                                ><span class="font-mono font-semibold">{{ checkoutInstructions()!.iban }}</span>
                              </p>
                              <p>
                                <span class="text-on-surface-variant">Banco: </span>{{ checkoutInstructions()!.bank }}
                              </p>
                              <p>
                                <span class="text-on-surface-variant">Referencia: </span
                                ><span class="font-mono font-semibold">{{ checkoutInstructions()!.reference }}</span>
                              </p>
                            </div>
                          } @else {
                            <p class="text-sm">{{ checkoutInstructions()!.message }}</p>
                          }
                        </div>
                      }

                      <div class="flex flex-col gap-2 sm:flex-row sm:gap-3">
                        <button class="btn-primary flex-1" [disabled]="paymentLoading()" (click)="startCheckout()">
                          @if (paymentLoading()) {
                            <span class="material-icons-round animate-spin text-base">refresh</span>
                          } @else {
                            <span>{{ paymentLabel() }}</span>
                            <span class="material-icons-round text-base">payment</span>
                          }
                        </button>
                        <button class="btn-secondary flex-1" (click)="resetFlow()">
                          <span class="material-icons-round text-base">add</span>
                          <span class="hidden sm:inline">Nueva reserva</span>
                        </button>
                      </div>

                      <div class="mt-6 border-t border-outline-variant pt-6">
                        <h3 class="font-display text-lg font-semibold text-on-surface mb-4">Reseñas</h3>

                        @if (reviews().length > 0) {
                          <div class="flex flex-col gap-3 mb-5">
                            @for (review of reviews(); track review.id) {
                              <div class="rounded-2xl border border-outline-variant/30 bg-white/50 p-4">
                                <div class="flex items-start gap-2 mb-2">
                                  @for (i of [1, 2, 3, 4, 5]; track i) {
                                    <span
                                      class="material-icons-round text-[0.9rem]"
                                      [class.text-yellow-400]="i <= review.rating"
                                      [class.text-outline/30]="i > review.rating"
                                      >star</span
                                    >
                                  }
                                </div>
                                @if (review.review) {
                                  <p class="text-sm text-on-surface">{{ review.review }}</p>
                                }
                                <p class="text-xs text-on-surface-variant mt-2">
                                  {{ review.createdAt | date: 'short' }}
                                </p>
                              </div>
                            }
                          </div>
                        } @else {
                          <p class="text-sm text-on-surface-variant mb-4">
                            No hay reseñas aún. ¡Sé el primero en compartir tu experiencia!
                          </p>
                        }

                        <div class="rounded-2xl border border-primary-fixed bg-brand-soft-high p-4 mt-5">
                          <p class="text-sm font-semibold text-primary mb-3">Deja tu reseña</p>
                          <div class="flex gap-2 mb-4">
                            @for (i of [1, 2, 3, 4, 5]; track i) {
                              <button
                                class="p-2 rounded-lg transition hover:bg-white/50 cursor-pointer"
                                type="button"
                                (click)="reviewForm.patchValue({ rating: i })"
                                [class.bg-yellow-400/20]="i <= (reviewForm.get('rating')?.value || 0)"
                              >
                                <span
                                  class="material-icons-round text-[1.5rem]"
                                  [class.text-yellow-400]="i <= (reviewForm.get('rating')?.value || 0)"
                                  [class.text-outline/30]="i > (reviewForm.get('rating')?.value || 0)"
                                  >star</span
                                >
                              </button>
                            }
                          </div>
                          <textarea
                            class="w-full rounded-lg border border-outline p-2 text-sm resize-none focus:outline-none focus:border-primary"
                            formControlName="review"
                            placeholder="Cuenta tu experiencia (opcional)"
                            [attr.rows]="2"
                          ></textarea>
                          <button
                            class="btn-primary w-full mt-3 min-h-[44px]"
                            type="button"
                            [disabled]="(reviewForm.get('rating')?.value || 0) === 0 || submitting()"
                            (click)="submitReview()"
                          >
                            @if (submitting()) {
                              <span class="material-icons-round animate-spin text-base">refresh</span>
                            } @else {
                              <span>Enviar reseña</span>
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  }

                  @if (step() < 4) {
                    <div class="border-t border-outline-variant/20 bg-white px-5 py-4">
                      <button
                        class="btn-primary w-full min-h-[56px] sm:min-h-[auto] text-lg sm:text-base"
                        [disabled]="!canProceed() || submitting()"
                        (click)="handleNext()"
                      >
                        @if (submitting()) {
                          <span class="material-icons-round animate-spin text-base">refresh</span>
                          <span class="hidden sm:inline">Enviando...</span>
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
})
export class BookingComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private realtime = inject(RealtimeService);
  private title = inject(Title);
  readonly Math = Math;
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly business = signal<Business | null>(null);
  private businessId = '';

  readonly step = signal<Step>(1);
  readonly loading = signal(false);
  readonly servicesLoading = signal(false);
  readonly servicesError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly paymentLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly reservations = signal<Reservation[]>([]);
  readonly reviews = signal<Review[]>([]);
  readonly ratingStats = signal<RatingStats | null>(null);
  readonly services = signal<string[]>([]);
  readonly selectedSlot = signal<Reservation | null>(null);
  readonly selectedService = signal<string | null>(null);
  readonly confirmed = signal<ConfirmedBooking | null>(null);
  readonly reservationId = signal<string>('');
  readonly customerId = signal<string>('');
  readonly paymentMethod = signal<PaymentMethod>('card');
  readonly depositActive = signal(false);
  readonly checkoutInstructions = signal<CheckoutInstructions | null>(null);
  readonly lastBooking = signal<{ servicio: string; franja: string; cliente: string; telefono: string } | null>(null);
  readonly paymentOptions: { id: PaymentMethod; label: string; icon: string }[] = [
    { id: 'card', label: 'Tarjeta', icon: 'credit_card' },
    { id: 'paypal', label: 'PayPal', icon: 'account_balance_wallet' },
    { id: 'transfer', label: 'Transferencia', icon: 'account_balance' },
    { id: 'cash', label: 'Efectivo', icon: 'payments' },
  ];
  readonly baseAmount = computed(() =>
    this.confirmed() ? this.serviceMeta(this.confirmed()!.servicio).priceNumber : 0
  );
  readonly dueAmount = computed(() => (this.depositActive() ? Math.round(this.baseAmount() * 0.3) : this.baseAmount()));
  readonly formatCurrency = formatCurrency;
  readonly paymentLabel = computed(() => {
    if (this.paymentLoading()) return '';
    switch (this.paymentMethod()) {
      case 'paypal':
        return 'Pagar con PayPal';
      case 'transfer':
        return 'Ver datos de transferencia';
      case 'cash':
        return 'Confirmar pago en efectivo';
      default:
        return this.depositActive() ? `Pagar anticipo (${formatCurrency(this.dueAmount())})` : 'Pagar';
    }
  });
  readonly bookingSteps = [
    { value: 1, label: 'Servicio' },
    { value: 2, label: 'Horario' },
    { value: 3, label: 'Datos' },
    { value: 4, label: 'Listo' },
  ] as const;
  readonly serviceFilter = signal<'all' | 'popular' | 'quick' | 'premium'>('all');
  readonly availableSlotsCount = computed(() => this.reservations().filter(row => !this.isTaken(row)).length);
  readonly reservedSlotsCount = computed(() => this.reservations().filter(row => this.isTaken(row)).length);
  readonly instructionItems = [
    {
      order: '01',
      title: 'Elige que quieres reservar',
      description: 'Selecciona el servicio y activa el siguiente paso del formulario.',
    },
    {
      order: '02',
      title: 'Escoge el mejor horario',
      description: 'Revisa la disponibilidad y elige la franja que mejor se ajuste a tu dia.',
    },
    {
      order: '03',
      title: 'Confirma en un momento',
      description: 'Deja tus datos, revisa el resumen y envia la reserva al instante.',
    },
  ] as const;

  readonly bookingForm = this.fb.group({
    cliente: ['', [Validators.required, Validators.minLength(2)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9+\s\-]{7,15}$/)]],
    notas: [''],
    dataConsent: [false, [Validators.requiredTrue]],
  });
  readonly bookingFormValid = signal(true);

  readonly reviewForm = this.fb.group({
    rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    review: ['', [Validators.maxLength(500)]],
  });

  readonly canProceed = computed(() => {
    if (this.step() === 1) return !!this.selectedService();
    if (this.step() === 2) return !!this.selectedSlot();
    if (this.step() === 3) return this.bookingFormValid();
    return false;
  });

  readonly nextLabel = computed(() => {
    if (this.step() === 1) return this.selectedService() ? 'Continuar al horario' : 'Selecciona un servicio';
    if (this.step() === 2) return this.selectedSlot() ? 'Continuar con tus datos' : 'Selecciona un horario';
    if (this.step() === 3) return 'Confirmar reserva';
    return '';
  });

  ngOnInit(): void {
    this.businessId = this.route.snapshot.params['businessId'] ?? '';
    this.bookingForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.bookingFormValid.set(this.bookingForm.valid));
    this.loadLastBooking();
    this.setupVisibilityPause();
    // Load business info
    this.api
      .getBusinesses()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(list => {
        const found = list.find(b => b.id === this.businessId);
        if (!found) location.replace('/'); // Redirect if business not found
        if (found) {
          this.business.set(found);
          this.title.setTitle(`Reserva en ${found.name} — Reservorio`);
        }
      });
    this.api.trackBusinessView(this.businessId).subscribe();
    this.loadServices();
    this.loadReviews();
    this.loadRatingStats();
    this.startPolling();
    this.setupRealtime();
  }

  private setupRealtime(): void {
    this.realtime
      .connect(this.businessId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(evt => {
        if (evt.event === 'booking_created' || evt.event === 'booking_updated') {
          const data = evt.data as { providerId?: string };
          if (!data?.providerId || data.providerId === this.businessId) {
            // SSE es push; recarga suave sin spinner
            this.api.getBusinessAvailability(this.businessId).subscribe(d => this.reservations.set(d));
          }
        }
      });
  }

  private lastBookingKey(): string {
    return `reservorio_last_booking_${this.businessId}`;
  }

  private loadLastBooking(): void {
    try {
      const raw = localStorage.getItem(this.lastBookingKey());
      if (raw) this.lastBooking.set(JSON.parse(raw));
    } catch (_error) {
      // almacenamiento no disponible
    }
  }

  private rememberBooking(): void {
    const booking = this.confirmed();
    if (!booking) return;
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
    } catch (_error) {
      // almacenamiento no disponible
    }
  }

  private prefillFromLastBooking(): void {
    const last = this.lastBooking();
    if (!last) return;
    if (!this.bookingForm.get('cliente')?.value && last.cliente) {
      this.bookingForm.patchValue({ cliente: last.cliente });
    }
    if (!this.bookingForm.get('telefono')?.value && last.telefono) {
      this.bookingForm.patchValue({ telefono: last.telefono });
    }
  }

  repeatLastService(): void {
    const last = this.lastBooking();
    if (!last) return;
    if (!this.services().includes(last.servicio)) {
      this.toast.error('Ese servicio ya no está disponible actualmente.');
      return;
    }
    this.selectedService.set(last.servicio);
    this.serviceFilter.set('all');
    const slot = this.reservations().find(r => r.franja === last.franja && !this.isTaken(r));
    if (slot) this.selectedSlot.set(slot);
    this.goToStep(2);
  }

  loadReviews(): void {
    this.api
      .getReviews(this.businessId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => this.reviews.set(data),
        error: () => this.reviews.set([]),
      });
  }

  loadRatingStats(): void {
    this.api
      .getAverageRating(this.businessId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => this.ratingStats.set(data),
        error: () => this.ratingStats.set(null),
      });
  }

  private readonly POLL_MS = 15_000;
  private pollSub?: Subscription;

  private setupVisibilityPause(): void {
    if (typeof document === 'undefined') return;
    fromEvent(document, 'visibilitychange')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (document.hidden) {
          this.pollSub?.unsubscribe();
        } else {
          this.startPolling();
        }
      });
  }

  startPolling(): void {
    // No poll si la pestaña está oculta (ahorro de batería/red, P3)
    if (typeof document !== 'undefined' && document.hidden) return;
    this.pollSub?.unsubscribe();
    this.pollSub = interval(this.POLL_MS)
      .pipe(
        startWith(0),
        switchMap(() => {
          this.loading.set(true);
          this.error.set(null);
          return this.api.getBusinessAvailability(this.businessId);
        })
      )
      .subscribe({
        next: data => {
          this.reservations.set(data);
          this.loading.set(false);
        },
        error: err => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  isTaken(row: Reservation): boolean {
    const d = (row.disponibilidad ?? '').toLowerCase();
    return (
      d.includes('ocup') ||
      d.includes('reserv') ||
      d.includes('conf') ||
      d.includes('pend') ||
      d.includes('book') ||
      d.includes('taken')
    );
  }

  slotClass(row: Reservation): string {
    const base = 'slot-chip';
    if (this.selectedSlot()?._rowIndex === row._rowIndex) return base + ' selected';
    if (this.isTaken(row)) return base + ' taken';
    return base;
  }

  selectSlot(row: Reservation): void {
    if (this.isTaken(row)) return;
    this.selectedSlot.set(row);
  }

  selectService(svc: string): void {
    this.selectedService.set(svc);
  }

  goToStep(s: Step): void {
    if (s === 3) this.prefillFromLastBooking();
    this.step.set(s);
  }

  readonly visibleServices = computed(() => {
    const list = this.services();
    const currentFilter = this.serviceFilter();

    if (currentFilter === 'all') return list;

    return list.filter(service => {
      const meta = this.serviceMeta(service);

      if (currentFilter === 'popular') return meta.tag === 'popular';
      if (currentFilter === 'quick') return meta.durationMinutes <= 45;
      if (currentFilter === 'premium') return meta.priceNumber >= 90;
      return true;
    });
  });

  serviceMeta(service: string): {
    price: string;
    duration: string;
    availability: string;
    summary: string;
    tag: 'popular' | 'quick' | 'premium';
    durationMinutes: number;
    priceNumber: number;
  } {
    const lowercase = service.toLowerCase();

    if (
      lowercase.includes('facial') ||
      lowercase.includes('spa') ||
      lowercase.includes('mani') ||
      lowercase.includes('pedi')
    ) {
      return {
        price: formatCurrency(39000),
        duration: '45 min',
        availability: 'Hoy',
        summary: 'Tratamiento completo con cuidado personalizado.',
        tag: 'popular',
        durationMinutes: 45,
        priceNumber: 39000,
      };
    }

    if (lowercase.includes('corte') || lowercase.includes('barba') || lowercase.includes('peinado')) {
      return {
        price: formatCurrency(28000),
        duration: '30 min',
        availability: '2 huecos',
        summary: 'Tiempos rápidos para una cita eficiente.',
        tag: 'quick',
        durationMinutes: 30,
        priceNumber: 28000,
      };
    }

    if (lowercase.includes('maquillaje') || lowercase.includes('celebr') || lowercase.includes('evento')) {
      return {
        price: formatCurrency(95000),
        duration: '75 min',
        availability: 'Agotado',
        summary: 'Servicio premium para eventos y finishing touch.',
        tag: 'premium',
        durationMinutes: 75,
        priceNumber: 95000,
      };
    }

    if (lowercase.includes('depil') || lowercase.includes('laser')) {
      return {
        price: formatCurrency(54000),
        duration: '50 min',
        availability: 'Hoy',
        summary: 'Ideal para rutinas de mantenimiento y confort.',
        tag: 'popular',
        durationMinutes: 50,
        priceNumber: 54000,
      };
    }

    return {
      price: formatCurrency(49000),
      duration: '60 min',
      availability: 'Disponible',
      summary: 'Servicio de consulta y atención personalizada.',
      tag: 'popular',
      durationMinutes: 60,
      priceNumber: 49000,
    };
  }

  goBack(): void {
    const s = this.step();
    if (s > 1) this.goToStep((s - 1) as Step);
    else this.router.navigate(['/']);
  }

  handleNext(): void {
    const s = this.step();
    if (s === 1 && this.selectedService()) {
      this.goToStep(2);
    } else if (s === 2 && this.selectedSlot()) {
      this.goToStep(3);
    } else if (s === 3) {
      this.submit();
    }
  }

  loadServices(): void {
    this.servicesLoading.set(true);
    this.servicesError.set(null);
    this.api
      .getBusinessServices(this.businessId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.services.set(data);
          this.servicesLoading.set(false);
        },
        error: err => {
          this.servicesError.set(err.message);
          this.services.set([]);
          this.servicesLoading.set(false);
        },
      });
  }

  fieldInvalid(name: string): boolean {
    const ctrl = this.bookingForm.get(name) as AbstractControl;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  submit(): void {
    this.bookingForm.markAllAsTouched();
    if (this.bookingForm.invalid || !this.selectedSlot() || !this.selectedService()) return;

    const { cliente, telefono, notas, dataConsent } = this.bookingForm.value;
    const payload: ConfirmedBooking = {
      franja: this.selectedSlot()!.franja,
      cliente: cliente!.trim(),
      telefono: telefono!.trim(),
      servicio: this.selectedService()!,
      notas: notas?.trim() ?? '',
    };

    this.submitting.set(true);
    this.api
      .createBusinessCheckout(this.businessId, { ...payload, dataConsent: dataConsent === true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: checkout => {
          const selected = this.selectedSlot();
          if (selected) {
            this.reservations.set(
              this.reservations().map(row =>
                row._rowIndex === selected._rowIndex ? { ...row, disponibilidad: 'Reservado' } : row
              )
            );
          }
          this.confirmed.set(payload);
          this.reservationId.set(checkout.data?.bookingId ?? '');
          this.customerId.set(checkout.data?.customerId ?? '');
          this.rememberBooking();
          this.toast.success('¡Reserva enviada con éxito! Ya está lista para pagar o confirmar.');
          this.goToStep(4);
          this.submitting.set(false);
        },
        error: err => {
          this.toast.error(err?.message ?? 'La franja seleccionada ya no está disponible. Elige otra opción.');
          this.startPolling();
          this.submitting.set(false);
        },
      });
  }

  startCheckout(): void {
    const booking = this.confirmed();
    if (!booking) return;

    const bookingId = this.reservationId();
    const customerId = this.customerId();
    if (!bookingId || !customerId) {
      this.toast.error('No se pudo preparar el checkout; vuelve a intentar la reserva.');
      return;
    }

    this.paymentLoading.set(true);
    this.checkoutInstructions.set(null);
    const providerId = this.businessId;
    const amount = this.dueAmount();
    const method = this.paymentMethod();
    const successUrl = `${window.location.origin}/payment/success?bookingId=${encodeURIComponent(bookingId)}&providerId=${encodeURIComponent(providerId)}&customerId=${encodeURIComponent(customerId)}`;
    const cancelUrl = `${window.location.origin}/payment/cancel?bookingId=${encodeURIComponent(bookingId)}&providerId=${encodeURIComponent(providerId)}&customerId=${encodeURIComponent(customerId)}`;

    this.api
      .createCheckoutSession({
        bookingId,
        providerId,
        customerId,
        amount,
        currency: DEFAULT_CURRENCY,
        method,
        status: 'pending',
        successUrl,
        cancelUrl,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this.paymentLoading.set(false);
          const data = result.data;
          if (data?.checkoutUrl) {
            window.location.href = data.checkoutUrl;
            return;
          }
          if (data?.instructions) {
            this.checkoutInstructions.set(data.instructions);
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
          this.paymentLoading.set(false);
          this.toast.error(err?.message ?? 'No se pudo iniciar el pago en este momento');
        },
      });
  }

  resetFlow(): void {
    this.selectedSlot.set(null);
    this.selectedService.set(null);
    this.confirmed.set(null);
    this.reservationId.set('');
    this.customerId.set('');
    this.depositActive.set(false);
    this.checkoutInstructions.set(null);
    this.paymentMethod.set('card');
    this.bookingForm.reset();
    this.pollSub?.unsubscribe();
    this.loadServices();
    this.loadReviews();
    this.loadRatingStats();
    this.startPolling();
    this.reviewForm.reset({ rating: 0, review: '' });
    this.goToStep(1);
  }

  submitReview(): void {
    const rating = this.reviewForm.get('rating')?.value || 0;
    if (rating === 0) return;

    this.submitting.set(true);
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
          this.submitting.set(false);
        },
        error: err => {
          this.toast.error(err?.message ?? 'Error al enviar reseña');
          this.submitting.set(false);
        },
      });
  }
}
