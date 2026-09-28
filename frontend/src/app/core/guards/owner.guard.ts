import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const ownerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Token inválido o expirado -> cierra sesión y redirige al home;
  // sin sesión previa -> redirige al login de owner.
  const purged = auth.purgeInvalidTokens();
  if (auth.isOwnerUnlocked()) return true;

  if (purged.length > 0) router.navigate(['/']);
  else router.navigate(['/owner/login']);
  return false;
};
