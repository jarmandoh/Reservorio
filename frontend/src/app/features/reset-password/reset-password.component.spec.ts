import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  function setup(authOverride: any = {}) {
    const auth = {
      supabase: {
        onAuthStateChange: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
      },
      updatePassword: vi.fn().mockReturnValue(of(undefined)),
      ...authOverride,
    };
    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
      ],
    });
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();
    return { fixture, auth };
  }

  it('renders the form when a session is available', async () => {
    const { fixture } = setup();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.ready()).toBe(true);
  });

  it('does not submit when the form is invalid', () => {
    const { fixture, auth } = setup();
    fixture.componentInstance.form.controls.password.setValue('short');
    fixture.componentInstance.form.controls.confirmPassword.setValue('short');
    fixture.componentInstance.submit();
    expect(auth.updatePassword).not.toHaveBeenCalled();
  });

  it('shows mismatch error when passwords differ', () => {
    const { fixture } = setup();
    fixture.componentInstance.form.controls.password.setValue('Abcdef1!ghij');
    fixture.componentInstance.form.controls.confirmPassword.setValue('different');
    fixture.componentInstance.form.controls.confirmPassword.markAsTouched();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.hasError('mismatch')).toBe(true);
    expect(fixture.componentInstance.passwordsMatch()).toBe(false);
  });

  it('updates strength and matching indicators as the password changes', () => {
    const { fixture } = setup();
    fixture.componentInstance.form.controls.password.setValue('Abcdef1!ghij');
    fixture.componentInstance.form.controls.confirmPassword.setValue('Abcdef1!ghij');

    expect(fixture.componentInstance.strength()).toBe(5);
    expect(fixture.componentInstance.strengthLabel()).toBe('Alta');
    expect(fixture.componentInstance.passwordsMatch()).toBe(true);
  });

  it('calls updatePassword with the new password on valid submit', async () => {
    const { fixture, auth } = setup();
    await fixture.whenStable();
    fixture.detectChanges();
    const pwd = 'StrongPass1!abc';
    fixture.componentInstance.form.controls.password.setValue(pwd);
    fixture.componentInstance.form.controls.confirmPassword.setValue(pwd);
    fixture.componentInstance.submit();
    expect(auth.updatePassword).toHaveBeenCalledWith(pwd);
  });

  it('shows an error message when updatePassword fails', async () => {
    const auth = {
      supabase: {
        onAuthStateChange: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
      },
      updatePassword: vi.fn().mockReturnValue(throwError(() => new Error('Token expirado'))),
    };
    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
      ],
    });
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const pwd = 'StrongPass1!abc';
    fixture.componentInstance.form.controls.password.setValue(pwd);
    fixture.componentInstance.form.controls.confirmPassword.setValue(pwd);
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(fixture.componentInstance.error()).toBe('Token expirado');
  });
});
