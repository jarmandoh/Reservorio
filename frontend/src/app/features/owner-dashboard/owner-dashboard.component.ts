import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OwnerBusinessService } from '../../core/services/owner-business.service';
import { Business } from '../../core/models/businesses.model';
import { BusinessFormComponent } from '../../shared/components/business-form/business-form.component';

@Component({
  selector: 'app-owner-dashboard',
  imports: [CommonModule, ReactiveFormsModule, BusinessFormComponent],
  template: `
  <div class="min-h-screen bg-surface p-4 sm:p-6">
    <div class="max-w-5xl mx-auto space-y-6">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="font-display text-3xl font-bold">Panel de dueños</h1>
          <p class="text-sm text-on-surface-variant">Gestiona tus negocios y crea nuevas fichas.</p>
        </div>
        <button class="btn-tertiary" (click)="logout()">Cerrar sesión</button>
      </header>

      <section class="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div class="card p-5">
          <h2 class="font-semibold text-lg">Tus negocios</h2>
          <p class="text-sm text-on-surface-variant mt-1">Visualiza el listado de tus negocios registrados.</p>
        </div>
        <button class="btn-primary btn-lg self-start" (click)="openCreateModal()">
          Nuevo negocio
        </button>
      </section>

      <section class="grid gap-4">
        @if (loading()) {
          <div class="card p-5 space-y-3">
            @for (i of [1,2,3]; track i) {
              <div class="skeleton h-16 rounded-xl"></div>
            }
          </div>
        } @else if (!businesses().length) {
          <div class="card p-5 text-center">
            <p class="text-sm text-on-surface-variant">No tienes negocios aún. Crea uno para comenzar.</p>
          </div>
        } @else {
          <div class="grid gap-4">
            @for (negocio of businesses(); track negocio.id) {
              <div class="card p-5 sm:flex sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 class="font-semibold text-lg">{{ negocio.name }}</h3>
                  <p class="text-sm text-on-surface-variant">{{ negocio.category }} · {{ negocio.location }}</p>
                </div>
                <div class="flex gap-2">
                  <button class="btn-secondary" (click)="openBusiness(negocio)">Ver reservas</button>
                  <button class="btn-tertiary" (click)="editBusiness(negocio)">Editar</button>
                </div>
              </div>
            }
          </div>
        }
      </section>

      @if (showModal()) {
        <div class="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div class="w-full max-w-2xl rounded-3xl bg-surface p-6 shadow-xl">
            <div class="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 class="font-semibold text-xl">{{ editingBusiness() ? 'Editar negocio' : 'Crear negocio' }}</h2>
                <p class="text-sm text-on-surface-variant">Usa tu cuenta de dueño para manejar tu negocio.</p>
              </div>
              <button class="btn-ghost" (click)="closeModal()" aria-label="Cerrar modal">✕</button>
            </div>

            <app-business-form
              [formGroup]="businessForm"
              submitLabel="Guardar negocio"
              [saving]="saving()"
              [isSubmitDisabled]="businessForm.invalid || saving()"
              (submit)="saveBusiness()"
              (cancel)="closeModal()"
            />
          </div>
        </div>
      }
    </div>
  </div>
  `,
})
export class OwnerDashboardComponent implements OnInit {
  private readonly ownerBusinessService = inject(OwnerBusinessService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly businesses = signal<Business[]>([]);
  readonly loading = signal(true);
  readonly showModal = signal(false);
  readonly saving = signal(false);
  readonly editingBusiness = signal<Business | null>(null);

  readonly businessForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    category: ['', Validators.required],
    description: [''],
    location: [''],
    phone: [''],
    logo: [''],
    tags: [''],
    facebook: [''],
    instagram: [''],
    tiktok: [''],
    whatsapp: [''],
    linkedin: [''],
    pin: ['', [Validators.required, Validators.minLength(4)]],
  });

  ngOnInit(): void {
    if (!this.auth.getOwnerToken()) {
      this.router.navigate(['/owner/login']);
      return;
    }

    this.ownerBusinessService.loadBusinesses().subscribe({
      next: list => {
        this.businesses.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.businesses.set([]);
        this.loading.set(false);
      },
    });
  }

  logout(): void {
    this.auth.clearOwnerToken();
    this.router.navigate(['/']);
  }

  openCreateModal(): void {
    this.editingBusiness.set(null);
    this.showModal.set(true);
    this.businessForm.reset(this.ownerBusinessService.createDefaults());
    this.businessForm.get('pin')?.setValidators([Validators.required, Validators.minLength(4)]);
    this.businessForm.get('pin')?.updateValueAndValidity();
  }

  editBusiness(negocio: Business): void {
    this.editingBusiness.set(negocio);
    this.showModal.set(true);
    this.businessForm.reset(this.ownerBusinessService.editDefaults(negocio));
    this.businessForm.get('pin')?.clearValidators();
    this.businessForm.get('pin')?.updateValueAndValidity();
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveBusiness(): void {
    if (this.businessForm.invalid) return;

    const values = this.businessForm.getRawValue();
    this.saving.set(true);

    this.ownerBusinessService.saveBusiness(values, this.editingBusiness()).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.refreshBusinesses();
      },
      error: err => {
        console.error(err);
        this.saving.set(false);
      },
    });
  }

  refreshBusinesses(): void {
    this.ownerBusinessService.loadBusinesses().subscribe({
      next: list => this.businesses.set(list),
      error: () => this.businesses.set([]),
    });
  }

  openBusiness(negocio: Business): void {
    this.router.navigate(['/business', negocio.id, 'admin']);
  }
}
