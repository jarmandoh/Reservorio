import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-toast',
    imports: [CommonModule],
    template: `
    <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2
                w-[calc(100%-3rem)] max-w-sm pointer-events-none">
      @for (toast of toasts(); track toast.id) {
        <div
          class="flex items-center gap-3 px-5 py-3.5 rounded-lg shadow-soft text-sm font-medium animate-slide-up pointer-events-auto"
          [class.bg-on-surface]="toast.type === 'default'"
          [class.text-surface-lowest]="toast.type === 'default'"
          [class.bg-green-800]="toast.type === 'success'"
          [class.text-white]="toast.type === 'success' || toast.type === 'error'"
          [class.bg-error]="toast.type === 'error'"
        >
          <span class="material-icons-round text-lg leading-none">
            {{ iconFor(toast.type) }}
          </span>
          {{ toast.message }}
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  private toast = inject(ToastService);
  readonly toasts = this.toast.toasts;

  iconFor(type: string) {
    return type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
  }
}
