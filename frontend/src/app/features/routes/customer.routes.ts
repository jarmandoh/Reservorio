import { Routes } from '@angular/router';
import { customerGuard } from '../../core/guards/customer.guard';

export const customerRoutes: Routes = [
  {
    path: 'usuario/auth',
    loadComponent: () => import('../usuario-auth/usuario-auth.component').then(m => m.UsuarioAuthComponent),
  },
  {
    path: 'customer/login',
    redirectTo: 'usuario/auth',
    pathMatch: 'full',
  },
  {
    path: 'customer/register',
    redirectTo: 'usuario/auth',
    pathMatch: 'full',
  },
  {
    path: 'customer/history',
    loadComponent: () => import('../customer/customer-history.component').then(m => m.CustomerHistoryComponent),
    canActivate: [customerGuard],
    canMatch: [customerGuard],
  },
  {
    path: 'customer/verify',
    loadComponent: () =>
      import('../customer-magic-verify/customer-magic-verify.component').then(m => m.CustomerMagicVerifyComponent),
  },
];
