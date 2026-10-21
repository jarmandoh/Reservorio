import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, signal } from '@angular/core';

export interface StatsBarItem {
  icon: string;
  value: string;
  label: string;
  detail?: string;
}

@Component({
  selector: 'app-stats-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="stats-bar"
      aria-label="Resumen de Resérvame"
      role="region"
      aria-roledescription="carrusel"
      (mouseenter)="pause()"
      (mouseleave)="resume()"
      (focusin)="pause()"
    >
      <div class="stats-viewport" aria-live="polite">
        <div class="stats-track" [style.transform]="'translate3d(-' + activeIndex() * 100 + '%, 0, 0)'">
          @for (stat of stats; track stat.label; let index = $index) {
            <div
              class="stats-slide"
              role="group"
              aria-roledescription="diapositiva"
              [attr.aria-label]="index + 1 + ' de ' + stats.length"
              [attr.aria-hidden]="activeIndex() !== index"
            >
              <span class="stats-icon material-icons-round" aria-hidden="true">{{ stat.icon }}</span>
              <span class="stats-copy">
                <strong>{{ stat.value }}</strong>
                <span>{{ stat.label }}</span>
                @if (stat.detail) {
                  <small>{{ stat.detail }}</small>
                }
              </span>
            </div>
          }
        </div>
      </div>

      @if (stats.length > 1) {
        <div class="stats-controls">
          <button type="button" class="stats-arrow" aria-label="Estadística anterior" (click)="previous()">
            <span class="material-icons-round" aria-hidden="true">chevron_left</span>
          </button>
          <div class="stats-dots" aria-label="Seleccionar estadística">
            @for (stat of stats; track stat.label; let index = $index) {
              <button
                type="button"
                class="stats-dot"
                [class.stats-dot-active]="activeIndex() === index"
                [attr.aria-label]="'Mostrar ' + stat.label"
                [attr.aria-current]="activeIndex() === index ? 'true' : null"
                (click)="goTo(index)"
              ></button>
            }
          </div>
          <button type="button" class="stats-arrow" aria-label="Siguiente estadística" (click)="next()">
            <span class="material-icons-round" aria-hidden="true">chevron_right</span>
          </button>
          <button
            type="button"
            class="stats-playback"
            [attr.aria-label]="isPaused() ? 'Reanudar carrusel' : 'Pausar carrusel'"
            (click)="togglePlayback()"
          >
            <span class="material-icons-round" aria-hidden="true">{{ isPaused() ? 'play_arrow' : 'pause' }}</span>
          </button>
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .stats-bar {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: min(100%, 34rem);
        min-height: 3.5rem;
        padding: 0.6rem 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 0.875rem;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(8px);
      }

      .stats-viewport {
        min-width: 0;
        flex: 1;
        overflow: hidden;
      }

      .stats-track {
        display: flex;
        transition: transform 360ms ease;
        will-change: transform;
      }

      .stats-slide {
        display: flex;
        min-width: 100%;
        align-items: center;
        gap: 0.65rem;
        color: #fff;
      }

      .stats-icon {
        display: grid;
        width: 2rem;
        height: 2rem;
        flex: 0 0 2rem;
        place-items: center;
        border-radius: 0.65rem;
        background: rgba(255, 255, 255, 0.16);
        font-size: 1.05rem;
      }

      .stats-copy {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 0.05rem;
      }

      .stats-copy strong {
        font-size: 1rem;
        font-variant-numeric: tabular-nums;
        line-height: 1.15;
      }

      .stats-copy span,
      .stats-copy small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .stats-copy span {
        font-size: 0.78rem;
        opacity: 0.9;
      }

      .stats-copy small {
        font-size: 0.68rem;
        opacity: 0.7;
      }

      .stats-controls {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .stats-arrow,
      .stats-playback {
        display: grid;
        width: 2.75rem;
        height: 2.75rem;
        flex: 0 0 2.75rem;
        place-items: center;
        border: 0;
        border-radius: 0.5rem;
        color: #fff;
        background: transparent;
        cursor: pointer;
      }

      .stats-arrow:hover,
      .stats-arrow:focus-visible,
      .stats-playback:hover,
      .stats-playback:focus-visible {
        background: rgba(255, 255, 255, 0.16);
      }

      .stats-arrow .material-icons-round,
      .stats-playback .material-icons-round {
        font-size: 1.15rem;
      }

      .stats-dots {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .stats-dot {
        position: relative;
        width: 2.75rem;
        height: 2.75rem;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        cursor: pointer;
      }

      .stats-dot::before {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0.4rem;
        height: 0.4rem;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.45);
        content: '';
        transform: translate(-50%, -50%);
      }

      .stats-dot-active::before {
        width: 0.9rem;
        border-radius: 999px;
        background: #fff;
      }

      @media (max-width: 480px) {
        .stats-bar {
          width: 100%;
        }

        .stats-controls {
          gap: 0.1rem;
        }

        .stats-dots {
          display: none;
        }

        .stats-arrow,
        .stats-playback {
          width: 2.75rem;
          height: 2.75rem;
          flex-basis: 2.75rem;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .stats-track {
          transition: none;
        }
      }
    `,
  ],
})
export class StatsBarComponent implements OnInit, OnDestroy {
  @Input() stats: StatsBarItem[] = [];

  readonly activeIndex = signal(0);
  readonly isPaused = signal(false);
  private autoplay?: ReturnType<typeof setInterval>;
  private reducedMotion = false;

  ngOnInit(): void {
    this.reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  next(): void {
    if (this.stats.length < 2) return;
    this.activeIndex.update(index => (index + 1) % this.stats.length);
  }

  previous(): void {
    if (this.stats.length < 2) return;
    this.activeIndex.update(index => (index - 1 + this.stats.length) % this.stats.length);
  }

  goTo(index: number): void {
    if (index < 0 || index >= this.stats.length) return;
    this.activeIndex.set(index);
  }

  pause(): void {
    this.isPaused.set(true);
    this.stopAutoplay();
  }

  resume(): void {
    if (this.reducedMotion) return;
    this.isPaused.set(false);
    this.startAutoplay();
  }

  togglePlayback(): void {
    if (this.isPaused()) {
      this.resume();
    } else {
      this.pause();
    }
  }

  private startAutoplay(): void {
    if (this.reducedMotion || this.stats.length < 2 || this.autoplay || this.isPaused()) return;
    this.autoplay = setInterval(() => this.next(), 4500);
  }

  private stopAutoplay(): void {
    if (!this.autoplay) return;
    clearInterval(this.autoplay);
    this.autoplay = undefined;
  }
}
