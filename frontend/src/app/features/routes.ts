import { Routes } from '@angular/router';
import { adminRoutes } from './routes/admin.routes';
import { businessRoutes } from './routes/business.routes';
import { customerRoutes } from './routes/customer.routes';
import { ownerRoutes } from './routes/owner.routes';
import { publicRoutes } from './routes/public.routes';

/** Composición de rutas por dominio. Mantener la ruta comodín al final. */
export const featureRoutes: Routes = [
  ...publicRoutes,
  ...customerRoutes,
  ...ownerRoutes,
  ...businessRoutes,
  ...adminRoutes,
  {
    path: '**',
    loadComponent: () => import('./not-found/not-found.component').then(m => m.NotFoundComponent),
  },
];
