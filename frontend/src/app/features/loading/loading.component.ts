import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-dvh flex items-center justify-center bg-surface">
      <div class="flex flex-col items-center gap-4">
        <span class="material-icons-round text-5xl animate-spin">hourglass_empty</span>
        <p class="text-base text-on-surface-variant">Verificando credenciales…</p>
      </div>
    </div>
  `,
})
export class LoadingComponent {}
