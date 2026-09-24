import { Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';

@Component({
  selector: 'app-customer-login',
  imports: [CommonModule, ReactiveFormsModule, AuthCardComponent],
  template: `
    <app-auth-card
      title="Mi cuenta"
      subtitle="Accede con el email y teléfono que usaste al reservar para ver tu historial."
      [formGroup]="form"
      submitLabel="Ver mi historial"
      loadingLabel="Comprobando…"
      [loading]="loading()"
      [isSubmitDisabled]="form.invalid || loading()"
      [errorMessage]="error()"
      footerText="¿Aún no has reservado?"
      footerActionLabel="Explorar negocios"
      (submit)="submit()"
      (footerAction)="goHome()"
    >
      <div>
        <label class="form-label" for="email">Correo electrónico</label>
        <input id="email" type="email" class="form-input w-full" formControlName="email" />
      </div>
      <div>
        <label class="form-label" for="phone">Teléfono</label>
        <input id="phone" type="tel" class="form-input w-full" formControlName="phone" placeholder="Ej. 600 123 456" />
      </div>
    </app-auth-card>
  `,
})
export class CustomerLoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(7)]],
  });

  ngOnInit(): void {
    if (this.auth.isCustomerUnlocked()) {
      this.router.navigate(['/customer/history']);
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const { email, phone } = this.form.value;
    this.auth.loginCustomer(email!, phone!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/customer/history']);
      },
      error: err => {
        const message = err instanceof Error ? err.message : 'No encontramos un cliente con ese email y teléfono.';
        this.error.set(message);
        this.loading.set(false);
      },
    });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}