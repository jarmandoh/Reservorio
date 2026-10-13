import { Routes } from '@angular/router';
import { customerGuard } from '../../core/guards/customer.guard';

export const customerRoutes: Routes = [
  {
    path: 'customer/login',
    loadComponent: () => import('../customer-login/customer-login.component').then(m => m.CustomerLoginComponent),
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
