import { Injectable, signal, computed } from '@angular/core';

export type ToastType = 'default' | 'success' | 'error';

export interface ToastMessage {
  id:      number;
  message: string;
  type:    ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<ToastMessage[]>([]);
  readonly toasts = computed(() => this._toasts());

  private nextId = 0;

  show(message: string, type: ToastType = 'default', duration = 3000): void {
    const id = ++this.nextId;
    this._toasts.update(list => [...list, { id, message, type }]);
    setTimeout(() => this.remove(id), duration);
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string):   void { this.show(message, 'error'); }

  remove(id: number): void {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }
}
