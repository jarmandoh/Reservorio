import { Component, DestroyRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Customer } from '../../core/models/reservation.model';
import { CustomerSidebarComponent } from './components/customer-sidebar.component';

@Component({
  selector: 'app-customer-shell',
  standalone: true,
  imports: [RouterOutlet, CustomerSidebarComponent],
  template: `
    <div class="min-h-screen bg-surface">
      <!-- Enlace accesible para saltar directo al contenido principal con teclado -->
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-primary focus:text-white focus:font-semibold focus:rounded-xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-white"
      >
        Saltar al contenido principal
      </a>

      <!-- Header móvil con botón para menú hamburguesa (touch target >= 44px) -->
      <header
        class="lg:hidden sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-outline-variant/30 px-4 py-2.5 flex items-center justify-between"
      >
        <div class="flex items-center gap-2.5">
          <span
            class="grid place-items-center h-9 w-9 rounded-xl bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <span class="material-icons-round text-xl">person</span>
          </span>
          <div>
            <span class="font-display font-bold text-base text-on-surface block leading-tight">Mi panel</span>
            <span class="text-[11px] text-on-surface-variant block">Miveci Cliente</span>
          </div>
        </div>
        <button
          class="btn-tertiary min-h-[44px] min-w-[44px] p-2 inline-flex items-center justify-center rounded-xl"
          type="button"
          (click)="mobileMenuOpen.set(true)"
          [attr.aria-expanded]="mobileMenuOpen()"
          aria-controls="mobile-nav-drawer"
          aria-label="Abrir menú de navegación"
        >
          <span class="material-icons-round text-xl" aria-hidden="true">menu</span>
        </button>
      </header>

      <!-- Menú lateral móvil (Drawer accesible con cierre en Escape y Backdrop) -->
      <div
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        class="lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ease-out"
        [class.opacity-100]="mobileMenuOpen()"
        [class.opacity-0]="!mobileMenuOpen()"
        [class.pointer-events-none]="!mobileMenuOpen()"
        [class.bg-black/60]="mobileMenuOpen()"
        (click)="mobileMenuOpen.set(false)"
      >
        <div
          class="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-surface p-5 overflow-y-auto shadow-2xl transition-transform duration-300 ease-out flex flex-col justify-between"
          [class.translate-x-0]="mobileMenuOpen()"
          [class.-translate-x-full]="!mobileMenuOpen()"
          (click)="$event.stopPropagation()"
        >
          <div>
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-outline-variant/30">
              <div class="flex items-center gap-2">
                <span class="material-icons-round text-primary text-xl" aria-hidden="true">dashboard</span>
                <span class="font-display font-bold text-lg text-on-surface">Navegación</span>
              </div>
              <button
                class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-low transition-colors"
                type="button"
                (click)="mobileMenuOpen.set(false)"
                aria-label="Cerrar menú de navegación"
              >
                <span class="material-icons-round text-xl" aria-hidden="true">close</span>
              </button>
            </div>
            <app-customer-sidebar
              [customer]="customer()"
              (logout)="logout()"
              (navigated)="mobileMenuOpen.set(false)"
            />
          </div>
        </div>
      </div>

      <!-- Layout de escritorio: sidebar estático a la izquierda + contenido animado -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside class="hidden lg:block customer-sidebar-aside" aria-label="Menú principal de cliente">
          <div class="sticky top-6">
            <app-customer-sidebar [customer]="customer()" (logout)="logout()" />
          </div>
        </aside>

        <!-- Contenedor de contenido: SOLO este bloque se anima al navegar entre rutas hijas -->
        <main id="main-content" role="main" tabindex="-1" class="min-w-0 customer-content-main outline-none">
          <div [class.customer-content-anim]="animTrigger()">
            <router-outlet (activate)="onOutletActivate()" />
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .customer-sidebar-aside {
        view-transition-name: customer-sidebar;
      }

      .customer-content-main {
        view-transition-name: customer-content;
      }

      .customer-content-anim {
        animation: customerContentEnter 200ms cubic-bezier(0.16, 1, 0.3, 1) both;
        will-change: opacity, transform;
      }

      @keyframes customerContentEnter {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .customer-content-anim {
          animation: none !important;
        }
      }
    `,
  ],
})
export class CustomerShellComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly customer = signal<Customer | null>(null);
  readonly mobileMenuOpen = signal(false);
  readonly animTrigger = signal(true);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mobileMenuOpen()) {
      this.mobileMenuOpen.set(false);
    }
  }

  ngOnInit(): void {
    const token = this.auth.getCustomerToken();
    if (!token) {
      this.auth.clearCustomerToken();
      void this.router.navigate(['/usuario/auth']);
      return;
    }

    this.api
      .getCustomerMe(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: customer => this.customer.set(customer),
        error: () => {
          this.auth.clearCustomerToken();
          void this.router.navigate(['/usuario/auth']);
        },
      });
  }

  onOutletActivate(): void {
    this.animTrigger.set(false);
    requestAnimationFrame(() => {
      this.animTrigger.set(true);
    });
  }

  logout(): void {
    this.auth.clearCustomerToken();
    void this.router.navigate(['/']);
  }
}
