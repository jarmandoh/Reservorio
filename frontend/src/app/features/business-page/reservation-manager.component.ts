import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { BookingComponent } from '../booking/booking.component';

@Component({
  selector: 'app-reservation-manager',
  standalone: true,
  imports: [BookingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="reservation-backdrop" role="presentation" (click)="close.emit()">
      <section
        class="reservation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-heading"
        #dialog
        (keydown)="handleDialogKeydown($event)"
        (click)="$event.stopPropagation()"
      >
        <div class="reservation-dialog-heading">
          <div class="reservation-heading-copy">
            <div class="reservation-kicker">
              <span class="material-icons-round" aria-hidden="true">calendar_month</span>
              <span>Reserva online</span>
              <span class="reservation-kicker-divider" aria-hidden="true"></span>
              <span class="reservation-kicker-secure">Confirmación al instante</span>
            </div>
            <h2 id="reservation-heading">Agenda tu servicio</h2>
            @if (serviceName) {
              <p class="reservation-selected-service">
                <span class="material-icons-round" aria-hidden="true">spa</span>
                {{ serviceName }}
              </p>
            } @else {
              <p class="reservation-heading-description">
                Elige un servicio y encuentra el horario que mejor te convenga.
              </p>
            }
          </div>
          <button #closeButton type="button" (click)="close.emit()" aria-label="Cerrar agendamiento" title="Cerrar">
            <span class="material-icons-round" aria-hidden="true">close</span>
          </button>
        </div>
        <app-booking [businessIdOverride]="businessId" [initialServiceName]="serviceName" [embedded]="true" />
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: block;
      }
      .reservation-backdrop {
        display: grid;
        height: 100%;
        place-items: center;
        padding: clamp(1rem, 3vw, 2rem);
        background:
          radial-gradient(circle at 18% 12%, rgba(46, 148, 255, 0.2), transparent 27rem), rgba(3, 12, 25, 0.76);
        backdrop-filter: blur(12px) saturate(125%);
        animation: backdrop-in 0.2s ease-out both;
      }
      .reservation-dialog {
        position: relative;
        display: flex;
        width: min(100%, 840px);
        max-height: min(92dvh, 900px);
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(184, 222, 255, 0.26);
        border-radius: 1.75rem;
        background: #081525;
        box-shadow:
          0 32px 100px rgba(0, 0, 0, 0.56),
          0 0 0 1px rgba(255, 255, 255, 0.04) inset;
        animation: dialog-in 0.28s cubic-bezier(0.2, 0.75, 0.25, 1) both;
      }
      .reservation-dialog::before {
        position: absolute;
        z-index: 0;
        top: -9rem;
        right: -7rem;
        width: 23rem;
        height: 23rem;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(48, 151, 255, 0.25), transparent 68%);
        content: '';
        pointer-events: none;
      }
      .reservation-dialog-heading {
        z-index: 2;
        display: flex;
        flex: 0 0 auto;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1.25rem;
        padding: 1.15rem 1.35rem 1.05rem;
        border-bottom: 1px solid rgba(182, 218, 255, 0.16);
        color: white;
        background: linear-gradient(115deg, rgba(11, 35, 63, 0.98), rgba(9, 25, 44, 0.91));
      }
      .reservation-heading-copy {
        min-width: 0;
      }
      .reservation-kicker {
        display: flex;
        align-items: center;
        gap: 0.38rem;
        margin: 0 0 0.45rem;
        color: #9fd1ff;
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .reservation-kicker .material-icons-round {
        font-size: 0.92rem;
      }
      .reservation-kicker-divider {
        width: 0.2rem;
        height: 0.2rem;
        border-radius: 50%;
        background: #5daeff;
      }
      .reservation-kicker-secure {
        color: rgba(225, 241, 255, 0.64);
        font-size: 0.58rem;
        letter-spacing: 0.08em;
      }
      .reservation-dialog-heading h2 {
        margin: 0;
        font-family: var(--font-display, inherit);
        font-size: clamp(1.2rem, 2.5vw, 1.5rem);
        font-weight: 750;
        letter-spacing: -0.025em;
        line-height: 1.15;
      }
      .reservation-heading-description,
      .reservation-selected-service {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin: 0.35rem 0 0;
        color: rgba(224, 239, 255, 0.72);
        font-size: 0.77rem;
        line-height: 1.35;
      }
      .reservation-selected-service {
        color: #b7ddff;
        font-weight: 600;
      }
      .reservation-selected-service .material-icons-round {
        font-size: 0.9rem;
      }
      .reservation-dialog-heading button {
        display: grid;
        width: 2.5rem;
        height: 2.5rem;
        flex: 0 0 auto;
        place-items: center;
        border: 1px solid rgba(198, 226, 255, 0.22);
        border-radius: 0.85rem;
        color: white;
        background: rgba(255, 255, 255, 0.09);
        cursor: pointer;
        transition:
          background 150ms ease,
          border-color 150ms ease,
          transform 150ms ease;
      }
      .reservation-dialog-heading button:hover {
        border-color: rgba(198, 226, 255, 0.48);
        background: rgba(255, 255, 255, 0.17);
        transform: translateY(-1px);
      }
      .reservation-dialog-heading button:focus-visible {
        outline: 3px solid rgba(125, 193, 255, 0.78);
        outline-offset: 3px;
      }
      app-booking {
        z-index: 1;
        display: block;
        min-height: 0;
        overflow: auto;
        background: linear-gradient(180deg, #f8fbff, #eff6ff);
      }
      @keyframes backdrop-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes dialog-in {
        from {
          opacity: 0;
          transform: translateY(18px) scale(0.985);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @media (max-width: 600px) {
        .reservation-backdrop {
          padding: 0;
          place-items: stretch;
        }
        .reservation-dialog {
          width: 100%;
          height: 100dvh;
          max-height: none;
          border-radius: 0;
        }
        .reservation-dialog-heading {
          padding: max(1rem, env(safe-area-inset-top)) 1rem 0.9rem;
        }
        .reservation-kicker-secure,
        .reservation-kicker-divider {
          display: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .reservation-backdrop,
        .reservation-dialog {
          animation-duration: 0.01ms !important;
        }
      }
    `,
  ],
})
export class ReservationManagerComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) businessId = '';
  @Input() serviceName = '';
  @Output() close = new EventEmitter<void>();
  @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('dialog') private dialog?: ElementRef<HTMLElement>;
  private previousFocus: HTMLElement | null = null;
  private previousBodyOverflow = '';

  ngAfterViewInit(): void {
    this.previousFocus = document.activeElement as HTMLElement | null;
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.closeButton?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.previousBodyOverflow;
    this.previousFocus?.focus();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  handleDialogKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const items = this.dialog?.nativeElement.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!items?.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
