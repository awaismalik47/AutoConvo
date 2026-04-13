import { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'inbox',
    loadComponent: () =>
      import('./inbox/inbox.component').then((m) => m.InboxComponent),
  },
  {
    path: 'broadcast',
    loadComponent: () =>
      import('./broadcast/broadcast.component').then((m) => m.BroadcastComponent),
  },
  {
    path: 'templates',
    loadComponent: () =>
      import('./templates/templates.component').then((m) => m.TemplatesComponent),
  },
  {
    path: 'contacts',
    loadComponent: () =>
      import('./contacts/contacts.component').then((m) => m.ContactsComponent),
  },
  {
    path: 'whatsapp',
    loadComponent: () =>
      import('./whatsapp/whatsapp.component').then((m) => m.WhatsappComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./settings/settings.component').then((m) => m.SettingsComponent),
  },
];
