import { Component, DestroyRef, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';

@Component({
  selector: 'app-owner-register',
  imports: [CommonModule, ReactiveFormsModule, AuthCardComponent],
  template: `
    <app-auth-card
      title="Registro de propietario"
      subtitle="Crea tu cuenta para administrar tus negocios."
      [formGroup]="form"
      submitLabel="Registrarme"
      loadingLabel="Registrando…"
      [loading]="loading()"
      [isSubmitDisabled]="form.invalid || loading()"
      [errorMessage]="error()"
      footerText="¿Ya tienes cuenta?"
      footerActionLabel="Iniciar sesión"
      (formSubmit)="submit()"
      (footerAction)="goLogin()"
    >
      <div>
        <label class="form-label" for="owner-name">Nombre completo</label>
        <div class="relative mt-1">
          <span
            class="material-icons-round pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant"
            aria-hidden="true"
            >person</span
          >
          <input
            id="owner-name"
            type="text"
            class="form-input w-full pl-11"
            formControlName="name"
            autocomplete="name"
            placeholder="Ana García"
          />
        </div>
      </div>

      <div>
        <label class="form-label" for="owner-email">Correo electrónico</label>
        <div class="relative mt-1">
          <span
            class="material-icons-round pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant"
            aria-hidden="true"
            >mail</span
          >
          <input
            id="owner-email"
            type="email"
            class="form-input w-full pl-11"
            formControlName="email"
            autocomplete="email"
            placeholder="ana@ejemplo.com"
          />
        </div>
      </div>

      <div>
        <label class="form-label" for="owner-password">Contraseña</label>
        <div class="relative mt-1">
          <span
            class="material-icons-round pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant"
            aria-hidden="true"
            >lock</span
          >
          <input
            id="owner-password"
            [type]="showPassword() ? 'text' : 'password'"
            class="form-input w-full pl-11 pr-12"
            formControlName="password"
            autocomplete="new-password"
            placeholder="Mínimo 6 caracteres"
          />
          <button
            type="button"
            class="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
            [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            [attr.aria-pressed]="showPassword()"
            (click)="togglePassword()"
          >
            <span class="material-icons-round text-lg" aria-hidden="true">{{
              showPassword() ? 'visibility_off' : 'visibility'
            }}</span>
          </button>
        </div>
      </div>

      <div>
        <label class="form-label" for="owner-confirm-password">Confirmar contraseña</label>
        <div class="relative mt-1">
          <span
            class="material-icons-round pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant"
            aria-hidden="true"
            >lock</span
          >
          <input
            id="owner-confirm-password"
            [type]="showConfirmPassword() ? 'text' : 'password'"
            class="form-input w-full pl-11 pr-12"
            formControlName="confirmPassword"
            autocomplete="new-password"
            placeholder="Repite tu contraseña"
          />
          <button
            type="button"
            class="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
            [attr.aria-label]="showConfirmPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            [attr.aria-pressed]="showConfirmPassword()"
            (click)="toggleConfirmPassword()"
          >
            <span class="material-icons-round text-lg" aria-hidden="true">{{
              showConfirmPassword() ? 'visibility_off' : 'visibility'
            }}</span>
          </button>
        </div>
      </div>

      <div class="flex items-start mt-4">
        <label class="inline-flex items-center">
          <input type="checkbox" formControlName="termsAccepted" class="form-checkbox" />
          <span class="ml-2 text-sm">Acepto los <a href="/terms" class="underline">términos y condiciones</a></span>
        </label>
      </div>
      <div class="flex items-start mt-2">
        <label class="inline-flex items-center">
          <input type="checkbox" formControlName="privacyAccepted" class="form-checkbox" />
          <span class="ml-2 text-sm"
            >Acepto la <a href="/privacy" class="underline">política de tratamiento de datos personales</a></span
          >
        </label>
      </div>
    </app-auth-card>
  `,
})
export class OwnerRegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    termsAccepted: [false, [Validators.requiredTrue]],
    privacyAccepted: [false, [Validators.requiredTrue]],
  });

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      // Show error if any field invalid
      this.error.set('Por favor completa todos los campos requeridos.');
      return;
    }
    const pwd = this.form.value.password;
    const cpwd = this.form.value.confirmPassword;
    if (pwd !== cpwd) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    const { name, email, password } = this.form.value;
    const payload = { name: name ?? '', email: email ?? '', password: password ?? '' };
    this.auth
      .registerOwner(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.loading.set(false);
          if (res.data?.confirmationRequired) {
            this.error.set('Cuenta creada. Confirma tu correo y luego inicia sesión.');
            return;
          }
          this.router.navigate(['/owner/dashboard']);
        },
        error: err => {
          const message = err instanceof Error ? err.message : 'No se pudo crear la cuenta.';
          this.error.set(message);
          this.loading.set(false);
        },
      });
  }

  goLogin(): void {
    this.router.navigate(['/owner/login']);
  }
}
