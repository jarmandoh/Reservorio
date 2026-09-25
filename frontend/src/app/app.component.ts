import { Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { OfflineService } from './core/services/offline.service';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { filter, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import gsap from 'gsap';

// ── Presets de animación ──────────────────────────────────────────────────────
const ENTER: gsap.TweenVars[] = [
  { opacity: 0, y: 64 },
  { opacity: 0, x: 90 },
  { opacity: 0, x: -90 },
  { opacity: 0, scale: 0.93 },
  { opacity: 0, y: -48, rotationX: 8, transformPerspective: 800 },
  { opacity: 0, scale: 1.06, filter: 'blur(6px)' },
];

const EXIT: gsap.TweenVars[] = [
  { opacity: 0, y: -48, duration: 0.28, ease: 'power2.in' },
  { opacity: 0, x: -90, duration: 0.28, ease: 'power2.in' },
  { opacity: 0, x: 90, duration: 0.28, ease: 'power2.in' },
  { opacity: 0, scale: 1.05, duration: 0.28, ease: 'power2.in' },
  { opacity: 0, y: 56, duration: 0.28, ease: 'power2.in' },
  { opacity: 0, scale: 0.94, filter: 'blur(6px)', duration: 0.28, ease: 'power2.in' },
];

const TO: gsap.TweenVars[] = [
  { opacity: 1, y: 0, duration: 0.52, ease: 'power3.out' },
  { opacity: 1, x: 0, duration: 0.52, ease: 'power3.out' },
  { opacity: 1, x: 0, duration: 0.52, ease: 'power3.out' },
  { opacity: 1, scale: 1, duration: 0.52, ease: 'back.out(1.4)' },
  { opacity: 1, y: 0, rotationX: 0, duration: 0.52, ease: 'power3.out' },
  { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.52, ease: 'power3.out' },
];

function rand(len: number) {
  return Math.floor(Math.random() * len);
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  template: `
    <div #pageHost>
      <router-outlet />
    </div>
    <app-toast />

    <button
      type="button"
      class="fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-soft transition active:scale-95"
      style="background: linear-gradient(135deg, #005bbf 0%, #1a73e8 100%);"
      [attr.aria-label]="themeService.isDark() ? 'Activar tema claro' : 'Activar tema oscuro'"
      (click)="themeService.toggle()"
    >
      <span class="material-icons-round">{{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}</span>
    </button>

    @if (!online()) {
      <div class="offline-banner" role="status" aria-live="polite">
        <span class="material-icons-round text-[1.1rem] flex-shrink-0">wifi_off</span>
        <span class="flex-1">Sin conexión. Los datos mostrados pueden estar desactualizados.</span>
        <button type="button">Esperando conexión…</button>
      </div>
    }
  `,
})
export class AppComponent implements OnInit {
  @ViewChild('pageHost', { static: true }) pageHost!: ElementRef<HTMLDivElement>;
  private router = inject(Router);
  private offlineService = inject(OfflineService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly themeService = inject(ThemeService);
  protected readonly online = this.offlineService.online;
  private busy = false;

  ngOnInit() {
    // Renovación de sesión activa (admin/owner/customer): primero a los 5s y luego cada hora.
    // Silencioso; si el backend rechaza (expirada fuera de gracia), la sesión caduca con normalidad.
    timer(5_000, 60 * 60 * 1000)
      .pipe(
        switchMap(() => this.auth.refreshSession()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.router.events
      .pipe(
        filter(e => e instanceof NavigationStart || e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        const el = this.pageHost.nativeElement;

        if (event instanceof NavigationStart && !this.busy) {
          this.busy = true;
          const i = rand(EXIT.length);
          gsap.killTweensOf(el);
          gsap.to(el, EXIT[i]);
        }

        if (event instanceof NavigationEnd) {
          this.busy = false;
          const i = rand(ENTER.length);
          gsap.killTweensOf(el);
          gsap.set(el, ENTER[i]);
          requestAnimationFrame(() =>
            gsap.to(el, {
              ...TO[i],
              onComplete: () => {
                gsap.set(el, { clearProps: 'all' });
              },
            })
          );
        }
      });
  }
}
