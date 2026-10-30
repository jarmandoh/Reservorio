import { Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { AuthCardComponent } from '../../shared/components/auth-card/auth-card.component';
import { SupabaseAuthService } from '../../core/services/supabase-auth.service';

@Component({
  selector: 'app-customer-magic-verify',
  imports: [ReactiveFormsModule, AuthCardComponent, RouterLink],
  template: `
    <app-auth-card
      title="Verificando acceso…"
      subtitle="Estamos validando tu enlace de acceso."
      [formGroup]="form"
      submitLabel="Volver a intentar"
      [loading]="loading()"
      [errorMessage]="error()"
      (formSubmit)="retry()"
    >
      @if (error()) {
        <p class="text-sm text-on-surface-variant">
          El enlace ha caducado o ya fue utilizado. Solicita uno nuevo desde
          <a class="text-primary font-semibold underline" routerLink="/usuario/auth">Mi cuenta</a>.
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
  private readonly supabase = inject(SupabaseAuthService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({});

  ngOnInit(): void {
    if (this.auth.isCustomerUnlocked()) {
      this.router.navigate(['/customer/history']);
      return;
    }

    if (this.supabase.enabled) {
      this.supabase.getSession().then(({ data, error }) => {
        if (error || !data.session?.access_token) {
          this.error.set('Enlace inválido o caducado. Solicita uno nuevo.');
          return;
        }
        this.auth.activateSupabaseSession().subscribe({
          next: role => {
            if (role !== 'customer') {
              this.error.set('Esta cuenta no tiene permisos de cliente.');
              return;
            }
            this.router.navigate(['/customer/history']);
          },
          error: () => this.error.set('No se pudo validar el rol de esta cuenta.'),
        });
      });
      return;
    }

    const token = this.route.snapshot.queryParams['token'];
    if (!token) {
      this.error.set('Enlace inválido. Solicita uno nuevo desde Mi cuenta.');
      return;
    }

    this.loading.set(true);
    this.auth
      .redeemCustomerMagicLink(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
    this.router.navigate(['/usuario/auth']);
  }
}
