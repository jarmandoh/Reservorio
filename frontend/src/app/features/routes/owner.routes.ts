import { Routes } from '@angular/router';
import { ownerGuard } from '../../core/guards/owner.guard';

export const ownerRoutes: Routes = [
  {
    path: 'propietario/auth',
    loadComponent: () => import('../owner-auth/owner-auth.component').then(m => m.OwnerAuthComponent),
  },
  {
    path: 'propietario/login',
    redirectTo: 'propietario/auth',
    pathMatch: 'full',
  },
  {
    path: 'propietario/register',
    redirectTo: 'propietario/auth',
    pathMatch: 'full',
  },
  {
    path: 'propietario/dashboard',
    loadComponent: () => import('../owner-dashboard/owner-dashboard.component').then(m => m.OwnerDashboardComponent),
    canActivate: [ownerGuard],
    canMatch: [ownerGuard],
  },
  {
    path: 'propietario/business/:businessId',
    loadComponent: () => import('../business-admin/business-admin.component').then(m => m.BusinessAdminComponent),
    canActivate: [ownerGuard],
  },
];
