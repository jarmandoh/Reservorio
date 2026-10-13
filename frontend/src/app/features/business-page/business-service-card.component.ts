import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DEFAULT_CURRENCY, formatCurrency } from '../../core/config/currency';

export interface BusinessServiceItem {
  name: string;
  description?: string;
  price?: number;
  durationMinutes?: number;
  requiresBooking: boolean;
}

@Component({
  selector: 'app-business-service-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="service-card">
      <div class="service-icon" aria-hidden="true">
        <span class="material-icons-round">{{ service.requiresBooking ? 'event_available' : 'handshake' }}</span>
      </div>
      <div class="service-main">
        <div class="service-title-row">
          <h3>{{ service.name }}</h3>
          @if (service.requiresBooking) {
            <span class="service-status"><span class="status-dot"></span>Con agenda</span>
          } @else {
            <span class="service-status service-status-consult">Consulta directa</span>
          }
        </div>
        @if (service.description) {
          <p>{{ service.description }}</p>
        }
        <div class="service-meta">
          @if (service.durationMinutes) {
            <span
              ><span class="material-icons-round" aria-hidden="true">schedule</span
              >{{ service.durationMinutes }} min</span
            >
          }
          @if (service.price != null) {
            <span
              ><span class="material-icons-round" aria-hidden="true">payments</span
              >{{ formatCurrency(service.price, currency) }}</span
            >
          }
        </div>
      </div>
      @if (service.requiresBooking) {
        <button
          type="button"
          class="service-action"
          (click)="schedule.emit(service.name)"
          [attr.aria-label]="'Agendar ' + service.name"
        >
          Agendar <span class="material-icons-round" aria-hidden="true">arrow_forward</span>
        </button>
      } @else if (contactUrl) {
        <a class="service-action service-contact" [href]="contactUrl" target="_blank" rel="noopener noreferrer">
          Consultar <span class="material-icons-round" aria-hidden="true">arrow_outward</span>
        </a>
      }
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
        --card-surface: #ffffff;
        --card-ink: #172033;
        --card-muted: #667085;
        --card-border: #e7edf2;
        --card-accent-soft: #edf6ff;
        font-family: 'Inter', system-ui, sans-serif;
      }
      :host-context(.dark) {
        --card-surface: #1a222d;
        --card-ink: #e6e9ee;
        --card-muted: #b8bfc9;
        --card-border: #34404e;
        --card-accent-soft: #1b2c42;
      }
      .service-card {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        padding: 1rem;
        border: 1px solid var(--card-border);
        border-radius: 1rem;
        background: var(--card-surface);
        transition:
          border-color 0.2s,
          transform 0.2s,
          box-shadow 0.2s;
      }
      .service-card:hover {
        transform: translateY(-2px);
        border-color: #6b8fb7;
        box-shadow: 0 8px 22px rgba(18, 38, 63, 0.06);
      }
      .service-icon {
        display: grid;
        width: 2.8rem;
        height: 2.8rem;
        flex: 0 0 auto;
        place-items: center;
        border-radius: 0.9rem;
        color: #1768a9;
        background: var(--card-accent-soft);
      }
      .service-icon .material-icons-round {
        font-size: 1.35rem;
      }
      .service-main {
        min-width: 0;
        flex: 1;
      }
      .service-title-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
      }
      h3 {
        margin: 0;
        color: var(--card-ink);
        font-family: 'Manrope', 'Inter', system-ui, sans-serif;
        font-size: 0.9rem;
        font-weight: 700;
      }
      p {
        margin: 0.3rem 0 0;
        color: var(--card-muted);
        font-size: 0.75rem;
        line-height: 1.45;
      }
      .service-status {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        color: #28704a;
        font-size: 0.65rem;
        font-weight: 700;
      }
      .service-status-consult {
        color: var(--card-muted);
      }
      .status-dot {
        width: 0.4rem;
        height: 0.4rem;
        border-radius: 50%;
        background: #22a565;
      }
      .service-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.8rem;
        margin-top: 0.45rem;
        color: var(--card-muted);
        font-size: 0.68rem;
      }
      .service-meta > span {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
      }
      .service-meta .material-icons-round {
        font-size: 0.85rem;
      }
      .service-action {
        display: inline-flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        padding: 0.62rem 0.75rem;
        border: 0;
        border-radius: 0.7rem;
        color: white;
        background: var(--color-primary);
        font: inherit;
        font-size: 0.72rem;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
        transition:
          background 0.2s,
          transform 0.2s;
      }
      .service-action:hover {
        background: #064a91;
        transform: translateY(-1px);
      }
      .service-action .material-icons-round {
        font-size: 0.95rem;
      }
      .service-contact {
        color: #155b93;
        background: var(--card-accent-soft);
      }
      .service-contact:hover {
        color: #0b4577;
        background: #c7e3ff;
      }
      @media (max-width: 540px) {
        .service-card {
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .service-icon {
          width: 2.4rem;
          height: 2.4rem;
        }
        .service-main {
          flex-basis: calc(100% - 3.5rem);
        }
        .service-action {
          margin-left: auto;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .service-card,
        .service-action {
          transition-duration: 0.01ms;
        }
      }
    `,
  ],
})
export class BusinessServiceCardComponent {
  @Input({ required: true }) service!: BusinessServiceItem;
  @Input() contactUrl: string | null = null;
  @Output() schedule = new EventEmitter<string>();
  readonly currency = DEFAULT_CURRENCY;
  readonly formatCurrency = formatCurrency;
}
