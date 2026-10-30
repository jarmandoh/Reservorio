import { Component, DestroyRef, ElementRef, ViewChild, AfterViewInit, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';

type UsuarioAuthMode = 'login' | 'register';

function passwordMatchValidator(group: { get(controlName: string): { value: unknown } | null }): {
  passwordMismatch: boolean;
} | null {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (!pass && !confirm) return null;
  return pass === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-usuario-auth',
  imports: [CommonModule, ReactiveFormsModule, AuthCardComponent, RouterLink],
  template: `
    <app-auth-card
      [title]="title()"
      [subtitle]="subtitle()"
      [formGroup]="activeForm()"
      [submitLabel]="submitLabel()"
      [loadingLabel]="loadingLabel()"
      [loading]="loading()"
      [isSubmitDisabled]="activeForm().invalid || loading()"
      [errorMessage]="error()"
      [footerText]="footerText()"
      [footerActionLabel]="footerActionLabel()"
      (formSubmit)="submit()"
      (footerAction)="toggleMode()"
    >
      <a
        routerLink="/"
        class="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
        aria-label="Volver al inicio"
      >
        <span class="material-icons-round text-base" aria-hidden="true">arrow_back</span>
        Volver al inicio
      </a>
      <div #formPane class="form-pane overflow-hidden">
        @if (mode() === 'login') {
          <div class="space-y-4">
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
              @if (loginForm.controls.email.touched && loginForm.controls.email.invalid) {
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
                  autocomplete="current-password"
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
              @if (loginForm.controls.password.touched && loginForm.controls.password.invalid) {
                <p class="mt-1 text-xs text-error">La contraseña debe tener al menos 6 caracteres.</p>
              }
            </div>
          </div>
        }

        @if (mode() === 'register') {
          <div class="space-y-4">
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
              @if (registerForm.controls.name.touched && registerForm.controls.name.invalid) {
                <p class="mt-1 text-xs text-error">Escribe tu nombre (mínimo 2 caracteres).</p>
              }
            </div>

            <div>
              <label class="form-label" for="customer-reg-email">Correo electrónico</label>
              <div class="icon-field">
                <span class="material-icons-round" aria-hidden="true">mail</span>
                <input
                  id="customer-reg-email"
                  type="email"
                  class="form-input"
                  formControlName="email"
                  autocomplete="email"
                  placeholder="ana@ejemplo.com"
                />
              </div>
              @if (registerForm.controls.email.touched && registerForm.controls.email.invalid) {
                <p class="mt-1 text-xs text-error">Introduce un correo electrónico válido.</p>
              }
            </div>

            <div>
              <label class="form-label" for="customer-reg-password">Contraseña</label>
              <div class="icon-field has-toggle">
                <span class="material-icons-round" aria-hidden="true">lock</span>
                <input
                  id="customer-reg-password"
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
              @if (registerForm.controls.password.touched && registerForm.controls.password.invalid) {
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
              @if (registerForm.controls.confirmPassword.touched && registerForm.hasError('passwordMismatch')) {
                <p class="mt-1 text-xs text-error">Las contraseñas no coinciden.</p>
              }
            </div>

            <label class="flex items-start gap-2 mt-1">
              <input type="checkbox" formControlName="dataConsent" class="mt-1" />
              <span class="text-xs text-on-surface-variant"
                >He leído y acepto la <a routerLink="/privacy" class="underline text-primary">política de privacidad</a></span
              >
            </label>
            @if (registerForm.controls.dataConsent.touched && registerForm.controls.dataConsent.invalid) {
              <p class="text-xs text-error">Debes aceptar la política de privacidad</p>
            }
          </div>
        }
      </div>
    </app-auth-card>
  `,
})
export class UsuarioAuthComponent implements AfterViewInit, OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = signal<UsuarioAuthMode>('login');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly registerForm = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      dataConsent: [false, [Validators.requiredTrue]],
    },
    { validators: passwordMatchValidator }
  );

  readonly activeForm = computed(() => (this.mode() === 'login' ? this.loginForm : this.registerForm));

  readonly title = computed(() =>
    this.mode() === 'login' ? 'Mi cuenta' : 'Crear cuenta'
  );
  readonly subtitle = computed(() =>
    this.mode() === 'login'
      ? 'Accede para ver tu historial y repetir tus reservas favoritas.'
      : 'Regístrate para ver tu historial y repetir tus reservas favoritas.'
  );
  readonly submitLabel = computed(() => (this.mode() === 'login' ? 'Iniciar sesión' : 'Registrarme'));
  readonly loadingLabel = computed(() => (this.mode() === 'login' ? 'Comprobando…' : 'Registrando…'));
  readonly footerText = computed(() =>
    this.mode() === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'
  );
  readonly footerActionLabel = computed(() =>
    this.mode() === 'login' ? 'Registrarse' : 'Iniciar sesión'
  );

  @ViewChild('formPane') private formPane?: ElementRef<HTMLDivElement>;

  private gsapPromise: Promise<any> | null = null;
  private loadGsap(): Promise<any> {
    if (!this.gsapPromise) {
      this.gsapPromise = import('gsap').then(m => m.default ?? m.gsap ?? m);
    }
    return this.gsapPromise;
  }

  ngAfterViewInit(): void {
    void this.animateIn();
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private async animateIn(): Promise<void> {
    const el = this.formPane?.nativeElement;
    if (!el || this.prefersReducedMotion()) return;
    try {
      const gsap = await this.loadGsap();
      gsap.killTweensOf(el);
      gsap.fromTo(
        el,
        { opacity: 0, y: 18, height: 0, filter: 'blur(4px)' },
        { opacity: 1, y: 0, height: 'auto', filter: 'blur(0px)', duration: 0.45, ease: 'power3.out' }
      );
    } catch {
      // ignore
    }
  }

  private async animateOutThen(cb: () => void): Promise<void> {
    const el = this.formPane?.nativeElement;
    if (!el || this.prefersReducedMotion()) {
      cb();
      return;
    }
    try {
      const gsap = await this.loadGsap();
      gsap.killTweensOf(el);
      gsap.to(el, {
        opacity: 0,
        y: -14,
        height: 0,
        filter: 'blur(4px)',
        duration: 0.22,
        ease: 'power2.in',
        onComplete: () => {
          cb();
          requestAnimationFrame(() => void this.animateIn());
        },
      });
    } catch {
      cb();
      requestAnimationFrame(() => void this.animateIn());
    }
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }

  setMode(mode: UsuarioAuthMode): void {
    if (this.mode() === mode) return;
    this.error.set(null);
    this.showPassword.set(false);
    this.showConfirmPassword.set(false);
    void this.animateOutThen(() => this.mode.set(mode));
  }

  toggleMode(): void {
    this.setMode(this.mode() === 'login' ? 'register' : 'login');
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

  submit(): void {
    if (this.loading()) return;

    if (this.mode() === 'login') {
      if (this.loginForm.invalid) return;
      const email = this.loginForm.value.email?.trim() ?? '';
      const password = this.loginForm.value.password ?? '';
      this.loading.set(true);
      this.error.set(null);
      this.auth
        .loginWithPassword(email, password, 'customer')
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
            this.error.set(err instanceof Error ? err.message : 'Credenciales inválidas.');
          },
        });
      return;
    }

    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid) return;

    const name = String(this.registerForm.value.name ?? '').trim();
    const email = String(this.registerForm.value.email ?? '').trim();
    const password = String(this.registerForm.value.password ?? '');

    this.loading.set(true);
    this.error.set(null);

    this.api
      .createCustomer({ name, email, dataConsent: true, marketingConsent: false })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
}
