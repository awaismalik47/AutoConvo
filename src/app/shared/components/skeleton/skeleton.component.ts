import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
})
export class SkeletonComponent {
  @Input() gap = 10;
  @Input() rows: { h: number; w: string; r?: number }[] = [
    { h: 16, w: '60%' },
    { h: 14, w: '80%' },
    { h: 14, w: '40%' },
  ];
}
