import {
  Component, OnInit, signal, computed, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, Validators, AbstractControl
} from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService }   from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService }  from '../../core/services/auth.service';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { Business, NewBusinessPayload, Reservation }  from '../../core/models/reservation.model';

type AdminTab = 'reservas' | 'servicios' | 'ajustes' | 'negocios';

@Component({
    selector: 'app-admin',
    imports: [CommonModule, ReactiveFormsModule, BadgeComponent],
    template: `
  <div class="flex flex-col min-h-screen bg-surface">

    <!-- TOP BAR -->
    <header class="sticky top-0 z-20 bg-surface-lowest border-b border-outline-variant/30
                   flex items-center gap-3 px-6 h-16">
      <div class="w-9 h-9 flex items-center justify-center rounded-md text-white text-base"
           style="background:linear-gradient(135deg,#005bbf,#1a73e8)">
        <span class="material-icons-round text-sm">admin_panel_settings</span>
      </div>
      <span class="font-display font-bold text-base flex-1">Panel de administración</span>
      <button class="w-9 h-9 flex items-center justify-center rounded-full
                     hover:bg-surface-container transition text-on-surface-variant"
              (click)="refresh()" [disabled]="loading()" aria-label="Actualizar">
        <span class="material-icons-round text-[1.1rem]" [class.animate-spin]="loading()">refresh</span>
      </button>
      <button class="btn-tertiary btn-sm gap-1" (click)="logout()">
        <span class="material-icons-round text-base">logout</span>
        Salir
      </button>
    </header>

    <!-- NAV TABS -->
    <nav class="flex items-center gap-1 px-4 py-2 bg-surface-lowest border-b border-outline-variant/30 overflow-x-auto">
      @for (t of tabs; track t.id) {
        <button class="nav-item whitespace-nowrap" [class.active]="tab() === t.id" (click)="tab.set(t.id)">
          <span class="material-icons-round text-[1rem]">{{ t.icon }}</span>
          {{ t.label }}
        </button>
      }
    </nav>

    <!-- ══ TAB: RESERVAS ═══════════════════════════════════════════ -->
    @if (tab() === 'reservas') {
      <div class="flex-1 p-4 sm:p-6 flex flex-col gap-5 max-w-6xl mx-auto w-full">

        <!-- Stats -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          @for (s of stats(); track s.label) {
            <div class="card flex flex-col gap-1.5">
              <p class="text-[11px] uppercase tracking-widest text-outline font-semibold">{{ s.label }}</p>
              <p class="font-display font-bold text-2xl text-on-surface">{{ s.value }}</p>
            </div>
          }
        </div>

        <!-- Search + filter -->
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1">
            <span class="material-icons-round absolute left-3 top-1/2 -translate-y-1/2
                         text-outline text-[1.1rem] pointer-events-none">search</span>
            <input type="search" class="form-input pl-10"
                   placeholder="Buscar cliente, servicio…"
                   [value]="searchQuery()"
                   (input)="searchQuery.set(getInputValue($event))" />
          </div>
          <select class="form-select sm:w-48"
                  [value]="filterStatus()"
                  (change)="filterStatus.set(getInputValue($event))">
            <option value="">Todos</option>
            <option value="disponible">Disponibles</option>
            <option value="pendiente">Pendientes</option>
            <option value="reservado">Reservados</option>
            <option value="confirmado">Confirmados</option>
          </select>
        </div>

        <!-- Error -->
        @if (error() && !loading()) {
          <div class="bg-error-container rounded-xl p-4 flex items-center gap-3 text-[#93000a]">
            <span class="material-icons-round">warning</span>
            <p class="text-sm">{{ error() }}</p>
          </div>
        }

        <!-- Skeleton -->
        @if (loading()) {
          <div class="flex flex-col gap-2">
            @for (i of [1,2,3,4]; track i) {
              <div class="skeleton h-14 rounded-xl"></div>
            }
          </div>
        }

        <!-- Table (desktop) / Cards (mobile) -->
        @if (!loading() && !error()) {
          @if (!filteredRows().length) {
            <div class="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <span class="material-icons-round text-[3.5rem] text-outline-variant">event_busy</span>
              <h3 class="font-display font-semibold text-xl">Sin resultados</h3>
              <p class="text-sm text-on-surface-variant">Ajusta los filtros o recarga los datos.</p>
            </div>
          } @else {
            <!-- Desktop table -->
            <div class="hidden sm:block card p-0 overflow-hidden">
              <table class="w-full text-sm text-left">
                <thead>
                  <tr class="border-b border-outline-variant/30 text-[11px] uppercase tracking-wider
                              text-outline bg-surface-low">
                    <th class="px-5 py-3">Franja</th>
                    <th class="px-5 py-3">Estado</th>
                    <th class="px-5 py-3">Cliente</th>
                    <th class="px-5 py-3">Teléfono</th>
                    <th class="px-5 py-3">Servicio</th>
                    <th class="px-5 py-3">Notas</th>
                    <th class="px-5 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of filteredRows(); track row._rowIndex) {
                    <tr class="border-b border-outline-variant/20 hover:bg-surface-low transition">
                      <td class="px-5 py-3.5 font-display font-semibold">{{ row.franja }}</td>
                      <td class="px-5 py-3.5"><app-badge [status]="row.disponibilidad" /></td>
                      <td class="px-5 py-3.5">{{ row.cliente || '—' }}</td>
                      <td class="px-5 py-3.5">{{ row.telefono || '—' }}</td>
                      <td class="px-5 py-3.5"><span class="service-tag">{{ row.servicio || '—' }}</span></td>
                      <td class="px-5 py-3.5 text-on-surface-variant max-w-[160px] truncate">{{ row.notas || '—' }}</td>
                      <td class="px-5 py-3.5">
                        @if (!isFreeSlot(row)) {
                          <button class="btn-primary btn-sm gap-1"
                                  [disabled]="updating() === row._rowIndex"
                                  (click)="openModal(row)">
                            <span class="material-icons-round text-[0.875rem]">edit</span>
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Mobile cards -->
            <div class="flex flex-col gap-3 sm:hidden">
              @for (row of filteredRows(); track row._rowIndex) {
                <div class="card flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <span class="font-display font-bold text-lg">{{ row.franja }}</span>
                    <app-badge [status]="row.disponibilidad" />
                  </div>
                  @if (row.cliente) {
                    <p class="text-sm text-on-surface-variant">
                      <span class="font-semibold text-on-surface">{{ row.cliente }}</span>
                      @if (row.telefono) { · {{ row.telefono }} }
                    </p>
                  }
                  @if (row.servicio) {
                    <span class="service-tag self-start">{{ row.servicio }}</span>
                  }
                  @if (row.notas) {
                    <p class="text-xs text-on-surface-variant">{{ row.notas }}</p>
                  }
                  @if (!isFreeSlot(row)) {
                    <button class="btn-secondary btn-sm self-end gap-1 mt-1" (click)="openModal(row)">
                      <span class="material-icons-round text-[0.875rem]">edit</span>
                      Cambiar estado
                    </button>
                  }
                </div>
              }
            </div>
          }
        }
      </div>
    }

    <!-- ══ TAB: SERVICIOS ══════════════════════════════════════════ -->
    @if (tab() === 'servicios') {
      <div class="flex-1 p-4 sm:p-6 flex flex-col gap-6 max-w-xl mx-auto w-full">

        <div>
          <h2 class="font-display font-semibold text-[1.375rem]">Servicios</h2>
          <p class="text-sm text-on-surface-variant mt-1">Administra la lista de servicios disponibles.</p>
        </div>

        <!-- Add service form -->
        <form [formGroup]="serviceForm" (ngSubmit)="addService()" class="card flex flex-col gap-4">
          <p class="section-label">Nuevo servicio</p>
          <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div class="flex-1 w-full">
              <label class="form-label" for="svcNombre">Nombre del servicio</label>
              <input id="svcNombre" type="text" class="form-input"
                     placeholder="Ej. Corte de cabello"
                     formControlName="nombre"
                     autocomplete="off" />
            </div>
            <button type="submit"
                    class="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold
                           text-white transition disabled:opacity-40 disabled:cursor-not-allowed
                           whitespace-nowrap w-full sm:w-auto flex-shrink-0"
                    style="background:linear-gradient(135deg,#005bbf,#1a73e8)"
                    [disabled]="serviceForm.invalid || addingService()">
              @if (addingService()) {
                <span class="material-icons-round text-base animate-spin">refresh</span>
                Guardando…
              } @else {
                <span class="material-icons-round text-base">add_circle</span>
                Agregar servicio
              }
            </button>
          </div>
        </form>

        <!-- Services list -->
        @if (servicesLoading()) {
          <div class="flex flex-col gap-2">
            <div class="skeleton h-14 rounded-xl"></div>
            <div class="skeleton h-14 rounded-xl"></div>
            <div class="skeleton h-14 rounded-xl"></div>
          </div>
        }
        @if (!servicesLoading()) {
          @if (!services().length) {
            <div class="flex flex-col items-center justify-center gap-4 py-14 text-center">
              <div class="w-16 h-16 rounded-full flex items-center justify-center"
                   style="background:#ebeef4">
                <span class="material-icons-round text-3xl" style="color:#727785">category</span>
              </div>
              <div>
                <h3 class="font-display font-semibold text-base">Sin servicios aún</h3>
                <p class="text-sm mt-1" style="color:#727785">Agrega el primero usando el formulario de arriba.</p>
              </div>
            </div>
          } @else {
            <div>
              <p class="section-label">{{ services().length }} servicio{{ services().length !== 1 ? 's' : '' }} registrado{{ services().length !== 1 ? 's' : '' }}</p>
              <div class="flex flex-col gap-2">
                @for (svc of services(); track svc; let i = $index) {
                  <div class="flex items-center gap-4 px-5 py-4 rounded-xl transition"
                       style="background:#ffffff;box-shadow:0 2px 8px rgba(24,28,32,0.04)">
                    <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                         style="background:#d8e2ff">
                      <span class="material-icons-round text-[1.1rem]" style="color:#005bbf">spa</span>
                    </div>
                    <span class="font-medium flex-1">{{ svc }}</span>
                    <button
                      class="w-9 h-9 rounded-lg flex items-center justify-center transition
                             disabled:opacity-40 disabled:cursor-not-allowed"
                      style="color:#93000a;background:#fff0ef"
                      (click)="deleteService(svc)"
                      [disabled]="deletingService() === svc"
                      [attr.aria-label]="'Eliminar ' + svc">
                      @if (deletingService() === svc) {
                        <span class="material-icons-round text-base animate-spin">refresh</span>
                      } @else {
                        <span class="material-icons-round text-base">delete_outline</span>
                      }
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        }
      </div>
    }

    <!-- ══ TAB: NEGOCIOS ══════════════════════════════════════════ -->
    @if (tab() === 'negocios') {
      <div class="flex-1 p-4 sm:p-6 flex flex-col gap-5 max-w-4xl mx-auto w-full">

        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-display font-semibold text-[1.375rem]">Negocios</h2>
            <p class="text-sm text-on-surface-variant mt-1">Gestiona los negocios de la plataforma.</p>
          </div>
          <button class="btn-primary btn-sm gap-1.5" (click)="openBizModal(null)" [disabled]="!adminToken()">
            <span class="material-icons-round text-base">add</span>
            Nuevo
          </button>
        </div>

        @if (!adminToken()) {
          <div class="flex gap-3 p-4 rounded-xl text-sm"
               style="background:#fff8e1;color:#7c4f00;border:1px solid #f5d87c">
            <span class="material-icons-round text-base mt-0.5">warning</span>
            <div>
              <p class="font-semibold">Token de administrador no disponible</p>
              <p class="mt-0.5 opacity-80">Asegúrate de que <code>ADMIN_PIN</code> en el servidor coincida con tu PIN local (por defecto: 1234).</p>
            </div>
          </div>
        }

        @if (businessesLoading()) {
          <div class="flex flex-col gap-3">
            @for (i of [1,2,3]; track i) { <div class="skeleton h-20 rounded-2xl"></div> }
          </div>
        }

        @if (!businessesLoading()) {
          @if (!businesses().length) {
            <div class="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <span class="material-icons-round text-[3.5rem] text-outline-variant">store</span>
              <h3 class="font-display font-semibold text-xl">Sin negocios aún</h3>
              <p class="text-sm text-on-surface-variant">Agrega el primero con el botón "Nuevo".</p>
            </div>
          } @else {
            <div class="flex flex-col gap-3">
              @for (biz of businesses(); track biz.id) {
                <div class="card flex items-center gap-4">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                       [style.background]="biz.gradient">
                    <span class="material-icons-round text-xl">{{ biz.icon }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h3 class="font-display font-bold text-base truncate">{{ biz.name }}</h3>
                      <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            [style.background]="biz.active ? '#e6f4ea' : '#f5f5f5'"
                            [style.color]="biz.active ? '#1e7e34' : '#727785'">
                        {{ biz.active ? 'Activo' : 'Inactivo' }}
                      </span>
                    </div>
                    <p class="text-xs text-on-surface-variant truncate mt-0.5">
                      {{ biz.category }} · {{ biz.location || 'Sin ubicación' }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <a [href]="'/business/' + biz.id + '/admin'" target="_blank"
                       class="w-9 h-9 flex items-center justify-center rounded-lg text-white"
                       style="background:linear-gradient(135deg,#005bbf,#1a73e8)">
                      <span class="material-icons-round text-base">open_in_new</span>
                    </a>
                    <button class="w-9 h-9 flex items-center justify-center rounded-lg transition"
                            style="background:#d8e2ff;color:#005bbf"
                            (click)="openBizModal(biz)" [disabled]="!adminToken()">
                      <span class="material-icons-round text-base">edit</span>
                    </button>
                    <button class="w-9 h-9 flex items-center justify-center rounded-lg transition disabled:opacity-40"
                            [style.background]="biz.active ? '#fff0ef' : '#e8f5e9'"
                            [style.color]="biz.active ? '#93000a' : '#2e7d32'"
                            (click)="toggleBusiness(biz.id)"
                            [disabled]="togglingBusiness() === biz.id || !adminToken()">
                      @if (togglingBusiness() === biz.id) {
                        <span class="material-icons-round text-base animate-spin">refresh</span>
                      } @else {
                        <span class="material-icons-round text-base">{{ biz.active ? 'visibility_off' : 'visibility' }}</span>
                      }
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>
    }

    <!-- ══ TAB: AJUSTES ════════════════════════════════════════════ -->
    @if (tab() === 'ajustes') {
      <div class="flex-1 p-4 sm:p-6 flex flex-col gap-6 max-w-xl mx-auto w-full">

        <div>
          <h2 class="font-display font-semibold text-[1.375rem]">Ajustes</h2>
          <p class="text-sm text-on-surface-variant mt-1">Configura la conexión y seguridad.</p>
        </div>

        <!-- Sheet info -->
        <div class="card flex flex-col gap-2">
          <p class="section-label">Google Sheets</p>
          <p class="text-xs text-on-surface-variant">ID de la hoja activa:</p>
          <code class="bg-surface-low rounded-md px-3 py-2 text-xs break-all font-mono text-primary">
            {{ sheetId }}
          </code>
          <p class="text-xs text-on-surface-variant mt-1">
            Asegúrate de que la hoja tenga permisos de "Cualquier persona con el enlace puede ver".
          </p>
        </div>

        <!-- PIN change -->
        <form [formGroup]="pinForm" (ngSubmit)="changePin()" class="card flex flex-col gap-4">
          <p class="section-label">Cambiar PIN de administrador</p>
          <div>
            <label class="form-label" for="currentPin">PIN actual</label>
            <input id="currentPin" type="password" class="form-input" inputmode="numeric"
                   maxlength="8" formControlName="current" placeholder="••••" />
          </div>
          <div>
            <label class="form-label" for="newPin">Nuevo PIN</label>
            <input id="newPin" type="password" class="form-input" inputmode="numeric"
                   maxlength="8" formControlName="next" placeholder="••••" />
            @if (pinError()) {
              <p class="text-xs text-error mt-1">{{ pinError() }}</p>
            }
          </div>
          <button type="submit" class="btn-primary btn-sm self-end"
                  [disabled]="pinForm.invalid">
            Guardar PIN
          </button>
        </form>

      </div>
    }

    <!-- ══ MODAL: Negocio ══════════════════════════════════════════ -->
    @if (showBizModal()) {
      <div class="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 sm:p-6
                  bg-black/40 backdrop-blur-sm animate-fade-in"
           (click)="closeBizModal()">
        <div class="w-full max-w-lg bg-surface-lowest rounded-t-2xl sm:rounded-2xl flex flex-col
                    shadow-soft max-h-[92dvh] animate-sheet-up"
             (click)="$event.stopPropagation()">

          <div class="flex items-center justify-between p-5 border-b border-outline-variant/20 flex-shrink-0">
            <h3 class="font-display font-semibold text-lg">
              {{ editingBusiness() ? 'Editar negocio' : 'Nuevo negocio' }}
            </h3>
            <button class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container"
                    (click)="closeBizModal()">
              <span class="material-icons-round text-on-surface-variant">close</span>
            </button>
          </div>

          <div class="overflow-y-auto flex-1 p-5">
            <form [formGroup]="businessForm" class="flex flex-col gap-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Nombre *</label>
                  <input type="text" class="form-input" formControlName="name" />
                </div>
                <div>
                  <label class="form-label">Categoría *</label>
                  <input type="text" class="form-input" formControlName="category"
                         placeholder="Ej. Salud & Bienestar" />
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
                <input type="text" class="form-input" formControlName="schedule"
                       placeholder="Ej. Lun-Vie 9:00–18:00" />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Ícono Material</label>
                  <input type="text" class="form-input" formControlName="icon" placeholder="store" />
                </div>
                <div>
                  <label class="form-label">Tags (coma separados)</label>
                  <input type="text" class="form-input" formControlName="tags"
                         placeholder="Consultas, Online" />
                </div>
              </div>
              <div>
                <label class="form-label">Gradiente CSS</label>
                <input type="text" class="form-input" formControlName="gradient"
                       placeholder="linear-gradient(135deg,#005bbf,#1a73e8)" />
              </div>
              <div>
                <label class="form-label">Google Sheet ID *</label>
                <input type="text" class="form-input" formControlName="sheetId" />
                <p class="text-xs text-on-surface-variant mt-1">
                  URL: docs.google.com/spreadsheets/d/<strong>ID</strong>/edit
                </p>
              </div>
              <div>
                <label class="form-label">Apps Script URL *</label>
                <input type="text" class="form-input" formControlName="appsScriptUrl"
                       placeholder="https://script.google.com/macros/s/…" />
              </div>
              <div>
                <label class="form-label">
                  {{ editingBusiness() ? 'Nuevo PIN (vacío = sin cambio)' : 'PIN de acceso *' }}
                </label>
                <input type="password" class="form-input" formControlName="pin"
                       inputmode="numeric" placeholder="••••" />
              </div>
            </form>
          </div>

          <div class="p-5 border-t border-outline-variant/20 flex gap-3 flex-shrink-0">
            <button class="btn-secondary flex-1" (click)="closeBizModal()">Cancelar</button>
            <button class="btn-primary flex-1"
                    [disabled]="businessForm.invalid || savingBusiness()"
                    (click)="saveBusiness()">
              @if (savingBusiness()) {
                <span class="material-icons-round text-base animate-spin">refresh</span>
                Guardando…
              } @else {
                Guardar
              }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ══ MODAL: Cambiar estado ════════════════════════════════════ -->
    @if (modalRow()) {
      <div class="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-4 sm:p-6
                  bg-black/40 backdrop-blur-sm animate-fade-in"
           (click)="closeModal()">
        <div class="w-full max-w-md bg-surface-lowest rounded-t-2xl sm:rounded-2xl p-6
                    flex flex-col gap-5 shadow-soft animate-sheet-up"
             (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h3 class="font-display font-semibold text-lg">Actualizar reserva</h3>
            <button class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container"
                    (click)="closeModal()">
              <span class="material-icons-round text-on-surface-variant">close</span>
            </button>
          </div>

          <!-- Resumen -->
          <div class="bg-surface-low rounded-xl p-4 flex flex-col gap-2 text-sm">
            <div class="flex justify-between">
              <span class="text-on-surface-variant">Franja</span>
              <span class="font-semibold font-display">{{ modalRow()!.franja }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-on-surface-variant">Cliente</span>
              <span>{{ modalRow()!.cliente || '—' }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-on-surface-variant">Estado actual</span>
              <app-badge [status]="modalRow()!.disponibilidad" />
            </div>
          </div>

          <div>
            <label class="form-label">Nuevo estado</label>
            <select class="form-select" [value]="newStatus()" (change)="newStatus.set(getInputValue($event))">
              <option value="disponible">Disponible</option>
              <option value="pendiente">Pendiente</option>
              <option value="reservado">Reservado</option>
              <option value="confirmado">Confirmado</option>
            </select>
          </div>

          <div class="flex gap-3">
            <button class="btn-secondary flex-1" (click)="closeModal()">Cancelar</button>
            <button class="btn-primary flex-1" [disabled]="updating() !== null"
                    (click)="saveStatus()">
              @if (updating() !== null) {
                <span class="material-icons-round text-base animate-spin">refresh</span>
                Guardando…
              } @else {
                Guardar
              }
            </button>
          </div>
        </div>
      </div>
    }

  </div>
  `
})
export class AdminComponent implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);
  private auth  = inject(AuthService);
  private router = inject(Router);
  private fb    = inject(FormBuilder);

  readonly sheetId = '1cxZR6YYFkXJy8AKGM-1AakGk9hw6AR9vTv2RHm4yUNc';

  readonly tabs = [
    { id: 'reservas'  as AdminTab, label: 'Reservas',  icon: 'event_note' },
    { id: 'servicios' as AdminTab, label: 'Servicios', icon: 'spa'        },
    { id: 'negocios'  as AdminTab, label: 'Negocios',  icon: 'store'      },
    { id: 'ajustes'   as AdminTab, label: 'Ajustes',   icon: 'settings'   },
  ];

  readonly tab            = signal<AdminTab>('reservas');
  readonly loading        = signal(false);
  readonly servicesLoading = signal(false);
  readonly addingService   = signal(false);
  readonly deletingService = signal<string | null>(null);
  readonly updating       = signal<number | null>(null);
  readonly error          = signal<string | null>(null);
  readonly reservations   = signal<Reservation[]>([]);
  readonly services       = signal<string[]>([]);
  readonly searchQuery    = signal('');
  readonly filterStatus   = signal('');
  readonly modalRow       = signal<Reservation | null>(null);
  readonly newStatus      = signal('disponible');
  readonly pinError       = signal<string | null>(null);

  // ── Negocios state ──────────────────────────────────────────────────────
  readonly adminToken        = signal<string | null>(null);
  readonly businesses        = signal<Business[]>([]);
  readonly businessesLoading = signal(false);
  readonly togglingBusiness  = signal<string | null>(null);
  readonly showBizModal      = signal(false);
  readonly editingBusiness   = signal<Business | null>(null);
  readonly savingBusiness    = signal(false);

  readonly serviceForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly pinForm = this.fb.group({
    current: ['', Validators.required],
    next:    ['', [Validators.required, Validators.minLength(4)]],
  });

  readonly businessForm = this.fb.group({
    name:          ['', [Validators.required, Validators.minLength(2)]],
    category:      ['', Validators.required],
    description:   [''],
    location:      [''],
    schedule:      [''],
    phone:         [''],
    tags:          [''],
    icon:          ['store'],
    gradient:      ['linear-gradient(135deg,#005bbf,#1a73e8)'],
    sheetId:       ['', Validators.required],
    appsScriptUrl: ['', Validators.required],
    pin:           [''],
  });

  readonly stats = computed(() => {
    const rows = this.reservations();
    const total      = rows.length;
    const available  = rows.filter(r => r.disponibilidad.toLowerCase().includes('disp')).length;
    const reserved   = rows.filter(r => r.disponibilidad.toLowerCase().includes('reserv')).length;
    const pending    = rows.filter(r => r.disponibilidad.toLowerCase().includes('pend')).length;
    return [
      { label: 'Total', value: total },
      { label: 'Disponibles', value: available },
      { label: 'Reservados', value: reserved },
      { label: 'Pendientes', value: pending },
    ];
  });

  readonly filteredRows = computed(() => {
    let rows = this.reservations();
    const q = this.searchQuery().toLowerCase();
    const f = this.filterStatus().toLowerCase();
    if (q) rows = rows.filter(r =>
      r.cliente?.toLowerCase().includes(q) ||
      r.servicio?.toLowerCase().includes(q) ||
      r.franja?.toLowerCase().includes(q)
    );
    if (f) rows = rows.filter(r => r.disponibilidad.toLowerCase().includes(f));
    return rows;
  });

  ngOnInit(): void {
    this.loadReservations();
    this.loadServices();
    this.initAdminToken();
  }

  initAdminToken(): void {
    const cached = this.auth.getAdminToken();
    if (cached) { this.adminToken.set(cached); this.loadBusinesses(cached); return; }
    this.api.loginAdmin(this.auth.storedPin).subscribe({
      next: res => {
        if (res.data?.token) {
          this.auth.setAdminToken(res.data.token);
          this.adminToken.set(res.data.token);
          this.loadBusinesses(res.data.token);
        }
      },
      error: () => { /* admin token not available — negocios tab will show warning */ },
    });
  }

  loadBusinesses(token?: string): void {
    const t = token ?? this.adminToken();
    if (!t) return;
    this.businessesLoading.set(true);
    this.api.getAllBusinesses(t).subscribe({
      next:  list => { this.businesses.set(list); this.businessesLoading.set(false); },
      error: ()   => { this.businessesLoading.set(false); },
    });
  }

  openBizModal(biz: Business | null): void {
    this.editingBusiness.set(biz);
    if (biz) {
      this.businessForm.patchValue({
        name: biz.name, category: biz.category, description: biz.description,
        location: biz.location, schedule: biz.schedule ?? '',
        phone: biz.phone ?? '', tags: biz.tags?.join(', ') ?? '',
        icon: biz.icon, gradient: biz.gradient,
        sheetId: biz.sheetId ?? '', appsScriptUrl: biz.appsScriptUrl ?? '',
        pin: '',
      });
      this.businessForm.get('pin')?.clearValidators();
    } else {
      this.businessForm.reset({ icon: 'store', gradient: 'linear-gradient(135deg,#005bbf,#1a73e8)' });
      this.businessForm.get('pin')?.setValidators([Validators.required, Validators.minLength(4)]);
    }
    this.businessForm.get('pin')?.updateValueAndValidity();
    this.showBizModal.set(true);
  }

  closeBizModal(): void { this.showBizModal.set(false); }

  saveBusiness(): void {
    if (this.businessForm.invalid) return;
    const token = this.adminToken();
    if (!token) return;
    const v = this.businessForm.value;
    const tagsArr = (v.tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean);
    this.savingBusiness.set(true);

    if (this.editingBusiness()) {
      const updates: Partial<NewBusinessPayload> & { pin?: string } = {
        name: v.name!, category: v.category!, description: v.description ?? '',
        location: v.location ?? '', schedule: v.schedule ?? '', phone: v.phone ?? '',
        tags: tagsArr, icon: v.icon!, gradient: v.gradient!,
        sheetId: v.sheetId!, appsScriptUrl: v.appsScriptUrl!,
      };
      if (v.pin) updates.pin = v.pin;
      this.api.updateBusiness(this.editingBusiness()!.id, updates, token).subscribe({
        next: () => {
          this.toast.success('Negocio actualizado');
          this.savingBusiness.set(false);
          this.closeBizModal();
          this.loadBusinesses();
        },
        error: err => { this.toast.error(err.message); this.savingBusiness.set(false); },
      });
    } else {
      const payload: NewBusinessPayload = {
        name: v.name!, category: v.category!, description: v.description ?? '',
        location: v.location ?? '', schedule: v.schedule ?? '', phone: v.phone ?? '',
        tags: tagsArr, icon: v.icon!, gradient: v.gradient!,
        sheetId: v.sheetId!, appsScriptUrl: v.appsScriptUrl!, pin: v.pin!,
      };
      this.api.createBusiness(payload, token).subscribe({
        next: () => {
          this.toast.success('Negocio creado');
          this.savingBusiness.set(false);
          this.closeBizModal();
          this.loadBusinesses();
        },
        error: err => { this.toast.error(err.message); this.savingBusiness.set(false); },
      });
    }
  }

  toggleBusiness(id: string): void {
    const token = this.adminToken();
    if (!token) return;
    this.togglingBusiness.set(id);
    this.api.toggleBusiness(id, token).subscribe({
      next: () => {
        this.togglingBusiness.set(null);
        this.loadBusinesses();
      },
      error: err => {
        this.toast.error(err.message);
        this.togglingBusiness.set(null);
      },
    });
  }

  loadReservations(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getReservations().subscribe({
      next:  data => { this.reservations.set(data); this.loading.set(false); },
      error: err  => { this.error.set(err.message); this.loading.set(false); },
    });
  }

  loadServices(): void {
    this.servicesLoading.set(true);
    this.api.getServices().subscribe({
      next:  data => { this.services.set(data); this.servicesLoading.set(false); },
      error: ()   => { this.servicesLoading.set(false); },
    });
  }

  refresh(): void {
    this.loadReservations();
    this.loadServices();
  }

  isFreeSlot(row: Reservation): boolean {
    const d = row.disponibilidad.toLowerCase();
    return d.includes('disp');
  }

  openModal(row: Reservation): void {
    this.newStatus.set(row.disponibilidad.toLowerCase());
    this.modalRow.set(row);
  }

  closeModal(): void { this.modalRow.set(null); }

  saveStatus(): void {
    const row = this.modalRow();
    if (!row) return;
    this.updating.set(row._rowIndex);
    this.api.updateReservation({ rowIndex: row._rowIndex, disponibilidad: this.newStatus() }).subscribe({
      next: () => {
        this.toast.success('Estado actualizado');
        this.updating.set(null);
        this.closeModal();
        this.loadReservations();
      },
      error: err => {
        this.toast.error(err.message);
        this.updating.set(null);
      },
    });
  }

  addService(): void {
    if (this.serviceForm.invalid) return;
    const nombre = this.serviceForm.value.nombre!.trim();
    this.addingService.set(true);
    this.api.createService(nombre).subscribe({
      next: () => {
        this.toast.success(`Servicio "${nombre}" agregado`);
        this.serviceForm.reset();
        this.addingService.set(false);
        this.loadServices();
      },
      error: err => {
        this.toast.error(err.message);
        this.addingService.set(false);
      },
    });
  }

  deleteService(nombre: string): void {
    this.deletingService.set(nombre);
    this.api.deleteService(nombre).subscribe({
      next: () => {
        this.toast.success(`Servicio "${nombre}" eliminado`);
        this.deletingService.set(null);
        this.loadServices();
      },
      error: err => {
        this.toast.error(err.message);
        this.deletingService.set(null);
      },
    });
  }

  changePin(): void {
    this.pinError.set(null);
    const { current, next } = this.pinForm.value;
    const ok = this.auth.changePin(current!, next!);
    if (!ok) {
      this.pinError.set('PIN actual incorrecto');
      return;
    }
    this.toast.success('PIN actualizado');
    this.pinForm.reset();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  getInputValue(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }
}
