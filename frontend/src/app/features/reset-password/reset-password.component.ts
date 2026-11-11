import { Component, DestroyRef, signal, inject, OnInit, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { PasswordFlowShellComponent } from '../../shared/components/password-flow-shell/password-flow-shell.component';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, PasswordFlowShellComponent, RouterLink],
  template: `
    <app-password-flow-shell
      title="Restablecer contraseña"
      subtitle="Crea una nueva clave para proteger el acceso a tu cuenta."
    >
      @if (ready()) {
        <form class="password-form" [formGroup]="form" (ngSubmit)="submit()">
          <div class="password-field">
            <label class="password-label" for="rp-password">Nueva contraseña</label>
            <div class="password-input-wrap">
              <span class="material-icons-round input-icon" aria-hidden="true">lock_outline</span>
              <input
                id="rp-password"
                [type]="showPassword() ? 'text' : 'password'"
                class="password-input"
                formControlName="password"
                autocomplete="new-password"
                placeholder="Crea una contraseña segura"
                [attr.aria-invalid]="form.controls.password.invalid && form.controls.password.touched ? 'true' : null"
                [attr.aria-describedby]="
                  form.controls.password.invalid && form.controls.password.touched
                    ? 'rp-password-error'
                    : 'rp-password-help'
                "
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

            <div
              class="strength-meter"
              role="meter"
              aria-label="Fortaleza de la contraseña"
              [attr.aria-valuenow]="strength()"
              [attr.aria-valuetext]="strengthLabel()"
              aria-valuemin="0"
              aria-valuemax="5"
            >
              @for (segment of strengthSegments; track segment; let index = $index) {
                <span [class.is-active]="strength() > index"></span>
              }
            </div>
            <p class="strength-caption" id="rp-password-help">
              <span>Fortaleza</span>
              <strong>{{ strengthLabel() }}</strong>
            </p>

            @if (form.controls.password.touched && form.controls.password.invalid) {
              <p id="rp-password-error" class="password-error" role="alert">
                La contraseña todavía no cumple todos los requisitos.
              </p>
            }
          </div>

          <div class="password-field">
            <label class="password-label" for="rp-confirm">Confirmar nueva contraseña</label>
            <div class="password-input-wrap">
              <span class="material-icons-round input-icon" aria-hidden="true">lock_outline</span>
              <input
                id="rp-confirm"
                [type]="showConfirm() ? 'text' : 'password'"
                class="password-input"
                formControlName="confirmPassword"
                autocomplete="new-password"
                placeholder="Escríbela de nuevo"
                [attr.aria-invalid]="form.hasError('mismatch') && form.controls.confirmPassword.touched ? 'true' : null"
                [attr.aria-describedby]="
                  form.hasError('mismatch') && form.controls.confirmPassword.touched ? 'rp-confirm-error' : null
                "
              />
              <button
                type="button"
                class="password-toggle"
                [attr.aria-label]="showConfirm() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                [attr.aria-pressed]="showConfirm()"
                (click)="toggleConfirm()"
              >
                <span class="material-icons-round" aria-hidden="true">{{
                  showConfirm() ? 'visibility_off' : 'visibility'
                }}</span>
              </button>
            </div>
            @if (form.hasError('mismatch') && form.controls.confirmPassword.touched) {
              <p id="rp-confirm-error" class="password-error" role="alert">Las contraseñas no coinciden.</p>
            }
          </div>

          <section class="security-checks" aria-label="Requisitos de seguridad">
            <h2 class="security-checks__title">
              <span class="material-icons-round" aria-hidden="true">verified_user</span>
              Requisitos de seguridad
            </h2>
            @for (requirement of requirements(); track requirement.id) {
              <p class="security-check" [class.is-met]="requirement.met">
                <span class="material-icons-round" aria-hidden="true">{{ requirement.met ? 'check' : 'remove' }}</span>
                {{ requirement.label }}
              </p>
            }
            <p class="security-check" [class.is-met]="passwordsMatch()">
              <span class="material-icons-round" aria-hidden="true">{{ passwordsMatch() ? 'check' : 'remove' }}</span>
              Las contraseñas deben coincidir
            </p>
          </section>

          @if (error()) {
            <p class="password-note" role="alert">
              <span class="material-icons-round" aria-hidden="true">error_outline</span>
              <span>{{ error() }}</span>
            </p>
          }

          <button class="password-primary" type="submit" [disabled]="form.invalid || loading()">
            @if (loading()) {
              <span class="material-icons-round animate-spin" aria-hidden="true">refresh</span>
              Actualizando contraseña…
            } @else {
              <span class="material-icons-round" aria-hidden="true">lock_reset</span>
              Restablecer contraseña
            }
          </button>
        </form>
      } @else {
        <div class="password-form">
          @if (checking()) {
            <p class="password-note" role="status">
              <span class="material-icons-round animate-spin" aria-hidden="true">refresh</span>
              <span>Validando el enlace de recuperación…</span>
            </p>
          } @else {
            <p class="password-note" role="alert">
              <span class="material-icons-round" aria-hidden="true">link_off</span>
              <span>{{ error() || 'El enlace de recuperación no es válido o ha vencido. Solicita uno nuevo.' }}</span>
            </p>
            <a
              class="password-primary"
              routerLink="/forgot-password"
              [queryParams]="role() === 'owner' ? { role: 'owner' } : null"
            >
              <span class="material-icons-round" aria-hidden="true">mark_email_read</span>
              Solicitar otro enlace
            </a>
          }
        </div>
      }

      <a
        class="password-link"
        [routerLink]="role() === 'owner' ? '/propietario/auth' : '/usuario/auth'"
        [queryParams]="role() === 'owner' ? { role: 'owner' } : null"
      >
        <span class="material-icons-round" aria-hidden="true">arrow_back</span>
        Volver al inicio de sesión
      </a>
    </app-password-flow-shell>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly checking = signal(true);
  readonly error = signal<string | null>(null);
  readonly ready = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirm = signal(false);
  readonly role = signal<'customer' | 'owner'>('customer');
  readonly strengthSegments = [0, 1, 2, 3, 4];

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirm(): void {
    this.showConfirm.update(v => !v);
  }

  readonly form = this.fb.group(
    {
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(12),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: (g: any) =>
        g.get('password')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true },
    }
  );

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: this.form.controls.password.value ?? '',
  });
  private readonly confirmPasswordValue = toSignal(this.form.controls.confirmPassword.valueChanges, {
    initialValue: this.form.controls.confirmPassword.value ?? '',
  });

  readonly requirements = computed(() => {
    const password = this.passwordValue() ?? '';
    return [
      { id: 'length', label: 'Mínimo 12 caracteres', met: password.length >= 12 },
      { id: 'uppercase', label: 'Incluir una letra mayúscula', met: /[A-Z]/.test(password) },
      { id: 'lowercase', label: 'Incluir una letra minúscula', met: /[a-z]/.test(password) },
      { id: 'number', label: 'Incluir al menos un número', met: /\d/.test(password) },
      { id: 'symbol', label: 'Incluir al menos un símbolo', met: /[^A-Za-z0-9]/.test(password) },
    ];
  });

  readonly strength = computed(() => {
    return this.requirements().filter(requirement => requirement.met).length;
  });

  readonly strengthLabel = computed(() => {
    const s = this.strength();
    if (s <= 1) return 'Débil';
    if (s <= 3) return 'Media';
    if (s === 4) return 'Fuerte';
    return 'Alta';
  });

  readonly passwordsMatch = computed(() => {
    const password = this.passwordValue() ?? '';
    const confirmPassword = this.confirmPasswordValue() ?? '';
    return !!password && password === confirmPassword;
  });

  ngOnInit(): void {
    this.role.set(this.route.snapshot.queryParamMap.get('role') === 'owner' ? 'owner' : 'customer');
    const sub = this.auth.supabase.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        this.ready.set(true);
        this.checking.set(false);
      }
    });
    void this.auth.supabase
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (data.session) this.ready.set(true);
        else if (!this.ready())
          this.error.set('El enlace de recuperación no es válido o ha vencido. Solicita uno nuevo.');
        this.checking.set(false);
      })
      .catch(err => {
        this.error.set(err instanceof Error ? err.message : 'No se pudo validar el enlace de recuperación.');
        this.checking.set(false);
      });
    this.destroyRef.onDestroy(() => sub?.unsubscribe());
  }

  submit(): void {
    if (this.loading() || this.form.invalid) return;
    const password = this.form.value.password ?? '';
    this.loading.set(true);
    this.error.set(null);
    this.auth
      .updatePassword(password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/auth/reset-success'], {
            queryParams: this.role() === 'owner' ? { role: 'owner' } : undefined,
          });
        },
        error: err => {
          this.loading.set(false);
          this.error.set(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.');
        },
      });
  }
}
