import { Routes } from '@angular/router';

export const publicRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'booking/:businessId',
    loadComponent: () => import('../booking/booking.component').then(m => m.BookingComponent),
  },
  {
    path: 'business/:businessId',
    pathMatch: 'full',
    loadComponent: () => import('../business-page/business-page.component').then(m => m.BusinessPageComponent),
  },
  {
    path: 'account/create',
    loadComponent: () => import('../account-create/account-create.component').then(m => m.AccountCreateComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('../account-create/account-create.component').then(m => m.AccountCreateComponent),
  },
  {
    path: 'payment/success',
    loadComponent: () => import('../payment-success/payment-success.component').then(m => m.PaymentSuccessComponent),
  },
  {
    path: 'payment/cancel',
    loadComponent: () => import('../payment-cancel/payment-cancel.component').then(m => m.PaymentCancelComponent),
  },
  {
    path: 'privacy',
    loadComponent: () => import('../privacy/privacy.component').then(m => m.PrivacyPolicyComponent),
  },
  {
    path: 'store/:businessId',
    loadComponent: () => import('../storefront/storefront.component').then(m => m.StorefrontComponent),
  },
  {
    path: 'test',
    loadComponent: () => import('../test/test.component').then(m => m.TestComponent),
  },
];
