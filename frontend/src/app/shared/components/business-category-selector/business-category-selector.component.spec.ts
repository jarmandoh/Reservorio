import { FormControl, FormGroup, Validators } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { BusinessCategorySelectorComponent } from './business-category-selector.component';

describe('BusinessCategorySelectorComponent', () => {
  let http: HttpTestingController;
  const formGroup = new FormGroup({
    category: new FormControl('', { nonNullable: true, validators: Validators.required }),
    categoryId: new FormControl<number | null>(null),
    professionCategoryId: new FormControl<number | string | null>(null),
    businessType: new FormControl('onsite_service'),
    profession: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  beforeEach(() => {
    formGroup.reset({
      category: '',
      categoryId: null,
      professionCategoryId: null,
      businessType: 'onsite_service',
      profession: '',
    });
    TestBed.configureTestingModule({
      imports: [BusinessCategorySelectorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('updates legacy text values and links the selected category to its profession', () => {
    const fixture = TestBed.createComponent(BusinessCategorySelectorComponent);
    fixture.componentRef.setInput('formGroup', formGroup);
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/categories/tree`).flush({
      data: [
        {
          id: 1,
          name: 'Reparaciones del hogar',
          children: [{ id: 8, name: 'Electricista' }],
        },
      ],
    });
    fixture.detectChanges();

    const selectOption = (selectId: string, optionLabel: string) => {
      const select = fixture.nativeElement.querySelector(`#${selectId}`) as HTMLSelectElement;
      const option = Array.from(select.options).find(item => item.textContent?.trim() === optionLabel);
      if (!option) throw new Error(`Option not found: ${optionLabel}`);
      select.value = option.value;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };

    selectOption('business-category', 'Reparaciones del hogar');
    expect(formGroup.get('category')?.value).toBe('Reparaciones del hogar');
    expect(formGroup.get('categoryId')?.value).toBe(1);

    selectOption('business-profession-category', 'Electricista');
    expect(formGroup.get('profession')?.value).toBe('Electricista');
    expect(formGroup.get('professionCategoryId')?.value).toBe(8);
    expect(formGroup.valid).toBe(true);
  });
});
