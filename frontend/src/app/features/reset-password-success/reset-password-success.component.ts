import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PasswordFlowShellComponent } from '../../shared/components/password-flow-shell/password-flow-shell.component';

@Component({
  selector: 'app-reset-password-success',
  imports: [PasswordFlowShellComponent, RouterLink],
  template: `
    <app-password-flow-shell
      variant="success"
      title="¡Contraseña actualizada!"
      subtitle="Tu contraseña ha sido cambiada correctamente."
    >
      <div class="password-form">
        <p class="password-note password-note--success">
          <span class="material-icons-round" aria-hidden="true">check_circle</span>
          <span>Ahora puedes iniciar sesión con tu nueva contraseña.</span>
        </p>
        <a
          class="password-primary"
          [routerLink]="role() === 'owner' ? '/propietario/auth' : '/usuario/auth'"
          [queryParams]="role() === 'owner' ? { role: 'owner' } : null"
        >
          <span class="material-icons-round text-base" aria-hidden="true">login</span>
          Volver al inicio de sesión
        </a>
      </div>
    </app-password-flow-shell>
  `,
})
export class ResetPasswordSuccessComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly role = signal<'customer' | 'owner'>('customer');

  ngOnInit(): void {
    this.role.set(this.route.snapshot.queryParamMap.get('role') === 'owner' ? 'owner' : 'customer');
  }
}
