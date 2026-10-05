import { Component, DestroyRef, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';

type AccountType = 'usuario' | 'negocio';

@Component({
  selector: 'app-account-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AuthCardComponent, RouterLink],
  template: `
    <app-auth-card
      title="Crear cuenta"
      subtitle="Elige tu tipo de cuenta y completa tus datos."
      [formGroup]="form"
      [submitLabel]="submitLabel()"
      loadingLabel="Creando cuenta…"
      [loading]="loading()"
      [isSubmitDisabled]="form.invalid || loading()"
      [errorMessage]="error()"
      footerText="¿Ya tienes cuenta?"
      footerActionLabel="Iniciar sesión"
      (submit)="submit()"
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

      <!-- Selector de tipo -->
      <div class="grid grid-cols-2 gap-3 mb-2">
        <button
          type="button"
          class="flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-4 transition"
          [class.border-primary]="accountType() === 'usuario'"
          [class.bg-primary-container]="accountType() === 'usuario'"
          [class.text-white]="accountType() === 'usuario'"
          [class.border-outline-variant]="accountType() !== 'usuario'"
          [attr.aria-pressed]="accountType() === 'usuario'"
          (click)="setType('usuario')"
        >
          <span class="material-icons-round text-2xl">person</span>
          <span class="text-sm font-bold">Usuario</span>
          <span class="text-xs">Reservar citas</span>
        </button>
        <button
          type="button"
          class="flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-4 transition"
          [class.border-primary]="accountType() === 'negocio'"
          [class.bg-primary-container]="accountType() === 'negocio'"
          [class.text-white]="accountType() === 'negocio'"
          [class.border-outline-variant]="accountType() !== 'negocio'"
          [attr.aria-pressed]="accountType() === 'negocio'"
          (click)="setType('negocio')"
        >
          <span class="material-icons-round text-2xl">store</span>
          <span class="text-sm font-bold">Negocio</span>
          <span class="text-xs">Gestionar reservas</span>
        </button>
      </div>

      <div class="rounded-2xl bg-surface-low px-3 py-2 text-xs text-on-surface-variant text-center">
        @if (accountType() === 'usuario') {
          Podrás reservar en cualquier negocio y ver tu historial.
        } @else {
          Crea tu espacio para recibir reservas de clientes.
        }
      </div>

      <div>
        <label class="form-label" for="name">Nombre completo</label>
        <input
          id="name"
          type="text"
          class="form-input w-full"
          formControlName="name"
          placeholder="Ana García"
          autocomplete="name"
          [attr.aria-invalid]="form.controls.name.touched && form.controls.name.invalid ? 'true' : null"
          [attr.aria-describedby]="form.controls.name.touched && form.controls.name.invalid ? 'name-error' : null"
        />
        @if (form.controls.name.touched && form.controls.name.invalid) {
          <p id="name-error" class="text-xs text-error mt-1">Mínimo 2 caracteres</p>
        }
      </div>

      <div>
        <label class="form-label" for="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          class="form-input w-full"
          formControlName="email"
          placeholder="ana@ejemplo.com"
          autocomplete="email"
          [attr.aria-invalid]="form.controls.email.touched && form.controls.email.invalid ? 'true' : null"
          [attr.aria-describedby]="form.controls.email.touched && form.controls.email.invalid ? 'email-error' : null"
        />
        @if (form.controls.email.touched && form.controls.email.invalid) {
          <p id="email-error" class="text-xs text-error mt-1">Correo inválido</p>
        }
      </div>

      @if (accountType() === 'usuario') {
        <div>
          <label class="form-label" for="phone">Teléfono</label>
          <input
            id="phone"
            type="tel"
            class="form-input w-full"
            formControlName="phone"
            placeholder="600 123 456"
            autocomplete="tel"
            [attr.aria-invalid]="form.controls.phone.touched && form.controls.phone.invalid ? 'true' : null"
            [attr.aria-describedby]="form.controls.phone.touched && form.controls.phone.invalid ? 'phone-error' : null"
          />
          @if (form.controls.phone.touched && form.controls.phone.invalid) {
            <p id="phone-error" class="text-xs text-error mt-1">Mínimo 7 dígitos</p>
          }
        </div>
      }

      @if (accountType() === 'negocio') {
        <div>
          <label class="form-label" for="password">Contraseña</label>
          <input
            id="password"
            type="password"
            class="form-input w-full"
            formControlName="password"
            placeholder="Mínimo 6 caracteres"
            autocomplete="new-password"
            [attr.aria-invalid]="form.controls.password.touched && form.controls.password.invalid ? 'true' : null"
            [attr.aria-describedby]="
              form.controls.password.touched && form.controls.password.invalid ? 'password-error' : null
            "
          />
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <p id="password-error" class="text-xs text-error mt-1">Mínimo 6 caracteres</p>
          }
        </div>
        <div>
          <label class="form-label" for="confirmPassword">Confirmar contraseña</label>
          <input
            id="confirmPassword"
            type="password"
            class="form-input w-full"
            formControlName="confirmPassword"
            placeholder="Repite tu contraseña"
            autocomplete="new-password"
            [attr.aria-invalid]="
              form.controls.confirmPassword.touched && form.hasError('passwordMismatch') ? 'true' : null
            "
            [attr.aria-describedby]="
              form.controls.confirmPassword.touched && form.hasError('passwordMismatch')
                ? 'confirm-password-error'
                : null
            "
          />
          @if (form.hasError('passwordMismatch') && form.controls.confirmPassword.touched) {
            <p id="confirm-password-error" class="text-xs text-error mt-1">Las contraseñas no coinciden</p>
          }
        </div>
      }

      <label class="flex items-start gap-2 mt-1">
        <input type="checkbox" formControlName="dataConsent" class="mt-1" />
        <span class="text-xs text-on-surface-variant"
          >He leído y acepto la <a routerLink="/privacy" class="underline text-primary">política de privacidad</a></span
        >
      </label>
      @if (form.controls.dataConsent.touched && form.controls.dataConsent.invalid) {
        <p class="text-xs text-error">Debes aceptar la política de privacidad</p>
      }

      @if (notice()) {
        <p class="rounded-2xl bg-primary/10 border border-primary/30 text-sm text-primary p-3">{{ notice() }}</p>
      }
    </app-auth-card>
  `,
})
export class AccountCreateComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly accountType = signal<AccountType>('usuario');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.minLength(7)]],
      password: ['', []],
      confirmPassword: ['', []],
      dataConsent: [false, [Validators.requiredTrue]],
    },
    { validators: this.passwordMatchValidator }
  );

  submitLabel = computed(() =>
    this.accountType() === 'usuario' ? 'Crear cuenta de usuario' : 'Crear cuenta de negocio'
  );

  constructor() {
    this.setType('usuario');
  }

  private passwordMatchValidator(group: any) {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (!pass && !confirm) return null;
    return pass === confirm ? null : { passwordMismatch: true };
  }

  setType(type: AccountType): void {
    this.accountType.set(type);
    this.error.set(null);
    this.notice.set(null);

    const phone = this.form.controls.phone;
    const password = this.form.controls.password;
    const confirmPassword = this.form.controls.confirmPassword;

    if (type === 'usuario') {
      phone.enable();
      phone.setValidators([Validators.required, Validators.minLength(7)]);
      password.disable();
      password.clearValidators();
      password.setValue('');
      confirmPassword.disable();
      confirmPassword.clearValidators();
      confirmPassword.setValue('');
    } else {
      phone.disable();
      phone.clearValidators();
      phone.setValue('');
      password.enable();
      password.setValidators([Validators.required, Validators.minLength(6)]);
      confirmPassword.enable();
      confirmPassword.setValidators([Validators.required, Validators.minLength(6)]);
    }
    phone.updateValueAndValidity();
    password.updateValueAndValidity();
    confirmPassword.updateValueAndValidity();
    this.form.updateValueAndValidity();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const name = String(this.form.value.name ?? '').trim();
    const email = String(this.form.value.email ?? '').trim();
    const dataConsent = !!this.form.value.dataConsent;

    if (!dataConsent) {
      this.error.set('Debes aceptar la política de privacidad.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.notice.set(null);

    if (this.accountType() === 'usuario') {
      const phone = String(this.form.value.phone ?? '').trim();
      this.api
        .createCustomer({ name, email, phone, dataConsent: true, marketingConsent: false })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            // Auto-intenta login OTP para dejar al usuario autenticado
            this.auth
              .requestCustomerOtp(email)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: res => {
                  this.loading.set(false);
                  if (res.data?.debugCode) {
                    this.auth
                      .loginCustomerWithOtp(email, res.data.debugCode)
                      .pipe(takeUntilDestroyed(this.destroyRef))
                      .subscribe({
                        next: () => this.router.navigate(['/customer/history']),
                        error: () => {
                          this.notice.set('Cuenta creada. Revisa tu correo para el código de acceso.');
                          setTimeout(() => this.router.navigate(['/customer/login']), 1500);
                        },
                      });
                  } else {
                    this.notice.set('Cuenta creada. Te enviamos un código por correo.');
                    setTimeout(() => this.router.navigate(['/customer/login']), 1500);
                  }
                },
                error: err => {
                  this.loading.set(false);
                  this.notice.set('Cuenta creada. Ya puedes iniciar sesión.');
                  setTimeout(() => this.router.navigate(['/customer/login']), 1500);
                },
              });
          },
          error: err => {
            this.loading.set(false);
            this.error.set(err instanceof Error ? err.message : 'No se pudo crear la cuenta (¿email ya registrado?).');
          },
        });
    } else {
      const password = String(this.form.value.password ?? '');
      this.auth
        .registerOwner({ name, email, password })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.loading.set(false);
            this.router.navigate(['/owner/dashboard']);
          },
          error: err => {
            this.loading.set(false);
            this.error.set(
              err instanceof Error ? err.message : 'No se pudo crear la cuenta de negocio (¿email ya registrado?).'
            );
          },
        });
    }
  }

  goLogin(): void {
    if (this.accountType() === 'negocio') this.router.navigate(['/owner/login']);
    else this.router.navigate(['/customer/login']);
  }
}
