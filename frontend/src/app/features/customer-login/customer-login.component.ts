import { Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';

@Component({
  selector: 'app-customer-login',
  imports: [CommonModule, ReactiveFormsModule, AuthCardComponent, RouterLink],
  template: `
    <app-auth-card
      title="Mi cuenta"
      subtitle="Accede para ver tu historial y repetir tus reservas favoritas."
      [formGroup]="form"
      [submitLabel]="'Iniciar sesión'"
      [loadingLabel]="'Comprobando…'"
      [loading]="loading()"
      [isSubmitDisabled]="loading() || form.invalid"
      [errorMessage]="error()"
      footerText="¿No tienes cuenta?"
      footerActionLabel="Registrarse"
      (formSubmit)="submit()"
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
            [attr.aria-invalid]="form.controls.email.invalid && form.controls.email.touched ? 'true' : null"
            [attr.aria-describedby]="form.controls.email.invalid && form.controls.email.touched ? 'email-error' : null"
          />
        </div>
        @if (form.controls.email.invalid && form.controls.email.touched) {
          <p id="email-error" class="mt-1 text-xs text-error">Introduce un correo electrónico válido.</p>
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
        @if (form.controls.password.touched && form.controls.password.invalid) {
          <p class="mt-1 text-xs text-error">La contraseña debe tener al menos 6 caracteres.</p>
        }
      </div>
    </app-auth-card>
  `,
})
export class CustomerLoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

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
    if (this.loading() || this.form.invalid) return;
    const email = this.form.value.email?.trim() ?? '';
    const password = this.form.value.password ?? '';
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
  }

  goRegister(): void {
    this.router.navigate(['/customer/register']);
  }
}
