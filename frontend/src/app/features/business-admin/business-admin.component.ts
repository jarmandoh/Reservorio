import {
  Component, OnInit, OnDestroy,
  signal, computed, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription, switchMap, startWith } from 'rxjs';

import { ApiService }   from '../../core/services/api.service';
import { AuthService }  from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { Business, GoogleStatus, Reservation } from '../../core/models/reservation.model';

type BizTab = 'reservas' | 'servicios' | 'perfil' | 'google';

@Component({
    selector: 'app-business-admin',
    imports: [CommonModule, ReactiveFormsModule, BadgeComponent],
    template: `
  <div class="min-h-dvh bg-surface flex flex-col">

    <!-- ══ TOP BAR ══════════════════════════════════════════════════ -->
    <header class="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-outline-variant/20">
      <div class="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
        @if (business()) {
          <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
               [style.background]="business()!.gradient">
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
        <button class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container
                       text-on-surface-variant transition" (click)="logout()" title="Cerrar sesión">
          <span class="material-icons-round">logout</span>
        </button>
      </div>

      <!-- Tab bar -->
      <div class="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto pb-0.5">
        @for (t of tabs; track t.id) {
          <button class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition
                         whitespace-nowrap border-b-2"
                  [class]="tab() === t.id
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-on-surface-variant border-transparent hover:bg-surface-container'"
                  (click)="setTab(t.id)">
            <span class="material-icons-round text-base">{{ t.icon }}</span>
            {{ t.label }}
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
          <button class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container
                         text-on-surface-variant transition" (click)="loadReservations()" title="Actualizar">
            <span class="material-icons-round text-lg" [class.animate-spin]="resLoading()">refresh</span>
          </button>
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

        <!-- Filters -->
        <div class="flex flex-col sm:flex-row gap-2">
          <input type="search" class="form-input flex-1" placeholder="Buscar por cliente, servicio…"
                 [value]="resSearch()" (input)="resSearch.set(getVal($event))" />
          <select class="form-select sm:w-44" [value]="resFilter()" (change)="resFilter.set(getVal($event))">
            <option value="">Todos los estados</option>
            <option value="disp">Disponible</option>
            <option value="pend">Pendiente</option>
            <option value="reserv">Reservado</option>
            <option value="confirm">Confirmado</option>
          </select>
        </div>

        <!-- Table -->
        @if (resLoading()) {
          <div class="flex flex-col gap-2">
            @for (i of [1,2,3,4,5]; track i) { <div class="skeleton h-14 rounded-xl"></div> }
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
                    <td class="px-4 py-3 text-right">
                      <button class="text-primary hover:underline text-xs font-medium"
                              (click)="openResModal(r)">Editar</button>
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
        <form [formGroup]="serviceForm" (ngSubmit)="addService()"
              class="card flex flex-col sm:flex-row gap-3">
          <input type="text" class="form-input flex-1" formControlName="nombre"
                 placeholder="Nombre del servicio…" />
          <button type="submit" class="btn-primary btn-sm whitespace-nowrap"
                  [disabled]="serviceForm.invalid || addingSvc()">
            @if (addingSvc()) {
              <span class="material-icons-round text-base animate-spin">refresh</span>
            } @else {
              <span class="material-icons-round text-base">add</span>
            }
            Agregar
          </button>
        </form>

        <!-- List -->
        @if (svcLoading()) {
          <div class="flex flex-col gap-2">
            @for (i of [1,2,3]; track i) { <div class="skeleton h-12 rounded-xl"></div> }
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
                <button class="w-8 h-8 flex items-center justify-center rounded-full
                               hover:bg-error/10 text-error transition"
                        [disabled]="deletingSvc() === svc"
                        (click)="deleteService(svc)">
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
            <input type="text" class="form-input" formControlName="schedule"
                   placeholder="Ej. Lun-Vie 9:00–18:00" />
          </div>
          <button type="submit" class="btn-primary self-end"
                  [disabled]="profileForm.invalid || savingProfile()">
            @if (savingProfile()) {
              <span class="material-icons-round text-base animate-spin">refresh</span> Guardando…
            } @else { Guardar cambios }
          </button>
        </form>

        <!-- Change PIN -->
        <form [formGroup]="pinForm" (ngSubmit)="changePin()" class="card flex flex-col gap-4">
          <p class="section-label">Cambiar PIN</p>
          <div>
            <label class="form-label">Nuevo PIN (mínimo 4 dígitos)</label>
            <input type="password" class="form-input" formControlName="pin"
                   inputmode="numeric" placeholder="••••" />
          </div>
          <div>
            <label class="form-label">Confirmar PIN</label>
            <input type="password" class="form-input" formControlName="pinConfirm"
                   inputmode="numeric" placeholder="••••" />
            @if (pinMismatch()) {
              <p class="text-xs text-error mt-1">Los PINs no coinciden.</p>
            }
          </div>
          <button type="submit" class="btn-primary self-end btn-sm"
                  [disabled]="pinForm.invalid || savingPin() || pinMismatch()">
            @if (savingPin()) {
              <span class="material-icons-round text-base animate-spin">refresh</span>
            } @else { Actualizar PIN }
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
                  <a [href]="'https://docs.google.com/spreadsheets/d/' + googleStatus()!.sheetId"
                     target="_blank" rel="noopener"
                     class="text-primary hover:underline flex items-center gap-1 text-xs font-medium">
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
                  <input type="text" class="form-input flex-1 text-sm"
                         placeholder="ID de la spreadsheet"
                         [value]="linkSheetId()"
                         (input)="linkSheetId.set(getVal($event))" />
                  <button class="btn-secondary btn-sm whitespace-nowrap"
                          [disabled]="!linkSheetId()"
                          (click)="linkSheet()">
                    Vincular
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Disconnect -->
          <button class="text-error text-sm hover:underline self-start flex items-center gap-1"
                  [disabled]="disconnecting()" (click)="disconnectGoogle()">
            <span class="material-icons-round text-base">link_off</span>
            Desvincular cuenta Google
          </button>
        }
      </div>
    }

    <!-- ══ MODAL: Editar reserva ════════════════════════════════════ -->
    @if (modalRes()) {
      <div class="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-4 sm:p-6
                  bg-black/40 backdrop-blur-sm animate-fade-in"
           (click)="closeResModal()">
        <div class="w-full max-w-md bg-surface-lowest rounded-t-2xl sm:rounded-2xl p-6
                    flex flex-col gap-5 shadow-soft animate-sheet-up"
             (click)="$event.stopPropagation()">

          <div class="flex items-center justify-between">
            <h3 class="font-display font-semibold text-lg">Actualizar reserva</h3>
            <button class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container"
                    (click)="closeResModal()">
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
            <select class="form-select" [value]="newResStatus()"
                    (change)="newResStatus.set(getVal($event))">
              <option value="Disponible">Disponible</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Reservado">Reservado</option>
              <option value="Confirmado">Confirmado</option>
            </select>
          </div>

          <div class="flex gap-3">
            <button class="btn-secondary flex-1" (click)="closeResModal()">Cancelar</button>
            <button class="btn-primary flex-1" [disabled]="savingRes()"
                    (click)="saveResStatus()">
              @if (savingRes()) {
                <span class="material-icons-round text-base animate-spin">refresh</span> Guardando…
              } @else { Guardar }
            </button>
          </div>
        </div>
      </div>
    }

  </div>
  `
})
export class BusinessAdminComponent implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private api    = inject(ApiService);
  private auth   = inject(AuthService);
  private toast  = inject(ToastService);
  private fb     = inject(FormBuilder);

  readonly tabs: { id: BizTab; label: string; icon: string }[] = [
    { id: 'reservas',  label: 'Reservas',  icon: 'event_note' },
    { id: 'servicios', label: 'Servicios', icon: 'spa'        },
    { id: 'perfil',    label: 'Perfil',    icon: 'storefront' },
    { id: 'google',    label: 'Sheets',    icon: 'table_chart' },
  ];

  readonly tab          = signal<BizTab>('reservas');
  readonly business     = signal<Business | null>(null);
  readonly reservations = signal<Reservation[]>([]);
  readonly services     = signal<string[]>([]);
  readonly resLoading   = signal(false);
  readonly svcLoading   = signal(false);
  readonly addingSvc    = signal(false);
  readonly deletingSvc  = signal<string | null>(null);
  readonly savingProfile = signal(false);
  readonly savingPin    = signal(false);
  readonly modalRes     = signal<Reservation | null>(null);
  readonly newResStatus = signal('Disponible');
  readonly savingRes    = signal(false);
  readonly resSearch    = signal('');
  readonly resFilter    = signal('');

  // Google Sheets
  readonly googleStatus   = signal<GoogleStatus | null>(null);
  readonly googleLoading  = signal(false);
  readonly syncing        = signal(false);
  readonly linkSheetId    = signal('');
  readonly creatingSheet  = signal(false);
  readonly disconnecting  = signal(false);

  private bizId   = '';
  private token   = '';
  private pollSub?: Subscription;

  readonly resStats = computed(() => {
    const rows  = this.reservations();
    const total = rows.length;
    return {
      total,
      items: [
        { label: 'Total',       value: total },
        { label: 'Disponibles', value: rows.filter(r => r.disponibilidad.toLowerCase().includes('disp')).length },
        { label: 'Reservados',  value: rows.filter(r => r.disponibilidad.toLowerCase().includes('reserv')).length },
        { label: 'Pendientes',  value: rows.filter(r => r.disponibilidad.toLowerCase().includes('pend')).length },
      ],
    };
  });

  readonly filteredRes = computed(() => {
    let rows = this.reservations();
    const q  = this.resSearch().toLowerCase();
    const f  = this.resFilter().toLowerCase();
    if (q) rows = rows.filter(r =>
      r.cliente?.toLowerCase().includes(q) ||
      r.servicio?.toLowerCase().includes(q) ||
      r.franja?.toLowerCase().includes(q));
    if (f) rows = rows.filter(r => r.disponibilidad.toLowerCase().includes(f));
    return rows;
  });

  readonly pinMismatch = computed(() => {
    const v = this.pinForm.value;
    return !!(v.pin && v.pinConfirm && v.pin !== v.pinConfirm);
  });

  readonly serviceForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly profileForm = this.fb.group({
    name:        ['', Validators.required],
    category:    ['', Validators.required],
    description: [''],
    location:    [''],
    schedule:    [''],
    phone:       [''],
  });

  readonly pinForm = this.fb.group({
    pin:        ['', [Validators.required, Validators.minLength(4)]],
    pinConfirm: ['', Validators.required],
  });

  ngOnInit(): void {
    this.bizId = this.route.snapshot.params['businessId'] ?? '';
    this.token = this.auth.getBusinessToken(this.bizId) ?? '';

    if (!this.token) {
      this.router.navigate(['/business', this.bizId, 'login']);
      return;
    }

    this.loadBusiness();
    this.startPolling();
    this.loadServices();

    // Check if returning from Google OAuth callback
    const googleParam = this.route.snapshot.queryParams['google'];
    if (googleParam === 'linked') {
      this.toast.success('Cuenta Google vinculada correctamente');
      this.tab.set('google');
      this.loadGoogleStatus();
    }
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  setTab(t: BizTab): void {
    this.tab.set(t);
    if (t === 'servicios') this.loadServices();
    if (t === 'google')    this.loadGoogleStatus();
  }

  loadBusiness(): void {
    this.api.getBusinesses().subscribe(list => {
      const found = list.find(b => b.id === this.bizId);
      if (found) {
        this.business.set(found);
        this.profileForm.patchValue({
          name:        found.name,
          category:    found.category,
          description: found.description,
          location:    found.location,
          schedule:    found.schedule ?? '',
          phone:       found.phone    ?? '',
        });
      }
    });
  }

  startPolling(): void {
    this.pollSub = interval(30_000).pipe(
      startWith(0),
      switchMap(() => {
        this.resLoading.set(true);
        return this.api.getBusinessReservations(this.bizId);
      }),
    ).subscribe({
      next:  data => { this.reservations.set(data); this.resLoading.set(false); },
      error: ()   => { this.resLoading.set(false); },
    });
  }

  loadReservations(): void {
    this.resLoading.set(true);
    this.api.getBusinessReservations(this.bizId).subscribe({
      next:  data => { this.reservations.set(data); this.resLoading.set(false); },
      error: ()   => { this.resLoading.set(false); },
    });
  }

  loadServices(): void {
    this.svcLoading.set(true);
    this.api.getBusinessServices(this.bizId).subscribe({
      next:  data => { this.services.set(data); this.svcLoading.set(false); },
      error: ()   => { this.svcLoading.set(false); },
    });
  }

  addService(): void {
    if (this.serviceForm.invalid) return;
    const nombre = this.serviceForm.value.nombre!;
    this.addingSvc.set(true);
    this.api.createBusinessService(this.bizId, nombre, this.token).subscribe({
      next: () => {
        this.toast.success('Servicio agregado');
        this.serviceForm.reset();
        this.addingSvc.set(false);
        this.loadServices();
      },
      error: err => { this.toast.error(err?.error?.message ?? 'Error al agregar'); this.addingSvc.set(false); },
    });
  }

  deleteService(nombre: string): void {
    this.deletingSvc.set(nombre);
    this.api.deleteBusinessService(this.bizId, nombre, this.token).subscribe({
      next: () => {
        this.toast.success('Servicio eliminado');
        this.deletingSvc.set(null);
        this.loadServices();
      },
      error: err => { this.toast.error(err?.error?.message ?? 'Error al eliminar'); this.deletingSvc.set(null); },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    const v = this.profileForm.value;
    this.savingProfile.set(true);
    this.api.updateBusiness(this.bizId, {
      name: v.name!, category: v.category!, description: v.description ?? '',
      location: v.location ?? '', schedule: v.schedule ?? '', phone: v.phone ?? '',
    }, this.token).subscribe({
      next: () => { this.toast.success('Perfil actualizado'); this.savingProfile.set(false); },
      error: err => { this.toast.error(err?.error?.message ?? 'Error al guardar'); this.savingProfile.set(false); },
    });
  }

  changePin(): void {
    if (this.pinForm.invalid || this.pinMismatch()) return;
    const pin = this.pinForm.value.pin!;
    this.savingPin.set(true);
    this.api.updateBusiness(this.bizId, { pin } as any, this.token).subscribe({
      next: () => {
        this.toast.success('PIN actualizado. Inicia sesión de nuevo.');
        this.auth.clearBusinessToken(this.bizId);
        this.router.navigate(['/business', this.bizId, 'login']);
      },
      error: err => { this.toast.error(err?.error?.message ?? 'Error al cambiar PIN'); this.savingPin.set(false); },
    });
  }

  openResModal(r: Reservation): void {
    this.modalRes.set(r);
    this.newResStatus.set(r.disponibilidad || 'Disponible');
  }

  closeResModal(): void { this.modalRes.set(null); }

  saveResStatus(): void {
    const r = this.modalRes();
    if (!r) return;
    this.savingRes.set(true);
    this.api.updateBusinessReservation(this.bizId, {
      rowIndex:       r._rowIndex,
      disponibilidad: this.newResStatus(),
      notas:          r.notas ?? '',
    }, this.token).subscribe({
      next: () => {
        this.toast.success('Estado actualizado');
        this.savingRes.set(false);
        this.closeResModal();
        this.loadReservations();
      },
      error: err => { this.toast.error(err?.error?.message ?? 'Error'); this.savingRes.set(false); },
    });
  }

  // ── Google Sheets ──────────────────────────────────────────────

  loadGoogleStatus(): void {
    this.googleLoading.set(true);
    this.api.getGoogleStatus(this.bizId, this.token).subscribe({
      next:  data => { this.googleStatus.set(data); this.googleLoading.set(false); },
      error: ()   => { this.googleLoading.set(false); },
    });
  }

  startGoogleAuth(): void {
    this.api.getGoogleAuthUrl(this.bizId, this.token).subscribe({
      next:  url => { window.location.href = url; },
      error: err => { this.toast.error(err?.message ?? 'Error al iniciar vinculación'); },
    });
  }

  syncSheets(): void {
    this.syncing.set(true);
    this.api.syncGoogleSheet(this.bizId, this.token).subscribe({
      next:  () => { this.toast.success('Sincronización completada'); this.syncing.set(false); },
      error: err => { this.toast.error(err?.message ?? 'Error al sincronizar'); this.syncing.set(false); },
    });
  }

  createSheet(): void {
    this.creatingSheet.set(true);
    this.api.createGoogleSheet(this.bizId, this.token).subscribe({
      next:  () => {
        this.toast.success('Spreadsheet creada');
        this.creatingSheet.set(false);
        this.loadGoogleStatus();
      },
      error: err => { this.toast.error(err?.message ?? 'Error al crear sheet'); this.creatingSheet.set(false); },
    });
  }

  linkSheet(): void {
    const sheetId = this.linkSheetId().trim();
    if (!sheetId) return;
    this.api.linkGoogleSheet(this.bizId, sheetId, this.token).subscribe({
      next:  () => {
        this.toast.success('Spreadsheet vinculada');
        this.linkSheetId.set('');
        this.loadGoogleStatus();
      },
      error: err => { this.toast.error(err?.message ?? 'No se pudo vincular'); },
    });
  }

  disconnectGoogle(): void {
    if (!confirm('¿Desvincular tu cuenta Google? Se dejará de sincronizar.')) return;
    this.disconnecting.set(true);
    this.api.disconnectGoogle(this.bizId, this.token).subscribe({
      next:  () => {
        this.toast.success('Cuenta Google desvinculada');
        this.googleStatus.set(null);
        this.disconnecting.set(false);
      },
      error: err => { this.toast.error(err?.message ?? 'Error'); this.disconnecting.set(false); },
    });
  }

  logout(): void {
    this.auth.clearBusinessToken(this.bizId);
    this.router.navigate(['/business', this.bizId, 'login']);
  }

  getVal(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }
}
