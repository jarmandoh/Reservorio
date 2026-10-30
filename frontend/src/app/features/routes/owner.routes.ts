import { Routes } from '@angular/router';
import { ownerGuard } from '../../core/guards/owner.guard';

export const ownerRoutes: Routes = [
  {
    path: 'owner/auth',
    loadComponent: () => import('../owner-auth/owner-auth.component').then(m => m.OwnerAuthComponent),
  },
  {
    path: 'owner/login',
    redirectTo: 'owner/auth',
    pathMatch: 'full',
  },
  {
    path: 'owner/register',
    redirectTo: 'owner/auth',
    pathMatch: 'full',
  },
  {
    path: 'owner/dashboard',
    loadComponent: () => import('../owner-dashboard/owner-dashboard.component').then(m => m.OwnerDashboardComponent),
    canActivate: [ownerGuard],
    canMatch: [ownerGuard],
  },
  {
    path: 'owner/business/:businessId',
    loadComponent: () => import('../business-admin/business-admin.component').then(m => m.BusinessAdminComponent),
    canActivate: [ownerGuard],
  },
];
