import { Component, signal, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { PinAuthCardComponent } from '../../shared/components/pin-auth-card/pin-auth-card.component';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, PinAuthCardComponent],
  template: `
    <app-pin-auth-card
      [formGroup]="form"
      [loading]="loading()"
      [isSubmitDisabled]="form.invalid || loading()"
      [errorMessage]="loginError() ? 'PIN incorrecto. Intenta de nuevo.' : null"
      submitLabel="Entrar al panel"
      loadingLabel="Verificando…"
      backLabel="Volver a reservas"
      (submit)="submit()"
      (backAction)="goBack()"
    >
      <div header class="flex flex-col items-center gap-3">
        <div
          class="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-soft bg-gradient-to-br from-primary to-primary-container"
        >
          <span class="material-icons-round text-2xl">admin_panel_settings</span>
        </div>
        <div class="text-center">
          <h1 class="font-display font-bold text-2xl text-on-surface">Reservorio Admin</h1>
          <p class="text-sm text-on-surface-variant mt-1">Ingresa tu PIN para continuar</p>
        </div>
      </div>

      <div>
        <label class="form-label text-center block mb-3" for="admin-pin" id="admin-pin-label">PIN de acceso</label>
        <input
          id="admin-pin"
          type="password"
          class="form-input text-center tracking-[0.5em] text-xl font-display"
          inputmode="numeric"
          maxlength="8"
          formControlName="pin"
          placeholder="••••"
          autocomplete="current-password"
          [attr.aria-invalid]="fieldInvalid('pin') || loginError() ? 'true' : null"
          [attr.aria-labelledby]="'admin-pin-label'"
          [attr.aria-describedby]="fieldInvalid('pin') ? 'admin-pin-error' : loginError() ? 'pin-auth-error' : null"
        />
        @if (fieldInvalid('pin')) {
          <p id="admin-pin-error" class="text-xs text-error text-center mt-2" role="alert">
            Ingresa tu PIN (mínimo 4 dígitos)
          </p>
        }
      </div>
      <div class="mt-4 border-t border-outline-variant pt-4">
        <label class="form-label" for="admin-email">Correo de administrador</label>
        <input id="admin-email" type="email" class="form-input w-full" formControlName="email" placeholder="admin@dominio.com" />
        <label class="form-label mt-3 block" for="admin-password">Contraseña de administrador</label>
        <input id="admin-password" type="password" class="form-input w-full" formControlName="password" autocomplete="current-password" />
        <button type="button" class="mt-2 w-full rounded-xl bg-primary px-4 py-3 text-white font-semibold" (click)="loginPassword()" [disabled]="loading() || !form.controls.email.value || !form.controls.password.value">
          Iniciar sesión con contraseña
        </button>
        <button type="button" class="mt-2 w-full rounded-xl border border-outline-variant px-4 py-3 font-semibold" (click)="requestOtp()" [disabled]="loading()">
          Enviar código por email
        </button>
        <button type="button" class="mt-2 w-full rounded-xl border border-outline-variant px-4 py-3 font-semibold" (click)="requestMagicLink()" [disabled]="loading()">
          Enviar enlace mágico
        </button>
        @if (otpRequested()) {
          <label class="form-label mt-3 block" for="admin-code">Código de verificación</label>
          <input id="admin-code" type="text" inputmode="numeric" maxlength="8" class="form-input w-full" formControlName="code" />
          <button type="button" class="mt-2 w-full rounded-xl bg-primary px-4 py-3 text-white font-semibold" (click)="verifyOtp()" [disabled]="loading() || form.controls.code.invalid">
            Verificar código
          </button>
        }
      </div>
      <button type="button" class="w-full rounded-xl border border-outline-variant px-4 py-3 font-semibold" (click)="loginGoogle()" [disabled]="loading()">
        Acceso administrativo con Google
      </button>
    </app-pin-auth-card>
  `,
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly loginError = signal(false);
  readonly otpRequested = signal(false);

  readonly form = this.fb.group({
    pin: ['', [Validators.required, Validators.minLength(4)]],
    email: [''],
    password: [''],
    code: [{ value: '', disabled: true }, [Validators.required, Validators.pattern(/^\d{4,8}$/)]],
  });

  ngOnInit(): void {
    if (this.auth.getAdminToken()) {
      this.router.navigate(['/admin']);
    }
  }

  fieldInvalid(name: string): boolean {
    const ctrl = this.form.get(name) as AbstractControl;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    // Navigate to a dedicated loading screen to give feedback during auth
    this.router.navigate(['/loading']);

    const pin = this.form.value.pin!;
    this.auth.loginAdmin(pin).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/admin']);
      },
      error: () => {
        this.loading.set(false);
        this.loginError.set(true);
        this.form.reset();
      },
    });
  }

  loginPassword(): void {
    const email = this.form.controls.email.value?.trim() ?? '';
    const password = this.form.controls.password.value ?? '';
    if (!email || !password) return;
    this.loading.set(true);
    this.loginError.set(false);
    this.auth.loginWithPassword(email, password, 'admin').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/admin']);
      },
      error: () => {
        this.loading.set(false);
        this.loginError.set(true);
      },
    });
  }

  requestOtp(): void {
    const email = this.form.controls.email.value?.trim() ?? '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.loginError.set(true);
      return;
    }
    this.loading.set(true);
    this.loginError.set(false);
    this.auth.requestEmailOtp(email).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading.set(false);
        this.otpRequested.set(true);
        this.form.controls.code.enable();
      },
      error: () => {
        this.loading.set(false);
        this.loginError.set(true);
      },
    });
  }

  requestMagicLink(): void {
    const email = this.form.controls.email.value?.trim() ?? '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.loginError.set(true);
      return;
    }
    this.loading.set(true);
    this.loginError.set(false);
    this.auth.requestRoleMagicLink(email).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading.set(false);
        this.loginError.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loginError.set(true);
      },
    });
  }

  verifyOtp(): void {
    const email = this.form.controls.email.value?.trim() ?? '';
    const code = this.form.controls.code.value?.trim() ?? '';
    if (!email || !code) return;
    this.loading.set(true);
    this.loginError.set(false);
    this.auth.verifyEmailOtp(email, code, 'admin').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/admin']);
      },
      error: () => {
        this.loading.set(false);
        this.loginError.set(true);
      },
    });
  }

  loginGoogle(): void {
    this.loading.set(true);
    this.loginError.set(false);
    this.auth.loginWithGoogle('admin').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
