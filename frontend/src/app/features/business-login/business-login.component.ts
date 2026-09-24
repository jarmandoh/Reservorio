import { Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService }  from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Business }    from '../../core/models/businesses.model';
import { PinAuthCardComponent } from '../../shared/components/pin-auth-card/pin-auth-card.component';

@Component({
    selector: 'app-business-login',
    imports: [CommonModule, ReactiveFormsModule, PinAuthCardComponent],
    template: `
  <app-pin-auth-card
    [formGroup]="form"
    [loading]="loading()"
    [isSubmitDisabled]="form.invalid || loading()"
    [errorMessage]="notFound() ? 'Negocio no encontrado. Verifica el enlace.' : loginError()"
    submitLabel="Entrar"
    loadingLabel="Verificando…"
    backLabel="Volver al inicio"
    (submit)="submit()"
    (backAction)="goHome()"
  >
    <div header class="flex flex-col items-center gap-3 text-center">
      @if (business()) {
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-soft"
             [style.background]="business()!.gradient">
          <span class="material-icons-round text-3xl">{{ business()!.icon }}</span>
        </div>
        <div>
          <h1 class="font-display font-bold text-xl">{{ business()!.name }}</h1>
          <p class="text-sm text-on-surface-variant mt-0.5">Panel de administración</p>
        </div>
      } @else {
        <div class="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center">
          <span class="material-icons-round text-3xl text-on-surface-variant">store</span>
        </div>
        <div>
          <h1 class="font-display font-bold text-xl">Acceso de negocio</h1>
          <p class="text-sm text-on-surface-variant mt-0.5">Introduce tu PIN para continuar</p>
        </div>
      }
    </div>

    @if (!notFound()) {
      <div>
        <label class="form-label" for="pin">PIN de acceso</label>
        <input id="pin" type="password" class="form-input text-center tracking-[0.4em] text-lg"
               inputmode="numeric" maxlength="8"
               formControlName="pin" placeholder="••••"
               autocomplete="current-password" />
      </div>
    }
  </app-pin-auth-card>
  `
})
export class BusinessLoginComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private api    = inject(ApiService);
  private auth   = inject(AuthService);
  private fb     = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly business   = signal<Business | null>(null);
  readonly notFound   = signal(false);
  readonly loading    = signal(false);
  readonly loginError = signal<string | null>(null);

  readonly form = this.fb.group({
    pin: ['', [Validators.required, Validators.minLength(4)]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.params['businessId'];
    if (!id) { this.notFound.set(true); return; }

    // If already unlocked, redirect directly
    if (this.auth.isBusinessUnlocked(id)) {
      this.router.navigate(['/business', id, 'admin']);
      return;
    }

    // Load business name for display
    this.api.getBusinesses().pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef)).subscribe(list => {
      const found = list.find(b => b.id === id);
      if (found) this.business.set(found);
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const id  = this.route.snapshot.params['businessId'];
    const pin = this.form.value.pin!;
    this.loading.set(true);
    this.loginError.set(null);

    this.auth.loginBusiness(id, pin).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/business', id, 'admin']);
      },
      error: err => {
        const message = err instanceof Error ? err.message : 'PIN incorrecto. Inténtalo de nuevo.';
        this.loginError.set(message);
        this.loading.set(false);
        this.form.get('pin')?.reset();
      },
    });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
