import { Component, OnInit, signal } from '@angular/core';
import { VehicleService } from '../vehicles/vehicle-service';
import { TripService } from '../vehicle-ec/vehicle-service-ec';
import { FueltypeService } from '../../masters/fueltype/fueltype-service'; // Added FueltypeService
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SearchVehcileService } from './search-vehcile-service';
import { Router } from '@angular/router';
import { DateRangePickerComponent } from '../../../public/date-range-picker-component/date-range-picker-component';

interface VehicleEmissionDisplay {
  tripId: string;
  vehicleNumber: string;
  vehicleType: string;
  fuelType: string;
  distanceKm: number;
  fuelConsumedLtr: number;
  tripStartDateTime: string;
  tripEndDateTime: string;
  statusId: number;
  entryDate: string;

  totalCO2: number;
  totalNO2: number;
  totalCH4: number;
  totalEmission: number;
}

@Component({
  selector: 'app-search-vehicle',
  standalone: true,
  imports: [FormsModule, CommonModule, DateRangePickerComponent],
  templateUrl: './search-vehicle.html',
  styleUrls: ['./search-vehicle.css'],
})

export class SearchVehicle implements OnInit {

  emissions = signal<VehicleEmissionDisplay[]>([]);
  filteredData = signal<VehicleEmissionDisplay[]>([]);

  searchText = signal<string>('');
  selectedFuelType: string = 'All';

  // Operation Date Range
  operationStartDate = signal<string | null>(null);
  operationEndDate = signal<string | null>(null);

  // Entry Date Range
  entryStartDate = signal<string | null>(null);
  entryEndDate = signal<string | null>(null);

  // --- Added fuelTypes property ---
  fuelTypes: any[] = [];

  totalRecordsCount = signal<number>(0);

