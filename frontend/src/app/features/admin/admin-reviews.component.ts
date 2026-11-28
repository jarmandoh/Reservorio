import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AdminReview } from '../../core/models/reservation.model';
import { formatDateTime } from '../../core/config/date-time';

@Component({
  selector: 'app-admin-reviews',
  imports: [CommonModule],
  templateUrl: './admin-reviews.component.html',
})
export class AdminReviewsComponent {
  readonly formatDateTime = formatDateTime;
  @Input() reviews: AdminReview[] = [];
  @Input() loading = false;
  @Input() deletingReviewId: number | null = null;
  @Output() deleteReview = new EventEmitter<number>();
}
