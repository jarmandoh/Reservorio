import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Business } from '../../../core/models/business.model';

@Component({
  selector: 'app-business-list',
  template: `
    <div class="grid gap-4">
      @for (negocio of businesses; track negocio.id) {
        <div class="card p-5 sm:flex sm:items-center sm:justify-between gap-4">
          <div>
            <h3 class="font-semibold text-lg">{{ negocio.name }}</h3>
            <p class="text-sm text-on-surface-variant">{{ negocio.category }} · {{ negocio.location }}</p>
          </div>
          <div class="flex gap-2">
            <button class="btn-secondary" (click)="view.emit(negocio)">Ver reservas</button>
            <button class="btn-tertiary" (click)="edit.emit(negocio)">Editar</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [],
})
export class BusinessListComponent {
  @Input() businesses: Business[] = [];
  @Output() view = new EventEmitter<Business>();
  @Output() edit = new EventEmitter<Business>();
}