  filterStartDate = signal<string | null>(null);
  filterEndDate = signal<string | null>(null);
  pageSizeOptions = [5, 10, 15, 20];
  pageSize = 10;
  sortColumn = 'entryDate';
  sortDirection = 'DESC';
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);

  selectedRecord: VehicleEmissionDisplay | null = null;

  constructor(
    private service: SearchVehcileService,
    private fuelService: FueltypeService, // <-- Inject FueltypeService
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadTrips();
    this.loadFuelTypes(); // <-- load fuel types on init
  }

  // --- Added method to fetch fuel types ---
  loadFuelTypes() {
    this.fuelService.getAll().subscribe({
      next: (res: any) => {
        this.fuelTypes = Array.isArray(res) ? res : res.data || [];
      },
      error: (err) => console.error('Error loading fuel types', err)
    });
  }

  /*SORTING*/
  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'ASC';
    }
    this.loadTrips();
  }

  /*LOAD DATA*/
  loadTrips() {
    this.service.searchTrips(
      this.currentPage(),
      this.pageSize,
      this.sortColumn,
      this.sortDirection
    ).subscribe({
      next: (res: any) => {
        const mapped: VehicleEmissionDisplay[] = res.data.map((e: any) => ({
          tripId: e.tripId,
          vehicleNumber: e.vehicleNumber,
          vehicleType: e.vehicleType,
          fuelType: e.fuelType,
          entryDate: e.entryDate,
          distanceKm: e.distanceKm ?? 0,
          fuelConsumedLtr: e.fuelConsumedLtr ?? 0,
          statusId: e.statusId,
          tripStartDateTime: e.tripStartDateTime,
          tripEndDateTime: e.tripEndDateTime,
          totalCO2: e.totalCO2 ?? 0,
          totalNO2: e.totalNO2 ?? 0,
          totalCH4: e.totalCH4 ?? 0,
          totalEmission: e.totalEmission ?? 0
        }));

        // Sort by entryDate descending
        const sorted = mapped.sort((a, b) =>
          new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
        );

        this.emissions.set(sorted);
        this.filteredData.set(sorted);
        this.totalPages.set(Math.ceil(res.totalRecords / res.pageSize));
        this.totalRecordsCount.set(res.totalRecords);

        this.applyFilters();
      },
      error: err => console.error('Error loading vehicle trips', err)
    });
  }

  /*FILTER EVENTS*/
  onSearch(event: any) {
    this.searchText.set(event.target.value);
    this.applyFilters();
  }

  onFuelTypeChange(event: any) {
    this.selectedFuelType = event.target.value;
    this.applyFilters();
  }

  onStartDateChange(event: any) {
    this.filterStartDate.set(event.target.value || null);
    this.applyFilters();
  }

  onEndDateChange(event: any) {
    this.filterEndDate.set(event.target.value || null);
    this.applyFilters();
  }

  onTripDateRangeSelected(event: any) {
    this.filterStartDate.set(event.startDate || null);
    this.filterEndDate.set(event.endDate || null);
    this.currentPage.set(1);
    this.applyFilters();
  }

  /*APPLY FILTER*/
  applyFilters() {
    const sText = this.searchText().toLowerCase();
    const fuel = this.selectedFuelType;

    const opStart = this.operationStartDate();
    const opEnd = this.operationEndDate();
    const enStart = this.entryStartDate();
    const enEnd = this.entryEndDate();

    // Convert end dates to include full day
    const opStartDate = opStart ? new Date(opStart) : null;
    const opEndDate = opEnd ? new Date(opEnd) : null;
    if (opEndDate) opEndDate.setHours(23, 59, 59, 999);

    const enStartDate = enStart ? new Date(enStart) : null;
    const enEndDate = enEnd ? new Date(enEnd) : null;
    if (enEndDate) enEndDate.setHours(23, 59, 59, 999);

    const filtered = this.emissions().filter(e => {
      const matchesSearch =
        e.vehicleNumber.toLowerCase().includes(sText) ||
        e.vehicleType.toLowerCase().includes(sText) ||
        e.fuelType.toLowerCase().includes(sText);

      const matchesFuel =
        fuel === 'All' || e.fuelType.toLowerCase() === fuel.toLowerCase();

      // Operation Date Filter
      let matchesOperationDate = true;
      const tripStart = new Date(e.tripStartDateTime);
      const tripEnd = new Date(e.tripEndDateTime);

      // Trip overlaps selected operation range
      if (opStartDate && tripEnd < opStartDate) matchesOperationDate = false;
      if (opEndDate && tripStart > opEndDate) matchesOperationDate = false;

      // Entry Date Filter
      let matchesEntryDate = true;
      const entryDate = new Date(e.entryDate);

      if (enStartDate && entryDate < enStartDate) matchesEntryDate = false;
      if (enEndDate && entryDate > enEndDate) matchesEntryDate = false;

      return matchesSearch && matchesFuel && matchesOperationDate && matchesEntryDate;
    });

    // this.totalPages.set(Math.ceil(filtered.length / this.pageSize));
    this.filteredData.set(filtered);
  }


  /*================= PAGINATION =================*/
  paginatedData() {
    return this.filteredData();
  }

  totalRecords() {
  return this.totalRecordsCount();
}

  goToPage(page: number) {
  if (page < 1 || page > this.totalPages()) return;
  this.currentPage.set(page);
  this.loadTrips();
}

  nextPage() {
  if (this.currentPage() < this.totalPages()) {
    this.currentPage.update(v => v + 1);
    this.loadTrips();
  }
}

  previousPage() {
  if (this.currentPage() > 1) {
    this.currentPage.update(v => v - 1);
    this.loadTrips();
  }
}

  openTrip(tripId: string) {
    if (!tripId) return;
    this.router.navigate(
      ['/dashboard/vehicle-ec', tripId],
      { queryParams: { source: 'search' } }
    );
  }

  getPages(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages(); i++) {
      pages.push(i);
    }
    return pages;
  }

  changePageSize(event: any) {
  this.pageSize = Number(event.target.value);
  this.currentPage.set(1); // reset to first page
  this.loadTrips(); // reload API with new size
}

  onOperationDateRangeSelected(event: any) {
    this.operationStartDate.set(event.startDate || null);
    this.operationEndDate.set(event.endDate || null);
    this.currentPage.set(1);
    this.applyFilters();
  }

  onEntryDateRangeSelected(event: any) {
    this.entryStartDate.set(event.startDate || null);
    this.entryEndDate.set(event.endDate || null);
    this.currentPage.set(1);
    this.applyFilters();
  }
}