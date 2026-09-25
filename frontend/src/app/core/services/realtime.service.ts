import { Injectable, inject, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RealtimeEvent {
  event: 'booking_created' | 'booking_updated' | 'connected' | string;
  data: unknown;
}

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly zone = inject(NgZone);

  /**
   * Conecta a SSE `GET /api/realtime/stream?businessId=xxx`.
   * Devuelve Observable que emite eventos; se reconecta automáticamente cada 5s si se corta.
   * Usa EventSource nativo (sin polyfill).
   */
  connect(businessId?: string): Observable<RealtimeEvent> {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return new Observable(subscriber => subscriber.complete());
    }

    const url = new URL(`${environment.apiUrl}/realtime/stream`, window.location.origin);
    if (businessId) url.searchParams.set('businessId', businessId);

    return new Observable<RealtimeEvent>(subscriber => {
      let es: EventSource | null = null;
      let closed = false;

      const open = () => {
        if (closed) return;
        es = new EventSource(url.toString(), { withCredentials: false } as EventSourceInit);

        const handler = (e: MessageEvent) => {
          this.zone.run(() => {
            try {
              const data = JSON.parse(e.data);
              const evt = (e as MessageEvent & { type?: string }).type || 'message';
              subscriber.next({ event: evt || 'message', data });
            } catch {
              subscriber.next({ event: 'message', data: e.data });
            }
          });
        };

        // Eventos tipados
        es.addEventListener('booking_created', handler as EventListener);
        es.addEventListener('booking_updated', handler as EventListener);
        es.addEventListener('message', handler as EventListener);

        es.onerror = () => {
          // EventSource reconecta solo; cerramos y reabrimos con backoff si se cierra por completo
          if (es && es.readyState === EventSource.CLOSED && !closed) {
            es.close();
            setTimeout(open, 3000);
          }
        };
      };

      open();

      return () => {
        closed = true;
        if (es) es.close();
      };
    });
  }
}
