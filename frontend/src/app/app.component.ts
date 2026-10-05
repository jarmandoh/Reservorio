import { Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { OfflineService } from './core/services/offline.service';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { ToastService } from './core/services/toast.service';
import { SeoService } from './core/services/seo.service';
import { filter, interval, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type gsap from 'gsap';

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
    <a class="skip-link" href="#main-content">Saltar al contenido principal</a>
    <main #mainContent id="main-content" tabindex="-1">
      <div #pageHost>
        <router-outlet />
      </div>
    </main>
    <app-toast />

    <button
      type="button"
      class="fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-soft transition active:scale-95"
      style="background: linear-gradient(135deg, #005bbf 0%, #1a73e8 100%);"
      [attr.aria-label]="themeService.isDark() ? 'Activar tema claro' : 'Activar tema oscuro'"
      (click)="themeService.toggle()"
    >
      <span class="material-icons-round" aria-hidden="true">{{
        themeService.isDark() ? 'light_mode' : 'dark_mode'
      }}</span>
    </button>

    @if (!online()) {
      <div class="offline-banner" role="status" aria-live="polite">
        <span class="material-icons-round text-[1.1rem] flex-shrink-0">wifi_off</span>
        <span class="flex-1">Sin conexión. Los datos mostrados pueden estar desactualizados.</span>
        <span>Esperando conexión…</span>
      </div>
    }
  `,
})
export class AppComponent implements OnInit {
  @ViewChild('pageHost', { static: true }) pageHost!: ElementRef<HTMLDivElement>;
  @ViewChild('mainContent', { static: true }) mainContent!: ElementRef<HTMLElement>;
  private router = inject(Router);
  private offlineService = inject(OfflineService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  protected readonly themeService = inject(ThemeService);
  protected readonly online = this.offlineService.online;
  private busy = false;
  private hasCompletedInitialNavigation = false;

  ngOnInit() {
    this.seo.updateForRoute(this.router.url);

    // ── Cierre proactivo de sesión si el token es inválido o expirado ──────
    // Limpia al iniciar y ante cada navegación; también cada 60s por si expira en segundo plano.
    this.auth.purgeInvalidTokens();
    this.checkProactiveSessionExpiry();

    // Verifica en cada navegación que la sesión siga válida
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        const purged = this.auth.purgeInvalidTokens();
        if (purged.length) this.checkProactiveSessionExpiry();
      });

    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.seo.updateForRoute(this.router.url);
        if (this.hasCompletedInitialNavigation) {
          requestAnimationFrame(() => this.mainContent.nativeElement.focus());
        }
        this.hasCompletedInitialNavigation = true;
      });

    // Poll cada 60s para tokens que expiran mientras la app está abierta sin navegar
    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const purged = this.auth.purgeInvalidTokens();
        if (purged.length) this.checkProactiveSessionExpiry();
      });

    // Renovación de sesión: defer para no bloquear LCP; usa requestIdleCallback si disponible
    const scheduleRefresh = () => {
      timer(5_000, 60 * 60 * 1000)
        .pipe(
          switchMap(() => this.auth.refreshSession()),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe();
    };
    if ('requestIdleCallback' in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(scheduleRefresh);
    } else {
      setTimeout(scheduleRefresh, 3000);
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Solo anima en dispositivos con capacidad hover (desktop) para no penalizar INP móvil
    if (!window.matchMedia('(hover: hover)').matches) return;

    let gsapPromise: Promise<(typeof import('gsap'))['default']> | undefined;
    const loadGsap = () => (gsapPromise ??= import('gsap').then(module => module.default));
    let hasInitialNavigationCompleted = false;

    this.router.events
      .pipe(
        filter(e => e instanceof NavigationStart || e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        const el = this.pageHost.nativeElement;

        if (event instanceof NavigationStart && hasInitialNavigationCompleted && !this.busy) {
          this.busy = true;
          const i = rand(EXIT.length);
          void loadGsap()
            .then(gsap => {
              if (!this.busy) return;
              gsap.killTweensOf(el);
              gsap.to(el, EXIT[i]);
            })
            .catch(error => console.error('No se pudo cargar la animación de navegación:', error));
        }

        if (event instanceof NavigationEnd) {
          if (!hasInitialNavigationCompleted) {
            hasInitialNavigationCompleted = true;
            return;
          }
          this.busy = false;
          const i = rand(ENTER.length);
          void loadGsap()
            .then(gsap => {
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
            })
            .catch(error => console.error('No se pudo cargar la animación de navegación:', error));
        }
      });
  }

  private checkProactiveSessionExpiry(): void {
    const url = this.router.url || '/';
    // No interferir con páginas de login/registro (deben ser siempre visibles)
    if (
      url === '/' ||
      url.startsWith('/jh-login') ||
      url.startsWith('/owner/login') ||
      url.startsWith('/owner/register') ||
      url.startsWith('/customer/login') ||
      url.startsWith('/customer/verify') ||
      /\/business\/[^\/]+\/login/.test(url)
    ) {
      return;
    }
    let redirected = false;
    // Si está en ruta protegida y el token correspondiente ya no es válido, cierra sesión y redirige al home
    if (url.startsWith('/admin')) {
      const hasJwt = !!this.auth.getAdminToken();
      const hasLegacy = this.auth.isUnlocked();
      if (!hasJwt && !hasLegacy) {
        this.router.navigate(['/'], { replaceUrl: true }).catch(() => {});
        redirected = true;
      }
    } else if (url.startsWith('/owner')) {
      if (!this.auth.getOwnerToken()) {
        this.router.navigate(['/'], { replaceUrl: true }).catch(() => {});
        redirected = true;
      }
    } else if (url.startsWith('/customer')) {
      if (!this.auth.getCustomerToken()) {
        this.router.navigate(['/'], { replaceUrl: true }).catch(() => {});
        redirected = true;
      }
    } else if (url.startsWith('/business/')) {
      const m = url.match(/\/business\/([^\/]+)/);
      const bid = m?.[1];
      if (bid && !this.auth.getBusinessToken(bid)) {
        this.router.navigate(['/'], { replaceUrl: true }).catch(() => {});
        redirected = true;
      }
    }
    if (redirected) {
      this.toast.show('Sesión expirada, vuelve a iniciar sesión', 'error');
    }
  }
}
