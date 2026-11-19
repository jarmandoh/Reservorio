import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Customer } from '../../../core/models/reservation.model';

export interface CustomerMenuItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-customer-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="space-y-4">
      <!-- Tarjeta de perfil del cliente -->
      <div class="card p-4 sm:p-5 border border-outline-variant/30 shadow-xs">
        <div class="flex items-center gap-3">
          <div
            class="grid place-items-center h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-white font-display font-bold text-base shadow-sm shrink-0"
            aria-hidden="true"
          >
            {{ initials(displayName()) }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <p class="font-display font-bold text-base text-on-surface truncate leading-tight">{{ displayName() }}</p>
            </div>
            <p class="text-xs text-on-surface-variant truncate mt-0.5">{{ customer?.email || 'Cuenta activa' }}</p>
            <div class="flex items-center gap-2 mt-2">
              <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <span class="material-icons-round text-[11px]" aria-hidden="true">check_circle</span>
                Cliente verificado
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Navegación de pestañas principales -->
      <nav class="card p-2.5 border border-outline-variant/30 shadow-xs" aria-label="Secciones del panel">
        <ul class="space-y-1">
          @for (item of menuItems; track item.id) {
            <li>
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-primary/10 text-primary font-semibold ring-1 ring-primary/20 shadow-xs"
                [routerLinkActiveOptions]="{ exact: item.id === 'dashboard' }"
                class="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium text-on-surface hover:bg-surface-low hover:text-primary transition-all duration-150"
                (click)="navigated.emit()"
              >
                <span class="material-icons-round text-lg shrink-0" aria-hidden="true">{{ item.icon }}</span>
                <span class="truncate flex-1">{{ item.label }}</span>
                <span class="material-icons-round text-sm opacity-30 text-on-surface-variant" aria-hidden="true">chevron_right</span>
              </a>
            </li>
          }
        </ul>

        <div class="my-2 border-t border-outline-variant/20"></div>

        <!-- Acciones secundarias -->
        <ul class="space-y-1">
          <li>
            <a
              routerLink="/"
              class="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-low transition-colors"
              (click)="navigated.emit()"
            >
              <span class="material-icons-round text-lg shrink-0 text-primary" aria-hidden="true">travel_explore</span>
              <span class="truncate flex-1">Explorar negocios</span>
              <span class="material-icons-round text-sm opacity-40" aria-hidden="true">north_east</span>
            </a>
          </li>
          <li>
            <button
              type="button"
              class="w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium text-error hover:bg-error/10 transition-colors text-left"
              (click)="logout.emit()"
            >
              <span class="material-icons-round text-lg shrink-0" aria-hidden="true">logout</span>
              <span class="truncate flex-1">Cerrar sesión</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  `,
})
export class CustomerSidebarComponent {
  @Input() customer: Customer | null = null;
  @Output() logout = new EventEmitter<void>();
  @Output() navigated = new EventEmitter<void>();

  readonly menuItems: CustomerMenuItem[] = [
    { id: 'dashboard', label: 'Inicio y Reservas', icon: 'dashboard', route: '/usuario/dashboard' },
    { id: 'historial', label: 'Historial completo', icon: 'history', route: '/usuario/dashboard/historial' },
    { id: 'favoritos', label: 'Mis favoritos', icon: 'favorite_border', route: '/usuario/dashboard/favoritos' },
    { id: 'perfil', label: 'Mi perfil y datos', icon: 'manage_accounts', route: '/usuario/dashboard/perfil' },
  ];

  displayName(): string {
    const c = this.customer;
    if (!c) return 'Cliente';
    const composed = [c.firstName, c.lastName].filter(Boolean).join(' ');
    return c.name || composed || c.email;
  }

  initials(name?: string): string {
    if (!name) return '?';
    return name
      .trim()
      .split(/\s+/)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
