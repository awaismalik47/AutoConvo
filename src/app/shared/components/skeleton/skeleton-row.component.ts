import { Component, Input } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

@Component({
  selector: 'app-skeleton-row',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './skeleton-row.component.html',
  styleUrl: './skeleton-row.component.scss',
})
export class SkeletonRowComponent {
  @Input() count = 5;

  get rowPlaceholders(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}
