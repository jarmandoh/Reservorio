import { Routes } from '@angular/router';
import { adminGuard }    from './core/guards/admin.guard';
import { businessGuard } from './core/guards/business.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'booking/:businessId',
    loadComponent: () =>
      import('./features/booking/booking.component').then(m => m.BookingComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [adminGuard],
  },
  {
    path: 'business/:businessId/login',
    loadComponent: () =>
      import('./features/business-login/business-login.component').then(m => m.BusinessLoginComponent),
  },
  {
    path: 'business/:businessId/admin',
    loadComponent: () =>
      import('./features/business-admin/business-admin.component').then(m => m.BusinessAdminComponent),
    canActivate: [businessGuard],
  },
  {
    path: 'ux-tips',
    loadComponent: () =>
      import('./features/ux-tips/ux-tips.component').then(m => m.UxTipsComponent),
  },
  { path: '**', redirectTo: '' },
];
