import {
  Component, OnInit, signal, computed, effect, inject, DestroyRef,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, Validators, AbstractControl
} from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService }  from '../../core/services/auth.service';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { Reservation, Payment, PaymentStatus, AdminStats, AdminReview, AdminServiceRecord }  from '../../core/models/reservation.model';
import { Business, NewBusinessPayload } from '../../core/models/businesses.model';
import { Categoria } from '../../core/models/categorias.model';
import { MapModalComponent, MapCoordinates } from '../../shared/components/map-modal/map-modal.component';



type AdminTab = 'panel' | 'resenas' | 'pagos' | 'reservas' | 'servicios' | 'ajustes' | 'negocios';

@Component({
    selector: 'app-admin',
    imports: [CommonModule, ReactiveFormsModule, BadgeComponent, MapModalComponent],
    templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private auth  = inject(AuthService);
  private router = inject(Router);
  private fb    = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly sheetId = '1cxZR6YYFkXJy8AKGM-1AakGk9hw6AR9vTv2RHm4yUNc';

  readonly mapModal = viewChild.required<MapModalComponent>('mapModal');
  location = signal<MapCoordinates | null>(null);

  readonly tabs = [
    { id: 'panel'    as AdminTab, label: 'Panel',     icon: 'dashboard' },
    { id: 'negocios' as AdminTab, label: 'Negocios',  icon: 'store' },
    { id: 'resenas'  as AdminTab, label: 'Reseñas',   icon: 'rate_review' },
    { id: 'pagos'    as AdminTab, label: 'Pagos',     icon: 'payments' },
  ];

  readonly tab            = signal<AdminTab>('panel');
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

  // ── Panel avanzado state (#14) ─────────────────────────────────────────
  readonly adminPanelLoading = signal(false);
  readonly adminPanelError   = signal<string | null>(null);
  readonly adminStats        = signal<AdminStats | null>(null);
  readonly allReviews        = signal<AdminReview[]>([]);
  readonly allServices       = signal<AdminServiceRecord[]>([]);
  readonly payments          = signal<Payment[]>([]);
  readonly adminPaymentFilter = signal<PaymentStatus | ''>('');
  readonly deletingReviewId  = signal<number | null>(null);
  readonly deletingServiceId = signal<number | null>(null);
  readonly paidUpdating      = signal<string | null>(null);

  readonly panelCards = computed(() => {
    const s = this.adminStats();
    return [
      { label: 'Negocios', value: s?.businesses ?? 0, icon: 'store' },
      { label: 'Clientes', value: s?.customers ?? 0, icon: 'people' },
      { label: 'Reservas', value: s?.bookings ?? 0, icon: 'event_available' },
      { label: 'Reseñas', value: s?.reviews ?? 0, icon: 'rate_review' },
      { label: 'Cobrados', value: s?.paidPayments ?? 0, icon: 'payments' },
      { label: 'Ingresos', value: (s?.revenue ?? 0) + ' €', icon: 'euro' },
    ];
  });

  readonly funnelSteps = computed<{ days: number; steps: { label: string; value: number; pct: number }[] } | null>(() => {
    const f = this.adminStats()?.funnel;
    if (!f) return null;
    const views = Math.max(1, f.views);
    return {
      days: f.days,
      steps: [
        { label: 'Vistas de negocio', value: f.views, pct: 100 },
        { label: 'Reservas', value: f.bookings, pct: Math.round((f.bookings / views) * 100) },
        { label: 'Pagos completados', value: f.paid, pct: Math.round((f.paid / views) * 100) },
      ],
    };
  });

  readonly paymentStats = computed(() => {
    const rows = this.payments();
    return {
      total:    rows.length,
      paid:     rows.filter(p => p.status === 'paid').length,
      pending:  rows.filter(p => p.status === 'pending').length,
      failed:   rows.filter(p => p.status === 'failed').length,
      refunded: rows.filter(p => p.status === 'refunded').length,
      revenue:  this.adminStats()?.revenue ?? 0,
    };
  });

  readonly filteredPayments = computed(() => {
    const rows = this.payments();
    const f = this.adminPaymentFilter();
    if (!f) return rows;
    return rows.filter(p => p.status === f);
  });

  statusBadgeClass(status: PaymentStatus): string {
    switch (status) {
      case 'paid':     return 'text-success-on bg-success-container';
      case 'pending':  return 'text-tertiary bg-amber-100';
      case 'failed':   return 'text-error-on-container bg-error-container';
      case 'refunded': return 'text-indigo-700 bg-indigo-100';
      default:         return 'text-on-surface-variant bg-surface-low';
    }
  }

  // ── Negocios state ──────────────────────────────────────────────────────
  readonly adminToken        = signal<string | null>(null);
  readonly adminError        = signal<string | null>(null);
  readonly businesses        = signal<Business[]>([]);
  readonly businessesLoading = signal(false);
  readonly togglingBusiness  = signal<string | null>(null);
  readonly verifyingBusiness = signal<string | null>(null);
  readonly deletingBusiness = signal<string | null>(null);
  readonly shownegocioModal      = signal(false);
  readonly editingBusiness   = signal<Business | null>(null);
  readonly savingBusiness    = signal(false);

  readonly tagsOptions = signal<string[]>([]);
  readonly tagQuery = signal('');
  readonly matchingTagSuggestions = computed(() => {
    const query = this.tagQuery().trim().toLowerCase();
    if (!query) return [];
    return this.tagsOptions().filter(tag => tag.toLowerCase().includes(query)).slice(0, 6);
  });

  readonly presetGradients = [
    { name: 'Cielo pastel', from: '#a4d8ff', to: '#f7f8ff' },
    { name: 'Amanecer', from: '#ffd3b6', to: '#ff9a9e' },
    { name: 'Lavanda', from: '#d8b4ff', to: '#f3e8ff' },
    { name: 'Menta suave', from: '#b5f5d6', to: '#d3f1ff' },
    { name: 'Durazno', from: '#ffccbc', to: '#ffe0b2' },
  ];

  readonly daysOfWeek = [
    { id: 'Lun', label: 'Lun' },
    { id: 'Mar', label: 'Mar' },
    { id: 'Mie', label: 'Mié' },
    { id: 'Jue', label: 'Jue' },
    { id: 'Vie', label: 'Vie' },
    { id: 'Sab', label: 'Sáb' },
    { id: 'Dom', label: 'Dom' },
  ];
  readonly selectedDays = signal<string[]>([]);
  readonly openTime = signal('09:00');
  readonly closeTime = signal('18:00');
  readonly schedulePreview = computed(() => {
    const days = this.selectedDays();
    if (!days.length) return this.businessForm.get('schedule')?.value ?? '';
    return `${days.join(', ')} ${this.openTime()}–${this.closeTime()}`;
  });

  readonly gradientFrom = signal('#005bbf');
  readonly gradientTo = signal('#1a73e8');
  readonly gradientPreview = computed(() => `linear-gradient(135deg, ${this.gradientFrom()}, ${this.gradientTo()})`);
  readonly logoPreview = computed(() => this.businessForm.get('logo')?.value ?? '');
  readonly locationMapUrl = computed(() => {
    const location = this.businessForm.get('location')?.value?.trim() ?? '';
    return location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}` : '';
  });

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
    logo:          [''],
    tags:          [''],
    facebook:      [''],
    instagram:     [''],
    tiktok:        [''],
    whatsapp:      [''],
    linkedin:      [''],
    icon:          ['store'],
    gradient:      ['linear-gradient(135deg,#005bbf,#1a73e8)'],
    verified:      [false],
    cancellationPolicy: [''],
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

  readonly filteredBusinesses = computed(() => {
    let list = this.businesses();
    const q = this.searchQuery().toLowerCase();
    const f = this.filterStatus().toLowerCase();
    if (q) list = list.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      (b.location ?? '').toLowerCase().includes(q)
    );
    if (f) list = list.filter(b => (b.active ? 'activo' : 'inactivo').includes(f));
    return list;
  });

  ngOnInit(): void {
    this.initAdminToken();
    // this.loadTags(); cargar tags cuando se abra el modal
    
  }

  selectTab(id: AdminTab): void {
    this.tab.set(id);
    if (id === 'panel' || id === 'resenas' || id === 'pagos') {
      if (this.adminToken()) this.loadAdminData();
    }
  }

  loadAdminData(): void {
    const token = this.adminToken();
    if (!token) return;
    this.adminPanelLoading.set(true);
    this.adminPanelError.set(null);
    this.adminService.getAdminStats(token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:  s => this.adminStats.set(s),
      error: () => this.adminPanelError.set('No se pudieron cargar las estadísticas'),
    });
    this.adminService.getAdminReviews(token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:  rows => this.allReviews.set(rows),
      error: () => this.adminPanelError.set('No se pudieron cargar las reseñas'),
    });
    this.adminService.getAdminServices(token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:  rows => this.allServices.set(rows),
      error: () => this.adminPanelError.set('No se pudieron cargar los servicios'),
    });
    this.loadAdminPayments();
    this.adminPanelLoading.set(false);
  }

  loadAdminPayments(): void {
    const token = this.adminToken();
    if (!token) return;
    this.adminService.getAdminPayments(token, this.adminPaymentFilter() || undefined).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:  rows => this.payments.set(rows),
      error: () => this.adminPanelError.set('No se pudieron cargar los pagos'),
    });
  }

  setPaymentFilter(value: string): void {
    this.adminPaymentFilter.set((value || '') as PaymentStatus | '');
    this.loadAdminPayments();
  }

  deleteReview(id: number): void {
    const token = this.adminToken();
    if (!token || !window.confirm('¿Eliminar esta reseña? Esta acción no se puede deshacer.')) return;
    this.deletingReviewId.set(id);
    this.adminService.deleteAdminReview(id, token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.allReviews.update(rows => rows.filter(r => r.id !== id));
        const s = this.adminStats();
        if (s) this.adminStats.set({ ...s, reviews: Math.max(0, s.reviews - 1) });
        this.toast.success('Reseña eliminada');
        this.deletingReviewId.set(null);
      },
      error: err => { this.toast.error(err.message); this.deletingReviewId.set(null); },
    });
  }

  deleteServiceById(id: number): void {
    const token = this.adminToken();
    if (!token || !window.confirm('¿Eliminar este servicio?')) return;
    this.deletingServiceId.set(id);
    this.adminService.deleteAdminService(id, token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.allServices.update(rows => rows.filter(s => s.id !== id));
        this.toast.success('Servicio eliminado');
        this.deletingServiceId.set(null);
      },
      error: err => { this.toast.error(err.message); this.deletingServiceId.set(null); },
    });
  }

  setPaymentStatus(payment: Payment, status: PaymentStatus): void {
    const token = this.adminToken();
    if (!token) return;
    this.paidUpdating.set(payment.id);
    this.adminService.updatePaymentStatus(payment.id, status, token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.payments.update(rows => rows.map(p => p.id === payment.id ? { ...p, status } : p));
        this.paidUpdating.set(null);
        this.toast.success('Estado de pago actualizado');
      },
      error: err => { this.toast.error(err.message); this.paidUpdating.set(null); },
    });
  }

  initAdminToken(): void {
    this.adminError.set(null);
    const cached = this.auth.getAdminToken();
    if (cached) {
      this.adminToken.set(cached);
      this.loadBusinesses(cached);
      this.loadAdminData();
      return;
    }

    this.adminService.ensureAdminToken().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: token => {
        this.adminToken.set(token);
        this.loadBusinesses(token);
        this.loadAdminData();
      },
      error: () => {
        this.adminError.set('No se pudo obtener el token de administrador. Verifica el PIN del servidor y vuelve a intentar.');
        this.adminToken.set(null);
      },
    });
  }

  loadBusinesses(token?: string): void {
    const t = token ?? this.adminToken();
    if (!t) return;
    this.adminError.set(null);
    this.businessesLoading.set(true);
    this.adminService.getAllBusinesses(t).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:  list => { this.businesses.set(list); this.businessesLoading.set(false); },
      error: ()   => { this.businessesLoading.set(false); },
    });
  }

  loadTags(): void {
    this.adminService.getTags().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: tags => this.tagsOptions.set(tags),
      error: err => console.warn('No se pudieron cargar tags:', err.message),
    });
  }

  extractGradientColor(gradient: string, index: 0 | 1): string | null {
    const regex = /linear-gradient\([^,]+,\s*(#[0-9a-fA-F]{3,6})\s*,\s*(#[0-9a-fA-F]{3,6})\s*\)/;
    const match = String(gradient).match(regex);
    if (!match) return null;
    return index === 0 ? match[1] : match[2];
  }

  applyPresetGradient(from: string, to: string): void {
    this.gradientFrom.set(from);
    this.gradientTo.set(to);
    const value = `linear-gradient(135deg, ${from}, ${to})`;
    this.businessForm.get('gradient')?.setValue(value);
  }

  updateGradientValue(): void {
    const value = `linear-gradient(135deg, ${this.gradientFrom()}, ${this.gradientTo()})`;
    this.businessForm.get('gradient')?.setValue(value);
  }

  toggleScheduleDay(day: string): void {
    const current = this.selectedDays();
    if (current.includes(day)) {
      this.selectedDays.set(current.filter(d => d !== day));
    } else {
      this.selectedDays.set([...current, day]);
    }
  }

  onLogoChange(): void {
    this.businessForm.get('logo')?.updateValueAndValidity();
  }

  updateTagsFromSuggestion(tag: string): void {
    const current = (this.businessForm.get('tags')?.value ?? '').split(',').map((t: string) => t.trim()).filter(Boolean);
    if (!current.includes(tag)) current.push(tag);
    this.businessForm.get('tags')?.setValue(current.join(', '));
    this.tagQuery.set('');
  }

  opennegocioModal(negocio: Business | null): void {
    this.editingBusiness.set(negocio);
    this.loadCategories();
    this.loadTags();
    console.log('Categorías cargadas:', this.categorias);
    if (negocio) {
      this.businessForm.patchValue({
        name: negocio.name, category: negocio.category, description: negocio.description,
        location: negocio.location, schedule: negocio.schedule ?? '',
        phone: negocio.phone ?? '', logo: negocio.logo ?? '', tags: negocio.tags?.join(', ') ?? '',
        facebook: negocio.facebook ?? '', instagram: negocio.instagram ?? '', tiktok: negocio.tiktok ?? '',
        whatsapp: negocio.whatsapp ?? '', linkedin: negocio.linkedin ?? '',
        icon: negocio.icon, gradient: negocio.gradient,
        verified: !!negocio.verified,
        cancellationPolicy: negocio.cancellationPolicy ?? '',
        pin: '',
      });
      this.gradientFrom.set(this.extractGradientColor(negocio.gradient, 0) ?? '#005bbf');
      this.gradientTo.set(this.extractGradientColor(negocio.gradient, 1) ?? '#1a73e8');
      this.businessForm.get('pin')?.clearValidators();
    } else {
      this.businessForm.reset({
        icon: 'store', gradient: 'linear-gradient(135deg,#005bbf,#1a73e8)',
        facebook: '', instagram: '', tiktok: '', whatsapp: '', linkedin: '',
        verified: false, cancellationPolicy: '',
      });
      this.gradientFrom.set('#005bbf');
      this.gradientTo.set('#1a73e8');
      this.businessForm.get('pin')?.setValidators([Validators.required, Validators.minLength(4)]);
    }
    this.businessForm.get('pin')?.updateValueAndValidity();
    this.shownegocioModal.set(true);
  }

  closenegocioModal(): void { this.shownegocioModal.set(false); }

  saveBusiness(): void {
    if (this.businessForm.invalid) return;
    const token = this.adminToken();
    if (!token) return;
    const v = this.businessForm.value;
    const tagsArr = (v.tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean);
    this.savingBusiness.set(true);

    const scheduleValue = this.schedulePreview() || v.schedule || '';
    const gradientValue = this.businessForm.get('gradient')?.value || this.gradientPreview();

    if (this.editingBusiness()) {
      const updates: Partial<NewBusinessPayload> & { pin?: string } = {};
      updates.name = v.name!;
      updates.category = v.category!;
      updates.description = v.description ?? '';
      updates.location = v.location ?? '';
      updates.schedule = scheduleValue;
      updates.phone = v.phone ?? '';
      updates.logo = v.logo ?? '';
      updates.tags = tagsArr;
      updates.icon = v.icon!;
      updates.gradient = gradientValue;
      updates.facebook = v.facebook ?? '';
      updates.instagram = v.instagram ?? '';
      updates.tiktok = v.tiktok ?? '';
      updates.whatsapp = v.whatsapp ?? '';
      updates.linkedin = v.linkedin ?? '';
      updates.cancellationPolicy = v.cancellationPolicy ?? '';
      if (v.pin) updates.pin = v.pin;
      this.adminService.updateBusiness(this.editingBusiness()!.id, updates, token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.toast.success('Negocio actualizado');
          this.savingBusiness.set(false);
          this.closenegocioModal();
          this.loadBusinesses();
          this.verifyAfterSave(this.editingBusiness()!.id, !!v.verified);
        },
        error: err => { this.toast.error(err.message); this.savingBusiness.set(false); },
      });
    } else {
      const payload: NewBusinessPayload = {
        name: v.name!, category: v.category!, description: v.description ?? '',
        location: v.location ?? '', schedule: scheduleValue, phone: v.phone ?? '',
        logo: v.logo ?? '', tags: tagsArr, icon: v.icon!, gradient: gradientValue,
        facebook: v.facebook ?? '', instagram: v.instagram ?? '', tiktok: v.tiktok ?? '',
        whatsapp: v.whatsapp ?? '', linkedin: v.linkedin ?? '',
        cancellationPolicy: v.cancellationPolicy ?? '',
        pin: v.pin!,
      };
      this.adminService.createBusiness(payload, token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (result) => {
          this.toast.success('Negocio creado');
          this.savingBusiness.set(false);
          this.closenegocioModal();
          this.loadBusinesses();
          const newId = result?.data?.id;
          if (newId) this.verifyAfterSave(newId, !!v.verified);
        },
        error: err => { this.toast.error(err.message); this.savingBusiness.set(false); },
      });
    }
  }

  toggleBusiness(id: string): void {
    const token = this.adminToken();
    if (!token) return;
    this.togglingBusiness.set(id);
    this.adminService.toggleBusiness(id, token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

  verifyBusiness(id: string): void {
    const token = this.adminToken();
    if (!token) return;
    const target = this.businesses().find(b => b.id === id);
    if (!target) return;
    this.verifyingBusiness.set(id);
    this.adminService.verifyBusiness(id, !target.verified, token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.verifyingBusiness.set(null);
        this.loadBusinesses();
      },
      error: err => {
        this.toast.error(err.message);
        this.verifyingBusiness.set(null);
      },
    });
  }

  private verifyAfterSave(id: string, verified: boolean): void {
    const token = this.adminToken();
    if (!token) return;
    if (verified === this.businesses().find(b => b.id === id)?.verified) return;
    this.adminService.verifyBusiness(id, verified, token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: err => this.toast.error(err?.message ?? 'No se pudo actualizar la verificación'),
    });
  }

  deleteBusiness(id: string): void {
    const token = this.adminToken();
    if (!token) return;
    if (!window.confirm('¿Eliminar este negocio? Esta acción no se puede deshacer.')) return;
    this.deletingBusiness.set(id);
    this.adminService.deleteBusiness(id, token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('Negocio eliminado');
        this.deletingBusiness.set(null);
        this.loadBusinesses();
      },
      error: err => {
        this.toast.error(err.message);
        this.deletingBusiness.set(null);
      },
    });
  }

  loadReservations(): void {
    this.loading.set(true);
    this.error.set(null);
    this.adminService.getReservations().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:  data => { this.reservations.set(data); this.loading.set(false); },
      error: err  => { this.error.set(err.message); this.loading.set(false); },
    });
  }

  loadServices(): void {
    this.servicesLoading.set(true);
    this.adminService.getServices().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:  data => { this.services.set(data); this.servicesLoading.set(false); },
      error: ()   => { this.servicesLoading.set(false); },
    });
  }

  refresh(): void {
    if (!this.adminToken()) {
      this.initAdminToken();
      return;
    }
    this.loadBusinesses();
    this.loadAdminData();
  }

  isFreeSlot(row: Reservation): boolean {
    const d = row.disponibilidad.toLowerCase();
    return d.includes('disp');
  }

  openModal(row: Reservation): void {
    this.newStatus.set(row.disponibilidad.toLowerCase());
    this.modalRow.set(row);
  }


  


  abrirmodalMapa(): void {
    const currentCoords = this.location() ?? undefined;
    const mapModalInstance = this.mapModal();

    if(mapModalInstance) {
      mapModalInstance.open(currentCoords);
    } else {
      console.error('No se pudo abrir el modal de mapa: instancia no encontrada.');
    }



    /* this.mapModal.coordinatesSelected.subscribe((coords) => {
      console.log('Coordenadas seleccionadas:', coords);
      // Aquí puedes actualizar el formulario o hacer lo que necesites con las coordenadas
      this.businessForm.get('location')?.setValue(`${coords.lat}, ${coords.lng}`);
    }); */
  }
  onCoordinatesSelected(coords: MapCoordinates) {
    this.location.set(coords);
    console.log('Coordenadas recibidas del modal:', coords);
  }

  closeModal(): void { this.modalRow.set(null); }

  saveStatus(): void {
    const row = this.modalRow();
    if (!row) return;
    this.updating.set(row._rowIndex);
    this.adminService.updateReservation({ rowIndex: row._rowIndex, disponibilidad: this.newStatus() }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    this.adminService.createService(nombre).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    this.adminService.deleteService(nombre).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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


  categorias: Categoria[] = [];
  isCategoriesLoading = false;

  async loadCategories(): Promise<void> {
    if(this.categorias.length > 0) return; // Ya cargadas
    this.isCategoriesLoading = true;
    try {
      console.log('Cargando categorías...');
      await this.adminService.getCategories().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: data => { this.categorias = data; this.isCategoriesLoading = false; },
        error: () => { this.isCategoriesLoading = false; },
      });
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      this.isCategoriesLoading = false;
    }
  }
}
