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
  <div class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(26,115,232,0.26),_transparent_32%),linear-gradient(180deg,#040814_0%,#091324_52%,#0c1628_100%)] text-white">
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div class="grid gap-8 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:gap-12">

        <section class="flex flex-col justify-center gap-8 lg:pr-6">
          <div class="space-y-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#8fb5ff]">Reserva sin esperas</p>
            <h1 class="font-display text-4xl font-bold leading-none sm:text-5xl lg:text-6xl">
              Agenda tu cita en minutos.<br>
              <span class="text-[#6ec3ff]">Rapido, claro y al instante.</span>
            </h1>
            <p class="max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Elige tu servicio, revisa la disponibilidad y deja tus datos para pedir la reserva en un flujo simple.
            </p>
          </div>

          <div class="grid gap-3 sm:max-w-xl">
            @for (item of instructionItems; track item.order) {
              <div class="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div class="flex items-start gap-4">
                  <span class="pt-1 font-mono text-xs tracking-[0.28em] text-[#8fb5ff]">{{ item.order }}</span>
                  <div>
                    <p class="font-display text-lg font-semibold text-white">{{ item.title }}</p>
                    <p class="mt-1 text-sm leading-6 text-slate-300">{{ item.description }}</p>
                  </div>
                </div>
              </div>
            }
          </div>

          <div class="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(26,115,232,0.16),rgba(142,194,255,0.08))] p-5 backdrop-blur-sm sm:max-w-xl">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[#8fb5ff]">Instrucciones</p>
            <p class="mt-3 text-sm leading-6 text-slate-200">
              Avanza paso a paso para reservar mas rapido. Si necesitas cambiar algo, vuelve atras y ajustalo sin empezar de nuevo.
            </p>
          </div>
        </section>

        <section class="flex justify-center lg:justify-end">
          <div class="w-full max-w-[430px] rounded-[2.1rem] border border-white/10 bg-white/5 p-3 shadow-[0_32px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <div class="overflow-hidden rounded-[1.8rem] border border-[#d8e2ff]/20 bg-surface-lowest text-on-surface shadow-soft">

              <header class="border-b border-white/10 bg-[linear-gradient(135deg,#004ea8_0%,#005bbf_45%,#1a73e8_100%)] px-5 py-4 text-white">
                <div class="flex items-center gap-3">
                  @if (step() < 4) {
                    <button class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/15"
                            (click)="goBack()" aria-label="Volver">
                      <span class="material-icons-round text-[1.15rem]">arrow_back</span>
                    </button>
                  } @else {
                    <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                      <span class="material-icons-round text-[1.15rem]">check</span>
                    </div>
                  }

                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold">{{ business()?.name ?? 'Reserva tu cita' }}</p>
                    <p class="text-xs text-white/80">Reserva online</p>
                  </div>

                  @if (step() < 4) {
                    <button class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/15"
                            (click)="startPolling()" aria-label="Actualizar" [disabled]="loading()">
                      <span class="material-icons-round text-[1.15rem]" [class.animate-spin]="loading()">refresh</span>
                    </button>
                  }
                </div>

                <div class="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
                  @for (item of bookingSteps; track item.value; let last = $last) {
                    <div class="flex items-center gap-2">
                      <div class="flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold"
                           [class.bg-white]="step() >= item.value"
                           [class.text-primary]="step() >= item.value"
                           [class.border-white]="step() >= item.value"
                           [class.bg-transparent]="step() < item.value"
                           [class.text-white/70]="step() < item.value"
                           [class.border-white/25]="step() < item.value">
                        {{ item.value }}
                      </div>
                      <span class="text-[11px] font-medium"
                            [class.text-white]="step() >= item.value"
                            [class.text-white/70]="step() < item.value">
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
                    <div class="rounded-2xl border border-[#d8e2ff] bg-[#eff5ff] p-4 text-primary">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.2em]">Paso 1</p>
                      <h2 class="mt-2 font-display text-2xl font-semibold text-on-surface">Elige tu servicio</h2>
                      <p class="mt-1 text-sm text-on-surface-variant">Empieza por el servicio que quieres agendar.</p>
                    </div>

                    @if (servicesLoading()) {
                      <div class="flex flex-col gap-3">
                        <div class="skeleton h-20 rounded-2xl"></div>
                        <div class="skeleton h-20 rounded-2xl"></div>
                        <div class="skeleton h-20 rounded-2xl"></div>
                      </div>
                    }

                    @if (servicesError() && !servicesLoading()) {
                      <div class="rounded-2xl bg-error-container p-5">
                        <div class="flex items-start gap-3 text-[#93000a]">
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
                        <div class="flex flex-col gap-3">
                          @for (svc of services(); track svc) {
                            <button
                              class="rounded-2xl border p-4 text-left transition"
                              [class.border-primary]="selectedService() === svc"
                              [class.bg-[#eff5ff]]="selectedService() === svc"
                              [class.shadow-card]="selectedService() === svc"
                              [class.border-outline-variant]="selectedService() !== svc"
                              [class.bg-white]="selectedService() !== svc"
                              (click)="selectService(svc)">
                              <div class="flex items-center justify-between gap-3">
                                <div class="flex items-center gap-3">
                                  <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#005bbf,#1a73e8)] text-white">
                                    <span class="material-icons-round text-[1.15rem]">content_cut</span>
                                  </div>
                                  <div>
                                    <p class="font-display text-base font-semibold text-on-surface">{{ svc }}</p>
                                    <p class="text-sm text-on-surface-variant">Disponible para agendar en linea</p>
                                  </div>
                                </div>

                                @if (selectedService() === svc) {
                                  <span class="material-icons-round text-primary">check_circle</span>
                                }
                              </div>
                            </button>
                          }
                        </div>
                      } @else {
                        <div class="rounded-2xl border border-dashed border-outline-variant bg-surface-low p-8 text-center">
                          <span class="material-icons-round text-[3rem] text-outline">category</span>
                          <p class="mt-3 font-display text-lg font-semibold text-on-surface">Aun no hay servicios cargados</p>
                          <p class="mt-1 text-sm text-on-surface-variant">Cuando el negocio configure sus servicios apareceran aqui.</p>
                        </div>
                      }
                    }
                  </div>
                }

                @if (step() === 2) {
                  <div class="flex flex-col gap-5 px-5 py-5">
                    <div class="rounded-2xl border border-[#d8e2ff] bg-[#eff5ff] p-4">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Paso 2</p>
                      <h2 class="mt-2 font-display text-2xl font-semibold text-on-surface">Selecciona el horario</h2>
                      <p class="mt-1 text-sm text-on-surface-variant">Escoge el horario disponible que mejor te funcione.</p>
                    </div>

                    <div class="flex items-center justify-between rounded-2xl border border-outline-variant bg-white px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
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
                        @for (i of [1,2,3,4,5,6,7,8,9]; track i) {
                          <div class="skeleton h-12 rounded-xl"></div>
                        }
                      </div>
                    }

                    @if (error() && !loading()) {
                      <div class="rounded-2xl bg-error-container p-5">
                        <div class="flex items-start gap-3 text-[#93000a]">
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
                            <p class="col-span-3 rounded-2xl bg-surface-low px-4 py-6 text-center text-sm text-outline">
                              No hay franjas disponibles por ahora.
                            </p>
                          }
                        </div>
                      </div>

                      @if (selectedSlot()) {
                        <div class="rounded-2xl border border-primary/15 bg-[#eff5ff] p-4">
                          <p class="section-label">Seleccion actual</p>
                          <div class="flex items-center gap-3">
                            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white">
                              <span class="material-icons-round text-[1.1rem]">schedule</span>
                            </div>
                            <div>
                              <p class="font-display text-lg font-semibold text-on-surface">{{ selectedSlot()!.franja }}</p>
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
                  <div class="flex flex-col gap-5 px-5 py-5">
                    <div class="rounded-2xl border border-[#d8e2ff] bg-[#eff5ff] p-4">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Paso 3</p>
                      <h2 class="mt-2 font-display text-2xl font-semibold text-on-surface">Completa tus datos</h2>
                      <p class="mt-1 text-sm text-on-surface-variant">Dejanos tus datos para confirmar la solicitud contigo.</p>
                    </div>

                    <div class="grid gap-3 sm:grid-cols-2">
                      <div class="rounded-2xl border border-outline-variant bg-white p-4">
                        <div class="flex items-start justify-between gap-3">
                          <div>
                            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-outline">Servicio</p>
                            <p class="mt-1 font-display text-lg font-semibold text-on-surface">{{ selectedService() }}</p>
                          </div>
                          <button class="btn-tertiary btn-sm" (click)="goToStep(1)">Editar</button>
                        </div>
                      </div>

                      <div class="rounded-2xl border border-outline-variant bg-white p-4">
                        <div class="flex items-start justify-between gap-3">
                          <div>
                            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-outline">Horario</p>
                            <p class="mt-1 font-display text-lg font-semibold text-on-surface">{{ selectedSlot()?.franja }}</p>
                          </div>
                          <button class="btn-tertiary btn-sm" (click)="goToStep(2)">Editar</button>
                        </div>
                      </div>
                    </div>

                    <form [formGroup]="bookingForm" class="flex flex-col gap-4" (ngSubmit)="submit()">
                      <div>
                        <label class="form-label" for="cliente">Nombre completo</label>
                        <input id="cliente" type="text" class="form-input"
                               formControlName="cliente" placeholder="Ej. Ana Garcia"
                               autocomplete="name" />
                        @if (fieldInvalid('cliente')) {
                          <p class="mt-1 text-xs text-error">El nombre es obligatorio</p>
                        }
                      </div>

                      <div>
                        <label class="form-label" for="telefono">Telefono</label>
                        <input id="telefono" type="tel" class="form-input"
                               formControlName="telefono" placeholder="Ej. 300 123 4567"
                               autocomplete="tel" />
                        @if (fieldInvalid('telefono')) {
                          <p class="mt-1 text-xs text-error">Telefono invalido. Usa entre 7 y 15 digitos.</p>
                        }
                      </div>

                      <div>
                        <label class="form-label" for="notas">Indicaciones adicionales</label>
                        <textarea id="notas" class="form-textarea" formControlName="notas"
                                  placeholder="Escribe aqui cualquier detalle importante"></textarea>
                      </div>

                      <div class="rounded-2xl border border-primary/15 bg-primary-fixed px-4 py-3 text-sm text-primary">
                        Revisa tus datos y envia la solicitud. El negocio la recibira para confirmarla.
                      </div>
                    </form>
                  </div>
                }

                @if (step() === 4) {
                  <div class="flex flex-col gap-5 px-5 py-5">
                    <div class="rounded-[1.75rem] bg-[linear-gradient(135deg,#005bbf_0%,#1a73e8_100%)] p-6 text-center text-white">
                      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                        <span class="material-icons-round text-3xl">check_circle</span>
                      </div>
                      <h2 class="mt-4 font-display text-2xl font-semibold">Solicitud enviada</h2>
                      <p class="mt-2 text-sm text-white/85">Tu solicitud fue enviada y quedo pendiente de confirmacion.</p>
                    </div>

                    <div class="rounded-2xl border border-outline-variant bg-white p-5">
                      <p class="section-label">Resumen final</p>
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
                      </div>
                    </div>

                    <div class="rounded-2xl border border-primary/15 bg-primary-fixed px-4 py-4 text-sm text-primary">
                      Si hace falta ajustar la hora o confirmar un detalle, el negocio te contactara al numero registrado.
                    </div>

                    <button class="btn-secondary" (click)="resetFlow()">
                      <span class="material-icons-round text-base">add</span>
                      Hacer otra reserva
                    </button>
                  </div>
                }

                @if (step() < 4) {
                  <div class="border-t border-outline-variant/20 bg-white px-5 py-4">
                    <button class="btn-primary" [disabled]="!canProceed() || submitting()"
                            (click)="handleNext()">
                      @if (submitting()) {
                        <span class="material-icons-round animate-spin text-base">refresh</span>
                        Enviando...
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
  readonly bookingSteps = [
    { value: 1, label: 'Servicio' },
    { value: 2, label: 'Horario' },
    { value: 3, label: 'Datos' },
    { value: 4, label: 'Listo' },
  ] as const;
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
    cliente:  ['', [Validators.required, Validators.minLength(2)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9+\s\-]{7,15}$/)]],
    notas:    [''],
  });

  readonly canProceed = computed(() => {
    if (this.step() === 1) return !!this.selectedService();
    if (this.step() === 2) return !!this.selectedSlot();
    if (this.step() === 3) return this.bookingForm.valid;
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
    // Load business info
    this.api.getBusinesses().pipe(catchError(() => of([]))).subscribe(list => {
      const found = list.find(b => b.id === this.businessId);
      if (found) this.business.set(found);
    });
    this.loadServices();
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

  goToStep(s: Step): void { this.step.set(s); }

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
    this.loadServices();
    this.startPolling();
    this.goToStep(1);
  }
}
