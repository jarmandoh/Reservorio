import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService }  from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Business }    from '../../core/models/reservation.model';

@Component({
    selector: 'app-business-login',
    imports: [CommonModule, ReactiveFormsModule],
    template: `
  <div class="min-h-dvh bg-surface flex flex-col items-center justify-center p-6">

    <div class="w-full max-w-sm flex flex-col gap-6">

      <!-- Logo / Icon -->
      @if (business()) {
        <div class="flex flex-col items-center gap-3 text-center">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-soft"
               [style.background]="business()!.gradient">
            <span class="material-icons-round text-3xl">{{ business()!.icon }}</span>
          </div>
          <div>
            <h1 class="font-display font-bold text-xl">{{ business()!.name }}</h1>
            <p class="text-sm text-on-surface-variant mt-0.5">Panel de administración</p>
          </div>
        </div>
      } @else {
        <div class="flex flex-col items-center gap-3 text-center">
          <div class="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center">
            <span class="material-icons-round text-3xl text-on-surface-variant">store</span>
          </div>
          <div>
            <h1 class="font-display font-bold text-xl">Acceso de negocio</h1>
            <p class="text-sm text-on-surface-variant mt-0.5">Introduce tu PIN para continuar</p>
          </div>
        </div>
      }

      <!-- Error -->
      @if (notFound()) {
        <div class="flex gap-3 p-4 rounded-xl text-sm"
             style="background:#fff0ef;color:#93000a;border:1px solid #f9aead">
          <span class="material-icons-round text-base mt-0.5">error_outline</span>
          <p>Negocio no encontrado. Verifica el enlace.</p>
        </div>
      }

      <!-- Form -->
      @if (!notFound()) {
        <form [formGroup]="form" (ngSubmit)="submit()" class="card flex flex-col gap-4">

          <div>
            <label class="form-label" for="pin">PIN de acceso</label>
            <input id="pin" type="password" class="form-input text-center tracking-[0.4em] text-lg"
                   inputmode="numeric" maxlength="8"
                   formControlName="pin" placeholder="••••"
                   autocomplete="current-password" />
          </div>

          @if (loginError()) {
            <p class="text-xs text-error text-center -mt-2">{{ loginError() }}</p>
          }

          <button type="submit"
                  class="btn-primary w-full"
                  [disabled]="form.invalid || loading()">
            @if (loading()) {
              <span class="material-icons-round text-base animate-spin">refresh</span>
              Verificando…
            } @else {
              Entrar
            }
          </button>
        </form>
      }

      <a routerLink="/" (click)="goHome()"
         class="flex items-center justify-center z-20 cursor-pointer gap-1.5 text-sm text-on-surface-variant hover:text-primary transition">
        <span class="material-icons-round text-base">arrow_back</span>
        Volver al inicio
      </a>
    </div>
  </div>
  `
})
export class BusinessLoginComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private api    = inject(ApiService);
  private auth   = inject(AuthService);
  private fb     = inject(FormBuilder);

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
    this.api.getBusinesses().pipe(catchError(() => of([]))).subscribe(list => {
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

    this.api.loginBusiness(id, pin).subscribe({
      next: res => {
        if (res.data?.token) {
          this.auth.setBusinessToken(id, res.data.token);
          this.router.navigate(['/business', id, 'admin']);
        }
      },
      error: err => {
        this.loginError.set(err?.error?.message ?? 'PIN incorrecto. Inténtalo de nuevo.');
        this.loading.set(false);
        this.form.get('pin')?.reset();
      },
    });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
