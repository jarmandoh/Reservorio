import {
  Component, signal, inject, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, Validators, AbstractControl
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PinAuthCardComponent } from '../../shared/components/pin-auth-card/pin-auth-card.component';

@Component({
    selector: 'app-login',
    imports: [CommonModule, ReactiveFormsModule, PinAuthCardComponent],
    template: `
  <app-pin-auth-card
    [formGroup]="form"
    [loading]="loading()"
    [isSubmitDisabled]="form.invalid || loading()"
    [errorMessage]="loginError() ? 'PIN incorrecto. Intenta de nuevo.' : null"
    submitLabel="Entrar al panel"
    loadingLabel="Verificando…"
    backLabel="Volver a reservas"
    (submit)="submit()"
    (backAction)="goBack()"
  >
    <div header class="flex flex-col items-center gap-3">
      <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-soft"
           style="background:linear-gradient(135deg,#005bbf,#1a73e8)">
        <span class="material-icons-round text-2xl">admin_panel_settings</span>
      </div>
      <div class="text-center">
        <h1 class="font-display font-bold text-2xl text-on-surface">Reservorio Admin</h1>
        <p class="text-sm text-on-surface-variant mt-1">Ingresa tu PIN para continuar</p>
      </div>
    </div>

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
  </app-pin-auth-card>
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
