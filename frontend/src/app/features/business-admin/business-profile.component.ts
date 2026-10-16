import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { Business } from '../../core/models/business.model';
import { AuthService } from '../../core/services/auth.service';
import { BusinessAdminService } from '../../core/services/business-admin.service';
import { ToastService } from '../../core/services/toast.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-business-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './business-profile.component.html',
})
export class BusinessProfileComponent implements OnChanges {
  @Input() business: Business | null = null;
  @Input() businessId = '';
  @Input() token = '';

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly businessAdminService = inject(BusinessAdminService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly savingProfile = signal(false);
  readonly savingPin = signal(false);
  readonly uploadingCover = signal(false);

  readonly profileForm = this.fb.group({
    name: ['', Validators.required],
    category: ['', Validators.required],
    description: [''],
    location: [''],
    schedule: [''],
    phone: [''],
    whatsapp: ['', Validators.pattern(/^\+?[0-9]{7,15}$/)],
    storeCoverImage: [''],
    cancellationPolicy: [''],
  });

  readonly pinForm = this.fb.group({
    pin: ['', [Validators.required, Validators.minLength(4)]],
    pinConfirm: ['', Validators.required],
  });

  pinMismatch(): boolean {
    const value = this.pinForm.value;
    return !!(value.pin && value.pinConfirm && value.pin !== value.pinConfirm);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['business'] || !this.business) return;
    this.profileForm.patchValue({
      name: this.business.name,
      category: this.business.category,
      description: this.business.description,
      location: this.business.location,
      schedule: this.business.schedule ?? '',
      phone: this.business.phone ?? '',
      whatsapp: this.business.whatsapp ?? '',
      storeCoverImage: this.business.storeCoverImage ?? '',
      cancellationPolicy: this.business.cancellationPolicy ?? '',
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    const value = this.profileForm.getRawValue();
    this.savingProfile.set(true);
    this.businessAdminService
      .saveProfile(this.businessId, value, this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Perfil actualizado');
          this.savingProfile.set(false);
        },
        error: error => {
          this.toast.error(error?.error?.message ?? 'Error al guardar');
          this.savingProfile.set(false);
        },
      });
  }

  changePin(): void {
    if (this.pinForm.invalid || this.pinMismatch()) return;
    const pin = this.pinForm.value.pin!;
    this.savingPin.set(true);
    this.businessAdminService
      .updatePin(this.businessId, pin, this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('PIN actualizado. Inicia sesión de nuevo.');
          this.auth.clearBusinessToken(this.businessId);
          this.router.navigate(['/business', this.businessId, 'login']);
        },
        error: error => {
          this.toast.error(error?.error?.message ?? 'Error al cambiar PIN');
          this.savingPin.set(false);
        },
      });
  }

  uploadCover(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.toast.error('Usa una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      this.toast.error('La imagen debe pesar menos de 8 MB.');
      return;
    }

    this.uploadingCover.set(true);
    this.businessAdminService
      .getCatalogImageSignature(this.businessId, 'cover', this.token)
      .pipe(
        switchMap(signature => this.businessAdminService.uploadCatalogImage(signature, file)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: image => {
          this.profileForm.patchValue({ storeCoverImage: image.secure_url });
          this.uploadingCover.set(false);
        },
        error: error => {
          this.toast.error(error?.error?.message ?? 'No se pudo subir la imagen.');
          this.uploadingCover.set(false);
        },
      });
  }
}
