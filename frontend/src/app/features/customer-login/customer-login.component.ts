import { Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';

type AuthMode = 'credentials' | 'otp' | 'register';

@Component({
  selector: 'app-customer-login',
  imports: [CommonModule, ReactiveFormsModule, AuthCardComponent],
  template: `
    <app-auth-card
      title="Mi cuenta"
      subtitle="Accede para ver tu historial y repetir tus reservas favoritas."
      [formGroup]="form"
      [submitLabel]="submitLabel"
      [loadingLabel]="loadingLabel"
      [loading]="loading()"
      [isSubmitDisabled]="loading() || form.invalid"
      [errorMessage]="error()"
      footerText="¿Aún no has reservado?"
      footerActionLabel="Explorar negocios"
      (submit)="submit()"
      (footerAction)="goHome()"
    >
      <div class="mb-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          class="rounded-xl border px-3 py-2 text-sm font-semibold transition-colors"
          [class.border-primary]="mode() === 'credentials'"
          [class.text-primary]="mode() === 'credentials'"
          [class.bg-primary/10]="mode() === 'credentials'"
          [class.border-on-surface-variant/30]="mode() !== 'credentials'"
          (click)="setMode('credentials')"
        >
          Email y teléfono
        </button>
        <button
          type="button"
          class="rounded-xl border px-3 py-2 text-sm font-semibold transition-colors"
          [class.border-primary]="mode() === 'otp'"
          [class.text-primary]="mode() === 'otp'"
          [class.bg-primary/10]="mode() === 'otp'"
          [class.border-on-surface-variant/30]="mode() !== 'otp'"
          (click)="setMode('otp')"
        >
          Código por email
        </button>
        <button
          type="button"
          class="rounded-xl border px-3 py-2 text-sm font-semibold transition-colors"
          [class.border-primary]="mode() === 'register'"
          [class.text-primary]="mode() === 'register'"
          [class.bg-primary/10]="mode() === 'register'"
          [class.border-on-surface-variant/30]="mode() !== 'register'"
          (click)="setMode('register')"
        >
          Crear cuenta
        </button>
      </div>

      <div>
        <label class="form-label" for="email">Correo electrónico</label>
        <input id="email" type="email" class="form-input w-full" formControlName="email" (input)="onEmailChange()" />
      </div>

      @if (mode() === 'register') {
        <div>
          <label class="form-label" for="name">Tu nombre</label>
          <input id="name" type="text" class="form-input w-full" formControlName="name" placeholder="Ana García" />
        </div>
      }

      @if (mode() === 'credentials' || mode() === 'register') {
        <div>
          <label class="form-label" for="phone">Teléfono</label>
          <input
            id="phone"
            type="tel"
            class="form-input w-full"
            formControlName="phone"
            placeholder="Ej. 600 123 456"
          />
        </div>
        @if (mode() === 'credentials') {
          <p class="text-xs text-on-surface-variant mt-1">
            ¿No lo recuerdas?
            <button type="button" class="text-primary font-semibold underline" (click)="sendMagicLink()">
              Recibe un enlace por correo
            </button>
          </p>
        }
      }

      @if (mode() === 'otp') {
        <div>
          <label class="form-label" for="code">Código de 6 dígitos</label>
          <input
            id="code"
            type="text"
            class="form-input w-full"
            formControlName="code"
            inputmode="numeric"
            maxlength="8"
            placeholder="123456"
          />
        </div>
        @if (codeRequested()) {
          <p class="text-xs text-on-surface-variant mt-1">Te enviamos el código a tu correo electrónico.</p>
        }
      }

      @if (mode() === 'register') {
        <label class="flex items-start gap-2 mt-2">
          <input type="checkbox" formControlName="dataConsent" class="mt-1" />
          <span class="text-xs text-on-surface-variant"
            >He leído y acepto la <a routerLink="/privacy" class="underline text-primary">política de privacidad</a></span
          >
        </label>
      }

      @if (notice()) {
        <p class="rounded-2xl bg-primary/10 border border-primary/30 text-sm text-primary mt-4 p-3">{{ notice() }}</p>
      }
    </app-auth-card>
  `,
})
export class CustomerLoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly mode = signal<AuthMode>('credentials');
  readonly codeRequested = signal(false);

  readonly form = this.fb.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(7)]],
    code: [
      { value: '', disabled: true },
      [Validators.minLength(4), Validators.maxLength(8), Validators.pattern(/^\d{4,8}$/)],
    ],
    dataConsent: [false],
  });

  get submitLabel(): string {
    if (this.mode() === 'register') return 'Crear cuenta';
    if (this.mode() === 'credentials') return 'Ver mi historial';
    return this.codeRequested() ? 'Entrar con el código' : 'Enviar código';
  }

  get loadingLabel(): string {
    if (this.mode() === 'register') return 'Creando cuenta…';
    if (this.mode() === 'credentials') return 'Comprobando…';
    return this.codeRequested() ? 'Verificando…' : 'Enviando código…';
  }

  private get redirectUrl(): string | null {
    return this.route.snapshot.queryParamMap.get('redirect');
  }

  ngOnInit(): void {
    if (this.auth.isCustomerUnlocked()) {
      const redirect = this.redirectUrl;
      if (redirect) this.router.navigateByUrl(redirect);
      else this.router.navigate(['/customer/history']);
    }
  }

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.error.set(null);
    const name = this.form.controls.name as any;
    const phone = this.form.controls.phone;
    const code = this.form.controls.code;
    const dataConsent = this.form.controls.dataConsent as any;
    if (mode === 'otp') {
      name.disable();
      phone.disable();
      code.disable();
      dataConsent.disable();
    } else if (mode === 'register') {
      name.enable();
      name.setValidators([Validators.required, Validators.minLength(2)]);
      phone.enable();
      code.disable();
      dataConsent.enable();
      dataConsent.setValidators([Validators.requiredTrue]);
    } else {
      name.disable();
      phone.enable();
      code.disable();
      dataConsent.disable();
    }
    name.updateValueAndValidity?.();
    phone.updateValueAndValidity();
    code.updateValueAndValidity();
    dataConsent.updateValueAndValidity?.();
  }

  onEmailChange(): void {
    if (this.codeRequested()) {
      this.codeRequested.set(false);
      this.form.controls.code.disable();
      this.form.controls.code.setValue('');
      this.notice.set(null);
      this.error.set(null);
    }
  }

  submit(): void {
    if (this.loading() || this.form.invalid) return;
    const email = this.form.value.email?.trim();

    if (this.mode() === 'register') {
      const name = String(this.form.value.name ?? '').trim();
      const phone = String(this.form.value.phone ?? '').trim();
      const dataConsent = this.form.value.dataConsent as boolean;
      if (!name || !email || !phone) {
        this.error.set('Completa nombre, correo y teléfono.');
        return;
      }
      if (!dataConsent) {
        this.error.set('Debes aceptar la política de privacidad.');
        return;
      }
      this.loading.set(true);
      this.error.set(null);
      this.notice.set(null);
      this.api
        .createCustomer({ name, email, phone, dataConsent: true, marketingConsent: false })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            // Auto-login con OTP: solicita código y lo canjea si hay debug, si no pide OTP
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
                        next: () => {
                          const redirect = this.redirectUrl;
                          this.router.navigateByUrl(redirect || '/customer/history');
                        },
                        error: () => {
                          this.notice.set('Cuenta creada. Revisa tu correo para el código de acceso.');
                          this.setMode('otp');
                          this.form.patchValue({ email });
                          this.form.controls.code.enable();
                          if (res.data?.debugCode) this.form.controls.code.setValue(res.data.debugCode);
                        },
                      });
                  } else {
                    this.notice.set('Cuenta creada. Te enviamos un código por correo.');
                    this.setMode('otp');
                    this.form.patchValue({ email });
                    this.form.controls.code.enable();
                  }
                },
                error: err => {
                  this.loading.set(false);
                  this.error.set(err instanceof Error ? err.message : 'Cuenta creada, pero no se pudo enviar el código.');
                },
              });
          },
          error: err => {
            this.loading.set(false);
            this.error.set(err instanceof Error ? err.message : 'No se pudo crear la cuenta (¿email ya registrado?).');
          },
        });
      return;
    }

    if (this.mode() === 'credentials') {
      const phone = this.form.value.phone?.trim();
      if (!email || !phone) {
        this.error.set('Introduce tu correo y teléfono.');
        return;
      }
      this.loading.set(true);
      this.error.set(null);
      this.notice.set(null);
      this.auth
        .loginCustomer(email, phone)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.loading.set(false);
            const redirect = this.redirectUrl;
            if (redirect) this.router.navigateByUrl(redirect);
            else this.router.navigate(['/customer/history']);
          },
          error: err => {
            this.loading.set(false);
            this.error.set(err instanceof Error ? err.message : 'No encontramos un cliente con ese email y teléfono.');
          },
        });
      return;
    }

    if (!this.codeRequested()) {
      if (!email) {
        this.error.set('Introduce tu correo electrónico.');
        return;
      }
      this.loading.set(true);
      this.error.set(null);
      this.notice.set(null);
      this.auth
        .requestCustomerOtp(email)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: res => {
            this.loading.set(false);
            this.codeRequested.set(true);
            this.form.controls.code.enable();
            this.notice.set(res.data?.message ?? 'Revisa tu correo electrónico.');
            if (res.data?.debugCode) {
              this.form.controls.code.setValue(res.data.debugCode);
              this.notice.set(`${this.notice()} (depuración: ${res.data.debugCode})`);
            }
          },
          error: err => {
            this.loading.set(false);
            this.error.set(err instanceof Error ? err.message : 'No pudimos enviar el código. Inténtalo otra vez.');
          },
        });
      return;
    }

    const code = this.form.value.code?.trim();
    if (!email || !code) {
      this.error.set('Introduce el código que recibiste por correo.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth
      .loginCustomerWithOtp(email, code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          const redirect = this.redirectUrl;
          if (redirect) this.router.navigateByUrl(redirect);
          else this.router.navigate(['/customer/history']);
        },
        error: err => {
          this.loading.set(false);
          this.error.set(err instanceof Error ? err.message : 'Código inválido o expirado.');
        },
      });
  }

  sendMagicLink(): void {
    const email = this.form.value.email?.trim();
    if (!email) {
      this.error.set('Introduce antes tu correo electrónico.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.auth
      .requestCustomerMagicLink(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (res.data?.debugToken) {
            this.auth
              .redeemCustomerMagicLink(res.data.debugToken)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: () => {
                  this.loading.set(false);
                  const redirect = this.redirectUrl;
                  if (redirect) this.router.navigateByUrl(redirect);
                  else this.router.navigate(['/customer/history']);
                },
                error: err => {
                  this.loading.set(false);
                  this.error.set(err instanceof Error ? err.message : 'El enlace no pudo validarse.');
                },
              });
            return;
          }
          this.loading.set(false);
          this.notice.set(res.data?.message ?? 'Revisa tu correo electrónico; el enlace te traerá de vuelta.');
        },
        error: err => {
          this.loading.set(false);
          this.error.set(err instanceof Error ? err.message : 'No pudimos enviar el enlace. Inténtalo otra vez.');
        },
      });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
