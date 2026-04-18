import {
  Component, signal, inject, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, Validators, AbstractControl
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-login',
    imports: [CommonModule, ReactiveFormsModule],
    template: `
  <div class="min-h-screen flex flex-col items-center justify-center bg-surface px-6">

    <!-- Card -->
    <div class="w-full max-w-[360px] flex flex-col items-center gap-8">

      <!-- Logo -->
      <div class="flex flex-col items-center gap-3">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-soft"
             style="background:linear-gradient(135deg,#005bbf,#1a73e8)">
          <span class="material-icons-round text-2xl">admin_panel_settings</span>
        </div>
        <div class="text-center">
          <h1 class="font-display font-bold text-2xl text-on-surface">Reservorio Admin</h1>
          <p class="text-sm text-on-surface-variant mt-1">Ingresa tu PIN para continuar</p>
        </div>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="submit()"
            class="w-full bg-surface-lowest rounded-2xl shadow-soft p-6 flex flex-col gap-5">

        <!-- PIN inputs -->
        <div>
          <label class="form-label text-center block mb-3">PIN de acceso</label>
          <input
            type="password"
            class="form-input text-center tracking-[0.5em] text-xl font-display"
            inputmode="numeric"
            maxlength="8"
            formControlName="pin"
            placeholder="••••"
            autocomplete="current-password"
            autofocus />
          @if (fieldInvalid('pin')) {
            <p class="text-xs text-error text-center mt-2">Ingresa tu PIN (mínimo 4 dígitos)</p>
          }
        </div>

        <!-- Error message -->
        @if (loginError()) {
          <div class="bg-error-container rounded-xl px-4 py-3 flex items-center gap-2
                      text-[#93000a] text-sm animate-fade-in">
            <span class="material-icons-round text-base">error_outline</span>
            <span>PIN incorrecto. Intenta de nuevo.</span>
          </div>
        }

        <!-- Submit -->
        <button type="submit" class="btn-primary" [disabled]="form.invalid || loading()">
          @if (loading()) {
            <span class="material-icons-round text-base animate-spin">refresh</span>
            Verificando…
          } @else {
            <span class="material-icons-round text-base">lock_open</span>
            Entrar al panel
          }
        </button>
      </form>

      <!-- Back link -->
      <button class="btn-tertiary btn-sm gap-1.5" (click)="goBack()">
        <span class="material-icons-round text-[0.875rem]">arrow_back</span>
        Volver a reservas
      </button>
    </div>
  </div>
  `
})
export class LoginComponent implements OnInit {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private fb     = inject(FormBuilder);

  readonly loading     = signal(false);
  readonly loginError  = signal(false);

  readonly form = this.fb.group({
    pin: ['', [Validators.required, Validators.minLength(4)]],
  });

  ngOnInit(): void {
    if (this.auth.isUnlocked()) {
      this.router.navigate(['/admin']);
    }
  }

  fieldInvalid(name: string): boolean {
    const ctrl = this.form.get(name) as AbstractControl;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.loginError.set(false);

    const pin = this.form.value.pin!;
    const ok  = this.auth.login(pin);

    setTimeout(() => {
      this.loading.set(false);
      if (ok) {
        this.router.navigate(['/admin']);
      } else {
        this.loginError.set(true);
        this.form.reset();
      }
    }, 350);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
