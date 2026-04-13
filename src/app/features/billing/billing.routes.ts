import { Routes } from '@angular/router';

/**
 * Public routes for Stripe redirect URLs (success / cancel / landing).
 * Must match URLs configured with Stripe checkout & billing portal.
 */
export const billingRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./billing-page.component').then((m) => m.BillingPageComponent),
  },
  {
    path: 'success',
    loadComponent: () =>
      import('./billing-success.component').then((m) => m.BillingSuccessComponent),
  },
  {
    path: 'cancel',
    loadComponent: () =>
      import('./billing-cancel.component').then((m) => m.BillingCancelComponent),
  },
];
