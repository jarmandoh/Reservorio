import { Routes } from '@angular/router';
import { businessGuard } from '../../core/guards/business.guard';

export const businessRoutes: Routes = [
  {
    path: 'business/:businessId/login',
    loadComponent: () => import('../business-login/business-login.component').then(m => m.BusinessLoginComponent),
  },
  {
    path: 'business/:businessId/admin',
    loadComponent: () => import('../business-admin/business-admin.component').then(m => m.BusinessAdminComponent),
    canActivate: [businessGuard],
  },
];
