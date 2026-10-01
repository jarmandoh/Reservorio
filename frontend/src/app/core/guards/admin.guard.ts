import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Si el token es inválido o expirado, cierra la sesión y redirige al home;
  // si nunca hubo sesión, redirige al login para permitir autenticarse.
  const purged = auth.purgeInvalidTokens();
  const hasJwt = !!auth.getAdminToken();
  const hasLegacy = auth.isUnlocked();

  if (hasJwt || hasLegacy) return true;

  if (purged.length > 0) router.navigate(['/']);
  else router.navigate(['/jh-login']);
  return false;
};
