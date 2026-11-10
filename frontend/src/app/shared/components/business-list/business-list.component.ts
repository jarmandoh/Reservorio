import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';
import { Business } from '../../../core/models/business.model';

@Component({
  selector: 'app-business-list',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-4">
      @for (negocio of businesses; track negocio.id) {
        <div
          class="card p-5 relative overflow-visible"
          style="content-visibility: visible; contain: none;"
          [style.view-transition-name]="'business-' + (negocio.id || negocio.name)"
        >
          <button
            type="button"
            class="absolute top-3 right-3 grid place-items-center h-9 w-9 rounded-full text-on-surface-variant hover:bg-surface-container transition"
            (click)="toggleMenu(negocio.id)"
            [attr.aria-expanded]="openMenuId() === negocio.id"
            aria-label="Opciones del negocio"
          >
            <span class="material-icons-round text-xl" aria-hidden="true">more_vert</span>
          </button>

          @if (openMenuId() === negocio.id) {
            <div class="absolute top-12 right-3 z-20 w-44 rounded-xl shadow-soft overflow-hidden menu-dropdown">
              <button type="button" class="menu-item" (click)="onAction('view', negocio)">
                <span class="material-icons-round text-base" aria-hidden="true">manage_accounts</span>
                Gestionar
              </button>
              <button type="button" class="menu-item" (click)="onAction('edit', negocio)">
                <span class="material-icons-round text-base" aria-hidden="true">edit</span>
                Editar
              </button>
              <button type="button" class="menu-item" (click)="onAction('promote', negocio)">
                <span class="material-icons-round text-base" aria-hidden="true">campaign</span>
                Promocionar
              </button>
              <button type="button" class="menu-item menu-item-danger" (click)="onAction('delete', negocio)">
                <span class="material-icons-round text-base" aria-hidden="true">delete_outline</span>
                Eliminar
              </button>
            </div>
            <div class="fixed inset-0 z-10" (click)="closeMenu()"></div>
          }

          <div class="pr-10">
            <h3 class="font-semibold text-lg">{{ negocio.name }}</h3>
            <p class="text-sm text-on-surface-variant">{{ negocio.category }}</p>
            @if (negocio.location) {
              <p class="text-sm text-on-surface-variant flex items-center gap-1 mt-1">
                <span class="material-icons-round text-base" aria-hidden="true">location_on</span>
                {{ negocio.location }}
              </p>
            }
            @if (negocio.phone) {
              <p class="text-sm text-on-surface-variant flex items-center gap-1">
                <span class="material-icons-round text-base" aria-hidden="true">call</span>
                {{ negocio.phone }}
              </p>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        --menu-surface: #ffffff;
        --menu-text: #181c20;
        --menu-muted: #686e7c;
        --menu-hover: #ebeef4;
        --menu-border: rgba(104, 110, 124, 0.22);
        --menu-accent: #005bbf;
        --menu-danger: #93000a;
      }
      :host-context(.dark) {
        --menu-surface: #1a222d;
        --menu-text: #e6e9ee;
        --menu-muted: #aeb8c5;
        --menu-hover: #26384c;
        --menu-border: rgba(230, 233, 238, 0.14);
        --menu-accent: #8fbaff;
        --menu-danger: #ffb4ab;
      }
      .menu-item {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        width: 100%;
        padding: 0.6rem 0.85rem;
        font-size: 0.85rem;
        text-align: left;
        color: var(--menu-text);
        transition: background 120ms ease;
      }
      .menu-item:hover {
        background: var(--menu-hover);
      }
      .menu-item > .material-icons-round {
        color: var(--menu-accent);
      }
      .menu-item-danger {
        color: var(--menu-danger);
      }
      .menu-item-danger > .material-icons-round {
        color: var(--menu-danger);
      }
      .menu-dropdown {
        background: var(--menu-surface);
        border: 1px solid var(--menu-border);
        color: var(--menu-text);
      }
    `,
  ],
})
export class BusinessListComponent {
  @Input() businesses: Business[] = [];
  @Output() view = new EventEmitter<Business>();
  @Output() edit = new EventEmitter<Business>();
  @Output() delete = new EventEmitter<Business>();
  @Output() promote = new EventEmitter<Business>();

  readonly openMenuId = signal<string | null>(null);

  toggleMenu(id: string | undefined): void {
    if (!id) return;
    this.openMenuId.update(current => (current === id ? null : id));
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  onAction(action: 'view' | 'edit' | 'delete' | 'promote', business: Business): void {
    this.closeMenu();
    if (action === 'view') this.view.emit(business);
    else if (action === 'edit') this.edit.emit(business);
    else if (action === 'delete') this.delete.emit(business);
    else if (action === 'promote') this.promote.emit(business);
  }
}
