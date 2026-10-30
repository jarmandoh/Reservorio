import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const customerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Los guards devuelven el destino para que Angular gestione una sola navegación.
  // Navegar de forma imperativa y devolver `false` puede competir con el login
  // cuando la sesión caduca mientras el historial está cargando.
  const purged = auth.purgeInvalidTokens();
  if (auth.isCustomerUnlocked()) return true;

  return purged.length > 0 ? router.parseUrl('/') : router.parseUrl('/usuario/auth');
};
