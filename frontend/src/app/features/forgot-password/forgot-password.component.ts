import { Component, DestroyRef, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { PasswordFlowShellComponent } from '../../shared/components/password-flow-shell/password-flow-shell.component';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, PasswordFlowShellComponent, RouterLink],
  template: `
    <app-password-flow-shell
      title="¿Olvidaste tu contraseña?"
      subtitle="Recupera el acceso a tu cuenta en unos pasos sencillos."
    >
      <form class="password-form" [formGroup]="form" (ngSubmit)="submit()">
        <div class="password-field">
          <label class="password-label" for="fp-email">Correo electrónico</label>
          <div class="password-input-wrap">
            <span class="material-icons-round input-icon" aria-hidden="true">mail_outline</span>
            <input
              id="fp-email"
              type="email"
              class="password-input"
              formControlName="email"
              autocomplete="email"
              placeholder="ana@ejemplo.com"
              [attr.aria-invalid]="form.controls.email.invalid && form.controls.email.touched ? 'true' : null"
              [attr.aria-describedby]="
                form.controls.email.invalid && form.controls.email.touched ? 'fp-email-error' : null
              "
            />
          </div>
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <p id="fp-email-error" class="password-error" role="alert">Introduce un correo electrónico válido.</p>
          }
        </div>

        @if (error()) {
          <p class="password-note" role="alert">
            <span class="material-icons-round" aria-hidden="true">error_outline</span>
            <span>{{ error() }}</span>
          </p>
        }

        @if (notice()) {
          <p class="password-note password-note--success" role="status">
            <span class="material-icons-round" aria-hidden="true">info</span>
            <span>{{ notice() }}</span>
          </p>
        } @else {
          <p class="password-note">
            <span class="material-icons-round" aria-hidden="true">info</span>
            <span>Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.</span>
          </p>
        }

        <button class="password-primary" type="submit" [disabled]="form.invalid || loading()">
          @if (loading()) {
            <span class="material-icons-round animate-spin" aria-hidden="true">refresh</span>
            Enviando instrucciones…
          } @else {
            <span class="material-icons-round" aria-hidden="true">send</span>
            Enviar instrucciones
          }
        </button>

        <div class="password-divider" aria-hidden="true">o</div>

        <a
          class="password-link"
          [routerLink]="role() === 'owner' ? '/propietario/auth' : '/usuario/auth'"
          [queryParams]="role() === 'owner' ? { role: 'owner' } : null"
        >
          <span class="material-icons-round" aria-hidden="true">arrow_back</span>
          Volver al inicio de sesión
        </a>
      </form>
    </app-password-flow-shell>
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly role = signal<'customer' | 'owner'>('customer');

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.role.set(this.route.snapshot.queryParamMap.get('role') === 'owner' ? 'owner' : 'customer');
  }

  submit(): void {
    if (this.loading() || this.form.invalid) return;
    const email = this.form.value.email?.trim() ?? '';
    this.loading.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.auth
      .requestPasswordReset(email, this.role())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.notice.set(
            'Si el correo electrónico está registrado, recibirás instrucciones para restablecer tu contraseña.'
          );
        },
        error: err => {
          this.loading.set(false);
          this.error.set(
            err instanceof Error ? err.message : 'No se pudieron enviar las instrucciones. Inténtalo de nuevo.'
          );
        },
      });
  }
}
