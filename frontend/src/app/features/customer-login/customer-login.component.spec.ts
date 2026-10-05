import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { CustomerLoginComponent } from './customer-login.component';

describe('CustomerLoginComponent form', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CustomerLoginComponent],
      providers: [
        { provide: AuthService, useValue: { isCustomerUnlocked: vi.fn().mockReturnValue(false) } },
        { provide: ApiService, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: Router, useValue: { navigate: vi.fn(), navigateByUrl: vi.fn() } },
      ],
    });
  });

  it('keeps submission disabled for invalid email and short phone number', () => {
    const fixture = TestBed.createComponent(CustomerLoginComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.controls.email.setValue('not-an-email');
    component.form.controls.phone.setValue('123');
    fixture.detectChanges();

    expect(component.form.invalid).toBe(true);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
  });

  it('enables submission once email and phone satisfy the form validators', () => {
    const fixture = TestBed.createComponent(CustomerLoginComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.controls.email.setValue('cliente@example.com');
    component.form.controls.phone.setValue('+573001234567');
    fixture.detectChanges();

    expect(component.form.valid).toBe(true);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });
});
