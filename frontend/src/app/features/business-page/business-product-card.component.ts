import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CatalogProduct } from '../../core/models/catalog.model';
import { DEFAULT_CURRENCY, formatCurrency } from '../../core/config/currency';

@Component({
  selector: 'app-business-product-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="product-card group">
      <div class="product-image-wrap">
        @if (product.imageUrl) {
          <img [src]="product.imageUrl" [alt]="product.name" width="640" height="640" loading="lazy" />
        } @else {
          <span class="material-icons-round product-placeholder" aria-hidden="true">inventory_2</span>
        }
        @if (product.category) {
          <span class="product-category">{{ product.category }}</span>
        }
      </div>
      <div class="product-content">
        <div>
          <h3>{{ product.name }}</h3>
          @if (product.description) {
            <p>{{ product.description }}</p>
          }
        </div>
        <div class="product-footer">
          <strong>{{ formatCurrency(product.price, currency) }}</strong>
          @if (contactUrl) {
            <a
              [href]="contactUrl"
              target="_blank"
              rel="noopener noreferrer"
              [attr.aria-label]="'Consultar por ' + product.name"
            >
              Consultar <span class="material-icons-round" aria-hidden="true">arrow_outward</span>
            </a>
          }
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
        --card-surface: #ffffff;
        --card-canvas: #f1f5f9;
        --card-ink: #172033;
        --card-muted: #667085;
        --card-border: #e8edf2;
        font-family: 'Inter', system-ui, sans-serif;
      }
      :host-context(.dark) {
        --card-surface: #1a222d;
        --card-canvas: #202a36;
        --card-ink: #e6e9ee;
        --card-muted: #b8bfc9;
        --card-border: #34404e;
      }
      .product-card {
        display: flex;
        height: 100%;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid var(--card-border);
        border-radius: 1.1rem;
        background: var(--card-surface);
        transition:
          transform 0.24s ease,
          box-shadow 0.24s ease;
      }
      .product-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 14px 34px rgba(18, 38, 63, 0.1);
      }
      .product-image-wrap {
        position: relative;
        display: grid;
        min-height: 12rem;
        aspect-ratio: 4/3;
        place-items: center;
        overflow: hidden;
        background: var(--card-canvas);
      }
      .product-image-wrap img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.5s ease;
      }
      .product-card:hover .product-image-wrap img {
        transform: scale(1.04);
      }
      .product-placeholder {
        color: #94a3b8;
        font-size: 3rem;
      }
      .product-category {
        position: absolute;
        left: 0.75rem;
        bottom: 0.75rem;
        padding: 0.35rem 0.6rem;
        border: 1px solid rgba(255, 255, 255, 0.65);
        border-radius: 999px;
        color: #26364b;
        background: rgba(255, 255, 255, 0.88);
        font-size: 0.68rem;
        font-weight: 700;
        backdrop-filter: blur(8px);
      }
      .product-content {
        display: flex;
        min-height: 9rem;
        flex: 1;
        flex-direction: column;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem;
      }
      h3 {
        margin: 0;
        color: var(--card-ink);
        font-family: 'Manrope', 'Inter', system-ui, sans-serif;
        font-size: 1rem;
        font-weight: 700;
      }
      p {
        display: -webkit-box;
        margin: 0.4rem 0 0;
        overflow: hidden;
        color: var(--card-muted);
        font-size: 0.8rem;
        line-height: 1.5;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
      }
      .product-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }
      .product-footer strong {
        color: var(--card-ink);
        font-size: 1rem;
      }
      .product-footer a {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        color: var(--color-primary);
        font-size: 0.75rem;
        font-weight: 700;
        text-decoration: none;
      }
      .product-footer a .material-icons-round {
        font-size: 0.95rem;
      }
      @media (prefers-reduced-motion: reduce) {
        .product-card,
        .product-image-wrap img {
          transition-duration: 0.01ms;
        }
      }
    `,
  ],
})
export class BusinessProductCardComponent {
  @Input({ required: true }) product!: CatalogProduct;
  @Input() contactUrl: string | null = null;
  readonly currency = DEFAULT_CURRENCY;
  readonly formatCurrency = formatCurrency;
}
