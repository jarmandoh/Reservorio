import {
  Component, OnInit, OnDestroy, signal, computed, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, Validators, AbstractControl
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription, switchMap, startWith, catchError, of } from 'rxjs';
import { ApiService }   from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Reservation, Business }  from '../../core/models/reservation.model';

type Step = 1 | 2 | 3 | 4;

interface ConfirmedBooking {
  franja:   string;
  cliente:  string;
  telefono: string;
  servicio: string;
  notas:    string;
}

@Component({
    selector: 'app-booking',
    imports: [CommonModule, ReactiveFormsModule],
    template: `
  <div class="flex flex-col min-h-screen max-w-[430px] mx-auto bg-surface-lowest shadow-soft">

    <!-- TOP BAR -->
    <header class="sticky top-0 z-10 flex items-center gap-3 px-6 py-4 bg-surface-lowest">
      @if (step() < 4) {
        <button class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition"
                (click)="goBack()" aria-label="Volver">
          <span class="material-icons-round text-on-surface-variant">arrow_back</span>
        </button>
      } @else {
        <div class="w-10 h-10 flex items-center justify-center rounded-md text-white"
             [style.background]="business()?.gradient ?? 'linear-gradient(135deg,#005bbf,#1a73e8)'">
          <span class="material-icons-round text-base">{{ business()?.icon ?? 'event_available' }}</span>
        </div>
      }
      <span class="font-display font-bold text-[1.1rem] flex-1">{{ business()?.name ?? 'Reserva' }}</span>
      @if (step() < 4) {
        <button class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition"
                (click)="startPolling()" aria-label="Actualizar" [disabled]="loading()">
          <span class="material-icons-round text-on-surface-variant"
                [class.animate-spin]="loading()">refresh</span>
        </button>
      }
    </header>

    <!-- STEPPER -->
    @if (step() < 4) {
      <div class="flex items-center justify-center gap-2 py-1">
        @for (n of [1,2,3]; track n) {
          <div class="rounded-full transition-all duration-200"
               [class]="dotClass(n)"></div>
        }
      </div>
    }

    <!-- ══ STEP 1: Horarios ══════════════════════════════════════════ -->
    @if (step() === 1) {
      <div class="flex-1 flex flex-col gap-6 px-6 py-5 pb-28">

        <div>
          <p class="section-label">Paso 1 de 3</p>
          <h2 class="font-display font-semibold text-[1.375rem]">¿Cuándo quieres venir?</h2>
          <p class="text-sm text-on-surface-variant mt-1">Elige una franja horaria disponible.</p>
        </div>

        <!-- Skeleton -->
        @if (loading()) {
          <div class="grid grid-cols-3 gap-2">
            @for (i of [1,2,3,4,5,6]; track i) {
              <div class="skeleton h-10"></div>
            }
          </div>
        }

        <!-- Error -->
        @if (error() && !loading()) {
          <div class="bg-error-container rounded-xl p-5 flex flex-col gap-3">
            <div class="flex items-center gap-2 text-[#93000a]">
              <span class="material-icons-round">warning</span>
              <span class="font-semibold text-sm">No se pudo cargar la disponibilidad</span>
            </div>
            <p class="text-sm text-[#93000a]">{{ error() }}</p>
            <p class="text-sm text-[#93000a]">Asegúrate de que la hoja es pública.</p>
            <button class="btn-secondary btn-sm self-start" (click)="startPolling()">Reintentar</button>
          </div>
        }

        <!-- Slots grid -->
        @if (!loading() && !error()) {
          <div>
            <p class="section-label">Horarios disponibles</p>
            <div class="grid grid-cols-3 gap-2">
              @for (row of reservations(); track row._rowIndex) {
                <button
                  [class]="slotClass(row)"
                  [disabled]="isTaken(row)"
                  (click)="selectSlot(row)">
                  {{ row.franja }}
                </button>
              }
              @if (!reservations().length) {
                <p class="col-span-3 text-sm text-outline text-center py-4">Sin franjas disponibles</p>
              }
            </div>
          </div>

          <!-- Preview selección -->
          @if (selectedSlot()) {
            <div class="card-flat flex flex-col gap-2 animate-fade-in">
              <p class="section-label">Tu selección</p>
              <div class="flex items-center gap-2">
                <span class="material-icons-round text-primary text-[1.1rem]">schedule</span>
                <span class="font-display font-semibold">{{ selectedSlot()!.franja }}</span>
              </div>
              @if (selectedSlot()!.notas) {
                <p class="text-sm text-on-surface-variant">{{ selectedSlot()!.notas }}</p>
              }
            </div>
          }
        }
      </div>
    }

    <!-- ══ STEP 2: Servicios ════════════════════════════════════════ -->
    @if (step() === 2) {
      <div class="flex-1 flex flex-col gap-6 px-6 py-5 pb-28">

        <div>
          <p class="section-label">Paso 2 de 3</p>
          <h2 class="font-display font-semibold text-[1.375rem]">¿Qué necesitas?</h2>
          <p class="text-sm text-on-surface-variant mt-1">Elige el servicio que deseas reservar.</p>
        </div>

        <!-- Resumen franja -->
        <div class="card flex items-center gap-3 py-3.5">
          <span class="material-icons-round text-primary">schedule</span>
          <div>
            <p class="text-[11px] uppercase tracking-widest text-outline font-semibold">Franja</p>
            <p class="font-display font-semibold">{{ selectedSlot()?.franja }}</p>
          </div>
        </div>

        <!-- Skeleton servicios -->
        @if (servicesLoading()) {
          <div class="flex flex-col gap-2">
            <div class="skeleton h-14"></div>
            <div class="skeleton h-14"></div>
          </div>
        }

        <!-- Error servicios -->
        @if (servicesError() && !servicesLoading()) {
          <div class="bg-error-container rounded-xl p-5 flex flex-col gap-3">
            <div class="flex items-center gap-2 text-[#93000a]">
              <span class="material-icons-round">warning</span>
              <span class="font-semibold text-sm">No se pudieron cargar los servicios</span>
            </div>
            <p class="text-sm text-[#93000a]">{{ servicesError() }}</p>
            <button class="btn-secondary btn-sm self-start" (click)="loadServices()">Reintentar</button>
          </div>
        }

        <!-- Lista de servicios -->
        @if (!servicesLoading() && !servicesError()) {
          @if (services().length) {
            <div class="flex flex-col gap-2">
              @for (svc of services(); track svc) {
                <button
                  class="flex items-center justify-between px-5 py-4 bg-surface-lowest rounded-xl shadow-card
                         text-left font-display font-medium text-on-surface transition cursor-pointer"
                  [class.bg-primary-fixed]="selectedService() === svc"
                  [style.outline]="selectedService() === svc ? '2px solid #005bbf' : 'none'"
                  (click)="selectService(svc)">
                  <div class="flex items-center gap-3">
                    <span class="material-icons-round text-primary text-xl">spa</span>
                    <span>{{ svc }}</span>
                  </div>
                  @if (selectedService() === svc) {
                    <span class="material-icons-round text-primary text-lg">check_circle</span>
                  }
                </button>
              }
            </div>
          } @else {
            <div class="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <span class="material-icons-round text-[3.5rem] text-outline-variant">category</span>
              <h3 class="font-display font-semibold text-xl">Sin servicios configurados</h3>
              <p class="text-sm text-on-surface-variant max-w-[240px]">El administrador aún no ha cargado los servicios.</p>
            </div>
          }
        }
      </div>
    }

    <!-- ══ STEP 3: Datos del cliente ════════════════════════════════ -->
    @if (step() === 3) {
      <div class="flex-1 flex flex-col gap-6 px-6 py-5 pb-28">

        <div>
          <p class="section-label">Paso 3 de 3</p>
          <h2 class="font-display font-semibold text-[1.375rem]">Tus datos</h2>
          <p class="text-sm text-on-surface-variant mt-1">Completa la información para confirmar.</p>
        </div>

        <!-- Resumen -->
        <div class="card-flat flex flex-col gap-3">
          <div class="flex justify-between items-center">
            <p class="section-label mb-0">Resumen</p>
            <button class="btn-tertiary btn-sm" (click)="goToStep(1)">Cambiar</button>
          </div>
          <div class="flex items-center gap-2">
            <span class="material-icons-round text-primary text-base">schedule</span>
            <span class="text-sm">{{ selectedSlot()?.franja }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="material-icons-round text-primary text-base">spa</span>
            <span class="service-tag">{{ selectedService() }}</span>
          </div>
        </div>

        <!-- Form -->
        <form [formGroup]="bookingForm" class="flex flex-col gap-4" (ngSubmit)="submit()">
          <div>
            <label class="form-label" for="cliente">Nombre completo</label>
            <input id="cliente" type="text" class="form-input"
                   formControlName="cliente" placeholder="Ej. Ana García"
                   autocomplete="name" />
            @if (fieldInvalid('cliente')) {
              <p class="text-xs text-error mt-1">El nombre es obligatorio</p>
            }
          </div>
          <div>
            <label class="form-label" for="telefono">Teléfono</label>
            <input id="telefono" type="tel" class="form-input"
                   formControlName="telefono" placeholder="Ej. 600 123 456"
                   autocomplete="tel" />
            @if (fieldInvalid('telefono')) {
              <p class="text-xs text-error mt-1">Teléfono inválido (7–15 dígitos)</p>
            }
          </div>
          <div>
            <label class="form-label" for="notas">
              Notas <span class="opacity-50 font-normal normal-case">(opcional)</span>
            </label>
            <textarea id="notas" class="form-textarea" formControlName="notas"
                      placeholder="Algo que debamos saber…"></textarea>
          </div>
        </form>
      </div>
    }

    <!-- ══ STEP 4: Confirmación ══════════════════════════════════════ -->
    @if (step() === 4) {
      <div class="flex-1 flex flex-col gap-6 px-6 py-5">

        <!-- Hero card -->
        <div class="rounded-xl p-8 text-center text-white"
             style="background:linear-gradient(135deg,#005bbf,#1a73e8)">
          <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
               style="background:rgba(255,255,255,.2)">
            <span class="material-icons-round text-3xl">check_circle</span>
          </div>
          <h2 class="font-display font-semibold text-2xl mb-1">¡Reserva enviada!</h2>
          <p class="text-sm opacity-90">Te contactaremos para confirmar.</p>
        </div>

        <!-- Detalles -->
        <div class="card flex flex-col gap-4">
          <p class="section-label">Detalles</p>
          <div class="flex justify-between text-sm">
            <span class="text-on-surface-variant">Franja</span>
            <span class="font-semibold">{{ confirmed()?.franja }}</span>
          </div>
          <div class="h-px bg-outline-variant opacity-20"></div>
          <div class="flex justify-between text-sm items-center">
            <span class="text-on-surface-variant">Servicio</span>
            <span class="service-tag">{{ confirmed()?.servicio }}</span>
          </div>
          <div class="h-px bg-outline-variant opacity-20"></div>
          <div class="flex justify-between text-sm">
            <span class="text-on-surface-variant">Nombre</span>
            <span class="font-semibold">{{ confirmed()?.cliente }}</span>
          </div>
          <div class="h-px bg-outline-variant opacity-20"></div>
          <div class="flex justify-between text-sm">
            <span class="text-on-surface-variant">Teléfono</span>
            <span class="font-semibold">{{ confirmed()?.telefono }}</span>
          </div>
        </div>

        <!-- Info + Nueva reserva -->
        <div class="bg-primary-fixed rounded-xl p-4 flex gap-3 items-start text-sm text-primary">
          <span class="material-icons-round text-base mt-0.5">info</span>
          <p>La reserva está <strong>pendiente de confirmación</strong>. Te avisaremos pronto.</p>
        </div>

        <button class="btn-secondary gap-2" (click)="resetFlow()">
          <span class="material-icons-round text-base">add</span>
          Nueva reserva
        </button>
      </div>
    }

    <!-- STICKY FOOTER CTA -->
    @if (step() < 4) {
      <div class="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[430px] w-full
                  px-6 pb-6 pt-4 bg-surface/80 backdrop-blur-xl z-10">
        <button class="btn-primary" [disabled]="!canProceed() || submitting()"
                (click)="handleNext()">
          @if (submitting()) {
            <span class="material-icons-round text-base animate-spin">refresh</span>
            Enviando…
          } @else {
            <span>{{ nextLabel() }}</span>
            <span class="material-icons-round text-base">arrow_forward</span>
          }
        </button>
      </div>
    }

  </div>
  `
})
export class BookingComponent implements OnInit, OnDestroy {
  private api   = inject(ApiService);
  private toast = inject(ToastService);
  private fb    = inject(FormBuilder);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  readonly business = signal<Business | null>(null);
  private businessId = '';

