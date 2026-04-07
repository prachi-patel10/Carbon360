// my-action-vehicle.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MyActionVehicleService, VehicleTrip } from './my-action-vehicle-service';
import { Router } from '@angular/router';

interface VehicleTripDisplay extends VehicleTrip {
  runHours: string;
  status: string;
}

@Component({
  selector: 'app-my-action-vehicle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-action-vehicle.html',
  styleUrl: './my-action-vehicle.css',
})
export class MyActionVehicle implements OnInit {

  trips = signal<VehicleTripDisplay[]>([]);
  totalRecords = signal(0);
  currentPage = signal(1);
  pageSize = 10;
  sortColumn = 'EntryDate';
  sortDirection = 'DESC';
  userRole: string = '';

  constructor(
    private service: MyActionVehicleService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      this.userRole = parsed.currentRole?.toLowerCase() || '';
    }
    this.loadTrips();
  }

  openTrip(item: VehicleTripDisplay) {
    if (!item?.tripId) return;

    let mode = 'view';

    if (this.userRole === 'corporate' && item.statusId === 1) {
      mode = 'review';
    } else if (this.userRole === 'reporter' && item.statusId === 3) {
      mode = 'edit';
    }
    // All other combinations → view (readonly, no action buttons)

    this.router.navigate(
      ['/dashboard/vehicle-ec', item.tripId],
      { queryParams: { mode, page: 'myaction' } }
    );
  }

  editTrip(tripId: string) {
    const trip = this.trips().find(t => t.tripId === tripId);
    if (!trip) return;
    this.openTrip(trip);
  }

  loadTrips() {
    this.service.getTrips(
      this.currentPage(),
      this.pageSize,
      this.sortColumn,
      this.sortDirection
    ).subscribe(res => {
      const mapped = (res.data || []).map((t: VehicleTrip) => {
        let runHours = 0;
        if (t.tripStartDateTime && t.tripEndDateTime) {
          const start = new Date(t.tripStartDateTime).getTime();
          const end = new Date(t.tripEndDateTime).getTime();
          runHours = (end - start) / (1000 * 60 * 60);
        }
        return {
          ...t,
          runHours: runHours.toFixed(2),
          status:
            t.statusId === 1 ? 'Reported' :
              t.statusId === 2 ? 'Approved' :
                'Rejected'
        };
      });

      this.trips.set(mapped);
      this.totalRecords.set(res.totalRecords);
    });
  }

  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'ASC';
    }
    this.loadTrips();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '↕';
    return this.sortDirection === 'ASC' ? '↑' : '↓';
  }

  totalPages(): number {
    return Math.ceil(this.totalRecords() / this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadTrips();
  }

  changePageSize(event: any) {
    this.pageSize = Number(event.target.value);
    this.currentPage.set(1);
    this.loadTrips();
  }

  getStatusClass(statusId: number): string {
    switch (statusId) {
      case 1: return 'badge-reported';
      case 2: return 'badge-approved';
      case 3: return 'badge-rejected';
      default: return '';
    }
  }
}