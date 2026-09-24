import { Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';

@Component({
  selector: 'app-customer-magic-verify',
  imports: [ReactiveFormsModule, AuthCardComponent],
  template: `
    <app-auth-card
      title="Verificando acceso…"
      subtitle="Estamos validando tu enlace de acceso."
      [formGroup]="form"
      submitLabel="Volver a intentar"
      [loading]="loading()"
      [errorMessage]="error()"
      (submit)="retry()"
    >
      @if (error()) {
        <p class="text-sm text-on-surface-variant">
          El enlace ha caducado o ya fue utilizado. Solicita uno nuevo desde
          <a class="text-primary font-semibold underline" routerLink="/customer/login">Mi cuenta</a>.
        </p>
      }
    </app-auth-card>
  `,
})
export class CustomerMagicVerifyComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({});

  ngOnInit(): void {
    if (this.auth.isCustomerUnlocked()) {
      this.router.navigate(['/customer/history']);
      return;
    }

    const token = this.route.snapshot.queryParams['token'];
    if (!token) {
      this.error.set('Enlace inválido. Solicita uno nuevo desde Mi cuenta.');
      return;
    }

    this.loading.set(true);
    this.auth.redeemCustomerMagicLink(token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/customer/history']);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err instanceof Error ? err.message : 'El enlace no pudo validarse.');
      },
    });
  }

  retry(): void {
    this.router.navigate(['/customer/login']);
  }
}