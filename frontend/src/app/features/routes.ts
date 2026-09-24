import { Routes } from '@angular/router';
import { adminGuard } from '../core/guards/admin.guard';
import { businessGuard } from '../core/guards/business.guard';
import { ownerGuard } from '../core/guards/owner.guard';
import { customerGuard } from '../core/guards/customer.guard';

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
    canMatch: [ownerGuard],
  },
  {
    path: 'customer/login',
    loadComponent: () => import('./customer-login/customer-login.component').then(m => m.CustomerLoginComponent),
  },
  {
    path: 'customer/history',
    loadComponent: () => import('./customer/customer-history.component').then(m => m.CustomerHistoryComponent),
    canActivate: [customerGuard],
    canMatch: [customerGuard],
  },
  {
    path: 'customer/verify',
    loadComponent: () => import('./customer-magic-verify/customer-magic-verify.component').then(m => m.CustomerMagicVerifyComponent),
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
  {
    path: 'payment/success',
    loadComponent: () => import('./payment-success/payment-success.component').then(m => m.PaymentSuccessComponent),
  },
  {
    path: 'payment/cancel',
    loadComponent: () => import('./payment-cancel/payment-cancel.component').then(m => m.PaymentCancelComponent),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./privacy/privacy.component').then(m => m.PrivacyPolicyComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./not-found/not-found.component').then(m => m.NotFoundComponent),
  },
];
