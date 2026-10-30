import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SessionStore } from '../../../core/state/session.store';

type AccountOption = {
  label: string;
  route: string;
  icon: string;
};

@Component({
  selector: 'app-account-menu',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="account-float">
      @if (menuOpen()) {
        <section id="account-menu-panel" class="account-panel account-menu-panel" aria-label="Menú de cuenta">
          <div class="panel-heading">
            <span class="system-mark material-icons-round" aria-hidden="true">blur_on</span>
            <div>
              <p class="panel-kicker">MIVECI · SISTEMA</p>
              <h2>{{ account() ? 'Perfil de usuario' : 'Acceso de usuario' }}</h2>
            </div>
            <span class="panel-status" [class.panel-status-active]="account()">
              {{ account() ? 'ONLINE' : 'OFFLINE' }}
            </span>
          </div>

          <div class="session-line">
            <span class="session-orb" [class.session-orb-active]="account()" aria-hidden="true"></span>
            <span>{{ account()?.label || 'No has iniciado sesión' }}</span>
          </div>

          <nav class="account-options" aria-label="Opciones de cuenta">
            @if (account(); as currentAccount) {
              @if (currentAccount.route) {
                <a class="menu-option" [routerLink]="currentAccount.route" (click)="closeMenu()">
                  <span class="material-icons-round" aria-hidden="true">{{ currentAccount.icon }}</span>
                  <span>{{ currentAccount.label }}</span>
                  <span class="option-arrow" aria-hidden="true">↗</span>
                </a>
              }
              <button class="menu-option logout-option" type="button" (click)="logout()">
                <span class="material-icons-round" aria-hidden="true">logout</span>
                <span>Cerrar sesión</span>
                <span class="option-arrow" aria-hidden="true">↗</span>
              </button>
            } @else {
              @for (option of guestOptions; track option.route) {
                <a class="menu-option" [routerLink]="option.route" (click)="closeMenu()">
                  <span class="material-icons-round" aria-hidden="true">{{ option.icon }}</span>
                  <span>{{ option.label }}</span>
                  <span class="option-arrow" aria-hidden="true">↗</span>
                </a>
              }
            }
          </nav>
          <span class="panel-corner corner-top" aria-hidden="true"></span>
          <span class="panel-corner corner-bottom" aria-hidden="true"></span>
        </section>
      }

      <button
        type="button"
        class="account-trigger"
        [class.trigger-active]="menuOpen()"
        [attr.aria-expanded]="menuOpen()"
        aria-controls="account-menu-panel"
        [attr.aria-label]="account()?.label || 'No has iniciado sesión'"
        (click)="toggleMenu()"
      >
        <span class="material-icons-round" aria-hidden="true">{{
          account() ? 'account_circle' : 'person_outline'
        }}</span>
        <span class="presence-indicator" [class.presence-active]="account()" aria-hidden="true"></span>
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        position: fixed;
        z-index: 45;
        right: 1rem;
        bottom: 5rem;
        display: block;
        font-family: 'Inter', system-ui, sans-serif;
        --account-surface: var(--color-surface, #f7f9ff);
        --account-text: var(--color-on-surface, #181c20);
        --account-muted: var(--color-outline, #686e7c);
        --account-border: rgb(104 110 124 / 22%);
        --account-accent: var(--color-primary, #005bbf);
        --account-accent-soft: rgb(0 91 191 / 8%);
        --account-shadow: 0 16px 42px rgb(24 28 32 / 16%);
      }
      :host-context(.dark) {
        --account-surface: #161d27;
        --account-text: #e6e9ee;
        --account-muted: #aeb8c5;
        --account-border: rgb(230 233 238 / 14%);
        --account-accent: #8fbaff;
        --account-accent-soft: rgb(143 186 255 / 10%);
        --account-shadow: 0 18px 48px rgb(0 0 0 / 38%);
      }
      .account-float {
        position: relative;
      }
      .account-trigger {
        position: relative;
        display: grid;
        width: 2.75rem;
        height: 2.75rem;
        place-items: center;
        border: 1px solid var(--account-border);
        border-radius: 50%;
        color: var(--account-accent);
        background: var(--account-surface);
        box-shadow: 0 4px 14px rgb(24 28 32 / 12%);
        cursor: pointer;
        transition:
          transform 180ms ease,
          box-shadow 180ms ease,
          border-color 180ms ease;
      }
      .account-trigger:hover,
      .account-trigger.trigger-active {
        transform: translateY(-2px);
        border-color: var(--account-accent);
        box-shadow:
          0 0 0 3px var(--account-accent-soft),
          0 8px 22px rgb(24 28 32 / 18%);
      }
      .account-trigger > .material-icons-round {
        font-size: 1.55rem;
      }
      .presence-indicator {
        position: absolute;
        right: 0.08rem;
        bottom: 0.08rem;
        width: 0.68rem;
        height: 0.68rem;
        border: 2px solid var(--account-surface);
        border-radius: 50%;
        background: #f4b45d;
      }
      .presence-indicator.presence-active {
        background: #5fe0aa;
        box-shadow: 0 0 8px rgba(95, 224, 170, 0.8);
      }
      .account-panel {
        position: absolute;
        right: 0;
        bottom: calc(100% + 0.9rem);
        width: min(20rem, calc(100vw - 2rem));
        overflow: hidden;
        padding: 1rem;
        border: 1px solid var(--account-border);
        border-radius: 1rem;
        color: var(--account-text);
        background: var(--account-surface);
        box-shadow: var(--account-shadow);
        backdrop-filter: blur(18px);
        animation: menu-enter 220ms cubic-bezier(0.18, 0.75, 0.3, 1) both;
      }
      .account-panel::before {
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, var(--account-accent-soft), transparent 55%);
        content: '';
        pointer-events: none;
      }
      .panel-heading,
      .session-line,
      .account-options {
        position: relative;
      }
      .panel-heading {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding-bottom: 0.85rem;
        border-bottom: 1px solid var(--account-border);
      }
      .system-mark {
        display: grid;
        width: 2.3rem;
        height: 2.3rem;
        flex: 0 0 auto;
        place-items: center;
        border: 1px solid var(--account-border);
        border-radius: 50%;
        color: var(--account-accent);
        background: var(--account-accent-soft);
        font-size: 1.45rem;
      }
      .panel-kicker {
        margin: 0 0 0.2rem;
        color: var(--account-accent);
        font-size: 0.55rem;
        font-weight: 700;
        letter-spacing: 0.16em;
      }
      .panel-heading h2 {
        margin: 0;
        font-size: 0.92rem;
        font-weight: 650;
        letter-spacing: 0.01em;
      }
      .panel-status {
        margin-left: auto;
        padding: 0.22rem 0.38rem;
        border: 1px solid rgba(241, 180, 94, 0.35);
        border-radius: 0.25rem;
        color: #f5c477;
        font-size: 0.55rem;
        font-weight: 700;
        letter-spacing: 0.1em;
      }
      .panel-status-active {
        border-color: rgba(95, 224, 170, 0.35);
        color: #70e7b4;
      }
      .session-line {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.8rem 0.2rem 0.45rem;
        color: var(--account-muted);
        font-size: 0.72rem;
      }
      .session-orb {
        width: 0.42rem;
        height: 0.42rem;
        border-radius: 50%;
        background: #f4b45d;
        box-shadow: 0 0 8px rgba(244, 180, 93, 0.5);
      }
      .session-orb-active {
        background: #5fe0aa;
        box-shadow: 0 0 8px rgba(95, 224, 170, 0.8);
      }
      .account-options {
        display: grid;
        gap: 0.4rem;
        margin-top: 0.35rem;
      }
      .menu-option {
        display: flex;
        min-height: 2.65rem;
        align-items: center;
        gap: 0.65rem;
        padding: 0.55rem 0.65rem;
        border: 1px solid var(--account-border);
        border-radius: 0.65rem;
        color: var(--account-text);
        background: var(--account-accent-soft);
        font: inherit;
        font-size: 0.75rem;
        text-align: left;
        text-decoration: none;
        cursor: pointer;
        transition:
          border-color 160ms ease,
          background 160ms ease,
          transform 160ms ease;
      }
      .menu-option:hover {
        transform: translateX(2px);
        border-color: var(--account-accent);
        background: var(--account-accent-soft);
      }
      .menu-option > .material-icons-round {
        color: var(--account-accent);
        font-size: 1.15rem;
      }
      .option-arrow {
        margin-left: auto;
        color: var(--account-accent);
        font-size: 0.8rem;
      }
      .logout-option {
        width: 100%;
        font-family: inherit;
      }
      .panel-corner {
        position: absolute;
        width: 0.55rem;
        height: 0.55rem;
        border-color: var(--account-accent);
        pointer-events: none;
      }
      .corner-top {
        top: 0.25rem;
        right: 0.25rem;
        border-top: 1px solid;
        border-right: 1px solid;
      }
      .corner-bottom {
        bottom: 0.25rem;
        left: 0.25rem;
        border-bottom: 1px solid;
        border-left: 1px solid;
      }
      @keyframes menu-enter {
        from {
          opacity: 0;
          transform: translateY(0.5rem) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .account-trigger,
        .menu-option {
          transition-duration: 0.01ms;
        }
        .account-panel {
          animation-duration: 0.01ms;
        }
      }
    `,
  ],
})
export class AccountMenuComponent {
  private readonly auth = inject(AuthService);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private audioContext: AudioContext | null = null;

  readonly menuOpen = signal(false);
  readonly account = computed(() => {
    if (this.auth.isUnlocked() || this.auth.getAdminToken() || this.sessionStore.isAdminAuthenticated()) {
      return { label: 'Sesión de administrador activa', route: '/admin', icon: 'admin_panel_settings' };
    }
    if (this.auth.getOwnerToken() || this.sessionStore.isOwnerAuthenticated()) {
      return { label: 'Sesión de negocio activa', route: '/owner/dashboard', icon: 'storefront' };
    }
    if (this.auth.getCustomerToken()) {
      return { label: 'Sesión de cliente activa', route: '/customer/history', icon: 'person' };
    }
    if (this.sessionStore.isAuthenticated() || this.auth.hasActiveSession()) {
      return { label: 'Sesión activa', route: '', icon: 'account_circle' };
    }
    return null;
  });

  readonly guestOptions: AccountOption[] = [
    { label: 'Iniciar sesión', route: '/usuario/auth', icon: 'login' },
    { label: 'Acceso para negocios', route: '/owner/auth', icon: 'storefront' },
  ];

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
    this.playInterfaceSound();
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.closeMenu();
    void this.router.navigate(['/']);
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    if (this.menuOpen() && !this.host.nativeElement.contains(event.target as Node)) this.closeMenu();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closeMenu();
  }

  private playInterfaceSound(): void {
    try {
      this.audioContext ??= new AudioContext();
      const context = this.audioContext;
      if (context.state === 'suspended') void context.resume();

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(this.menuOpen() ? 920 : 680, now);
      oscillator.frequency.exponentialRampToValueAtTime(this.menuOpen() ? 1380 : 420, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch {
      // El menú sigue funcionando si Web Audio no está disponible.
    }
  }
}
