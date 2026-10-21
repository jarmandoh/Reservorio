import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface HomeFilters {
  category: string;
  location: string;
}

const EMPTY_FILTERS: HomeFilters = {
  category: 'Todos',
  location: '',
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
          <h2>Encuentra el negocio que necesitas</h2>
        </div>
        <button
          type="button"
          class="mobile-toggle"
          [attr.aria-expanded]="filtersExpanded()"
          aria-controls="business-filter-content"
          (click)="filtersExpanded.update(expanded => !expanded)"
        >
          <span>Filtros</span>
          <span class="material-icons-round" aria-hidden="true">expand_more</span>
        </button>
      </div>

      <div id="business-filter-content" class="filter-content" [class.filter-content-collapsed]="!filtersExpanded()">
        <label class="filter-field search-field" for="business-search">
          <span class="field-label">Buscar negocios</span>
          <span class="input-wrap">
            <span class="material-icons-round" aria-hidden="true">search</span>
            <input
              id="business-search"
              name="business-search"
              class="filter-control"
              type="search"
              autocomplete="off"
              placeholder="Ej. barbería o masaje…"
              [ngModel]="searchQuery"
              (ngModelChange)="searchQueryChange.emit($event)"
              aria-label="Buscar negocios"
            />
          </span>
        </label>

        <div class="filter-controls">
        <label class="filter-field location-field">
          <span class="field-label">Ubicación</span>
          <span class="input-wrap">
            <span class="material-icons-round" aria-hidden="true">location_on</span>
            <input
              name="business-location"
              class="filter-control"
              type="search"
              autocomplete="off"
              placeholder="Ej. Chapinero o Bogotá…"
              [ngModel]="filters.location"
              (ngModelChange)="update({ location: $event })"
              aria-label="Filtrar por ubicación"
            />
          </span>
        </label>

        <label class="filter-field">
          <span class="field-label">Categoría</span>
          <span class="autocomplete-wrap">
            <span class="material-icons-round autocomplete-icon" aria-hidden="true">category</span>
            <input
              id="business-category"
              name="business-category"
              class="filter-control"
              type="search"
              autocomplete="off"
              placeholder="Todas las categorías"
              [ngModel]="categoryQuery()"
              (ngModelChange)="onCategoryInput($event)"
              (focus)="categoryOpen.set(true)"
              (blur)="closeCategorySuggestions()"
              (keydown)="onCategoryKeydown($event)"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="business-category-suggestions"
              [attr.aria-expanded]="categoryOpen()"
              [attr.aria-activedescendant]="activeCategoryId()"
              aria-label="Filtrar por categoría"
            />
            @if (categoryOpen()) {
              <div id="business-category-suggestions" class="autocomplete-menu" role="listbox">
                @for (category of categorySuggestions(); track category; let index = $index) {
                  <button
                    type="button"
                    class="autocomplete-option"
                    [class.autocomplete-option-active]="activeCategoryIndex() === index"
                    [id]="categoryOptionId(index)"
                    role="option"
                    [attr.aria-selected]="filters.category === category"
                    (mousedown)="$event.preventDefault()"
                    (click)="selectCategory(category)"
                  >
                    <span>{{ category }}</span>
                    @if (filters.category === category) {
                      <span class="material-icons-round" aria-hidden="true">check</span>
                    }
                  </button>
                } @empty {
                  <span class="autocomplete-empty">No encontramos categorías.</span>
                }
              </div>
            }
          </span>
        </label>

        </div>
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
          <button type="button" class="clear-button" (click)="clearFilters()">
            <span class="material-icons-round" aria-hidden="true">restart_alt</span>
            Limpiar filtros
          </button>
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        --filter-surface: #ffffff;
        --filter-control: #ffffff;
        --filter-border: #e2e8f0;
        --filter-muted: #64748b;
        --filter-text: #181c20;
        --filter-hover: #eff6ff;
        --filter-chip-bg: #f1f7ff;
        --filter-chip-border: #dbeafe;
        --filter-chip-text: #174a7e;
      }
      :host-context(.dark) {
        --filter-surface: #1a222d;
        --filter-control: #111821;
        --filter-border: #34404e;
        --filter-muted: #aab5c3;
        --filter-text: #e6e9ee;
        --filter-hover: #26384c;
        --filter-chip-bg: #203349;
        --filter-chip-border: #36516d;
        --filter-chip-text: #d5e8fa;
        color-scheme: dark;
      }
      .filter-panel {
        padding: 1.125rem;
        background: var(--filter-surface);
        border: 1px solid var(--filter-border);
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
      .mobile-toggle {
        display: none;
        align-items: center;
        gap: 0.25rem;
        padding: 0.5rem 0.65rem;
        border: 1px solid var(--filter-border);
        border-radius: 0.625rem;
        color: var(--filter-text);
        background: var(--filter-control);
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
      }
      .mobile-toggle .material-icons-round {
        transition: transform 160ms ease;
      }
      .mobile-toggle[aria-expanded='true'] .material-icons-round {
        transform: rotate(180deg);
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
        color: var(--filter-text);
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
        background: var(--filter-hover);
      }
      .clear-button:disabled {
        color: var(--filter-muted);
        cursor: default;
      }
      .clear-button .material-icons-round {
        font-size: 1.1rem;
      }
      .filter-controls {
        display: grid;
        grid-template-columns: repeat(2, minmax(180px, 1fr));
        align-items: end;
        gap: 0.65rem;
      }
      .search-field {
        margin-bottom: 0.8rem;
      }
      .filter-field {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 0.4rem;
      }
      .field-label {
        color: var(--filter-muted);
        font-size: 0.7rem;
        font-weight: 600;
      }
      .input-wrap,
      .select-wrap,
      .autocomplete-wrap {
        position: relative;
        display: flex;
        align-items: center;
        min-width: 0;
        height: 42px;
        border: 1px solid var(--filter-border);
        border-radius: 0.625rem;
        background: var(--filter-control);
      }
      .input-wrap:focus-within,
      .select-wrap:focus-within,
      .autocomplete-wrap:focus-within {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(0, 91, 191, 0.14);
      }
      .input-wrap > .material-icons-round {
        margin-left: 0.7rem;
        color: var(--filter-muted);
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
        color: var(--filter-text);
        background: transparent;
        font: inherit;
        font-size: 0.78rem;
      }
      .filter-control:focus,
      .filter-control:focus-visible {
        outline: none !important;
        border: 0;
        border-radius: 0;
        box-shadow: none !important;
      }
      .input-wrap input {
        padding-left: 0.4rem;
      }
      .autocomplete-icon {
        position: absolute;
        left: 0.7rem;
        color: var(--filter-muted);
        font-size: 1.05rem;
        pointer-events: none;
      }
      .autocomplete-wrap input {
        padding-left: 2.25rem;
      }
      .autocomplete-menu {
        position: absolute;
        z-index: 20;
        display: block;
        top: calc(100% + 0.35rem);
        right: 0;
        left: 0;
        max-height: 16rem;
        overflow-y: auto;
        padding: 0.35rem;
        border: 1px solid var(--filter-border);
        border-radius: 0.75rem;
        background: var(--filter-surface);
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
      }
      .autocomplete-option {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.65rem 0.75rem;
        border: 0;
        border-radius: 0.5rem;
        color: var(--filter-text);
        background: transparent;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .autocomplete-option:hover,
      .autocomplete-option-active,
      .autocomplete-option:focus-visible {
        outline: none;
        color: var(--color-primary);
        background: var(--filter-hover);
      }
      .autocomplete-option .material-icons-round {
        font-size: 1rem;
      }
      .autocomplete-empty {
        display: block;
        padding: 0.75rem;
        color: var(--filter-muted);
        font-size: 0.8rem;
      }
      .autocomplete-empty {
        display: block;
        padding: 0.75rem;
        color: var(--filter-muted);
        font-size: 0.8rem;
      }
      select {
        appearance: none;
        padding-right: 1.9rem;
        cursor: pointer;
      }
      select.filter-control option {
        color: var(--filter-text);
        background: var(--filter-control);
      }
      :host-context(.dark) select.filter-control {
        color-scheme: dark;
      }
      .select-wrap > .material-icons-round {
        position: absolute;
        right: 0.5rem;
        color: var(--filter-muted);
        font-size: 1.1rem;
        pointer-events: none;
      }
      .applied-filters {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.45rem;
        margin-top: 0.85rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--filter-border);
      }
      .applied-label {
        margin-right: 0.15rem;
        color: var(--filter-muted);
        font-size: 0.7rem;
        font-weight: 600;
      }
      .filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.3rem 0.55rem;
        border: 1px solid var(--filter-chip-border);
        border-radius: 999px;
        color: var(--filter-chip-text);
        background: var(--filter-chip-bg);
        font-size: 0.7rem;
        font-weight: 600;
      }
      .filter-chip .material-icons-round {
        font-size: 0.85rem;
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
        .clear-button { font-size: 0.72rem; }
        .clear-button .material-icons-round { font-size: 1rem; }
      }
      @media (max-width: 640px) {
        .filter-heading {
          margin-bottom: 0;
        }
        .mobile-toggle {
          display: inline-flex;
        }
        .filter-content {
          max-height: 32rem;
          overflow: visible;
          margin-top: 1rem;
          opacity: 1;
          transition: max-height 220ms ease, margin-top 220ms ease, opacity 160ms ease;
        }
        input[type='search'],
        select {
          font-size: 1rem;
        }
        .filter-content-collapsed {
          max-height: 0;
          overflow: hidden;
          margin-top: 0;
          opacity: 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .filter-content,
        .mobile-toggle .material-icons-round {
          transition: none;
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
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() clearAll = new EventEmitter<void>();
  readonly filtersExpanded = signal(false);
  readonly categoryQuery = signal('');
  readonly categoryOpen = signal(false);
  readonly activeCategoryIndex = signal(-1);

  onCategoryInput(value: string): void {
    this.categoryQuery.set(value);
    this.categoryOpen.set(true);
    this.activeCategoryIndex.set(-1);
    const category = this.categories.find(item => this.normalizeCategory(item) === this.normalizeCategory(value));
    this.update({ category: category ?? 'Todos' });
  }

  categorySuggestions(): string[] {
    const query = this.normalizeCategory(this.categoryQuery());
    return this.categories.filter(category => !query || this.normalizeCategory(category).includes(query));
  }

  onCategoryKeydown(event: KeyboardEvent): void {
    const suggestions = this.categorySuggestions();
    if (event.key === 'Escape') {
      this.categoryOpen.set(false);
      return;
    }
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      this.activeCategoryIndex.update(index => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      this.activeCategoryIndex.update(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && this.activeCategoryIndex() >= 0) {
      event.preventDefault();
      this.selectCategory(suggestions[this.activeCategoryIndex()]);
    }
  }

  selectCategory(category: string): void {
    this.categoryQuery.set(category === 'Todos' ? '' : category);
    this.categoryOpen.set(false);
    this.activeCategoryIndex.set(-1);
    this.update({ category });
  }

  categoryOptionId(index: number): string {
    return `business-category-option-${index}`;
  }

  activeCategoryId(): string | null {
    return this.activeCategoryIndex() >= 0 ? this.categoryOptionId(this.activeCategoryIndex()) : null;
  }

  closeCategorySuggestions(): void {
    setTimeout(() => this.categoryOpen.set(false), 100);
  }

  get hasFilters(): boolean {
    return (
      !!this.searchQuery ||
      this.filters.category !== 'Todos' ||
      !!this.filters.location
    );
  }

  update(patch: Partial<HomeFilters>): void {
    this.filtersChange.emit({ ...this.filters, ...patch });
  }

  clearFilters(): void {
    this.categoryQuery.set('');
    this.categoryOpen.set(false);
    this.activeCategoryIndex.set(-1);
    this.clearAll.emit();
    this.filtersChange.emit({ ...EMPTY_FILTERS });
  }

  private normalizeCategory(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}
