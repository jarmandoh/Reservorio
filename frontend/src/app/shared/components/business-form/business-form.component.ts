import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-business-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="formGroup" (ngSubmit)="formSubmit.emit()" class="grid gap-4">
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label" for="business-name">Nombre</label>
          <div class="icon-field">
            <span class="material-icons-round" aria-hidden="true">store</span>
            <input id="business-name" class="form-input" formControlName="name" />
          </div>
        </div>
        <div>
          <label class="form-label" for="business-category">Categoría</label>
          <div class="icon-field">
            <span class="material-icons-round" aria-hidden="true">category</span>
            <input id="business-category" class="form-input" formControlName="category" />
          </div>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label" for="business-type">Tipo de negocio</label>
          <div class="icon-field">
            <span class="material-icons-round" aria-hidden="true">tune</span>
            <select
              id="business-type"
              class="form-input"
              formControlName="businessType"
              (change)="updateProfessionValidators()"
            >
              <option value="appointment">Negocio con agenda</option>
              <option value="onsite_service">Prestador de servicio presencial</option>
            </select>
          </div>
        </div>
        @if (formGroup.get('businessType')?.value === 'onsite_service') {
          <div>
            <label class="form-label" for="business-profession">Profesión</label>
            <div class="icon-field">
              <span class="material-icons-round" aria-hidden="true">work</span>
              <input
                id="business-profession"
                class="form-input"
                formControlName="profession"
                placeholder="Ej. electricista, ebanista, cerrajero"
                required
                maxlength="100"
              />
            </div>
          </div>
        }
      </div>

      <div>
        <label class="form-label" for="business-description">Descripción</label>
        <textarea
          id="business-description"
          class="form-input w-full min-h-[108px]"
          formControlName="description"
        ></textarea>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label" for="business-location">Ubicación</label>
          <div class="icon-field">
            <span class="material-icons-round" aria-hidden="true">place</span>
            <input id="business-location" class="form-input" formControlName="location" />
          </div>
        </div>
        <div>
          <label class="form-label" for="business-pin">PIN de negocio</label>
          <div class="icon-field has-toggle">
            <span class="material-icons-round" aria-hidden="true">lock</span>
            <input
              id="business-pin"
              [type]="showPin() ? 'text' : 'password'"
              class="form-input"
              formControlName="pin"
              autocomplete="new-password"
            />
            <button
              type="button"
              class="password-toggle"
              [attr.aria-label]="showPin() ? 'Ocultar PIN' : 'Mostrar PIN'"
              [attr.aria-pressed]="showPin()"
              (click)="togglePin()"
            >
              <span class="material-icons-round" aria-hidden="true">{{
                showPin() ? 'visibility_off' : 'visibility'
              }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label" for="business-phone">Teléfono</label>
          <div class="icon-field">
            <span class="material-icons-round" aria-hidden="true">phone</span>
            <input id="business-phone" class="form-input" formControlName="phone" autocomplete="tel" />
          </div>
        </div>
        <div>
          <label class="form-label" for="business-logo">Logo (URL)</label>
          <div class="icon-field">
            <span class="material-icons-round" aria-hidden="true">image</span>
            <input id="business-logo" class="form-input" formControlName="logo" />
          </div>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label" for="business-facebook">Facebook</label>
          <div class="icon-field">
            <span class="material-icons-round" aria-hidden="true">link</span>
            <input id="business-facebook" class="form-input" formControlName="facebook" />
          </div>
        </div>
        <div>
          <label class="form-label" for="business-instagram">Instagram</label>
          <div class="icon-field">
            <span class="material-icons-round" aria-hidden="true">link</span>
            <input id="business-instagram" class="form-input" formControlName="instagram" />
          </div>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label" for="business-tiktok">TikTok</label>
          <div class="icon-field">
            <span class="material-icons-round" aria-hidden="true">link</span>
            <input id="business-tiktok" class="form-input" formControlName="tiktok" />
          </div>
        </div>
        <div>
          <label class="form-label" for="business-whatsapp">WhatsApp</label>
          <div class="icon-field">
            <span class="material-icons-round" aria-hidden="true">chat</span>
            <input id="business-whatsapp" class="form-input" formControlName="whatsapp" />
          </div>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label" for="business-linkedin">LinkedIn</label>
          <div class="icon-field">
            <span class="material-icons-round" aria-hidden="true">link</span>
            <input id="business-linkedin" class="form-input" formControlName="linkedin" />
          </div>
        </div>
        <div>
          <label class="form-label" for="business-tags">Etiquetas</label>
          <div class="icon-field">
            <span class="material-icons-round" aria-hidden="true">sell</span>
            <input id="business-tags" class="form-input" formControlName="tags" placeholder="ej. peluquería, spa" />
          </div>
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

  @Output() formSubmit = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  readonly showPin = signal(false);

  togglePin(): void {
    this.showPin.update(v => !v);
  }

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
