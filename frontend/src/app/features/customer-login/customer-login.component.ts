import { Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';

type AuthMode = 'credentials' | 'otp';

@Component({
  selector: 'app-customer-login',
  imports: [CommonModule, ReactiveFormsModule, AuthCardComponent, RouterLink],
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
      footerText="¿No tienes cuenta?"
      footerActionLabel="Crear cuenta"
      (submit)="submit()"
      (footerAction)="goCreateAccount()"
    >
      <div class="mb-4 grid grid-cols-2 gap-2">
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
      </div>

      <div>
        <label class="form-label" for="email">Correo electrónico</label>
        <input id="email" type="email" class="form-input w-full" formControlName="email" (input)="onEmailChange()" />
      </div>

      @if (mode() === 'credentials') {
        <div>
          <label class="form-label" for="phone">Teléfono</label>
          <input
            id="phone"
            type="tel"
            class="form-input w-full"
            formControlName="phone"
            placeholder="Ej. 600 123 456"
          />
          <p class="text-xs text-on-surface-variant mt-1">
            ¿No lo recuerdas?
            <button type="button" class="text-primary font-semibold underline" (click)="sendMagicLink()">
              Recibe un enlace por correo
            </button>
          </p>
        </div>
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

      @if (notice()) {
        <p class="rounded-2xl bg-primary/10 border border-primary/30 text-sm text-primary mt-4 p-3">{{ notice() }}</p>
      }

      <p class="text-center text-xs text-on-surface-variant mt-2">
        ¿Primera vez aquí?
        <a routerLink="/account/create" class="text-primary font-semibold underline">Crea tu cuenta</a>
      </p>
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
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(7)]],
    code: [
      { value: '', disabled: true },
      [Validators.minLength(4), Validators.maxLength(8), Validators.pattern(/^\d{4,8}$/)],
    ],
  });

  get submitLabel(): string {
    if (this.mode() === 'credentials') return 'Ver mi historial';
    return this.codeRequested() ? 'Entrar con el código' : 'Enviar código';
  }

  get loadingLabel(): string {
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
    this.notice.set(null);
    const phone = this.form.controls.phone;
    const code = this.form.controls.code;
    if (mode === 'otp') {
      phone.disable();
      code.disable();
      this.codeRequested.set(false);
    } else {
      phone.enable();
      code.disable();
      this.codeRequested.set(false);
    }
    phone.updateValueAndValidity();
    code.updateValueAndValidity();
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

  goCreateAccount(): void {
    this.router.navigate(['/account/create']);
  }
}
