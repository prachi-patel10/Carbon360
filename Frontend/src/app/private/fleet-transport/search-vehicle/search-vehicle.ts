import { Component, HostListener, OnInit, ViewChild, signal } from '@angular/core';
import { FueltypeService } from '../../masters/fueltype/fueltype-service';
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

  @ViewChild('opDatePicker') opDatePicker!: DateRangePickerComponent;
  @ViewChild('entryDatePicker') entryDatePicker!: DateRangePickerComponent;

  emissions = signal<VehicleEmissionDisplay[]>([]);
  filteredData = signal<VehicleEmissionDisplay[]>([]);

  searchText = signal<string>('');

  // Fuel multi-select
  fuelTypes: any[] = [];
  selectedFuels: string[] = [];
  fuelDropdownOpen = false;

  // Operation Date Range
  operationStartDate = signal<string | null>(null);
  operationEndDate = signal<string | null>(null);

  // Entry Date Range
  entryStartDate = signal<string | null>(null);
  entryEndDate = signal<string | null>(null);

  totalRecordsCount = signal<number>(0);
  pageSize = 10;
  sortColumn = 'entryDate';
  sortDirection = 'DESC';
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);

  constructor(
    private service: SearchVehcileService,
    private fuelService: FueltypeService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadTrips();
    this.loadFuelTypes();
  }

  // ─── Data Loading ─────────────────────────────────────────────

  loadFuelTypes() {
    this.fuelService.getAll().subscribe({
      next: (res: any) => {
        this.fuelTypes = Array.isArray(res) ? res : res.data || [];
      },
      error: (err) => console.error('Error loading fuel types', err)
    });
  }

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

  // ─── Fuel Multi-Select ────────────────────────────────────────

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.fuel-multiselect'))
      this.fuelDropdownOpen = false;
  }

  toggleFuelDropdown() {
    this.fuelDropdownOpen = !this.fuelDropdownOpen;
  }

  toggleFuel(name: string) {
    const idx = this.selectedFuels.indexOf(name);
    if (idx > -1) this.selectedFuels.splice(idx, 1);
    else this.selectedFuels.push(name);
    this.applyFilters();
  }

  isFuelSelected(name: string): boolean {
    return this.selectedFuels.includes(name);
  }

  toggleSelectAll() {
    if (this.selectedFuels.length === this.fuelTypes.length)
      this.selectedFuels = [];
    else
      this.selectedFuels = this.fuelTypes.map((f: any) => f.fuel_name);
    this.applyFilters();
  }

  clearFuels() {
    this.selectedFuels = [];
    this.applyFilters();
  }

  // ─── Search ───────────────────────────────────────────────────

  onSearch(event: any) {
    this.searchText.set(event.target.value);
    this.applyFilters();
  }

  // ─── Date Range ───────────────────────────────────────────────

  onOperationDateRangeSelected(range: { startDate: Date | null, endDate: Date | null }) {
    this.operationStartDate.set(range.startDate ? range.startDate.toISOString() : null);
    this.operationEndDate.set(range.endDate ? range.endDate.toISOString() : null);
    this.currentPage.set(1);
    this.applyFilters();
  }

  onEntryDateRangeSelected(range: { startDate: Date | null, endDate: Date | null }) {
    this.entryStartDate.set(range.startDate ? range.startDate.toISOString() : null);
    this.entryEndDate.set(range.endDate ? range.endDate.toISOString() : null);
    this.currentPage.set(1);
    this.applyFilters();
  }

  // ─── Reset ────────────────────────────────────────────────────

  resetFilters() {
    this.selectedFuels = [];
    this.fuelDropdownOpen = false;
    this.searchText.set('');
    this.operationStartDate.set(null);
    this.operationEndDate.set(null);
    this.entryStartDate.set(null);
    this.entryEndDate.set(null);
    this.currentPage.set(1);
    this.opDatePicker?.reset();
    this.entryDatePicker?.reset();
    this.filteredData.set(this.emissions());
  }

  // ─── Filters ──────────────────────────────────────────────────

  applyFilters() {
    const sText = this.searchText().toLowerCase();

    const opStart = this.operationStartDate();
    const opEnd = this.operationEndDate();
    const enStart = this.entryStartDate();
    const enEnd = this.entryEndDate();

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
        this.selectedFuels.length === 0 ||
        this.selectedFuels.map(f => f.toLowerCase())
          .includes(e.fuelType.toLowerCase());

      let matchesOperationDate = true;
      const tripStart = new Date(e.tripStartDateTime);
      const tripEnd = new Date(e.tripEndDateTime);
      if (opStartDate && tripEnd < opStartDate) matchesOperationDate = false;
      if (opEndDate && tripStart > opEndDate) matchesOperationDate = false;

      let matchesEntryDate = true;
      const entryDate = new Date(e.entryDate);
      if (enStartDate && entryDate < enStartDate) matchesEntryDate = false;
      if (enEndDate && entryDate > enEndDate) matchesEntryDate = false;

      return matchesSearch && matchesFuel && matchesOperationDate && matchesEntryDate;
    });

    this.filteredData.set(filtered);
  }

  // ─── Pagination ───────────────────────────────────────────────

  paginatedData() { return this.filteredData(); }
  totalRecords() { return this.totalRecordsCount(); }

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

  // ─── Sort ─────────────────────────────────────────────────────

  sort(column: string) {
    if (this.sortColumn === column)
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    else {
      this.sortColumn = column;
      this.sortDirection = 'ASC';
    }
    this.loadTrips();
  }

  // ─── Navigation ───────────────────────────────────────────────

  openTrip(tripId: string) {
    if (!tripId) return;
    this.router.navigate(
      ['/dashboard/vehicle-ec', tripId],
      { queryParams: { source: 'search' } }
    );
  }
}