import { Routes } from '@angular/router';
import { ownerGuard } from '../../core/guards/owner.guard';

export const ownerRoutes: Routes = [
  {
    path: 'owner/register',
    loadComponent: () => import('../owner-register/owner-register.component').then(m => m.OwnerRegisterComponent),
  },
  {
    path: 'owner/login',
    loadComponent: () => import('../owner-login/owner-login.component').then(m => m.OwnerLoginComponent),
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
