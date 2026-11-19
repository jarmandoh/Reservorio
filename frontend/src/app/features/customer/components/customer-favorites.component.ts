import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

interface FavoriteItem {
  id: string;
  businessName: string;
  url?: string;
  category?: string;
}

@Component({
  selector: 'app-customer-favorites',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="space-y-6">
      <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 class="font-display text-2xl sm:text-3xl font-bold tracking-tight">Favoritos</h1>
          <p class="text-sm text-on-surface-variant">Negocios guardados para acceder y reservar en un clic.</p>
        </div>
        @if (favorites().length > 0) {
          <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-xs font-semibold text-on-surface-variant self-start sm:self-auto">
            <span class="material-icons-round text-primary text-sm" aria-hidden="true">favorite</span>
            <span>{{ favorites().length }} guardado{{ favorites().length === 1 ? '' : 's' }}</span>
          </div>
        }
      </header>

      @if (favorites().length === 0) {
        <section class="card p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div class="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span class="material-icons-round text-3xl" aria-hidden="true">favorite_border</span>
          </div>
          <div class="space-y-1.5 max-w-md">
            <h2 class="font-display text-lg font-bold text-on-surface">Aún no tienes favoritos</h2>
            <p class="text-sm text-on-surface-variant">
              Guarda tus salones, barberías o profesionales favoritos para reservar citas más rápido y llevar un seguimiento directo.
            </p>
          </div>
          <a
            routerLink="/"
            class="btn-primary min-h-[44px] px-5 py-2.5 rounded-xl inline-flex items-center gap-2 font-medium shadow-sm transition-all hover:shadow"
          >
            <span class="material-icons-round text-lg" aria-hidden="true">storefront</span>
            Explorar negocios
          </a>
        </section>
      } @else {
        <section class="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Lista de negocios favoritos">
          @for (fav of favorites(); track fav.id) {
            <article class="card p-5 flex flex-col justify-between gap-4 border border-outline/10 hover:border-outline/25 transition-all duration-200">
              <div class="flex items-start gap-3.5 min-w-0">
                <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-base shrink-0">
                  {{ getInitials(fav.businessName) }}
                </div>
                <div class="min-w-0 flex-1 space-y-1">
                  <h2 class="font-display font-semibold text-base text-on-surface truncate" [title]="fav.businessName">
                    {{ fav.businessName }}
                  </h2>
                  @if (fav.category) {
                    <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                      <span class="material-icons-round text-xs" aria-hidden="true">label</span>
                      {{ fav.category }}
                    </span>
                  }
                </div>
              </div>

              <div class="flex items-center justify-between gap-2 pt-3 border-t border-outline/10">
                <a
                  [routerLink]="fav.url || '/'"
                  class="btn-primary min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 flex-1 justify-center"
                  [attr.aria-label]="'Abrir y agendar en ' + fav.businessName"
                >
                  <span class="material-icons-round text-base" aria-hidden="true">calendar_today</span>
                  Reservar
                </a>
                <button
                  type="button"
                  (click)="remove(fav)"
                  class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-on-surface-variant hover:text-error hover:bg-error/10 inline-flex items-center justify-center gap-1 transition-colors"
                  [attr.aria-label]="'Quitar ' + fav.businessName + ' de favoritos'"
                  title="Quitar de favoritos"
                >
                  <span class="material-icons-round text-lg text-error" aria-hidden="true">favorite</span>
                  <span class="hidden sm:inline">Quitar</span>
                </button>
              </div>
            </article>
          }
        </section>
      }
    </div>
  `,
})
export class CustomerFavoritesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly favorites = signal<FavoriteItem[]>([]);

  ngOnInit(): void {
    this.favorites.set(this.readFavorites());
  }

  getInitials(name: string): string {
    return (name || '')
      .trim()
      .split(/\s+/)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'NB';
  }

  remove(item: FavoriteItem): void {
    const next = this.favorites().filter(fav => fav.id !== item.id);
    this.favorites.set(next);
    this.writeFavorites(next);
    this.toast.success(`"${item.businessName}" se quitó de tus favoritos.`);
  }

  private storageKey(): string {
    const id = (this.auth.getCustomerPayload()?.customerId as string | undefined) ?? 'me';
    return `customer:${id}:favorites`;
  }

  private readFavorites(): FavoriteItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey());
      return raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
    } catch {
      return [];
    }
  }

  private writeFavorites(items: FavoriteItem[]): void {
    localStorage.setItem(this.storageKey(), JSON.stringify(items));
  }
}
