import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-business-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="formGroup" (ngSubmit)="submit.emit()" class="grid gap-4">
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label">Nombre</label>
          <input class="form-input w-full" formControlName="name" />
        </div>
        <div>
          <label class="form-label">Categoría</label>
          <input class="form-input w-full" formControlName="category" />
        </div>
      </div>

      <div>
        <label class="form-label">Descripción</label>
        <textarea class="form-input w-full min-h-[108px]" formControlName="description"></textarea>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label">Ubicación</label>
          <input class="form-input w-full" formControlName="location" />
        </div>
        <div>
          <label class="form-label">PIN de negocio</label>
          <input type="password" class="form-input w-full" formControlName="pin" />
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label">Teléfono</label>
          <input class="form-input w-full" formControlName="phone" />
        </div>
        <div>
          <label class="form-label">Logo (URL)</label>
          <input class="form-input w-full" formControlName="logo" />
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label">Facebook</label>
          <input class="form-input w-full" formControlName="facebook" />
        </div>
        <div>
          <label class="form-label">Instagram</label>
          <input class="form-input w-full" formControlName="instagram" />
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label">TikTok</label>
          <input class="form-input w-full" formControlName="tiktok" />
        </div>
        <div>
          <label class="form-label">WhatsApp</label>
          <input class="form-input w-full" formControlName="whatsapp" />
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label">LinkedIn</label>
          <input class="form-input w-full" formControlName="linkedin" />
        </div>
        <div>
          <label class="form-label">Etiquetas</label>
          <input class="form-input w-full" formControlName="tags" placeholder="ej. peluquería, spa" />
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" class="btn-secondary" (click)="cancel.emit()">Cancelar</button>
        <button type="submit" class="btn-primary" [disabled]="isSubmitDisabled || saving">
          @if (saving) {
            Guardando…
          } @else {
            {{ submitLabel }}
          }
        </button>
      </div>
    </form>
  `,
})
export class BusinessFormComponent {
  @Input() formGroup!: FormGroup;
  @Input() submitLabel = 'Guardar negocio';
  @Input() saving = false;
  @Input() isSubmitDisabled = false;

  @Output() submit = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
