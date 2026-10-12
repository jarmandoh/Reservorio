import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type BusinessOpenState = 'any' | 'open' | 'closed';

export interface HomeFilters {
  category: string;
  location: string;
  minimumRating: number;
  bookableOnly: boolean;
  openState: BusinessOpenState;
}

const EMPTY_FILTERS: HomeFilters = {
  category: 'Todos',
  location: '',
  minimumRating: 0,
  bookableOnly: false,
  openState: 'any',
};

@Component({
  selector: 'app-category-filters',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="filter-panel" aria-label="Filtros de negocios">
      <div class="filter-heading">
        <div>
          <p class="filter-eyebrow">Encuentra tu próxima reserva</p>
          <h2>Explora negocios</h2>
        </div>
        <button type="button" class="clear-button" [disabled]="!hasFilters" (click)="clearFilters()">
          <span class="material-icons-round" aria-hidden="true">restart_alt</span>
          Limpiar filtros
        </button>
      </div>

      <div class="filter-controls">
        <label class="filter-field location-field">
          <span class="field-label">Ubicación</span>
          <span class="input-wrap">
            <span class="material-icons-round" aria-hidden="true">location_on</span>
            <input
              type="search"
              placeholder="Ciudad, barrio o zona"
              [ngModel]="filters.location"
              (ngModelChange)="update({ location: $event })"
              aria-label="Filtrar por ubicación"
            />
          </span>
        </label>

        <label class="filter-field">
          <span class="field-label">Categoría</span>
          <span class="select-wrap">
            <select
              [ngModel]="filters.category"
              (ngModelChange)="update({ category: $event })"
              aria-label="Filtrar por categoría"
            >
              @for (category of categories; track category) {
                <option [value]="category">{{ category }}</option>
              }
            </select>
            <span class="material-icons-round" aria-hidden="true">expand_more</span>
          </span>
        </label>

        <label class="filter-field">
          <span class="field-label">Calificación</span>
          <span class="select-wrap">
            <select
              [ngModel]="filters.minimumRating"
              (ngModelChange)="update({ minimumRating: +$event })"
              aria-label="Calificación mínima"
            >
              <option [ngValue]="0">Cualquier calificación</option>
              <option [ngValue]="3">3+ estrellas</option>
              <option [ngValue]="4">4+ estrellas</option>
              <option [ngValue]="4.5">4.5+ estrellas</option>
            </select>
            <span class="material-icons-round" aria-hidden="true">expand_more</span>
          </span>
        </label>

        <label class="filter-field">
          <span class="field-label">Estado</span>
          <span class="select-wrap">
            <select
              [ngModel]="filters.openState"
              (ngModelChange)="update({ openState: $event })"
              aria-label="Filtrar por horario"
            >
              <option value="any">Cualquier horario</option>
              <option value="open">Abierto ahora</option>
              <option value="closed">Cerrado ahora</option>
            </select>
            <span class="material-icons-round" aria-hidden="true">expand_more</span>
          </span>
        </label>

        <label class="booking-toggle" [class.booking-toggle-active]="filters.bookableOnly">
          <input type="checkbox" [ngModel]="filters.bookableOnly" (ngModelChange)="update({ bookableOnly: $event })" />
          <span class="toggle-icon material-icons-round" aria-hidden="true">event_available</span>
          <span>Permite reservar</span>
        </label>
      </div>

      @if (hasFilters) {
        <div class="applied-filters" aria-live="polite">
          <span class="applied-label">Aplicados</span>
          @if (filters.category !== 'Todos') {
            <span class="filter-chip"
              ><span class="material-icons-round" aria-hidden="true">category</span>{{ filters.category }}</span
            >
          }
          @if (searchQuery) {
            <span class="filter-chip"
              ><span class="material-icons-round" aria-hidden="true">search</span>{{ searchQuery }}</span
            >
          }
          @if (filters.location) {
            <span class="filter-chip"
              ><span class="material-icons-round" aria-hidden="true">place</span>{{ filters.location }}</span
            >
          }
          @if (filters.minimumRating) {
            <span class="filter-chip"
              ><span class="material-icons-round" aria-hidden="true">star</span>{{ filters.minimumRating }}+
              estrellas</span
            >
          }
          @if (filters.bookableOnly) {
            <span class="filter-chip"
              ><span class="material-icons-round" aria-hidden="true">event_available</span>Permite reservar</span
            >
          }
          @if (filters.openState !== 'any') {
            <span class="filter-chip"
              ><span class="status-dot" [class.status-dot-open]="filters.openState === 'open'"></span
              >{{ filters.openState === 'open' ? 'Abierto ahora' : 'Cerrado ahora' }}</span
            >
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .filter-panel {
        padding: 1.125rem;
        background: var(--color-surface-lowest, #fff);
        border: 1px solid rgba(100, 116, 139, 0.16);
        border-radius: 1rem;
        box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
      }
      .filter-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .filter-eyebrow {
        margin: 0 0 0.25rem;
        color: var(--color-primary);
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.13em;
        text-transform: uppercase;
      }
      h2 {
        margin: 0;
        color: var(--color-on-surface);
        font-size: 1.125rem;
        font-weight: 700;
      }
      .clear-button {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.5rem 0.65rem;
        border: 0;
        border-radius: 0.625rem;
        color: var(--color-primary);
        background: transparent;
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
      }
      .clear-button:hover:not(:disabled) {
        background: #eff6ff;
      }
      .clear-button:disabled {
        color: #9ca3af;
        cursor: default;
      }
      .clear-button .material-icons-round {
        font-size: 1.1rem;
      }
      .filter-controls {
        display: grid;
        grid-template-columns: minmax(180px, 1.4fr) repeat(3, minmax(145px, 1fr)) auto;
        align-items: end;
        gap: 0.65rem;
      }
      .filter-field {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 0.4rem;
      }
      .field-label {
        color: #64748b;
        font-size: 0.7rem;
        font-weight: 600;
      }
      .input-wrap,
      .select-wrap {
        position: relative;
        display: flex;
        align-items: center;
        min-width: 0;
        height: 42px;
        border: 1px solid #e2e8f0;
        border-radius: 0.625rem;
        background: #fff;
      }
      .input-wrap:focus-within,
      .select-wrap:focus-within {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(0, 91, 191, 0.1);
      }
      .input-wrap > .material-icons-round {
        margin-left: 0.7rem;
        color: #64748b;
        font-size: 1.05rem;
      }
      input[type='search'],
      select {
        width: 100%;
        min-width: 0;
        height: 100%;
        padding: 0 0.65rem;
        border: 0;
        outline: 0;
        color: var(--color-on-surface, #181c20);
        background: transparent;
        font: inherit;
        font-size: 0.78rem;
      }
      .input-wrap input {
        padding-left: 0.4rem;
      }
      select {
        appearance: none;
        padding-right: 1.9rem;
        cursor: pointer;
      }
      .select-wrap > .material-icons-round {
        position: absolute;
        right: 0.5rem;
        color: #64748b;
        font-size: 1.1rem;
        pointer-events: none;
      }
      .booking-toggle {
        display: flex;
        height: 42px;
        align-items: center;
        gap: 0.45rem;
        padding: 0 0.7rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.625rem;
        color: #475569;
        background: #fff;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
        cursor: pointer;
      }
      .booking-toggle input {
        width: 15px;
        height: 15px;
        accent-color: var(--color-primary);
      }
      .booking-toggle-active {
        border-color: rgba(0, 91, 191, 0.35);
        color: var(--color-primary);
        background: #eff6ff;
      }
      .toggle-icon {
        font-size: 1.05rem;
      }
      .applied-filters {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.45rem;
        margin-top: 0.85rem;
        padding-top: 0.75rem;
        border-top: 1px solid #eef2f6;
      }
      .applied-label {
        margin-right: 0.15rem;
        color: #64748b;
        font-size: 0.7rem;
        font-weight: 600;
      }
      .filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.3rem 0.55rem;
        border: 1px solid #dbeafe;
        border-radius: 999px;
        color: #174a7e;
        background: #f1f7ff;
        font-size: 0.7rem;
        font-weight: 600;
      }
      .filter-chip .material-icons-round {
        font-size: 0.85rem;
      }
      .status-dot {
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 50%;
        background: #f59e0b;
      }
      .status-dot-open {
        background: #16a34a;
      }
      @media (max-width: 900px) {
        .filter-controls {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .location-field {
          grid-column: span 2;
        }
      }
      @media (max-width: 480px) {
        .filter-panel {
          padding: 0.9rem;
        }
        .filter-controls {
          grid-template-columns: 1fr;
        }
        .location-field {
          grid-column: auto;
        }
        .booking-toggle {
          justify-content: flex-start;
        }
        .clear-button {
          font-size: 0;
        }
        .clear-button .material-icons-round {
          font-size: 1.2rem;
        }
      }
    `,
  ],
})
export class CategoryFiltersComponent {
  @Input() categories: string[] = ['Todos'];
  @Input() filters: HomeFilters = { ...EMPTY_FILTERS };
  @Input() searchQuery = '';
  @Output() filtersChange = new EventEmitter<HomeFilters>();
  @Output() clearAll = new EventEmitter<void>();

  get hasFilters(): boolean {
    return (
      !!this.searchQuery ||
      this.filters.category !== 'Todos' ||
      !!this.filters.location ||
      this.filters.minimumRating > 0 ||
      this.filters.bookableOnly ||
      this.filters.openState !== 'any'
    );
  }

  update(patch: Partial<HomeFilters>): void {
    this.filtersChange.emit({ ...this.filters, ...patch });
  }

  clearFilters(): void {
    this.clearAll.emit();
    this.filtersChange.emit({ ...EMPTY_FILTERS });
  }
}
