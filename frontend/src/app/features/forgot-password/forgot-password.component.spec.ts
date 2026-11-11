import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  function setup(auth: { requestPasswordReset: ReturnType<typeof vi.fn> }, role: string | null = null) {
    TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => role } } } },
      ],
    });
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.detectChanges();
    return { fixture, auth };
  }

  it('does not submit when email is invalid', () => {
    const auth = { requestPasswordReset: vi.fn().mockReturnValue(of(undefined)) };
    const { fixture } = setup(auth);
    fixture.componentInstance.form.controls.email.setValue('not-an-email');
    fixture.componentInstance.submit();
    expect(auth.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('calls requestPasswordReset with the entered email', () => {
    const auth = { requestPasswordReset: vi.fn().mockReturnValue(of(undefined)) };
    const { fixture } = setup(auth);
    fixture.componentInstance.form.controls.email.setValue('ana@example.com');
    fixture.componentInstance.submit();
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('ana@example.com', 'customer');
  });

  it('shows a generic confirmation message after submit', () => {
    const auth = { requestPasswordReset: vi.fn().mockReturnValue(of(undefined)) };
    const { fixture } = setup(auth);
    fixture.componentInstance.form.controls.email.setValue('ana@example.com');
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(fixture.componentInstance.notice()).toContain('Si el correo electrónico está registrado');
  });

  it('preserves the owner role when requesting a recovery email', () => {
    const auth = { requestPasswordReset: vi.fn().mockReturnValue(of(undefined)) };
    const { fixture } = setup(auth, 'owner');
    fixture.componentInstance.form.controls.email.setValue('comercio@example.com');
    fixture.componentInstance.submit();
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('comercio@example.com', 'owner');
  });

  it('shows request failures instead of reporting a successful submission', () => {
    const auth = {
      requestPasswordReset: vi.fn().mockReturnValue(throwError(() => new Error('Servicio no disponible'))),
    };
    const { fixture } = setup(auth);
    fixture.componentInstance.form.controls.email.setValue('ana@example.com');
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.error()).toBe('Servicio no disponible');
    expect(fixture.componentInstance.notice()).toBeNull();
  });
});
