import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="min-h-screen grid place-items-center p-6">
      <section class="max-w-sm w-full text-center rounded-3xl bg-surface p-8 shadow-soft">
        <h1 class="text-xl font-bold text-on-surface">Verificando tu cuenta</h1>
        <p class="mt-2 text-sm text-on-surface-variant">{{ message() }}</p>
        @if (error()) {
          <a class="inline-flex mt-5 text-primary underline" href="/usuario/auth">Volver al inicio de sesión</a>
        }
      </section>
    </main>
  `,
})
export class AuthCallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly message = signal('Estamos validando tu sesión de forma segura…');
  readonly error = signal(false);

  ngOnInit(): void {
    this.auth.activateSupabaseSession().subscribe({
      next: role => {
        this.message.set('Acceso correcto. Redirigiendo…');
        const target = role === 'admin' ? '/admin' : role === 'owner' ? '/owner/dashboard' : '/customer/history';
        void this.router.navigateByUrl(target);
      },
      error: () => {
        this.error.set(true);
        this.message.set('No pudimos validar tu sesión o tu cuenta aún no tiene permisos.');
      },
    });
  }
}
