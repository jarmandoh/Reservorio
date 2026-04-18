import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type BadgeVariant = 'avail' | 'reserved' | 'pending' | 'confirmed' | 'low';

@Component({
    selector: 'app-badge',
    imports: [CommonModule],
    template: `
    <span class="badge" [ngClass]="cssClass">
      <span class="material-icons-round text-[10px] leading-none">circle</span>
      {{ label }}
    </span>
  `
})
export class BadgeComponent {
  @Input() status = '';

  get variant(): BadgeVariant {
    const d = this.status.toLowerCase();
    if (d.includes('conf'))  return 'confirmed';
    if (d.includes('pend'))  return 'pending';
    if (d.includes('ocup') || d.includes('reserv') || d === '0' || d === 'no') return 'reserved';
    if (d.includes('baja'))  return 'low';
    return 'avail';
  }

  get label(): string {
    const v = this.variant;
    const map: Record<BadgeVariant, string> = {
      avail:     this.status || 'Disponible',
      reserved:  'Reservado',
      pending:   'Pendiente',
      confirmed: 'Confirmado',
      low:       'Baja disp.',
    };
    return map[v];
  }

  get cssClass(): string {
    return `badge-${this.variant}`;
  }
}
