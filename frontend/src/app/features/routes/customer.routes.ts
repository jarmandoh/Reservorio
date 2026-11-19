import { Routes } from '@angular/router';
import { customerGuard } from '../../core/guards/customer.guard';

export const customerRoutes: Routes = [
  // Acceso y autenticación de clientes
  {
    path: 'usuario/auth',
    loadComponent: () => import('../usuario-auth/usuario-auth.component').then(m => m.UsuarioAuthComponent),
  },

  // Redirecciones de compatibilidad y enlaces previos
  { path: 'customer/login', redirectTo: 'usuario/auth', pathMatch: 'full' },
  { path: 'customer/register', redirectTo: 'usuario/auth', pathMatch: 'full' },
  { path: 'customer/dashboard', redirectTo: 'usuario/dashboard', pathMatch: 'full' },
  { path: 'customer/history', redirectTo: 'usuario/dashboard/historial', pathMatch: 'full' },
  { path: 'dashboard', redirectTo: 'usuario/dashboard', pathMatch: 'full' },
  { path: 'historial', redirectTo: 'usuario/dashboard/historial', pathMatch: 'full' },
  { path: 'favoritos', redirectTo: 'usuario/dashboard/favoritos', pathMatch: 'full' },
  { path: 'perfil', redirectTo: 'usuario/dashboard/perfil', pathMatch: 'full' },
  { path: 'usuario/dashboard/reservas', redirectTo: 'usuario/dashboard', pathMatch: 'full' },

  // Panel del cliente (RUTAS PROTEGIDAS)
  {
    path: 'usuario/dashboard',
    loadComponent: () => import('../customer/customer-shell.component').then(m => m.CustomerShellComponent),
    canActivate: [customerGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('../customer/customer-dashboard.component').then(m => m.CustomerDashboardComponent),
      },
      {
        path: 'historial',
        loadComponent: () =>
          import('../customer/customer-history.component').then(m => m.CustomerHistoryComponent),
      },
      {
        path: 'favoritos',
        loadComponent: () =>
          import('../customer/components/customer-favorites.component').then(m => m.CustomerFavoritesComponent),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('../customer/customer-profile.component').then(m => m.CustomerProfileComponent),
      },
    ],
  },
];
