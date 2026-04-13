import { Component, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { InitialsPipe } from '../../../shared/pipes/pipes';

const PAGE_TITLES: Record<string, string> = {
  home: 'Overview',
  inbox: 'Inbox',
  broadcast: 'Broadcasts',
  templates: 'Templates',
  contacts: 'Contacts',
  whatsapp: 'WhatsApp',
  settings: 'Settings',
};

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    InitialsPipe,
    TitleCasePipe,
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
})
export class DashboardLayoutComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly pageTitle = signal('Overview');

  readonly nav = [
    { path: '/home', label: 'Overview', icon: '◎' },
    { path: '/inbox', label: 'Inbox', icon: '◇' },
    { path: '/broadcast', label: 'Broadcasts', icon: '▤' },
    { path: '/templates', label: 'Templates', icon: '▢' },
    { path: '/contacts', label: 'Contacts', icon: '☰' },
    { path: '/whatsapp', label: 'WhatsApp', icon: '◉' },
    { path: '/settings', label: 'Settings', icon: '⚙' },
  ];

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.syncTitle());
    this.syncTitle();
  }

  private syncTitle(): void {
    const parts = this.router.url.split('?')[0].split('/').filter(Boolean);
    const key = parts[0] ?? 'home';
    this.pageTitle.set(PAGE_TITLES[key] ?? 'Overview');
  }

  logout(): void {
    this.auth.logout();
  }
}
