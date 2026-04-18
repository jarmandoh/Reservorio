import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const businessGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth       = inject(AuthService);
  const router     = inject(Router);
  const businessId = route.params['businessId'] as string;

  if (auth.isBusinessUnlocked(businessId)) return true;

  router.navigate(['/business', businessId, 'login']);
  return false;
};
