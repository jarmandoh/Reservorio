import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin.guard';

export const adminRoutes: Routes = [
  {
    path: 'jh-login',
    loadComponent: () => import('../login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'admin',
    loadComponent: () => import('../admin/admin.component').then(m => m.AdminComponent),
    canActivate: [adminGuard],
  },
];
