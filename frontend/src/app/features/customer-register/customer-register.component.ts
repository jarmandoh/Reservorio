import { Component, DestroyRef, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';

@Component({
  selector: 'app-customer-register',
  imports: [CommonModule, ReactiveFormsModule, AuthCardComponent, RouterLink],
  template: `
    <app-auth-card
      title="Crear cuenta"
      subtitle="Regístrate para ver tu historial y repetir tus reservas favoritas."
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
      <a
        routerLink="/"
        class="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
        aria-label="Volver al inicio"
      >
        <span class="material-icons-round text-base" aria-hidden="true">arrow_back</span>
        Volver al inicio
      </a>

      <div>
        <label class="form-label" for="customer-name">Nombre completo</label>
        <div class="icon-field">
          <span class="material-icons-round" aria-hidden="true">person</span>
          <input
            id="customer-name"
            type="text"
            class="form-input"
            formControlName="name"
            autocomplete="name"
            placeholder="Ana García"
          />
        </div>
        @if (form.controls.name.touched && form.controls.name.invalid) {
          <p class="mt-1 text-xs text-error">Escribe tu nombre (mínimo 2 caracteres).</p>
        }
      </div>

      <div>
        <label class="form-label" for="customer-email">Correo electrónico</label>
        <div class="icon-field">
          <span class="material-icons-round" aria-hidden="true">mail</span>
          <input
            id="customer-email"
            type="email"
            class="form-input"
            formControlName="email"
            autocomplete="email"
            placeholder="ana@ejemplo.com"
          />
        </div>
        @if (form.controls.email.touched && form.controls.email.invalid) {
          <p class="mt-1 text-xs text-error">Introduce un correo electrónico válido.</p>
        }
      </div>

      <div>
        <label class="form-label" for="customer-password">Contraseña</label>
        <div class="icon-field has-toggle">
          <span class="material-icons-round" aria-hidden="true">lock</span>
          <input
            id="customer-password"
            [type]="showPassword() ? 'text' : 'password'"
            class="form-input"
            formControlName="password"
            autocomplete="new-password"
            placeholder="Mínimo 6 caracteres"
          />
          <button
            type="button"
            class="password-toggle"
            [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            [attr.aria-pressed]="showPassword()"
            (click)="togglePassword()"
          >
            <span class="material-icons-round" aria-hidden="true">{{
              showPassword() ? 'visibility_off' : 'visibility'
            }}</span>
          </button>
        </div>
        @if (form.controls.password.touched && form.controls.password.invalid) {
          <p class="mt-1 text-xs text-error">La contraseña debe tener al menos 6 caracteres.</p>
        }
      </div>

      <div>
        <label class="form-label" for="customer-confirm-password">Confirmar contraseña</label>
        <div class="icon-field has-toggle">
          <span class="material-icons-round" aria-hidden="true">lock</span>
          <input
            id="customer-confirm-password"
            [type]="showConfirmPassword() ? 'text' : 'password'"
            class="form-input"
            formControlName="confirmPassword"
            autocomplete="new-password"
            placeholder="Repite tu contraseña"
          />
          <button
            type="button"
            class="password-toggle"
            [attr.aria-label]="showConfirmPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            [attr.aria-pressed]="showConfirmPassword()"
            (click)="toggleConfirmPassword()"
          >
            <span class="material-icons-round" aria-hidden="true">{{
              showConfirmPassword() ? 'visibility_off' : 'visibility'
            }}</span>
          </button>
        </div>
        @if (form.controls.confirmPassword.touched && form.hasError('passwordMismatch')) {
          <p class="mt-1 text-xs text-error">Las contraseñas no coinciden.</p>
        }
      </div>

      <label class="flex items-start gap-2 mt-1">
        <input type="checkbox" formControlName="dataConsent" class="mt-1" />
        <span class="text-xs text-on-surface-variant"
          >He leído y acepto la <a routerLink="/privacy" class="underline text-primary">política de privacidad</a></span
        >
      </label>
      @if (form.controls.dataConsent.touched && form.controls.dataConsent.invalid) {
        <p class="text-xs text-error">Debes aceptar la política de privacidad</p>
      }
    </app-auth-card>
  `,
})
export class CustomerRegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }

  readonly form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      dataConsent: [false, [Validators.requiredTrue]],
    },
    { validators: passwordMatchValidator }
  );

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const name = String(this.form.value.name ?? '').trim();
    const email = String(this.form.value.email ?? '').trim();
    const password = String(this.form.value.password ?? '');

    this.loading.set(true);
    this.error.set(null);

    // 1) Registrar el cliente en el backend (crea el registro de negocio del cliente).
    this.api
      .createCustomer({ name, email, dataConsent: true, marketingConsent: false })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // 2) Crear el acceso con correo y contraseña en Supabase.
        next: () => {
          this.auth
            .registerCustomerWithPassword(email, password, name)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: result => {
                this.loading.set(false);
                if (result.data?.confirmationRequired) {
                  this.error.set('Cuenta creada. Confirma tu correo y luego inicia sesión.');
                  return;
                }
                this.router.navigate(['/customer/history']);
              },
              error: err => {
                this.loading.set(false);
                this.error.set(
                  err instanceof Error ? err.message : 'No se pudo crear el acceso con contraseña. Inténtalo de nuevo.'
                );
              },
            });
        },
        error: err => {
          this.loading.set(false);
          this.error.set(err instanceof Error ? err.message : 'No se pudo crear la cuenta (¿correo ya registrado?).');
        },
      });
  }

  goLogin(): void {
    this.router.navigate(['/customer/login']);
  }
}

function passwordMatchValidator(group: { get(controlName: string): { value: unknown } | null }): {
  passwordMismatch: boolean;
} | null {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (!pass && !confirm) return null;
  return pass === confirm ? null : { passwordMismatch: true };
}
