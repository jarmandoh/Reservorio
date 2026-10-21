import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Business } from '../../../core/models/business.model';

@Component({
  selector: 'app-business-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      class="business-card group block overflow-hidden rounded-2xl border border-outline-variant/25 bg-surface-lowest shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      [routerLink]="['/business', business.id]"
      [attr.aria-label]="'Ver ' + business.name + ', ' + business.category + ', en ' + business.location"
      [style.--card-index]="animationIndex"
    >
      <div
        class="card-cover relative flex h-36 items-end overflow-hidden p-4 sm:h-40"
        [style.background]="business.gradient || 'linear-gradient(135deg, #005bbf, #1a73e8)'"
      >
        @if (business.storeCoverImage) {
          <img
            class="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
            [src]="business.storeCoverImage"
            [alt]="'Imagen de ' + business.name"
            width="640"
            height="360"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/10"></div>
        } @else {
          <div class="cover-orb cover-orb-one"></div>
          <div class="cover-orb cover-orb-two"></div>
          <span class="material-icons-round cover-watermark" aria-hidden="true">{{
            business.icon || 'storefront'
          }}</span>
        }

        <div class="relative z-[1] flex w-full items-end justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            @if (business.logo) {
              <img
                class="h-11 w-11 shrink-0 rounded-xl border border-white/50 bg-white object-cover shadow-sm"
                [src]="business.logo"
                [alt]="'Logo de ' + business.name"
                width="44"
                height="44"
                loading="lazy"
              />
            } @else {
              <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/20 text-white backdrop-blur-sm"
              >
                <span class="material-icons-round text-2xl" aria-hidden="true">{{
                  business.icon || 'storefront'
                }}</span>
              </span>
            }
            <span class="truncate text-xs font-semibold text-white/95">{{ business.category }}</span>
          </div>
          @if (business.verified) {
            <span class="verified-badge" title="Negocio verificado">
              <span class="material-icons-round" aria-hidden="true">verified</span>
              Verificado
            </span>
          }
        </div>
      </div>

      <div class="flex min-h-[218px] flex-col gap-3.5 p-4 sm:p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h3
              class="truncate font-display text-lg font-bold leading-tight text-on-surface transition group-hover:text-primary"
            >
              {{ business.name }}
            </h3>
            <p class="mt-1 flex items-center gap-1 text-xs text-on-surface-variant">
              <span class="material-icons-round text-[15px] text-outline" aria-hidden="true">location_on</span>
              <span class="truncate">{{ business.location || 'Ubicación no especificada' }}</span>
            </p>
          </div>
          <div
            class="rating"
            [attr.aria-label]="
              business.rating
                ? business.rating + ' de 5 estrellas, ' + business.reviews + ' reseñas'
                : 'Aún sin calificaciones'
            "
          >
            <span class="material-icons-round" aria-hidden="true">star</span>
            @if (business.rating > 0) {
              <span>{{ business.rating | number: '1.1-1' }}</span>
              <span class="rating-count">({{ business.reviews }})</span>
            } @else {
              <span class="rating-count">Nuevo</span>
            }
          </div>
        </div>

        @if (business.description) {
          <p class="line-clamp-2 text-sm leading-relaxed text-on-surface-variant">{{ business.description }}</p>
        }

        <div class="flex flex-wrap items-center gap-1.5">
          @if (business.businessType === 'onsite_service') {
            <span class="detail-badge detail-badge-service">
              <span class="material-icons-round" aria-hidden="true">home_repair_service</span>
              {{ business.profession || 'Servicio a domicilio' }}
            </span>
          } @else {
            <span class="detail-badge detail-badge-booking">
              <span class="material-icons-round" aria-hidden="true">event_available</span>
              Agenda disponible
            </span>
          }
          @if (business.schedule) {
            <span class="detail-badge" [title]="business.schedule">
              <span class="material-icons-round" aria-hidden="true">schedule</span>
              <span class="truncate max-w-36">{{ business.schedule }}</span>
            </span>
          }
          @if (business.cancellationPolicy) {
            <span class="detail-badge">
              <span class="material-icons-round" aria-hidden="true">event_busy</span>
              Cancelación informada
            </span>
          }
        </div>

        @if (business.tags.length) {
          <div class="flex flex-wrap gap-1.5" aria-label="Servicios y especialidades">
            @for (tag of business.tags.slice(0, 3); track tag) {
              <span class="service-tag">{{ tag }}</span>
            }
            @if (business.tags.length > 3) {
              <span class="service-tag service-tag-more">+{{ business.tags.length - 3 }}</span>
            }
          </div>
        }

        <div class="mt-auto flex items-center justify-between border-t border-outline-variant/20 pt-3">
          <span class="text-xs font-medium text-on-surface-variant">{{
            business.available > 0 ? business.available + ' horarios disponibles' : 'Consulta horarios'
          }}</span>
          <span class="booking-link">
            Ver negocio
            <span class="material-icons-round transition-transform group-hover:translate-x-1" aria-hidden="true"
              >arrow_forward</span
            >
          </span>
        </div>
      </div>
    </a>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .business-card {
        min-height: 100%;
        animation: card-enter 0.52s cubic-bezier(0.2, 0.7, 0.25, 1) both;
        animation-delay: calc(min(var(--card-index, 0), 8) * 42ms);
      }
      .card-cover {
        isolation: isolate;
      }
      .cover-orb {
        position: absolute;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
      }
      .cover-orb-one {
        width: 13rem;
        height: 13rem;
        top: -8rem;
        right: -2rem;
      }
      .cover-orb-two {
        width: 8rem;
        height: 8rem;
        top: -3.5rem;
        right: 5rem;
      }
      .cover-watermark {
        position: absolute;
        top: 0.6rem;
        right: 1rem;
        color: rgba(255, 255, 255, 0.14);
        font-size: 7rem;
        transform: rotate(-12deg);
      }
      .verified-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.3rem 0.55rem;
        border: 1px solid rgba(255, 255, 255, 0.35);
        border-radius: 999px;
        color: white;
        background: rgba(15, 23, 42, 0.24);
        font-size: 0.65rem;
        font-weight: 700;
        backdrop-filter: blur(8px);
      }
      .verified-badge .material-icons-round {
        font-size: 0.9rem;
      }
      .rating {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        gap: 0.2rem;
        padding: 0.3rem 0.45rem;
        border: 1px solid #f3e8c7;
        border-radius: 0.65rem;
        color: #7c5410;
        background: #fffbeb;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .rating .material-icons-round {
        color: #e6a700;
        font-size: 0.95rem;
      }
      .rating-count {
        color: #8a7a58;
        font-size: 0.65rem;
        font-weight: 500;
      }
      .detail-badge {
        display: inline-flex;
        max-width: 100%;
        align-items: center;
        gap: 0.25rem;
        padding: 0.28rem 0.45rem;
        border: 1px solid #e5eaf0;
        border-radius: 999px;
        color: #586577;
        background: #f8fafc;
        font-size: 0.65rem;
        font-weight: 600;
      }
      .detail-badge .material-icons-round {
        flex-shrink: 0;
        font-size: 0.85rem;
      }
      .detail-badge-service {
        border-color: #e5dcfa;
        color: #6941a5;
        background: #f7f3ff;
      }
      .detail-badge-booking {
        border-color: #dcebe3;
        color: #28704a;
        background: #f1faf5;
      }
      .service-tag {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.5rem;
        border-radius: 999px;
        color: #536477;
        background: #f1f4f7;
        font-size: 0.65rem;
        font-weight: 500;
      }
      .service-tag-more {
        color: #315e91;
        background: #edf5ff;
      }
      .booking-link {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        color: var(--color-primary);
        font-size: 0.8rem;
        font-weight: 700;
      }
      .booking-link .material-icons-round {
        font-size: 1rem;
      }
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }
      @keyframes card-enter {
        from {
          opacity: 0;
          transform: translateY(16px) scale(0.985);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .business-card,
        .business-card * {
          animation-duration: 0.01ms !important;
          animation-delay: 0ms !important;
          transition-duration: 0.01ms !important;
        }
      }
    `,
  ],
})
export class BusinessCardComponent {
  @Input({ required: true }) business!: Business;
  @Input() animationIndex = 0;
}
