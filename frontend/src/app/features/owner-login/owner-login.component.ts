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
      title="Login de dueño"
      subtitle="Accede para gestionar tus negocios."
      [formGroup]="form"
      submitLabel="Iniciar sesión"
      loadingLabel="Iniciando…"
      [loading]="loading()"
      [isSubmitDisabled]="form.invalid || loading()"
      [errorMessage]="error()"
      footerText="¿No tienes cuenta?"
      footerActionLabel="Regístrate"
      (submit)="submit()"
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
        <label class="form-label">Correo electrónico</label>
        <input type="email" class="form-input w-full" formControlName="email" />
      </div>
      <div>
        <label class="form-label">Contraseña</label>
        <input type="password" class="form-input w-full" formControlName="password" />
      </div>
      <button type="button" class="w-full rounded-xl border border-outline-variant px-4 py-3 font-semibold" (click)="loginGoogle()" [disabled]="loading()">
        Continuar con Google
      </button>
      <button type="button" class="w-full rounded-xl border border-outline-variant px-4 py-3 font-semibold" (click)="requestOtp()" [disabled]="loading()">
        Enviar código de acceso por email
      </button>
      @if (otpRequested()) {
        <div>
          <label class="form-label">Código recibido por email</label>
          <input type="text" inputmode="numeric" maxlength="8" class="form-input w-full" formControlName="code" />
          <button type="button" class="mt-2 w-full rounded-xl bg-primary px-4 py-3 text-white font-semibold" (click)="verifyOtp()" [disabled]="loading() || form.controls.code.invalid">
            Verificar código
          </button>
        </div>
      }
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
  readonly otpRequested = signal(false);

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
    this.auth.requestEmailOtp(email).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading.set(false);
        this.otpRequested.set(true);
        this.form.controls.code.enable();
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err instanceof Error ? err.message : 'No se pudo enviar el código.');
      },
    });
  }

  verifyOtp(): void {
    const email = this.form.controls.email.value?.trim() ?? '';
    const code = this.form.controls.code.value?.trim() ?? '';
    if (!email || !code) return;
    this.loading.set(true);
    this.error.set(null);
    this.auth.verifyEmailOtp(email, code, 'owner').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    this.auth.loginWithGoogle('owner').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
          if (res.data?.confirmationRequired) {
            this.error.set('Cuenta creada. Confirma tu correo y luego inicia sesión.');
            return;
          }
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
