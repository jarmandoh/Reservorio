import { Routes } from '@angular/router';
import { adminGuard } from '../core/guards/admin.guard';
import { businessGuard } from '../core/guards/business.guard';
import { ownerGuard } from '../core/guards/owner.guard';

export const featureRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'booking/:businessId',
    loadComponent: () => import('./booking/booking.component').then(m => m.BookingComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'owner/register',
    loadComponent: () => import('./owner-register/owner-register.component').then(m => m.OwnerRegisterComponent),
  },
  {
    path: 'owner/login',
    loadComponent: () => import('./owner-login/owner-login.component').then(m => m.OwnerLoginComponent),
  },
  {
    path: 'owner/dashboard',
    loadComponent: () => import('./owner-dashboard/owner-dashboard.component').then(m => m.OwnerDashboardComponent),
    canActivate: [ownerGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent),
    canActivate: [adminGuard],
  },
  {
    path: 'business/:businessId/login',
    loadComponent: () => import('./business-login/business-login.component').then(m => m.BusinessLoginComponent),
  },
  {
    path: 'business/:businessId/admin',
    loadComponent: () => import('./business-admin/business-admin.component').then(m => m.BusinessAdminComponent),
    canActivate: [businessGuard],
  },
  {
    path: 'owner/business/:businessId',
    loadComponent: () => import('./business-admin/business-admin.component').then(m => m.BusinessAdminComponent),
    canActivate: [ownerGuard],
  },
  { path: '**', redirectTo: '' },
];
