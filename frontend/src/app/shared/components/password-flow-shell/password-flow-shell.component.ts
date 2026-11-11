import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-password-flow-shell',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="password-page" [class.password-page--success]="variant === 'success'">
      <div class="page-glow page-glow--top" aria-hidden="true"></div>
      <div class="page-glow page-glow--bottom" aria-hidden="true"></div>

      <section
        class="password-card"
        [class.password-card--success]="variant === 'success'"
        aria-labelledby="password-title"
      >
        @if (variant === 'landscape') {
          <aside class="reservoir-art" aria-hidden="true">
            <svg class="reservoir-scene" viewBox="0 0 360 760" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stop-color="#57b9f4" />
                  <stop offset="1" stop-color="#d9f3ff" />
                </linearGradient>
                <linearGradient id="water" x1="0" x2="0.85" y1="0" y2="1">
                  <stop offset="0" stop-color="#63c7dc" />
                  <stop offset="1" stop-color="#0872b5" />
                </linearGradient>
                <linearGradient id="dam" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stop-color="#f8fcff" />
                  <stop offset="1" stop-color="#a7c7d9" />
                </linearGradient>
              </defs>
              <rect width="360" height="760" fill="url(#sky)" />
              <circle cx="276" cy="112" r="44" fill="#fff" opacity=".58" />
              <path d="M0 278 71 185l42 48 78-111 58 92 44-50 67 83v172H0Z" fill="#6a9c74" />
              <path d="m0 318 99-119 46 61 48-64 75 110 37-54 55 47v162H0Z" fill="#477e67" />
              <path d="M0 329c65-33 113-20 174-2 57 17 111 19 186-6v253H0Z" fill="url(#water)" />
              <path
                d="M0 397c76-23 132-3 193 14 57 15 109 11 167-8"
                fill="none"
                stroke="#c6f4f1"
                stroke-width="8"
                opacity=".6"
              />
              <path d="M0 500c70-21 136-9 204 10 54 15 100 17 156-2v252H0Z" fill="#1684b8" opacity=".62" />
              <path d="M0 559 360 522v238H0Z" fill="#78cbd0" opacity=".42" />
              <path d="m51 455 258-30-14 123-224 24Z" fill="url(#dam)" />
              <path
                d="m65 455 228-27m-224 48 219-26m-213 48 208-24m-202 46 197-23"
                stroke="#7699ac"
                stroke-width="4"
                opacity=".7"
              />
              <path
                d="M81 475v90m42-96v92m42-97v91m42-96v88m42-94v84"
                stroke="#69899a"
                stroke-width="4"
                opacity=".52"
              />
              <path d="m0 650 86-47 55 30 58-48 59 34 56-49 46 18v172H0Z" fill="#327c65" />
              <path d="M0 696c72-44 133-33 192-11 60 22 107 11 168-26v101H0Z" fill="#1d9bb5" opacity=".84" />
            </svg>
            <div class="scene-caption">
              <span class="scene-caption__line"></span>
              <span>Tu cuenta, siempre bajo control</span>
            </div>
          </aside>
        }

        <div class="password-content">
          <a class="brand" routerLink="/" aria-label="Reservorio, ir al inicio">
            <svg class="brand-mark" viewBox="0 0 40 48" aria-hidden="true">
              <path d="M20 2C14 12 4 22 4 31a16 16 0 0 0 32 0C36 22 26 12 20 2Z" fill="#1676d2" />
              <path d="M7 32c6-1 11-5 15-11 2 7 6 11 12 13a14 14 0 0 1-27-2Z" fill="#39a95d" />
              <path d="M10 31c7 0 14-4 19-10" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="2.4" />
              <path d="M20 7c-4 7-9 13-9 19" fill="none" stroke="#a9e4ff" stroke-linecap="round" stroke-width="2" />
            </svg>
            <span class="brand-copy">
              <strong>Reservorio</strong>
              <small>Gestiona · Controla · Optimiza</small>
            </span>
          </a>

          <div class="flow-icon" [class.flow-icon--success]="variant === 'success'" aria-hidden="true">
            @if (variant === 'success') {
              <svg viewBox="0 0 64 64">
                <path
                  d="m17 33 10 10 21-23"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="6"
                />
              </svg>
            } @else {
              <svg viewBox="0 0 64 64">
                <path
                  d="M20 29v-8a12 12 0 0 1 24 0v8"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-width="4"
                />
                <rect x="14" y="27" width="36" height="29" rx="6" fill="none" stroke="currentColor" stroke-width="4" />
                <circle cx="32" cy="39" r="3" fill="currentColor" />
                <path d="M32 42v5" stroke="currentColor" stroke-linecap="round" stroke-width="3" />
              </svg>
            }
          </div>

          <header class="flow-heading">
            <h1 id="password-title">{{ title }}</h1>
            <p>{{ subtitle }}</p>
          </header>

          <ng-content></ng-content>
        </div>

        @if (variant === 'success') {
          <svg class="success-waves" viewBox="0 0 900 120" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 45c125-44 192 36 321 26S523 9 654 27s157 12 246-5v98H0Z" fill="#b9ddff" opacity=".52" />
            <path d="M0 70c127-41 204 35 342 19s197-56 319-37 156 14 239-6v74H0Z" fill="#78baf2" opacity=".5" />
            <path d="M0 91c145-30 226 23 363 9s196-33 304-21 157 12 233-2v43H0Z" fill="#3c99df" opacity=".4" />
          </svg>
        }
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }

      .password-page {
        --ink: #17345b;
        --muted: #64748b;
        --blue: #0965bd;
        --green: #2cad59;
        position: relative;
        display: grid;
        min-height: 100vh;
        place-items: center;
        overflow: hidden;
        padding: 2rem;
        background:
          radial-gradient(ellipse at 12% 18%, rgb(91 171 240 / 12%), transparent 34rem),
          linear-gradient(145deg, #f3f7ff 0%, #eaf3ff 52%, #f8fbff 100%);
        color: var(--ink);
      }

      .page-glow {
        position: absolute;
        width: 28rem;
        aspect-ratio: 1;
        border-radius: 50%;
        background: #64aaf3;
        filter: blur(100px);
        opacity: 0.1;
        pointer-events: none;
      }

      .page-glow--top {
        top: -20rem;
        left: 18%;
      }

      .page-glow--bottom {
        right: -17rem;
        bottom: -19rem;
        background: #46c0bd;
      }

      .password-card {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: minmax(13rem, 0.72fr) minmax(26rem, 1fr);
        width: min(100%, 55rem);
        min-height: 40rem;
        overflow: hidden;
        border: 1px solid rgb(178 199 224 / 72%);
        border-radius: 1.5rem;
        background: rgb(255 255 255 / 94%);
        box-shadow:
          0 32px 80px rgb(23 52 91 / 12%),
          0 4px 14px rgb(23 52 91 / 5%);
        animation: card-arrive 550ms cubic-bezier(0.2, 0.75, 0.25, 1) both;
      }

      .reservoir-art {
        position: relative;
        min-height: 100%;
        overflow: hidden;
        background: #8ed3ec;
      }

      .reservoir-art::after {
        position: absolute;
        inset: 0;
        content: '';
        background: linear-gradient(180deg, transparent 62%, rgb(8 51 84 / 48%));
      }

      .reservoir-scene {
        position: absolute;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .scene-caption {
        position: absolute;
        z-index: 1;
        right: 1.5rem;
        bottom: 1.6rem;
        left: 1.5rem;
        display: flex;
        align-items: center;
        gap: 0.65rem;
        color: white;
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.03em;
        text-shadow: 0 1px 5px rgb(0 0 0 / 22%);
      }

      .scene-caption__line {
        width: 1.5rem;
        height: 2px;
        background: #9de0c2;
      }

      .password-content {
        position: relative;
        z-index: 1;
        display: flex;
        width: 100%;
        max-width: 33rem;
        flex-direction: column;
        justify-content: center;
        margin-inline: auto;
        padding: clamp(2rem, 5vw, 3.75rem);
      }

      .brand {
        display: inline-flex;
        align-items: center;
        align-self: center;
        gap: 0.55rem;
        margin-bottom: 2rem;
        color: #0e417a;
        text-decoration: none;
      }

      .brand-mark {
        width: 2.35rem;
        height: 2.8rem;
        flex: 0 0 auto;
      }

      .brand-copy {
        display: flex;
        flex-direction: column;
        line-height: 1.1;
      }

      .brand-copy strong {
        font-size: 1.45rem;
        font-weight: 800;
        letter-spacing: -0.055em;
      }

      .brand-copy small {
        margin-top: 0.25rem;
        font-size: 0.57rem;
        font-weight: 700;
        letter-spacing: 0.035em;
      }

      .flow-icon {
        display: grid;
        width: 4.25rem;
        height: 4.25rem;
        place-items: center;
        align-self: center;
        margin-bottom: 1rem;
        border: 1px solid #d5e9ff;
        border-radius: 1.35rem;
        background: linear-gradient(145deg, #eaf4ff, #d9eaff);
        color: #0871d1;
        box-shadow: inset 0 1px 0 white;
      }

      .flow-icon svg {
        width: 2.55rem;
        height: 2.55rem;
      }

      .flow-icon--success {
        width: 5.3rem;
        height: 5.3rem;
        margin-bottom: 1.45rem;
        border: 0;
        border-radius: 50%;
        background: linear-gradient(145deg, #a4edb2, #6bd989);
        color: white;
        box-shadow: 0 9px 24px rgb(44 173 89 / 18%);
      }

      .flow-icon--success svg {
        width: 3.1rem;
        height: 3.1rem;
      }

      .flow-heading {
        margin-bottom: 1.65rem;
        text-align: center;
      }

      .flow-heading h1 {
        margin: 0;
        color: var(--ink);
        font-family: 'Manrope', 'Inter', sans-serif;
        font-size: clamp(1.55rem, 3vw, 1.9rem);
        font-weight: 800;
        letter-spacing: -0.055em;
        line-height: 1.18;
      }

      .flow-heading p {
        max-width: 26rem;
        margin: 0.65rem auto 0;
        color: var(--muted);
        font-size: 0.9rem;
        line-height: 1.55;
      }

      .password-card--success {
        display: block;
        width: min(100%, 35rem);
        min-height: 0;
        padding-bottom: 2rem;
        text-align: center;
      }

      .password-card--success .password-content {
        max-width: none;
        padding: 3rem clamp(2rem, 7vw, 4rem) 4.7rem;
      }

      .password-card--success .flow-heading {
        margin-bottom: 1.2rem;
      }

      .success-waves {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 6rem;
        pointer-events: none;
      }

      :host ::ng-deep .password-form {
        display: grid;
        gap: 1.1rem;
      }

      :host ::ng-deep .password-field {
        display: grid;
        gap: 0.42rem;
      }

      :host ::ng-deep .password-label {
        color: #284565;
        font-size: 0.8rem;
        font-weight: 700;
      }

      :host ::ng-deep .password-input-wrap {
        position: relative;
      }

      :host ::ng-deep .password-input {
        width: 100%;
        min-height: 3.15rem;
        border: 1px solid #cbd9ea;
        border-radius: 0.85rem;
        background: #fff;
        padding: 0.75rem 3rem 0.75rem 2.8rem;
        color: #15375e;
        font: inherit;
        font-size: 0.9rem;
        transition:
          border-color 160ms ease,
          box-shadow 160ms ease;
      }

      :host ::ng-deep .password-input::placeholder {
        color: #8999ad;
      }

      :host ::ng-deep .password-input:focus {
        border-color: #3a8ddb;
        outline: 0;
        box-shadow: 0 0 0 3px rgb(38 130 210 / 14%);
      }

      :host ::ng-deep .password-input[aria-invalid='true'] {
        border-color: #c33b43;
      }

      :host ::ng-deep .input-icon {
        position: absolute;
        top: 50%;
        left: 0.8rem;
        color: #56708e;
        font-size: 1.12rem;
        transform: translateY(-50%);
        pointer-events: none;
      }

      :host ::ng-deep .password-toggle {
        position: absolute;
        top: 50%;
        right: 0.55rem;
        display: grid;
        width: 2rem;
        height: 2rem;
        place-items: center;
        border: 0;
        border-radius: 0.55rem;
        background: transparent;
        color: #5c7390;
        transform: translateY(-50%);
        cursor: pointer;
      }

      :host ::ng-deep .password-toggle:hover {
        background: #eef5fc;
        color: #075db2;
      }

      :host ::ng-deep .password-primary {
        display: inline-flex;
        min-height: 3.15rem;
        align-items: center;
        justify-content: center;
        gap: 0.55rem;
        border: 0;
        border-radius: 0.82rem;
        background: linear-gradient(110deg, #0871ce, #0755a8);
        padding: 0.8rem 1rem;
        color: white;
        font: inherit;
        font-size: 0.9rem;
        font-weight: 750;
        box-shadow: 0 8px 18px rgb(9 91 169 / 17%);
        transition:
          filter 160ms ease,
          transform 160ms ease,
          box-shadow 160ms ease;
        cursor: pointer;
      }

      :host ::ng-deep .password-primary:hover:not(:disabled) {
        filter: brightness(1.07);
        box-shadow: 0 10px 24px rgb(9 91 169 / 23%);
        transform: translateY(-1px);
      }

      :host ::ng-deep .password-primary:disabled {
        opacity: 0.56;
        cursor: not-allowed;
      }

      :host ::ng-deep .password-link {
        display: inline-flex;
        min-height: 2.75rem;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        color: #075eb8;
        font-size: 0.85rem;
        font-weight: 750;
        text-decoration: none;
      }

      :host ::ng-deep .password-link:hover {
        color: #064987;
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      :host ::ng-deep .password-note {
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        border: 1px solid #d3e6ff;
        border-radius: 0.95rem;
        background: #edf5ff;
        padding: 0.85rem 0.95rem;
        color: #1f4e80;
        font-size: 0.77rem;
        line-height: 1.5;
        text-align: left;
      }

      :host ::ng-deep .password-note .material-icons-round {
        margin-top: 0.05rem;
        color: #0871ce;
        font-size: 1.1rem;
      }

      :host ::ng-deep .password-note--success {
        border-color: #b7edc4;
        background: #e8faed;
        color: #236a3d;
      }

      :host ::ng-deep .password-note--success .material-icons-round {
        color: #2ca957;
      }

      :host ::ng-deep .password-error {
        margin: 0;
        color: #ad2935;
        font-size: 0.76rem;
        line-height: 1.45;
      }

      :host ::ng-deep .password-divider {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: #718198;
        font-size: 0.78rem;
      }

      :host ::ng-deep .password-divider::before,
      :host ::ng-deep .password-divider::after {
        height: 1px;
        flex: 1;
        background: #dce5ef;
        content: '';
      }

      :host ::ng-deep .strength-meter {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 0.25rem;
        margin-top: 0.6rem;
      }

      :host ::ng-deep .strength-meter span {
        height: 0.28rem;
        border-radius: 999px;
        background: #dbe3ec;
        transition: background-color 180ms ease;
      }

      :host ::ng-deep .strength-meter span.is-active {
        background: #33b759;
      }

      :host ::ng-deep .strength-caption {
        display: flex;
        justify-content: space-between;
        margin-top: 0.35rem;
        color: #637890;
        font-size: 0.7rem;
      }

      :host ::ng-deep .strength-caption strong {
        color: #29954b;
      }

      :host ::ng-deep .security-checks {
        display: grid;
        gap: 0.48rem;
        border: 1px solid #dcecff;
        border-radius: 0.9rem;
        background: linear-gradient(115deg, #edf5ff, #f4f9ff);
        padding: 0.85rem 1rem;
      }

      :host ::ng-deep .security-checks__title {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        margin: 0 0 0.1rem;
        color: #234a74;
        font-size: 0.77rem;
        font-weight: 800;
      }

      :host ::ng-deep .security-checks__title .material-icons-round {
        color: #1473c8;
        font-size: 1rem;
      }

      :host ::ng-deep .security-check {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        color: #607791;
        font-size: 0.74rem;
        transition: color 160ms ease;
      }

      :host ::ng-deep .security-check.is-met {
        color: #267c43;
      }

      :host ::ng-deep .security-check .material-icons-round {
        color: #a0afbf;
        font-size: 1rem;
      }

      :host ::ng-deep .security-check.is-met .material-icons-round {
        color: #31a956;
      }

      :host ::ng-deep .password-center {
        text-align: center;
      }

      @keyframes card-arrive {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 700px) {
        .password-page {
          align-items: start;
          padding: 1rem;
        }

        .password-card {
          grid-template-columns: 1fr;
          width: min(100%, 31rem);
          min-height: 0;
          margin-block: auto;
          border-radius: 1.25rem;
        }

        .reservoir-art {
          display: none;
        }

        .password-content {
          padding: clamp(1.65rem, 7vw, 2.5rem);
        }

        .brand {
          margin-bottom: 1.55rem;
        }

        .flow-heading {
          margin-bottom: 1.35rem;
        }

        .password-card--success .password-content {
          padding: 2.4rem 1.5rem 5.3rem;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .password-card {
          animation: none;
        }

        :host ::ng-deep *,
        :host ::ng-deep *::before,
        :host ::ng-deep *::after {
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
        }
      }

      :host-context(.dark) .password-page {
        background: linear-gradient(145deg, #101b2a, #172c41 55%, #102136);
      }

      :host-context(.dark) .password-card {
        border-color: #344c63;
        background: rgb(24 38 54 / 97%);
      }

      :host-context(.dark) .flow-heading h1,
      :host-context(.dark) .password-label {
        color: #e2edf8;
      }

      :host-context(.dark) .flow-heading p,
      :host-context(.dark) .strength-caption {
        color: #a8bbce;
      }

      :host-context(.dark) .brand {
        color: #b8dcff;
      }
    `,
  ],
})
export class PasswordFlowShellComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() variant: 'landscape' | 'success' = 'landscape';
}
