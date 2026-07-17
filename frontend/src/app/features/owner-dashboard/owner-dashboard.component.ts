import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BusinessService } from '../../core/services/business.service';
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
            @for (biz of businesses(); track biz.id) {
              <div class="card p-5 sm:flex sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 class="font-semibold text-lg">{{ biz.name }}</h3>
                  <p class="text-sm text-on-surface-variant">{{ biz.category }} · {{ biz.location }}</p>
                </div>
                <div class="flex gap-2">
                  <button class="btn-secondary" (click)="openBusiness(biz)">Ver reservas</button>
                  <button class="btn-tertiary" (click)="editBusiness(biz)">Editar</button>
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
  private businessService = inject(BusinessService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

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
    const token = this.auth.getOwnerToken();
    if (!token) {
      this.router.navigate(['/owner/login']);
      return;
    }
    this.businessService.getOwnerBusinesses(token).subscribe({
      next: list => { this.businesses.set(list); this.loading.set(false); },
      error: () => { this.businesses.set([]); this.loading.set(false); },
    });
  }

  logout(): void {
    this.auth.clearOwnerToken();
    this.router.navigate(['/']);
  }

  openCreateModal(): void {
    this.editingBusiness.set(null);
    this.showModal.set(true);
    this.businessForm.reset({
      name: '', category: '', description: '', location: '', phone: '', logo: '', tags: '',
      facebook: '', instagram: '', tiktok: '', whatsapp: '', linkedin: '', pin: '',
    });
    this.businessForm.get('pin')?.setValidators([Validators.required, Validators.minLength(4)]);
    this.businessForm.get('pin')?.updateValueAndValidity();
  }

  editBusiness(biz: Business): void {
    this.editingBusiness.set(biz);
    this.showModal.set(true);
    this.businessForm.reset({
      name: biz.name,
      category: biz.category,
      description: biz.description,
      location: biz.location,
      phone: biz.phone ?? '',
      logo: biz.logo ?? '',
      tags: biz.tags?.join(', ') ?? '',
      facebook: biz.facebook ?? '',
      instagram: biz.instagram ?? '',
      tiktok: biz.tiktok ?? '',
      whatsapp: biz.whatsapp ?? '',
      linkedin: biz.linkedin ?? '',
      pin: '',
    });
    this.businessForm.get('pin')?.clearValidators();
    this.businessForm.get('pin')?.updateValueAndValidity();
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveBusiness(): void {
    if (this.businessForm.invalid) return;
    const token = this.auth.getOwnerToken();
    if (!token) return;
    const values = this.businessForm.value;
    const tagsArr = (values.tags ?? '').split(',').map((tag: string) => tag.trim()).filter(Boolean);
    const payload = {
      name: values.name!,
      category: values.category!,
      description: values.description ?? '',
      location: values.location ?? '',
      phone: values.phone ?? '',
      logo: values.logo ?? '',
      tags: tagsArr,
      facebook: values.facebook ?? '',
      instagram: values.instagram ?? '',
      tiktok: values.tiktok ?? '',
      whatsapp: values.whatsapp ?? '',
      linkedin: values.linkedin ?? '',
      pin: values.pin!,
    };

    this.saving.set(true);

    if (this.editingBusiness()) {
      this.businessService.updateBusiness(this.editingBusiness()!.id, payload, token).subscribe({
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
    } else {
      this.businessService.createBusiness(payload, token).subscribe({
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
  }

  refreshBusinesses(): void {
    const token = this.auth.getOwnerToken();
    if (!token) return;
    this.businessService.getOwnerBusinesses(token).subscribe({ next: list => this.businesses.set(list) });
  }

  openBusiness(biz: Business): void {
    this.router.navigate(['/business', biz.id, 'admin']);
  }
}
