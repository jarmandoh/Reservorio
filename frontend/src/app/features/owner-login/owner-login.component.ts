import { Component, DestroyRef, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';

@Component({
  selector: 'app-owner-login',
  imports: [CommonModule, ReactiveFormsModule, AuthCardComponent, RouterLink],
  template: `
    <app-auth-card
      title="Iniciar sesión de propietario"
      subtitle="Accede para gestionar tus negocios."
      [formGroup]="form"
      submitLabel="Iniciar sesión"
      loadingLabel="Iniciando…"
      [loading]="loading()"
      [isSubmitDisabled]="form.invalid || loading()"
      [errorMessage]="error()"
      footerText="¿No tienes cuenta?"
      footerActionLabel="Regístrate"
      (formSubmit)="submit()"
      (footerAction)="goRegister()"
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
        <label class="form-label" for="owner-login-email">Correo electrónico</label>
        <div class="relative mt-1">
          <span
            class="material-icons-round pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant"
            aria-hidden="true"
            >mail</span
          >
          <input
            id="owner-login-email"
            type="email"
            class="form-input w-full pl-11"
            formControlName="email"
            autocomplete="email"
            placeholder="ana@ejemplo.com"
          />
        </div>
      </div>

      <div>
        <label class="form-label" for="owner-login-password">Contraseña</label>
        <div class="relative mt-1">
          <span
            class="material-icons-round pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant"
            aria-hidden="true"
            >lock</span
          >
          <input
            id="owner-login-password"
            [type]="showPassword() ? 'text' : 'password'"
            class="form-input w-full pl-11 pr-12"
            formControlName="password"
            autocomplete="current-password"
            placeholder="Tu contraseña"
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
    </app-auth-card>
  `,
})
export class OwnerLoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    code: [{ value: '', disabled: true }, [Validators.required, Validators.pattern(/^\d{4,8}$/)]],
  });

  requestOtp(): void {
    const email = this.form.controls.email.value?.trim();
    if (!email || this.form.controls.email.invalid) {
      this.error.set('Introduce un correo válido antes de solicitar el código.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth
      .requestEmailOtp(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.error.set(err instanceof Error ? err.message : 'No se pudo enviar el código.');
        },
      });
  }

  requestMagicLink(): void {
    const email = this.form.controls.email.value?.trim();
    if (!email || this.form.controls.email.invalid) {
      this.error.set('Introduce un correo válido antes de solicitar el enlace.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth
      .requestRoleMagicLink(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.error.set('Si el correo está registrado, recibirás un enlace para iniciar sesión.');
        },
        error: err => {
          this.loading.set(false);
          this.error.set(err instanceof Error ? err.message : 'No se pudo enviar el enlace.');
        },
      });
  }

  verifyOtp(): void {
    const email = this.form.controls.email.value?.trim() ?? '';
    const code = this.form.controls.code.value?.trim() ?? '';
    if (!email || !code) return;
    this.loading.set(true);
    this.error.set(null);
    this.auth
      .verifyEmailOtp(email, code, 'owner')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/owner/dashboard']);
        },
        error: err => {
          this.loading.set(false);
          this.error.set(err instanceof Error ? err.message : 'Código inválido o cuenta sin permisos de propietario.');
        },
      });
  }

  loginGoogle(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth
      .loginWithGoogle('owner')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loading.set(false),
        error: err => {
          this.loading.set(false);
          this.error.set(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google.');
        },
      });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.value;
    this.auth
      .loginOwner(email!, password!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.loading.set(false);
          /* if (res.data?.confirmationRequired) {
            this.error.set('Cuenta creada. Confirma tu correo y luego inicia sesión.');
            return;
          } */
          this.router.navigate(['/owner/dashboard']);
        },
        error: err => {
          const message = err instanceof Error ? err.message : 'Credenciales inválidas.';
          this.error.set(message);
          this.loading.set(false);
        },
      });
  }

  goRegister(): void {
    this.router.navigate(['/owner/register']);
  }
}
