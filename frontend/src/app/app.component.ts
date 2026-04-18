import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { filter } from 'rxjs';
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

function rand(len: number) { return Math.floor(Math.random() * len); }

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, ToastComponent],
    template: `
    <div #pageHost>
      <router-outlet />
    </div>
    <app-toast />
  `
})
export class AppComponent implements OnInit {
  @ViewChild('pageHost', { static: true }) pageHost!: ElementRef<HTMLDivElement>;
  private router = inject(Router);
  private busy = false;

  ngOnInit() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.router.events
      .pipe(filter(e => e instanceof NavigationStart || e instanceof NavigationEnd))
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
              onComplete: () => { gsap.set(el, { clearProps: 'all' }); },
            })
          );
        }
      });
  }
}
