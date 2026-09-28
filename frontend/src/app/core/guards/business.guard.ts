import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const businessGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const businessId = route.params['businessId'] as string;

  // Token inválido o expirado -> cierra sesión y redirige al home;
  // sin sesión previa -> redirige al login del negocio para permitir autenticarse.
  const purged = auth.purgeInvalidTokens();
  if (auth.isBusinessUnlocked(businessId)) return true;

  if (purged.length > 0) router.navigate(['/']);
  else router.navigate(['/business', businessId, 'login']);
  return false;
};
