import { Component, DestroyRef, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';

@Component({
  selector: 'app-owner-register',
  imports: [CommonModule, ReactiveFormsModule, AuthCardComponent],
  template: `
    <app-auth-card
      title="Registro de dueño"
      subtitle="Crea tu cuenta para administrar tus negocios."
      [formGroup]="form"
      submitLabel="Registrarme"
      loadingLabel="Registrando…"
      [loading]="loading()"
      [isSubmitDisabled]="form.invalid || loading()"
      [errorMessage]="error()"
      footerText="¿Ya tienes cuenta?"
      footerActionLabel="Iniciar sesión"
      (submit)="submit()"
      (footerAction)="goLogin()"
    >
      <div>
        <label class="form-label">Nombre completo</label>
        <input type="text" class="form-input w-full" formControlName="name" />
      </div>
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
export class OwnerRegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const { name, email, password } = this.form.value;
    const payload = { name: name ?? '', email: email ?? '', password: password ?? '' };
    this.auth.registerOwner(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/owner/dashboard']);
      },
      error: err => {
        const message = err instanceof Error ? err.message : 'No se pudo crear la cuenta.';
        this.error.set(message);
        this.loading.set(false);
      },
    });
  }

  goLogin(): void {
    this.router.navigate(['/owner/login']);
  }
}
