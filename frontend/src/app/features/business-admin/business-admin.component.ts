import { Component, OnInit, OnDestroy, DestroyRef, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription, switchMap, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import { BusinessAdminService } from '../../core/services/business-admin.service';
import { ToastService } from '../../core/services/toast.service';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import {
  BookingRecord,
  Customer,
  GoogleStatus,
  NotificationItem,
  Payment,
  Reservation,
} from '../../core/models/reservation.model';
import { Business } from '../../core/models/businesses.model';

type negocioTab = 'reservas' | 'servicios' | 'perfil' | 'google';

@Component({
  selector: 'app-business-admin',
  imports: [CommonModule, ReactiveFormsModule, BadgeComponent],
  template: `
    <div class="min-h-dvh bg-surface flex flex-col">
      <!-- ══ TOP BAR ══════════════════════════════════════════════════ -->
      <header class="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-outline-variant/20">
        <div class="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          @if (business()) {
            <div
              class="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              [style.background]="business()!.gradient"
            >
              <span class="material-icons-round text-lg">{{ business()!.icon }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <h1 class="font-display font-bold text-base leading-tight truncate">{{ business()!.name }}</h1>
              <p class="text-xs text-on-surface-variant truncate">{{ business()!.category }}</p>
            </div>
          } @else {
            <div class="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center">
              <span class="material-icons-round text-on-surface-variant">store</span>
            </div>
            <div class="flex-1">
              <div class="skeleton h-4 w-32 rounded"></div>
            </div>
          }
          <button
            class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container
                       text-on-surface-variant transition sm:w-10 sm:h-10"
            (click)="logout()"
            title="Cerrar sesión"
          >
            <span class="material-icons-round">logout</span>
          </button>
        </div>

        <!-- Tab bar -->
        <div class="max-w-4xl mx-auto px-4 flex gap-0.5 sm:gap-1 overflow-x-auto pb-0.5">
          @for (t of tabs; track t.id) {
            <button
              class="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-t-lg transition
                         whitespace-nowrap border-b-2 min-h-[44px] sm:min-h-[auto]"
              [class]="
                tab() === t.id
                  ? 'text-primary border-primary bg-primary/5'
                  : 'text-on-surface-variant border-transparent hover:bg-surface-container'
              "
              (click)="setTab(t.id)"
            >
              <span class="material-icons-round text-base">{{ t.icon }}</span>
              <span class="hidden sm:inline">{{ t.label }}</span>
            </button>
          }
        </div>
      </header>

      <!-- ══ CONTENT ══════════════════════════════════════════════════ -->

      <!-- TAB: RESERVAS ──────────────────────────────────────────────── -->
      @if (tab() === 'reservas') {
        <div class="flex-1 p-4 sm:p-6 flex flex-col gap-5 max-w-4xl mx-auto w-full">
          <div class="flex items-center justify-between">
            <h2 class="font-display font-semibold text-[1.375rem]">Reservas</h2>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn-secondary btn-sm min-h-[44px] sm:min-h-[auto]"
                (click)="exportReservationsCsv()"
                title="Exportar reservas a CSV"
              >
                <span class="material-icons-round text-base">file_download</span>
                <span class="hidden sm:inline">CSV</span>
              </button>
              <button
                class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container
                           text-on-surface-variant transition sm:w-10 sm:h-10 min-h-[44px] sm:min-h-[auto]"
                (click)="loadReservations()"
                title="Actualizar"
              >
                <span class="material-icons-round text-lg" [class.animate-spin]="resLoading()">refresh</span>
              </button>
            </div>
          </div>

          <!-- Stats -->
          @if (resStats().total) {
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              @for (s of resStats().items; track s.label) {
                <div class="card text-center py-3">
                  <p class="font-display font-bold text-2xl">{{ s.value }}</p>
                  <p class="text-xs text-on-surface-variant mt-0.5">{{ s.label }}</p>
                </div>
              }
            </div>
          }

          @if (businessAnalytics().cards.length) {
            <div class="card p-4 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <p class="section-label">Analytics de negocio</p>
                <span class="badge badge-primary">{{ businessAnalytics().cards.length }} métricas</span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                @for (metric of businessAnalytics().cards; track metric.label) {
                  <div class="rounded-xl bg-surface-low px-3 py-3 text-center">
                    <p class="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">{{ metric.label }}</p>
                    <p
                      class="mt-2 font-display text-2xl font-bold"
                      [class.text-success]="metric.tone === 'success'"
                      [class.text-warning]="metric.tone === 'warning'"
                      [class.text-primary]="metric.tone === 'primary'"
                      [class.text-error]="metric.tone === 'error'"
                    >
                      {{ metric.value }}
                    </p>
                  </div>
                }
              </div>
            </div>
          }

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div class="card p-4 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <p class="section-label">Clientes de marketplace</p>
                <span class="badge badge-primary">{{ recentCustomers().length }}</span>
              </div>
              <div class="flex flex-col gap-2">
                @for (customer of recentCustomers(); track customer.id) {
                  <div class="flex items-center justify-between rounded-xl bg-surface-low px-3 py-2">
                    <div>
                      <p class="font-medium">{{ customer.name ?? customer.email }}</p>
                      <p class="text-xs text-on-surface-variant">{{ customer.email }}</p>
                    </div>
                    <span class="text-xs text-on-surface-variant">{{ customer.phone || 'Sin teléfono' }}</span>
                  </div>
                }
              </div>
            </div>

            <div class="card p-4 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <p class="section-label">Cobro preparado</p>
                <span class="badge" [class.badge-success]="checkoutBooking()">{{
                  checkoutBooking() ? 'Listo' : 'Sin reserva'
                }}</span>
              </div>
              <p class="font-display text-3xl font-bold">{{ paymentAmount() }}€</p>
              <p class="text-sm text-on-surface-variant">
                {{
                  checkoutBooking()
                    ? 'Preparado para ' + checkoutBooking()!.slot
                    : 'Selecciona una reserva activa para preparar el pago.'
                }}
              </p>
              <button
                class="btn-primary btn-sm self-start min-h-[44px] sm:min-h-[auto]"
                [disabled]="!checkoutBooking() || checkouting()"
                (click)="prepareCheckout()"
              >
                @if (checkouting()) {
                  <span class="material-icons-round text-base animate-spin">refresh</span>
                } @else {
                  <span class="material-icons-round text-base">payment</span>
                }
                <span class="hidden sm:inline">Preparar cobro</span>
              </button>
            </div>
          </div>

          @if (reservationGroups().statusGroups.some(item => item.value > 0) || providerBookings().length) {
            <div class="card p-4 flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <p class="section-label">Resumen operativo</p>
                <span class="badge badge-info"
                  >{{ reservationGroups().statusGroups.reduce((sum, item) => sum + item.value, 0) }} total</span
                >
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                @for (item of reservationGroups().statusGroups; track item.label) {
                  <div class="rounded-xl bg-surface-low px-3 py-3">
                    <p class="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">{{ item.label }}</p>
                    <p class="mt-2 font-display text-2xl font-bold text-on-surface">{{ item.value }}</p>
                  </div>
                }
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="rounded-xl border border-outline-variant/20 bg-surface-low p-3">
                  <p class="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Servicios con más demanda
                  </p>
                  <div class="mt-3 flex flex-col gap-2">
                    @for (item of reservationGroups().byService; track item.label) {
                      <div class="flex items-center justify-between text-sm">
                        <span class="text-on-surface-variant">{{ item.label }}</span>
                        <span class="font-semibold text-on-surface">{{ item.value }}</span>
                      </div>
                    }
                    @if (!reservationGroups().byService.length) {
                      <p class="text-sm text-on-surface-variant">Sin datos todavía.</p>
                    }
                  </div>
                </div>

                <div class="rounded-xl border border-outline-variant/20 bg-surface-low p-3">
                  <p class="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">Días con más actividad</p>
                  <div class="mt-3 flex flex-col gap-2">
                    @for (item of reservationGroups().byDay; track item.label) {
                      <div class="flex items-center justify-between text-sm">
                        <span class="text-on-surface-variant">{{ item.label }}</span>
                        <span class="font-semibold text-on-surface">{{ item.value }}</span>
                      </div>
                    }
                    @if (!reservationGroups().byDay.length) {
                      <p class="text-sm text-on-surface-variant">Aún no hay actividad programada.</p>
                    }
                  </div>
                </div>
              </div>
            </div>
          }

          @if (providerBookings().length) {
            <div class="card p-4 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <p class="section-label">Reservas del marketplace</p>
                <span class="badge badge-info">{{ providerBookings().length }}</span>
              </div>

              <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div class="rounded-xl bg-surface-low px-3 py-2 text-center">
                  <p class="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">Pendientes</p>
                  <p class="mt-1 font-display text-xl font-bold text-warning">{{ pendingBookingsCount() }}</p>
                </div>
                <div class="rounded-xl bg-surface-low px-3 py-2 text-center">
                  <p class="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">Confirmadas</p>
                  <p class="mt-1 font-display text-xl font-bold text-success">{{ confirmedBookingsCount() }}</p>
                </div>
                <div class="rounded-xl bg-surface-low px-3 py-2 text-center">
                  <p class="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">Pagadas</p>
                  <p class="mt-1 font-display text-xl font-bold text-primary">{{ paidBookingsCount() }}</p>
                </div>
                <div class="rounded-xl bg-surface-low px-3 py-2 text-center">
                  <p class="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">Canceladas</p>
                  <p class="mt-1 font-display text-xl font-bold text-error">{{ cancelledBookingsCount() }}</p>
                </div>
              </div>

              <div class="flex flex-col gap-2">
                @for (booking of providerBookings(); track booking.id) {
                  <div class="rounded-xl border border-outline-variant/15 bg-surface-low p-3">
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <p class="font-medium">{{ booking.serviceId || 'Servicio' }}</p>
                        <p class="text-xs text-on-surface-variant">{{ booking.date }} · {{ booking.slot }}</p>
                      </div>
                      <div class="flex flex-col items-end gap-1.5">
                        <span class="badge" [ngClass]="bookingOverallStateClass(booking.id)">
                          {{ bookingOverallStateLabel(booking.id) }}
                        </span>
                        <span class="badge badge-secondary">{{ booking.status }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Filters -->
          <div class="flex flex-col gap-3">
            <div class="flex flex-wrap gap-2">
              <button
                class="btn-tertiary btn-sm"
                [class.btn-primary]="resQuickFilter() === 'all'"
                (click)="resQuickFilter.set('all')"
              >
                Todas
              </button>
              <button
                class="btn-tertiary btn-sm"
                [class.btn-primary]="resQuickFilter() === 'pending'"
                (click)="resQuickFilter.set('pending')"
              >
                Pendientes
              </button>
              <button
                class="btn-tertiary btn-sm"
                [class.btn-primary]="resQuickFilter() === 'confirmed'"
                (click)="resQuickFilter.set('confirmed')"
              >
                Confirmadas
              </button>
              <button
                class="btn-tertiary btn-sm"
                [class.btn-primary]="resQuickFilter() === 'available'"
                (click)="resQuickFilter.set('available')"
              >
                Disponibles
              </button>
            </div>

            <div class="flex flex-col sm:flex-row gap-2">
              <input
                type="search"
                class="form-input flex-1"
                placeholder="Buscar por cliente, servicio…"
                [value]="resSearch()"
                (input)="resSearch.set(getVal($event))"
              />
              <select class="form-select sm:w-44" [value]="resFilter()" (change)="resFilter.set(getVal($event))">
                <option value="">Todos los estados</option>
                <option value="disp">Disponible</option>
                <option value="pend">Pendiente</option>
                <option value="reserv">Reservado</option>
                <option value="confirm">Confirmado</option>
              </select>
            </div>
          </div>

          <!-- Table -->
          <div class="card p-4 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <p class="section-label">Notificaciones</p>
              <span class="badge badge-primary">{{ notifications().length }}</span>
            </div>
            @if (!notifications().length) {
              <p class="text-sm text-on-surface-variant">No hay avisos todavía para este negocio.</p>
            } @else {
              <div class="flex flex-col gap-2">
                @for (notification of notifications(); track notification.id) {
                  <div class="rounded-xl bg-surface-low px-3 py-2">
                    <div class="flex items-center justify-between gap-3">
                      <p class="font-medium text-sm">{{ notification.title }}</p>
                      <span
                        class="badge"
                        [class.badge-success]="notification.status === 'sent'"
                        [class.badge-secondary]="notification.status !== 'sent'"
                      >
                        {{
                          notification.status === 'sent'
                            ? 'Enviado'
                            : notification.status === 'failed'
                              ? 'Fallido'
                              : 'Pendiente'
                        }}
                      </span>
                    </div>
                    <p class="text-xs text-on-surface-variant mt-1">{{ notification.message }}</p>
                    <p class="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant mt-2">
                      {{ notification.type }} · {{ notification.channel }}
                    </p>
                  </div>
                }
              </div>
            }
          </div>

          @if (resLoading()) {
            <div class="flex flex-col gap-2">
              @for (i of [1, 2, 3, 4, 5]; track i) {
                <div class="skeleton h-14 rounded-xl"></div>
              }
            </div>
          } @else if (!filteredRes().length) {
            <div class="flex flex-col items-center gap-3 py-16 text-center">
              <span class="material-icons-round text-[3rem] text-outline-variant">event_busy</span>
              <p class="text-on-surface-variant text-sm">Sin reservas que mostrar.</p>
            </div>
          } @else {
            <div class="overflow-x-auto rounded-xl border border-outline-variant/20">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-surface-container text-on-surface-variant text-left">
                    <th class="px-4 py-3 font-semibold">Franja</th>
                    <th class="px-4 py-3 font-semibold hidden sm:table-cell">Cliente</th>
                    <th class="px-4 py-3 font-semibold hidden md:table-cell">Servicio</th>
                    <th class="px-4 py-3 font-semibold">Estado</th>
                    <th class="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant/10">
                  @for (r of filteredRes(); track r._rowIndex) {
                    <tr class="hover:bg-surface-container/40 transition">
                      <td class="px-4 py-3 font-display font-semibold whitespace-nowrap">{{ r.franja }}</td>
                      <td class="px-4 py-3 hidden sm:table-cell">{{ r.cliente || '—' }}</td>
                      <td class="px-4 py-3 hidden md:table-cell text-on-surface-variant">{{ r.servicio || '—' }}</td>
                      <td class="px-4 py-3"><app-badge [status]="r.disponibilidad" /></td>
                      <td class="px-4 py-3 text-right whitespace-nowrap">
                        @if (
                          r.disponibilidad.toLowerCase().includes('pend') ||
                          r.disponibilidad.toLowerCase().includes('reserv')
                        ) {
                          <button class="btn-primary btn-sm mr-1" (click)="setResStatus(r, 'Confirmado')">
                            Confirmar
                          </button>
                          <button class="btn-tertiary btn-sm mr-1" (click)="setResStatus(r, 'Cancelado')">
                            Rechazar
                          </button>
                        }
                        @if (r.telefono) {
                          <a
                            href="{{ contactHref(r) }}"
                            target="_blank"
                            rel="noopener"
                            class="btn-tertiary btn-sm mr-1"
                            [attr.title]="'Contactar a ' + (r.cliente || 'el cliente') + ' por WhatsApp'"
                          >
                            <span class="material-icons-round text-base">chat</span>
                            <span class="hidden lg:inline">Contactar</span>
                          </a>
                        }
                        <button class="text-primary hover:underline text-xs font-medium" (click)="openResModal(r)">
                          Editar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- TAB: SERVICIOS ─────────────────────────────────────────────── -->
      @if (tab() === 'servicios') {
        <div class="flex-1 p-4 sm:p-6 flex flex-col gap-5 max-w-xl mx-auto w-full">
          <h2 class="font-display font-semibold text-[1.375rem]">Servicios</h2>

          <!-- Add service form -->
          <form [formGroup]="serviceForm" (ngSubmit)="addService()" class="card flex flex-col gap-3">
            <div class="flex-1 w-full">
              <input
                type="text"
                class="form-input w-full"
                formControlName="nombre"
                placeholder="Nombre del servicio…"
              />
              @if (fieldInvalid('nombre')) {
                <p class="mt-1 text-xs text-error">
                  El nombre del servicio es obligatorio y debe tener al menos 2 caracteres.
                </p>
              }
            </div>
            <button
              type="submit"
              class="btn-primary btn-sm whitespace-nowrap min-h-[44px] sm:min-h-[auto]"
              [disabled]="serviceForm.invalid || addingSvc()"
            >
              @if (addingSvc()) {
                <span class="material-icons-round text-base animate-spin">refresh</span>
              } @else {
                <span class="material-icons-round text-base">add</span>
              }
              <span class="hidden sm:inline">Agregar</span>
            </button>
          </form>

          <!-- List -->
          @if (svcLoading()) {
            <div class="flex flex-col gap-2">
              @for (i of [1, 2, 3]; track i) {
                <div class="skeleton h-12 rounded-xl"></div>
              }
            </div>
          } @else if (!services().length) {
            <div class="flex flex-col items-center gap-3 py-12 text-center">
              <span class="material-icons-round text-[3rem] text-outline-variant">spa</span>
              <p class="text-on-surface-variant text-sm">Sin servicios. Agrega el primero.</p>
            </div>
          } @else {
            <div class="flex flex-col gap-2">
              @for (svc of services(); track svc) {
                <div class="card flex items-center gap-3">
                  <span class="material-icons-round text-primary text-base">spa</span>
                  <span class="flex-1 font-medium">{{ svc }}</span>
                  <button
                    class="w-8 h-8 flex items-center justify-center rounded-full
                               hover:bg-error/10 text-error transition min-h-[44px] sm:min-h-[auto] sm:w-8 sm:h-8"
                    [disabled]="deletingSvc() === svc"
                    (click)="deleteService(svc)"
                  >
                    @if (deletingSvc() === svc) {
                      <span class="material-icons-round text-base animate-spin">refresh</span>
                    } @else {
                      <span class="material-icons-round text-base">delete_outline</span>
                    }
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- TAB: PERFIL ─────────────────────────────────────────────────── -->
      @if (tab() === 'perfil') {
        <div class="flex-1 p-4 sm:p-6 flex flex-col gap-5 max-w-xl mx-auto w-full">
          <h2 class="font-display font-semibold text-[1.375rem]">Perfil del negocio</h2>

          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="card flex flex-col gap-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="form-label">Nombre</label>
                <input type="text" class="form-input" formControlName="name" />
              </div>
              <div>
                <label class="form-label">Categoría</label>
                <input type="text" class="form-input" formControlName="category" />
              </div>
            </div>
            <div>
              <label class="form-label">Descripción</label>
              <textarea class="form-textarea" formControlName="description" rows="2"></textarea>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="form-label">Ubicación</label>
                <input type="text" class="form-input" formControlName="location" />
              </div>
              <div>
                <label class="form-label">Teléfono</label>
                <input type="tel" class="form-input" formControlName="phone" />
              </div>
            </div>
            <div>
              <label class="form-label">Horario</label>
              <input type="text" class="form-input" formControlName="schedule" placeholder="Ej. Lun-Vie 9:00–18:00" />
            </div>
            <div>
              <label class="form-label">Política de cancelación</label>
              <textarea
                class="form-textarea"
                formControlName="cancellationPolicy"
                rows="2"
                placeholder="Ej. Cancelar hasta 24 horas antes de tu cita."
              ></textarea>
              <p class="text-xs text-on-surface-variant mt-1">
                Se muestra a los clientes antes de reservar. Da claridad sobre cancelaciones y reembolsos.
              </p>
            </div>
            <button
              type="submit"
              class="btn-primary self-end min-h-[44px] sm:min-h-[auto]"
              [disabled]="profileForm.invalid || savingProfile()"
            >
              @if (savingProfile()) {
                <span class="material-icons-round text-base animate-spin">refresh</span>
                <span class="hidden sm:inline">Guardando…</span>
              } @else {
                Guardar
              }
            </button>
          </form>

          <!-- Change PIN -->
          <form [formGroup]="pinForm" (ngSubmit)="changePin()" class="card flex flex-col gap-4">
            <p class="section-label">Cambiar PIN</p>
            <div>
              <label class="form-label">Nuevo PIN (mínimo 4 dígitos)</label>
              <input type="password" class="form-input" formControlName="pin" inputmode="numeric" placeholder="••••" />
            </div>
            <div>
              <label class="form-label">Confirmar PIN</label>
              <input
                type="password"
                class="form-input"
                formControlName="pinConfirm"
                inputmode="numeric"
                placeholder="••••"
              />
              @if (pinMismatch()) {
                <p class="text-xs text-error mt-1">Los PINs no coinciden.</p>
              }
            </div>
            <button
              type="submit"
              class="btn-primary self-end btn-sm min-h-[44px] sm:min-h-[auto]"
              [disabled]="pinForm.invalid || savingPin() || pinMismatch()"
            >
              @if (savingPin()) {
                <span class="material-icons-round text-base animate-spin">refresh</span>
              } @else {
                Actualizar PIN
              }
            </button>
          </form>
        </div>
      }

      <!-- TAB: GOOGLE SHEETS ────────────────────────────────────────── -->
      @if (tab() === 'google') {
        <div class="flex-1 p-4 sm:p-6 flex flex-col gap-5 max-w-xl mx-auto w-full">
          <h2 class="font-display font-semibold text-[1.375rem]">Google Sheets</h2>

          @if (googleLoading()) {
            <div class="flex flex-col gap-3">
              <div class="skeleton h-20 rounded-xl"></div>
              <div class="skeleton h-14 rounded-xl"></div>
            </div>
          } @else if (!googleStatus()?.linked) {
            <!-- No vinculado -->
            <div class="card flex flex-col items-center gap-4 py-8 text-center">
              <span class="material-icons-round text-[3rem] text-outline-variant">link_off</span>
              <div>
                <p class="font-medium">Sin cuenta Google vinculada</p>
                <p class="text-sm text-on-surface-variant mt-1">
                  Vincula tu cuenta para sincronizar reservas y servicios a tu propia Google Sheet.
                </p>
              </div>
              <button class="btn-primary" (click)="startGoogleAuth()">
                <span class="material-icons-round text-base">link</span>
                Vincular cuenta Google
              </button>
            </div>
          } @else {
            <!-- Vinculado -->
            <div class="card flex flex-col gap-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span class="material-icons-round text-primary">check_circle</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium">Cuenta vinculada</p>
                  <p class="text-sm text-on-surface-variant truncate">{{ googleStatus()!.email }}</p>
                </div>
              </div>

              @if (googleStatus()!.sheetId) {
                <div class="bg-surface-low rounded-xl p-4 flex flex-col gap-2 text-sm">
                  <div class="flex justify-between items-center">
                    <span class="text-on-surface-variant">Spreadsheet</span>
                    <a
                      [href]="'https://docs.google.com/spreadsheets/d/' + googleStatus()!.sheetId"
                      target="_blank"
                      rel="noopener"
                      class="text-primary hover:underline flex items-center gap-1 text-xs font-medium"
                    >
                      Abrir
                      <span class="material-icons-round text-sm">open_in_new</span>
                    </a>
                  </div>
                </div>

                <!-- Sync button -->
                <button class="btn-primary self-start" [disabled]="syncing()" (click)="syncSheets()">
                  @if (syncing()) {
                    <span class="material-icons-round text-base animate-spin">refresh</span> Sincronizando…
                  } @else {
                    <span class="material-icons-round text-base">sync</span> Sincronizar ahora
                  }
                </button>
              } @else {
                <!-- Sin sheet vinculada todavía -->
                <div class="bg-surface-low rounded-xl p-4 flex flex-col gap-3">
                  <p class="text-sm text-on-surface-variant">Elige cómo vincular tu spreadsheet:</p>

                  <!-- Crear nueva -->
                  <button class="btn-primary btn-sm" [disabled]="creatingSheet()" (click)="createSheet()">
                    @if (creatingSheet()) {
                      <span class="material-icons-round text-base animate-spin">refresh</span>
                    } @else {
                      <span class="material-icons-round text-base">add</span>
                    }
                    Crear spreadsheet nueva
                  </button>

                  <!-- O vincular existente -->
                  <div class="flex items-center gap-2 text-xs text-on-surface-variant">
                    <hr class="flex-1 border-outline-variant/20" />
                    <span>o vincular una existente</span>
                    <hr class="flex-1 border-outline-variant/20" />
                  </div>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      class="form-input flex-1 text-sm"
                      placeholder="ID de la spreadsheet"
                      [value]="linkSheetId()"
                      (input)="linkSheetId.set(getVal($event))"
                    />
                    <button
                      class="btn-secondary btn-sm whitespace-nowrap"
                      [disabled]="!linkSheetId()"
                      (click)="linkSheet()"
                    >
                      Vincular
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Disconnect -->
            <button
              class="text-error text-sm hover:underline self-start flex items-center gap-1"
              [disabled]="disconnecting()"
              (click)="disconnectGoogle()"
            >
              <span class="material-icons-round text-base">link_off</span>
              Desvincular cuenta Google
            </button>
          }
        </div>
      }

      <!-- ══ MODAL: Editar reserva ════════════════════════════════════ -->
      @if (modalRes()) {
        <div
          class="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-4 sm:p-6
                  bg-black/40 backdrop-blur-sm animate-fade-in"
          (click)="closeResModal()"
        >
          <div
            class="w-full max-w-md bg-surface-lowest rounded-t-2xl sm:rounded-2xl p-6
                    flex flex-col gap-5 shadow-soft animate-sheet-up"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between">
              <h3 class="font-display font-semibold text-lg">Actualizar reserva</h3>
              <button
                class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container"
                (click)="closeResModal()"
              >
                <span class="material-icons-round text-on-surface-variant">close</span>
              </button>
            </div>

            <div class="bg-surface-low rounded-xl p-4 flex flex-col gap-2 text-sm">
              <div class="flex justify-between">
                <span class="text-on-surface-variant">Franja</span>
                <span class="font-semibold font-display">{{ modalRes()!.franja }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-on-surface-variant">Cliente</span>
                <span>{{ modalRes()!.cliente || '—' }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-on-surface-variant">Estado actual</span>
                <app-badge [status]="modalRes()!.disponibilidad" />
              </div>
            </div>

            <div>
              <label class="form-label">Nuevo estado</label>
              <select class="form-select" [value]="newResStatus()" (change)="newResStatus.set(getVal($event))">
                <option value="Disponible">Disponible</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Reservado">Reservado</option>
                <option value="Confirmado">Confirmado</option>
              </select>
            </div>

            <div class="flex gap-3">
              <button class="btn-secondary flex-1" (click)="closeResModal()">Cancelar</button>
              <button class="btn-primary flex-1" [disabled]="savingRes()" (click)="saveResStatus()">
                @if (savingRes()) {
                  <span class="material-icons-round text-base animate-spin">refresh</span> Guardando…
                } @else {
                  Guardar
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class BusinessAdminComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private businessAdminService = inject(BusinessAdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tabs: { id: negocioTab; label: string; icon: string }[] = [
    { id: 'reservas', label: 'Reservas', icon: 'event_note' },
    { id: 'servicios', label: 'Servicios', icon: 'spa' },
    { id: 'perfil', label: 'Perfil', icon: 'storefront' },
    { id: 'google', label: 'Sheets', icon: 'table_chart' },
  ];

  readonly tab = signal<negocioTab>('reservas');
  readonly business = signal<Business | null>(null);
  readonly reservations = signal<Reservation[]>([]);
  readonly services = signal<string[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly marketplaceBookings = signal<BookingRecord[]>([]);
  readonly payments = signal<Payment[]>([]);
  readonly notifications = signal<NotificationItem[]>([]);
  readonly checkouting = signal(false);
  readonly resLoading = signal(false);
  readonly svcLoading = signal(false);
  readonly addingSvc = signal(false);
  readonly deletingSvc = signal<string | null>(null);
  readonly savingProfile = signal(false);
  readonly savingPin = signal(false);
  readonly modalRes = signal<Reservation | null>(null);
  readonly newResStatus = signal('Disponible');
  readonly savingRes = signal(false);
  readonly resSearch = signal('');
  readonly resFilter = signal('');
  readonly resQuickFilter = signal<'all' | 'pending' | 'confirmed' | 'available'>('all');

  // Google Sheets
  readonly googleStatus = signal<GoogleStatus | null>(null);
  readonly googleLoading = signal(false);
  readonly syncing = signal(false);
  readonly linkSheetId = signal('');
  readonly creatingSheet = signal(false);
  readonly disconnecting = signal(false);

  private negocioId = '';
  private token = '';
  private pollSub?: Subscription;

  readonly resStats = computed(() => {
    const rows = this.reservations();
    const total = rows.length;
    return {
      total,
      items: [
        { label: 'Total', value: total },
        { label: 'Disponibles', value: rows.filter(r => r.disponibilidad.toLowerCase().includes('disp')).length },
        { label: 'Reservados', value: rows.filter(r => r.disponibilidad.toLowerCase().includes('reserv')).length },
        { label: 'Pendientes', value: rows.filter(r => r.disponibilidad.toLowerCase().includes('pend')).length },
      ],
    };
  });

  readonly filteredRes = computed(() => {
    let rows = this.reservations();
    const q = this.resSearch().toLowerCase();
    const f = this.resFilter().toLowerCase();
    const quick = this.resQuickFilter();

    if (quick === 'pending')
      rows = rows.filter(
        r => r.disponibilidad.toLowerCase().includes('pend') || r.disponibilidad.toLowerCase().includes('reserv')
      );
    if (quick === 'confirmed') rows = rows.filter(r => r.disponibilidad.toLowerCase().includes('confirm'));
    if (quick === 'available') rows = rows.filter(r => r.disponibilidad.toLowerCase().includes('disp'));

    if (q)
      rows = rows.filter(
        r =>
          r.cliente?.toLowerCase().includes(q) ||
          r.servicio?.toLowerCase().includes(q) ||
          r.franja?.toLowerCase().includes(q)
      );
    if (f) rows = rows.filter(r => r.disponibilidad.toLowerCase().includes(f));
    return rows;
  });

  readonly reservationGroups = computed(() => {
    const rows = this.reservations();
    const statusGroups = [
      {
        label: 'Pendientes',
        value: rows.filter(
          r => r.disponibilidad.toLowerCase().includes('pend') || r.disponibilidad.toLowerCase().includes('reserv')
        ).length,
      },
      { label: 'Confirmadas', value: rows.filter(r => r.disponibilidad.toLowerCase().includes('confirm')).length },
      { label: 'Disponibles', value: rows.filter(r => r.disponibilidad.toLowerCase().includes('disp')).length },
    ];

    const byService = Object.entries(
      rows.reduce(
        (acc, row) => {
          const key = row.servicio || 'Sin servicio';
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    )
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    const byDay = Object.entries(
      this.providerBookings().reduce(
        (acc, booking) => {
          acc[booking.date] = (acc[booking.date] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    )
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    return { statusGroups, byService, byDay };
  });

  readonly businessAnalytics = computed(() => {
    const totalSlots = this.reservations().length;
    const bookings = this.providerBookings();
    const payments = this.payments();

    const reservedSlots = this.reservations().filter(
      r =>
        r.disponibilidad.toLowerCase().includes('pend') ||
        r.disponibilidad.toLowerCase().includes('reserv') ||
        r.disponibilidad.toLowerCase().includes('confirm')
    ).length;

    const confirmedSlots = this.reservations().filter(r => r.disponibilidad.toLowerCase().includes('confirm')).length;
    const paidBookings = payments.filter(p => p.status === 'paid').length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

    const reservationRate = totalSlots ? Math.round((reservedSlots / totalSlots) * 100) : 0;
    const confirmationRate = totalSlots ? Math.round((confirmedSlots / totalSlots) * 100) : 0;
    const paymentRate = bookings.length ? Math.round((paidBookings / bookings.length) * 100) : 0;
    const abandonmentRate = bookings.length
      ? Math.round(((pendingBookings + cancelledBookings) / bookings.length) * 100)
      : 0;

    const byService = Object.entries(
      this.reservations().reduce(
        (acc, row) => {
          const key = row.servicio || 'Sin servicio';
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    )
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    const bySlot = Object.entries(
      bookings.reduce(
        (acc, booking) => {
          acc[booking.slot] = (acc[booking.slot] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    )
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    return {
      cards: [
        { label: 'Reserva', value: `${reservationRate}%`, tone: 'primary' },
        { label: 'Confirmación', value: `${confirmationRate}%`, tone: 'success' },
        { label: 'Pago', value: `${paymentRate}%`, tone: 'primary' },
        { label: 'Abandono', value: `${abandonmentRate}%`, tone: 'warning' },
      ],
      byService,
      bySlot,
    };
  });

  readonly providerBookings = computed(() => this.marketplaceBookings().filter(b => b.providerId === this.negocioId));

  readonly recentCustomers = computed(() => this.customers().slice(0, 4));

  readonly checkoutBooking = computed(
    () =>
      this.providerBookings().find(b => b.status !== 'cancelled' && b.status !== 'completed') ??
      this.providerBookings()[0] ??
      null
  );

  readonly pendingBookingsCount = computed(() => this.providerBookings().filter(b => b.status === 'pending').length);

  readonly confirmedBookingsCount = computed(
    () => this.providerBookings().filter(b => b.status === 'confirmed').length
  );

  readonly paidBookingsCount = computed(() => this.payments().filter(p => p.status === 'paid').length);

  readonly cancelledBookingsCount = computed(
    () => this.providerBookings().filter(b => b.status === 'cancelled').length
  );

  readonly bookingPaymentMap = computed(
    () => new Map(this.payments().map(payment => [payment.bookingId, payment] as const))
  );

  bookingPaymentStatus(bookingId: string): Payment | null {
    return this.bookingPaymentMap().get(bookingId) ?? null;
  }

  bookingPaymentStateLabel(bookingId: string): string {
    const payment = this.bookingPaymentStatus(bookingId);
    if (!payment) return 'Sin pago';
    if (payment.status === 'paid') return 'Pagado';
    if (payment.status === 'pending') return 'Pendiente';
    return 'Fallido';
  }

  bookingPaymentStateClass(bookingId: string): string {
    const payment = this.bookingPaymentStatus(bookingId);
    if (payment?.status === 'paid') return 'badge-success';
    if (payment?.status === 'pending') return 'badge-info';
    if (payment?.status === 'failed') return 'badge-error';
    return 'badge-secondary';
  }

  bookingOverallStateLabel(bookingId: string): string {
    const booking = this.providerBookings().find(b => b.id === bookingId);
    const payment = this.bookingPaymentStatus(bookingId);

    if (booking?.status === 'cancelled') return 'Cancelada';
    if (payment?.status === 'paid') return 'Pagada';
    if (booking?.status === 'confirmed') return 'Confirmada';
    if (payment?.status === 'pending') return 'Pendiente';
    if (booking?.status === 'pending') return 'Pendiente';
    return 'Sin pago';
  }

  bookingOverallStateClass(bookingId: string): string {
    const booking = this.providerBookings().find(b => b.id === bookingId);
    const payment = this.bookingPaymentStatus(bookingId);

    if (booking?.status === 'cancelled') return 'badge-error';
    if (payment?.status === 'paid') return 'badge-success';
    if (booking?.status === 'confirmed') return 'badge-primary';
    if (payment?.status === 'pending' || booking?.status === 'pending') return 'badge-info';
    return 'badge-secondary';
  }

  readonly paymentAmount = computed(() => {
    const booking = this.checkoutBooking();
    const paid = this.payments().find(p => p.bookingId === booking?.id)?.amount ?? 89;
    return paid || 89;
  });

  readonly pinMismatch = computed(() => {
    const v = this.pinForm.value;
    return !!(v.pin && v.pinConfirm && v.pin !== v.pinConfirm);
  });

  fieldInvalid(name: string): boolean {
    const ctrl = this.serviceForm.get(name);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  readonly serviceForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly profileForm = this.fb.group({
    name: ['', Validators.required],
    category: ['', Validators.required],
    description: [''],
    location: [''],
    schedule: [''],
    phone: [''],
    cancellationPolicy: [''],
  });

  readonly pinForm = this.fb.group({
    pin: ['', [Validators.required, Validators.minLength(4)]],
    pinConfirm: ['', Validators.required],
  });

  ngOnInit(): void {
    this.negocioId = this.route.snapshot.params['businessId'] ?? '';
    this.token = this.businessAdminService.resolveToken(this.negocioId) ?? '';

    const isOwnerRoute = this.route.snapshot.url.some(seg => seg.path === 'owner');
    if (!this.token) {
      if (isOwnerRoute) {
        this.router.navigate(['/owner/login']);
      } else {
        this.router.navigate(['/business', this.negocioId, 'login']);
      }
      return;
    }

    this.loadBusiness();
    this.loadMarketplaceData();
    this.loadNotifications();
    this.startPolling();
    this.loadServices();

    const googleParam = this.route.snapshot.queryParams['google'];
    if (googleParam === 'linked') {
      this.toast.success('Cuenta Google vinculada correctamente');
      this.tab.set('google');
      this.loadGoogleStatus();
    }

    const paymentStatus = this.route.snapshot.queryParamMap.get('paymentStatus');
    const bookingId = this.route.snapshot.queryParamMap.get('bookingId');
    if (paymentStatus && bookingId) {
      this.applyPaymentStatusFromRoute(bookingId, paymentStatus);
    }
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  setTab(t: negocioTab): void {
    this.tab.set(t);
    if (t === 'servicios') this.loadServices();
    if (t === 'google') this.loadGoogleStatus();
  }

  loadBusiness(): void {
    this.businessAdminService
      .loadBusiness(this.negocioId, this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: found => {
          this.business.set(found);
          this.profileForm.patchValue({
            name: found.name,
            category: found.category,
            description: found.description,
            location: found.location,
            schedule: found.schedule ?? '',
            phone: found.phone ?? '',
            cancellationPolicy: found.cancellationPolicy ?? '',
          });
        },
        error: () => {
          this.toast.error('No se pudo cargar el negocio.');
        },
      });
  }

  startPolling(): void {
    this.pollSub = interval(30_000)
      .pipe(
        startWith(0),
        switchMap(() => {
          this.resLoading.set(true);
          return this.businessAdminService.loadReservations(this.negocioId, this.token);
        })
      )
      .subscribe({
        next: data => {
          this.reservations.set(data);
          this.resLoading.set(false);
        },
        error: () => {
          this.resLoading.set(false);
        },
      });
  }

  loadMarketplaceData(): void {
    this.businessAdminService
      .loadMarketplaceBookings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => this.marketplaceBookings.set(data),
        error: () => this.marketplaceBookings.set([]),
      });

    this.businessAdminService
      .loadNotifications(this.negocioId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => this.notifications.set(data),
        error: () => this.notifications.set([]),
      });

    this.businessAdminService
      .loadCustomers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => this.customers.set(data),
        error: () => this.customers.set([]),
      });

    this.businessAdminService
      .loadPayments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.payments.set(data);
          const routeBookingId = this.route.snapshot.queryParamMap.get('bookingId');
          const routeStatus = this.route.snapshot.queryParamMap.get('paymentStatus');
          if (routeBookingId && routeStatus) {
            this.applyPaymentStatusFromRoute(routeBookingId, routeStatus);
          }
        },
        error: () => this.payments.set([]),
      });
  }

  private applyPaymentStatusFromRoute(bookingId: string, paymentStatus: string): void {
    const normalized = paymentStatus.toLowerCase();
    if (!['paid', 'pending', 'failed'].includes(normalized)) return;

    const current = this.payments();
    const idx = current.findIndex(item => item.bookingId === bookingId);
    const nextItem: Payment = {
      id: `route-${bookingId}-${Date.now()}`,
      bookingId,
      providerId: this.negocioId,
      customerId: this.route.snapshot.queryParamMap.get('customerId') ?? '',
      amount: this.paymentAmount(),
      currency: 'EUR',
      method: 'card',
      status: normalized as 'paid' | 'pending' | 'failed',
      createdAt: new Date().toISOString(),
    };

    if (idx >= 0) {
      this.payments.set(current.map((item, index) => (index === idx ? { ...item, ...nextItem } : item)));
    } else {
      this.payments.set([nextItem, ...current]);
    }

    if (normalized === 'paid') {
      this.toast.success('Pago confirmado y estado actualizado');
    }
  }

  prepareCheckout(): void {
    const booking = this.checkoutBooking();
    if (!booking) return;

    this.checkouting.set(true);
    const successUrl = `${window.location.origin}/payment/success?bookingId=${encodeURIComponent(booking.id)}&providerId=${encodeURIComponent(booking.providerId)}&customerId=${encodeURIComponent(booking.customerId)}`;
    const cancelUrl = `${window.location.origin}/payment/cancel?bookingId=${encodeURIComponent(booking.id)}&providerId=${encodeURIComponent(booking.providerId)}&customerId=${encodeURIComponent(booking.customerId)}`;

    this.businessAdminService
      .createCheckoutSession({
        bookingId: booking.id,
        providerId: booking.providerId,
        customerId: booking.customerId,
        amount: this.paymentAmount(),
        currency: 'EUR',
        method: 'card',
        status: 'pending',
        successUrl,
        cancelUrl,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          const current = this.payments();
          const checkoutData = data.data;
          if (checkoutData?.paymentId) {
            this.payments.set([
              {
                id: checkoutData.paymentId,
                bookingId: booking.id,
                providerId: booking.providerId,
                customerId: booking.customerId,
                amount: this.paymentAmount(),
                currency: 'EUR',
                method: 'card',
                status: 'pending',
                createdAt: new Date().toISOString(),
              },
              ...current,
            ]);
          }
          this.toast.success('Redirigiendo al pago seguro de Stripe');
          if (checkoutData?.checkoutUrl) window.location.href = checkoutData.checkoutUrl;
          this.checkouting.set(false);
        },
        error: err => {
          this.toast.error(err?.message ?? 'No se pudo preparar el cobro');
          this.checkouting.set(false);
        },
      });
  }

  loadNotifications(): void {
    this.businessAdminService
      .loadNotifications(this.negocioId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => this.notifications.set(data),
        error: () => this.notifications.set([]),
      });
  }

  loadReservations(): void {
    this.resLoading.set(true);
    this.businessAdminService
      .loadReservations(this.negocioId, this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.reservations.set(data);
          this.resLoading.set(false);
        },
        error: () => {
          this.resLoading.set(false);
        },
      });
  }

  loadServices(): void {
    this.svcLoading.set(true);
    this.businessAdminService
      .loadServices(this.negocioId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.services.set(data);
          this.svcLoading.set(false);
        },
        error: () => {
          this.svcLoading.set(false);
        },
      });
  }

  addService(): void {
    if (this.serviceForm.invalid) return;
    const nombre = this.serviceForm.value.nombre!;
    this.addingSvc.set(true);
    this.businessAdminService
      .addService(this.negocioId, nombre, this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Servicio agregado');
          this.serviceForm.reset();
          this.addingSvc.set(false);
          this.loadServices();
        },
        error: err => {
          this.toast.error(err?.error?.message ?? 'Error al agregar');
          this.addingSvc.set(false);
        },
      });
  }

  deleteService(nombre: string): void {
    this.deletingSvc.set(nombre);
    this.businessAdminService
      .removeService(this.negocioId, nombre, this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Servicio eliminado');
          this.deletingSvc.set(null);
          this.loadServices();
        },
        error: err => {
          this.toast.error(err?.error?.message ?? 'Error al eliminar');
          this.deletingSvc.set(null);
        },
      });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    const v = this.profileForm.value;
    const profileValues = {
      name: v.name ?? null,
      category: v.category ?? null,
      description: v.description ?? null,
      location: v.location ?? null,
      schedule: v.schedule ?? null,
      phone: v.phone ?? null,
      cancellationPolicy: v.cancellationPolicy ?? null,
    };
    this.savingProfile.set(true);
    this.businessAdminService
      .saveProfile(this.negocioId, profileValues, this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Perfil actualizado');
          this.savingProfile.set(false);
        },
        error: err => {
          this.toast.error(err?.error?.message ?? 'Error al guardar');
          this.savingProfile.set(false);
        },
      });
  }

  changePin(): void {
    if (this.pinForm.invalid || this.pinMismatch()) return;
    const pin = this.pinForm.value.pin!;
    this.savingPin.set(true);
    this.businessAdminService
      .updatePin(this.negocioId, pin, this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('PIN actualizado. Inicia sesión de nuevo.');
          this.auth.clearBusinessToken(this.negocioId);
          this.router.navigate(['/business', this.negocioId, 'login']);
        },
        error: err => {
          this.toast.error(err?.error?.message ?? 'Error al cambiar PIN');
          this.savingPin.set(false);
        },
      });
  }

  openResModal(r: Reservation): void {
    this.modalRes.set(r);
    this.newResStatus.set(r.disponibilidad || 'Disponible');
  }

  closeResModal(): void {
    this.modalRes.set(null);
  }

  saveResStatus(): void {
    const r = this.modalRes();
    if (!r) return;
    this.savingRes.set(true);
    this.businessAdminService
      .updateReservationStatus(
        this.negocioId,
        {
          rowIndex: r._rowIndex,
          disponibilidad: this.newResStatus(),
          notas: r.notas ?? '',
        },
        this.token
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Estado actualizado');
          this.savingRes.set(false);
          this.closeResModal();
          this.loadReservations();
          this.loadNotifications();
        },
        error: err => {
          this.toast.error(err?.error?.message ?? 'Error');
          this.savingRes.set(false);
        },
      });
  }

  setResStatus(r: Reservation, estado: 'Confirmado' | 'Cancelado'): void {
    this.businessAdminService
      .updateReservationStatus(
        this.negocioId,
        {
          rowIndex: r._rowIndex,
          disponibilidad: estado,
          notas: r.notas ?? '',
        },
        this.token
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(estado === 'Confirmado' ? 'Reserva confirmada' : 'Reserva cancelada');
          this.loadReservations();
          this.loadNotifications();
        },
        error: err => {
          this.toast.error(err?.error?.message ?? 'Error al actualizar la reserva');
        },
      });
  }

  contactHref(r: Reservation): string {
    const phone = String(r.telefono ?? '')
      .replace(/\s+/g, '')
      .replace(/^\+/, '');
    return phone ? `https://wa.me/${phone}` : '';
  }

  exportReservationsCsv(): void {
    const header = ['Franja', 'Disponibilidad', 'Cliente', 'Telefono', 'Servicio', 'Notas'];
    const escape = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = this.filteredRes();

    const lines = [header.map(escape).join(';')];
    for (const r of rows) {
      lines.push([r.franja, r.disponibilidad, r.cliente, r.telefono, r.servicio, r.notas].map(escape).join(';'));
    }

    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservas-${this.negocioId}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.toast.success(rows.length ? `Exportadas ${rows.length} reservas` : 'No hay reservas que exportar');
  }

  // ── Google Sheets ──────────────────────────────────────────────

  loadGoogleStatus(): void {
    this.googleLoading.set(true);
    this.businessAdminService
      .getGoogleStatus(this.negocioId, this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.googleStatus.set(data);
          this.googleLoading.set(false);
        },
        error: () => {
          this.googleLoading.set(false);
        },
      });
  }

  startGoogleAuth(): void {
    this.businessAdminService
      .getGoogleAuthUrl(this.negocioId, this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: url => {
          window.location.href = url;
        },
        error: err => {
          this.toast.error(err?.message ?? 'Error al iniciar vinculación');
        },
      });
  }

  syncSheets(): void {
    this.syncing.set(true);
    this.businessAdminService
      .syncGoogleSheet(this.negocioId, this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Sincronización completada');
          this.syncing.set(false);
        },
        error: err => {
          this.toast.error(err?.message ?? 'Error al sincronizar');
          this.syncing.set(false);
        },
      });
  }

  createSheet(): void {
    this.creatingSheet.set(true);
    this.businessAdminService
      .createGoogleSheet(this.negocioId, this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Spreadsheet creada');
          this.creatingSheet.set(false);
          this.loadGoogleStatus();
        },
        error: err => {
          this.toast.error(err?.message ?? 'Error al crear sheet');
          this.creatingSheet.set(false);
        },
      });
  }

  linkSheet(): void {
    const sheetId = this.linkSheetId().trim();
    if (!sheetId) return;
    this.businessAdminService
      .linkGoogleSheet(this.negocioId, sheetId, this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Spreadsheet vinculada');
          this.linkSheetId.set('');
          this.loadGoogleStatus();
        },
        error: err => {
          this.toast.error(err?.message ?? 'No se pudo vincular');
        },
      });
  }

  disconnectGoogle(): void {
    if (!confirm('¿Desvincular tu cuenta Google? Se dejará de sincronizar.')) return;
    this.disconnecting.set(true);
    this.businessAdminService
      .disconnectGoogle(this.negocioId, this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Cuenta Google desvinculada');
          this.googleStatus.set(null);
          this.disconnecting.set(false);
        },
        error: err => {
          this.toast.error(err?.message ?? 'Error');
          this.disconnecting.set(false);
        },
      });
  }

  logout(): void {
    this.auth.clearBusinessToken(this.negocioId);
    this.router.navigate(['/business', this.negocioId, 'login']);
  }

  getVal(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }
}
