import { Component, DestroyRef, ElementRef, ViewChild, AfterViewInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';

type OwnerAuthMode = 'login' | 'register';

function passwordMatchValidator(group: { get(controlName: string): { value: unknown } | null }): {
  passwordMismatch: boolean;
} | null {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (!pass && !confirm) return null;
  return pass === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-owner-auth',
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
            <label class="form-label" for="owner-email">Correo electrónico</label>
            <div class="icon-field">
              <span class="material-icons-round" aria-hidden="true">mail</span>
              <input
                id="owner-email"
                type="email"
                class="form-input"
                formControlName="email"
                autocomplete="email"
                placeholder="ana@ejemplo.com"
              />
            </div>
          </div>

          <div>
            <label class="form-label" for="owner-password">Contraseña</label>
            <div class="icon-field has-toggle">
              <span class="material-icons-round" aria-hidden="true">lock</span>
              <input
                id="owner-password"
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
          </div>
        </div>
      }

      @if (mode() === 'register') {
        <div class="space-y-4">
          <div>
            <label class="form-label" for="owner-name">Nombre completo</label>
            <div class="icon-field">
              <span class="material-icons-round" aria-hidden="true">person</span>
              <input
                id="owner-name"
                type="text"
                class="form-input"
                formControlName="name"
                autocomplete="name"
                placeholder="Ana García"
              />
            </div>
          </div>

          <div>
            <label class="form-label" for="owner-reg-email">Correo electrónico</label>
            <div class="icon-field">
              <span class="material-icons-round" aria-hidden="true">mail</span>
              <input
                id="owner-reg-email"
                type="email"
                class="form-input"
                formControlName="email"
                autocomplete="email"
                placeholder="ana@ejemplo.com"
              />
            </div>
          </div>

          <div>
            <label class="form-label" for="owner-reg-password">Contraseña</label>
            <div class="icon-field has-toggle">
              <span class="material-icons-round" aria-hidden="true">lock</span>
              <input
                id="owner-reg-password"
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
          </div>

          <div>
            <label class="form-label" for="owner-confirm-password">Confirmar contraseña</label>
            <div class="icon-field has-toggle">
              <span class="material-icons-round" aria-hidden="true">lock</span>
              <input
                id="owner-confirm-password"
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

          <div class="flex items-start mt-2">
            <label class="inline-flex items-center">
              <input type="checkbox" formControlName="termsAccepted" class="form-checkbox" />
              <span class="ml-2 text-sm">Acepto los <a href="/terms" class="underline">términos y condiciones</a></span>
            </label>
          </div>
          <div class="flex items-start">
            <label class="inline-flex items-center">
              <input type="checkbox" formControlName="privacyAccepted" class="form-checkbox" />
              <span class="ml-2 text-sm"
                >Acepto la <a href="/privacy" class="underline">política de tratamiento de datos personales</a></span
              >
            </label>
          </div>
        </div>
      }
      </div>
    </app-auth-card>
  `,
})
export class OwnerAuthComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('formPane') private formPane?: ElementRef<HTMLDivElement>;

  private gsapPromise: Promise<any> | null = null;
  private loadGsap(): Promise<any> {
    if (!this.gsapPromise) {
      this.gsapPromise = import('gsap').then(m => m.default ?? m.gsap ?? m);
    }
    return this.gsapPromise;
  }

  ngAfterViewInit(): void {
    // Entrance animation on first render.
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
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GSAP no disponible:', e);
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
          // animate in after DOM swap
          requestAnimationFrame(() => void this.animateIn());
        },
      });
    } catch {
      cb();
      requestAnimationFrame(() => void this.animateIn());
    }
  }
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly mode = signal<OwnerAuthMode>('login');

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
      termsAccepted: [false, [Validators.requiredTrue]],
      privacyAccepted: [false, [Validators.requiredTrue]],
    },
    { validators: passwordMatchValidator }
  );

  readonly activeForm = computed(() => (this.mode() === 'login' ? this.loginForm : this.registerForm));

  readonly title = computed(() =>
    this.mode() === 'login' ? 'Iniciar sesión de propietario' : 'Registro de propietario'
  );
  readonly subtitle = computed(() =>
    this.mode() === 'login'
      ? 'Accede para gestionar tus negocios.'
      : 'Crea tu cuenta para administrar tus negocios.'
  );
  readonly submitLabel = computed(() => (this.mode() === 'login' ? 'Iniciar sesión' : 'Registrarme'));
  readonly loadingLabel = computed(() => (this.mode() === 'login' ? 'Comprobando…' : 'Registrando…'));
  readonly footerText = computed(() =>
    this.mode() === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'
  );
  readonly footerActionLabel = computed(() =>
    this.mode() === 'login' ? 'Registrarse' : 'Iniciar sesión'
  );

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }

  setMode(mode: OwnerAuthMode): void {
    if (this.mode() === mode) return;
    this.error.set(null);
    this.showPassword.set(false);
    this.showConfirmPassword.set(false);
    void this.animateOutThen(() => this.mode.set(mode));
  }

  toggleMode(): void {
    this.setMode(this.mode() === 'login' ? 'register' : 'login');
  }

  submit(): void {
    if (this.loading()) return;

    if (this.mode() === 'login') {
      if (this.loginForm.invalid) return;
      const { email, password } = this.loginForm.value;
      this.loading.set(true);
      this.error.set(null);
      this.auth
        .loginOwner(email!, password!)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.loading.set(false);
            this.router.navigate(['/owner/dashboard']);
          },
          error: err => {
            const message = err instanceof Error ? err.message : 'Credenciales inválidas.';
            this.error.set(message);
            this.loading.set(false);
          },
        });
      return;
    }

    if (this.registerForm.invalid) return;
    const pwd = this.registerForm.value.password;
    const cpwd = this.registerForm.value.confirmPassword;
    if (pwd !== cpwd) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    const { name, email, password } = this.registerForm.value;
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
}
