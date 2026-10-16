import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Business } from '../../core/models/business.model';
import { filterBusinesses } from './admin.selectors';

@Component({
  selector: 'app-admin-businesses',
  imports: [CommonModule],
  templateUrl: './admin-businesses.component.html',
})
export class AdminBusinessesComponent {
  @Input() adminToken: string | null = null;
  @Input() adminError: string | null = null;
  @Input() businesses: Business[] = [];
  @Input() businessesLoading = false;
  @Input() searchQuery = '';
  @Input() filterStatus = '';
  @Input() togglingBusiness: string | null = null;
  @Input() verifyingBusiness: string | null = null;
  @Input() deletingBusiness: string | null = null;
  @Output() retry = new EventEmitter<void>();
  @Output() editBusiness = new EventEmitter<Business | null>();
  @Output() toggleBusiness = new EventEmitter<string>();
  @Output() verifyBusiness = new EventEmitter<string>();
  @Output() deleteBusiness = new EventEmitter<string>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() statusChange = new EventEmitter<string>();

  filteredBusinesses(): Business[] {
    return filterBusinesses(this.businesses, this.searchQuery, this.filterStatus);
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }
}
