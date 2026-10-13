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
          <div>
            <p>RESERVA ONLINE</p>
            <h2 id="reservation-heading">Agenda tu servicio</h2>
          </div>
          <button #closeButton type="button" (click)="close.emit()" aria-label="Cerrar agendamiento">
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
        padding: 1rem;
        background: rgba(7, 15, 29, 0.72);
        backdrop-filter: blur(8px);
        animation: backdrop-in 0.2s ease-out both;
      }
      .reservation-dialog {
        position: relative;
        display: flex;
        width: min(100%, 760px);
        max-height: min(92dvh, 900px);
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 1.4rem;
        background: #0b1423;
        box-shadow: 0 28px 90px rgba(0, 0, 0, 0.45);
        animation: dialog-in 0.28s cubic-bezier(0.2, 0.75, 0.25, 1) both;
      }
      .reservation-dialog-heading {
        z-index: 2;
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.8rem 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        color: white;
        background: #101c30;
      }
      .reservation-dialog-heading p {
        margin: 0 0 0.15rem;
        color: #99c9f6;
        font-size: 0.6rem;
        font-weight: 700;
        letter-spacing: 0.16em;
      }
      .reservation-dialog-heading h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
      }
      .reservation-dialog-heading button {
        display: grid;
        width: 2.25rem;
        height: 2.25rem;
        flex: 0 0 auto;
        place-items: center;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 50%;
        color: white;
        background: rgba(255, 255, 255, 0.08);
        cursor: pointer;
      }
      .reservation-dialog-heading button:hover {
        background: rgba(255, 255, 255, 0.18);
      }
      app-booking {
        display: block;
        min-height: 0;
        overflow: auto;
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
          padding-top: max(0.8rem, env(safe-area-inset-top));
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
