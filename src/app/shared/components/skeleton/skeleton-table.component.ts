import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-table',
  standalone: true,
  templateUrl: './skeleton-table.component.html',
  styleUrl: './skeleton-table.component.scss',
})
export class SkeletonTableComponent {
  @Input() count = 6;
  @Input() cols = ['20%', '30%', '20%', '15%', '15%'];

  get rowPlaceholders(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}
