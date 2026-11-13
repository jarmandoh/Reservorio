import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Categoria } from '../../../core/models/categorias.model';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-business-category-selector',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div [formGroup]="formGroup">
      @if (loading()) {
        <p class="text-sm text-on-surface-variant" role="status">Cargando categorías y oficios…</p>
      } @else if (loadError()) {
        <div class="grid gap-2">
          <p class="text-sm text-error" role="alert">
            No se pudo cargar el catálogo. Puedes guardar la categoría como texto y volver a clasificar el negocio
            después.
          </p>
          <label class="form-label" for="business-category-fallback">Categoría *</label>
          <input id="business-category-fallback" class="form-input" formControlName="category" required />
        </div>
      } @else {
        <input type="hidden" formControlName="category" />
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="form-label" for="business-category">Categoría general *</label>
            <select
              id="business-category"
              class="form-input"
              formControlName="categoryId"
              required
              (change)="onCategoryChanged()"
            >
              <option [ngValue]="null">Selecciona una categoría</option>
              @for (category of categories(); track category.id) {
                <option [ngValue]="category.id">{{ category.name }}</option>
              }
            </select>
          </div>

          @if (selectedCategory()?.children?.length) {
            <div>
              <label class="form-label" for="business-profession-category">
                Oficio o especialidad {{ formGroup.get('businessType')?.value === 'onsite_service' ? '*' : '' }}
              </label>
              <select
                id="business-profession-category"
                class="form-input"
                formControlName="professionCategoryId"
                (change)="onProfessionChanged()"
              >
                <option [ngValue]="null">Selecciona un oficio</option>
                @for (profession of selectedCategory()?.children ?? []; track profession.id) {
                  <option [ngValue]="profession.id">{{ profession.name }}</option>
                }
                <option [ngValue]="'other'">Otro (especificar)</option>
              </select>
            </div>
          }
        </div>

        @if (showCustomProfession()) {
          <div>
            <label class="form-label" for="business-profession">Profesión o especialidad *</label>
            <input
              id="business-profession"
              class="form-input"
              formControlName="profession"
              placeholder="Ej. técnico de estufas"
              maxlength="100"
            />
          </div>
        }
      }
    </div>
  `,
})
export class BusinessCategorySelectorComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) formGroup!: FormGroup;

  readonly categories = signal<Categoria[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  ngOnInit(): void {
    this.api
      .getCategoryTree()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: categories => {
          this.categories.set(categories);
          this.loading.set(false);
          this.restoreSelection();
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }

  selectedCategory(): Categoria | undefined {
    const categoryId = Number(this.formGroup.get('categoryId')?.value);
    return this.categories().find(category => category.id === categoryId);
  }

  showCustomProfession(): boolean {
    const businessType = this.formGroup.get('businessType')?.value;
    const professionCategoryId = this.formGroup.get('professionCategoryId')?.value;
    const category = this.selectedCategory();
    return (businessType === 'onsite_service' && !category?.children?.length) || professionCategoryId === 'other';
  }

  onCategoryChanged(): void {
    const category = this.selectedCategory();
    this.formGroup.patchValue({
      category: category?.name ?? '',
      professionCategoryId: null,
      profession: '',
    });
  }

  onProfessionChanged(): void {
    const professionId = Number(this.formGroup.get('professionCategoryId')?.value);
    const profession = this.selectedCategory()?.children?.find(item => item.id === professionId);
    this.formGroup.get('profession')?.setValue(profession?.name ?? '');
  }

  private restoreSelection(): void {
    const currentCategoryId = Number(this.formGroup.get('categoryId')?.value);
    const currentProfessionId = Number(this.formGroup.get('professionCategoryId')?.value);

    const normalize = (value: unknown) =>
      String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
    const categoryName = normalize(this.formGroup.get('category')?.value);
    const professionName = normalize(this.formGroup.get('profession')?.value);
    const category =
      this.categories().find(item => item.id === currentCategoryId) ??
      this.categories().find(item => normalize(item.name) === categoryName);
    const professionCategory = category?.children?.find(
      child => child.id === currentProfessionId || normalize(child.name) === professionName
    );
    if (professionCategory && category) {
      this.formGroup.patchValue({
        category: category.name,
        categoryId: category.id,
        profession: professionCategory.name,
        professionCategoryId: professionCategory.id,
      });
      return;
    }

    const legacyProfession = this.categories()
      .flatMap(parent => (parent.children ?? []).map(child => ({ parent, child })))
      .find(entry => normalize(entry.child.name) === categoryName || normalize(entry.child.name) === professionName);
    if (legacyProfession) {
      this.formGroup.patchValue({
        category: legacyProfession.parent.name,
        categoryId: legacyProfession.parent.id,
        profession: legacyProfession.child.name,
        professionCategoryId: legacyProfession.child.id,
      });
      return;
    }

    if (category) {
      this.formGroup.patchValue({ category: category.name, categoryId: category.id });
    }
  }
}
