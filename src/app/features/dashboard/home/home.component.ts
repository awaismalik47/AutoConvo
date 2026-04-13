import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import type { ChartDataPoint, DashboardStats } from '../../../core/models';
import { SkeletonCardComponent } from '../../../shared/components/skeleton/skeleton-card.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

const EMPTY_STATS: DashboardStats = {
  totalSent: 0,
  deliveryRate: 0,
  totalConversations: 0,
  totalContacts: 0,
  sentDelta: 0,
  deliveryDelta: 0,
  conversationsDelta: 0,
  contactsDelta: 0,
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DecimalPipe, SkeletonCardComponent, SkeletonComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly api = inject(ApiService);

  readonly loading = signal(true);
  readonly stats = signal<DashboardStats | null>(null);
  readonly chartPoints = signal<ChartDataPoint[]>([]);

  readonly chartMax = computed(() => {
    const rows = this.chartPoints();
    if (!rows.length) return 1;
    return Math.max(
      ...rows.flatMap((r) => [r.sent, r.delivered]),
      1
    );
  });

  constructor() {
    forkJoin({
      stats: this.api
        .getAnalyticsDashboard()
        .pipe(catchError(() => of(null))),
      chart: this.api
        .getAnalyticsMessagesChart(7)
        .pipe(catchError(() => of([] as ChartDataPoint[]))),
    }).subscribe(({ stats, chart }) => {
      this.stats.set(stats ?? EMPTY_STATS);
      this.chartPoints.set(chart ?? []);
      this.loading.set(false);
    });
  }

  barPct(value: number): number {
    return Math.round((value / this.chartMax()) * 100);
  }

  deltaClass(n: number): string {
    if (n > 0) return 'is-up';
    if (n < 0) return 'is-down';
    return '';
  }
}
