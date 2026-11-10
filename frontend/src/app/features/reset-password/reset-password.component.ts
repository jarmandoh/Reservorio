import { Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule, AuthCardComponent, RouterLink],
  template: `
    <app-auth-card
      title="Restablecer contraseña"
      subtitle="Ingresa tu nueva contraseña."
      [formGroup]="form"
      submitLabel="Guardar nueva contraseña"
      loadingLabel="Guardando…"
      [loading]="loading()"
      [isSubmitDisabled]="form.invalid || loading() || !ready()"
      [errorMessage]="error()"
      (formSubmit)="submit()"
    >
      <a
        routerLink="/usuario/auth"
        class="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
        aria-label="Volver al inicio de sesión"
      >
        <span class="material-icons-round text-base" aria-hidden="true">arrow_back</span>
        Volver al inicio de sesión
      </a>

      @if (!ready()) {
        <p class="text-sm text-on-surface-variant text-center py-4">Validando el enlace de recuperación…</p>
      }

      @if (ready()) {
        <div>
          <label class="form-label" for="rp-password">Nueva contraseña</label>
          <div class="icon-field has-toggle">
            <span class="material-icons-round" aria-hidden="true">lock</span>
            <input
              id="rp-password"
              [type]="showPassword() ? 'text' : 'password'"
              class="form-input"
              formControlName="password"
              autocomplete="new-password"
              placeholder="Mínimo 8 caracteres"
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
          <label class="form-label" for="rp-confirm">Confirmar contraseña</label>
          <div class="icon-field has-toggle">
            <span class="material-icons-round" aria-hidden="true">lock</span>
            <input
              id="rp-confirm"
              [type]="showConfirm() ? 'text' : 'password'"
              class="form-input"
              formControlName="confirmPassword"
              autocomplete="new-password"
              placeholder="Repite tu contraseña"
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
            <p class="mt-1 text-xs text-error">Las contraseñas no coinciden.</p>
          }
        </div>
      }

      @if (notice()) {
        <p class="rounded-2xl bg-primary/10 border border-primary/30 text-sm text-primary p-3" role="status">
          {{ notice() }}
        </p>
      }
    </app-auth-card>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly ready = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirm = signal(false);

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirm(): void {
    this.showConfirm.update(v => !v);
  }

  readonly form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: (g: any) =>
        g.get('password')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true },
    }
  );

  ngOnInit(): void {
    // Supabase detecta el código en la URL y establece la sesión de recuperación.
    const sub = this.auth.supabase.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        this.ready.set(true);
      }
    });
    // También verificar si ya hay sesión (caso en que el evento ya se disparó).
    void this.auth.supabase.getSession().then(({ data }) => {
      if (data.session) this.ready.set(true);
    });
    // Cleanup
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
          this.notice.set('Contraseña actualizada. Redirigiendo al inicio de sesión…');
          setTimeout(() => this.router.navigate(['/usuario/auth']), 1800);
        },
        error: err => {
          this.loading.set(false);
          this.error.set(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.');
        },
      });
  }
}
