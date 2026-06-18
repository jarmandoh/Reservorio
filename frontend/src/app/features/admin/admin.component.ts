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
import { Reservation }  from '../../core/models/reservation.model';
import { Business, NewBusinessPayload } from '../../core/models/businesses.model';
import { Categoria } from '../../core/models/categorias.model';

type AdminTab = 'reservas' | 'servicios' | 'ajustes' | 'negocios';

@Component({
    selector: 'app-admin',
    imports: [CommonModule, ReactiveFormsModule, BadgeComponent],
    templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);
  private auth  = inject(AuthService);
  private router = inject(Router);
  private fb    = inject(FormBuilder);

  readonly sheetId = '1cxZR6YYFkXJy8AKGM-1AakGk9hw6AR9vTv2RHm4yUNc';

  readonly tabs = [
    { id: 'negocios'  as AdminTab, label: 'Negocios', icon: 'store' },
  ];

  readonly tab            = signal<AdminTab>('negocios');
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
  readonly adminError        = signal<string | null>(null);
  readonly businesses        = signal<Business[]>([]);
  readonly businessesLoading = signal(false);
  readonly togglingBusiness  = signal<string | null>(null);
  readonly deletingBusiness = signal<string | null>(null);
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
    logo:          [''],
    tags:          [''],
    icon:          ['store'],
    gradient:      ['linear-gradient(135deg,#005bbf,#1a73e8)'],
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
  }

  initAdminToken(): void {
    this.adminError.set(null);
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
      error: err => {
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
    this.api.getAllBusinesses(t).subscribe({
      next:  list => { this.businesses.set(list); this.businessesLoading.set(false); },
      error: ()   => { this.businessesLoading.set(false); },
    });
  }

  openBizModal(biz: Business | null): void {
    this.editingBusiness.set(biz);
    this.loadCategories();
    console.log('Categorías cargadas:', this.categorias);
    if (biz) {
      this.businessForm.patchValue({
        name: biz.name, category: biz.category, description: biz.description,
        location: biz.location, schedule: biz.schedule ?? '',
        phone: biz.phone ?? '', logo: biz.logo ?? '', tags: biz.tags?.join(', ') ?? '',
        icon: biz.icon, gradient: biz.gradient,
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
        logo: v.logo ?? '', tags: tagsArr, icon: v.icon!, gradient: v.gradient!,
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
        logo: v.logo ?? '', tags: tagsArr, icon: v.icon!, gradient: v.gradient!,
        pin: v.pin!,
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

  deleteBusiness(id: string): void {
    const token = this.adminToken();
    if (!token) return;
    if (!window.confirm('¿Eliminar este negocio? Esta acción no se puede deshacer.')) return;
    this.deletingBusiness.set(id);
    this.api.deleteBusiness(id, token).subscribe({
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
    if (!this.adminToken()) {
      this.initAdminToken();
      return;
    }
    this.loadBusinesses();
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


  categorias: Categoria[] = [];
  isCategoriesLoading = false;

  async loadCategories(): Promise<void> {
    if(this.categorias.length > 0) return; // Ya cargadas
    this.isCategoriesLoading = true;
    try {
      await this.api.getCategories().subscribe({
        next: data => { this.categorias = data; this.isCategoriesLoading = false; },
        error: err => { this.isCategoriesLoading = false; },
      });
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      this.isCategoriesLoading = false;
    }
  }
}
