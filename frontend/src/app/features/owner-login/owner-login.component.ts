import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';

@Component({
  selector: 'app-owner-login',
  imports: [CommonModule, ReactiveFormsModule, AuthCardComponent],
  template: `
    <app-auth-card
      title="Login de dueño"
      subtitle="Accede para gestionar tus negocios."
      [formGroup]="form"
      submitLabel="Iniciar sesión"
      loadingLabel="Iniciando…"
      [loading]="loading()"
      [isSubmitDisabled]="form.invalid || loading()"
      [errorMessage]="error()"
      footerText="¿No tienes cuenta?"
      footerActionLabel="Regístrate"
      (submit)="submit()"
      (footerAction)="goRegister()"
    >
      <div>
        <label class="form-label">Correo electrónico</label>
        <input type="email" class="form-input w-full" formControlName="email" />
      </div>
      <div>
        <label class="form-label">Contraseña</label>
        <input type="password" class="form-input w-full" formControlName="password" />
      </div>
    </app-auth-card>
  `,
})
export class OwnerLoginComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.value;
    this.api.loginOwner(email!, password!).subscribe({
      next: result => {
        if (result.data?.token) {
          this.auth.setOwnerToken(result.data.token);
          this.router.navigate(['/owner/dashboard']);
        }
      },
      error: err => {
        this.error.set(err.message || 'Credenciales inválidas.');
        this.loading.set(false);
      },
    });
  }

  goRegister(): void {
    this.router.navigate(['/owner/register']);
  }
}
