import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label" for="business-type">Tipo de negocio</label>
          <select
            id="business-type"
            class="form-input w-full"
            formControlName="businessType"
            (change)="updateProfessionValidators()"
          >
            <option value="appointment">Negocio con agenda</option>
            <option value="onsite_service">Prestador de servicio presencial</option>
          </select>
        </div>
        @if (formGroup.get('businessType')?.value === 'onsite_service') {
          <div>
            <label class="form-label" for="business-profession">Profesión</label>
            <input
              id="business-profession"
              class="form-input w-full"
              formControlName="profession"
              placeholder="Ej. electricista, ebanista, cerrajero"
              required
              maxlength="100"
            />
          </div>
        }
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
export class BusinessFormComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  @Input() formGroup!: FormGroup;
  @Input() submitLabel = 'Guardar negocio';
  @Input() saving = false;
  @Input() isSubmitDisabled = false;

  @Output() submit = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  ngOnInit(): void {
    this.formGroup
      .get('businessType')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateProfessionValidators());
    this.updateProfessionValidators();
  }

  updateProfessionValidators(): void {
    const profession = this.formGroup.get('profession');
    if (!profession) return;

    if (this.formGroup.get('businessType')?.value === 'onsite_service') {
      profession.setValidators([Validators.required, Validators.maxLength(100)]);
    } else {
      profession.clearValidators();
    }
    profession.updateValueAndValidity({ emitEvent: false });
  }
}