  readonly step         = signal<Step>(1);
  readonly loading      = signal(false);
  readonly servicesLoading = signal(false);
  readonly servicesError   = signal<string | null>(null);
  readonly submitting   = signal(false);
  readonly error        = signal<string | null>(null);
  readonly reservations = signal<Reservation[]>([]);
  readonly services     = signal<string[]>([]);
  readonly selectedSlot    = signal<Reservation | null>(null);
  readonly selectedService = signal<string | null>(null);
  readonly confirmed    = signal<ConfirmedBooking | null>(null);

  readonly bookingForm = this.fb.group({
    cliente:  ['', [Validators.required, Validators.minLength(2)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9+\s\-]{7,15}$/)]],
    notas:    [''],
  });

  readonly canProceed = computed(() => {
    if (this.step() === 1) return !!this.selectedSlot();
    if (this.step() === 2) return !!this.selectedService();
    if (this.step() === 3) return this.bookingForm.valid;
    return false;
  });

  readonly nextLabel = computed(() => {
    if (this.step() === 1) return this.selectedSlot() ? 'Elegir servicio' : 'Selecciona un horario';
    if (this.step() === 2) return this.selectedService() ? 'Completar datos' : 'Selecciona un servicio';
    if (this.step() === 3) return 'Confirmar reserva';
    return '';
  });

  ngOnInit(): void {
    this.businessId = this.route.snapshot.params['businessId'] ?? '';
    // Load business info
    this.api.getBusinesses().pipe(catchError(() => of([]))).subscribe(list => {
      const found = list.find(b => b.id === this.businessId);
      if (found) this.business.set(found);
    });
    this.startPolling();
  }

  private readonly POLL_MS = 30_000;
  private pollSub?: Subscription;

  startPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = interval(this.POLL_MS)
      .pipe(startWith(0), switchMap(() => {
        this.loading.set(true);
        this.error.set(null);
        return this.api.getBusinessReservations(this.businessId);
      }))
      .subscribe({
        next:  data => { this.reservations.set(data); this.loading.set(false); },
        error: err  => { this.error.set(err.message); this.loading.set(false); },
      });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  isTaken(row: Reservation): boolean {
    const d = row.disponibilidad.toLowerCase();
    return d.includes('ocup') || d.includes('reserv') || d.includes('conf') || d.includes('pend');
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

  dotClass(n: number): string {
    const s = this.step();
    if (n < s)  return 'w-2 h-2 bg-primary';
    if (n === s) return 'w-2.5 h-2.5 border-2 border-primary bg-transparent';
    return 'w-2 h-2 bg-outline-variant';
  }

  goToStep(s: Step): void { this.step.set(s); }

  goBack(): void {
    const s = this.step();
    if (s === 2) { this.loadServices(); this.goToStep(1 as Step); }
    else if (s > 1) this.goToStep((s - 1) as Step);
    else this.router.navigate(['/']);
  }

  handleNext(): void {
    const s = this.step();
    if (s === 1 && this.selectedSlot()) {
      this.loadServices();
      this.goToStep(2);
    } else if (s === 2 && this.selectedService()) {
      this.goToStep(3);
    } else if (s === 3) {
      this.submit();
    }
  }

  loadServices(): void {
    this.servicesLoading.set(true);
    this.servicesError.set(null);
    this.api.getBusinessServices(this.businessId).subscribe({
      next:  data => { this.services.set(data); this.servicesLoading.set(false); },
      error: err  => { this.servicesError.set(err.message); this.services.set([]); this.servicesLoading.set(false); },
    });
  }

  fieldInvalid(name: string): boolean {
    const ctrl = this.bookingForm.get(name) as AbstractControl;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  submit(): void {
    this.bookingForm.markAllAsTouched();
    if (this.bookingForm.invalid || !this.selectedSlot() || !this.selectedService()) return;

    const { cliente, telefono, notas } = this.bookingForm.value;
    const payload: ConfirmedBooking = {
      franja:   this.selectedSlot()!.franja,
      cliente:  cliente!.trim(),
      telefono: telefono!.trim(),
      servicio: this.selectedService()!,
      notas:    notas?.trim() ?? '',
    };

    this.submitting.set(true);
    this.api.createBusinessReservation(this.businessId, payload).subscribe({
      next: () => {
        this.confirmed.set(payload);
        this.toast.success('¡Reserva enviada con éxito!');
        this.goToStep(4);
        this.submitting.set(false);
      },
      error: err => {
        this.toast.error(err.message);
        this.submitting.set(false);
      },
    });
  }

  resetFlow(): void {
    this.selectedSlot.set(null);
    this.selectedService.set(null);
    this.confirmed.set(null);
    this.bookingForm.reset();
    this.pollSub?.unsubscribe();
    this.startPolling();
    this.goToStep(1);
  }
}
