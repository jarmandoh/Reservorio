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
   * Conecta al SSE del negocio autenticado y reintenta si se corta la conexión.
   */
  connect(businessId: string, token: string): Observable<RealtimeEvent> {
    if (typeof window === 'undefined' || !businessId || !token) {
      return new Observable(subscriber => subscriber.complete());
    }

    const url = new URL(`${environment.apiUrl}/realtime/stream`, window.location.origin);
    url.searchParams.set('businessId', businessId);

    return new Observable<RealtimeEvent>(subscriber => {
      let closed = false;
      let controller: AbortController | null = null;
      let retryTimer: ReturnType<typeof setTimeout> | null = null;

      const open = async () => {
        if (closed) return;
        controller = new AbortController();
        try {
          const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
            signal: controller.signal,
          });
          if (!response.ok || !response.body) {
            if (response.status === 401 || response.status === 403) {
              subscriber.error(new Error('No tienes acceso a las actualizaciones de este negocio.'));
              return;
            }
            throw new Error(`Realtime request failed (${response.status})`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (!closed) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let boundary = buffer.indexOf('\n\n');
            while (boundary >= 0) {
              const block = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              let event = 'message';
              const data: string[] = [];
              for (const line of block.split(/\r?\n/)) {
                if (line.startsWith('event:')) event = line.slice(6).trim();
                if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
              }
              if (data.length) {
                this.zone.run(() => {
                  try {
                    subscriber.next({ event, data: JSON.parse(data.join('\n')) });
                  } catch {
                    subscriber.next({ event, data: data.join('\n') });
                  }
                });
              }
              boundary = buffer.indexOf('\n\n');
            }
          }
        } catch (error) {
          if (closed || controller?.signal.aborted) return;
          if (error instanceof Error && error.message.startsWith('No tienes acceso')) {
            subscriber.error(error);
            return;
          }
        }

        if (!closed && !subscriber.closed) retryTimer = setTimeout(open, 5000);
      };

      open();

      return () => {
        closed = true;
        controller?.abort();
        if (retryTimer) clearTimeout(retryTimer);
      };
    });
  }
}
