import { Component, HostListener, OnInit, ViewChild, signal } from '@angular/core';
import { FueltypeService } from '../../masters/fueltype/fueltype-service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SearchVehcileService } from './search-vehcile-service';
import { Router, ActivatedRoute } from '@angular/router';   // ← added ActivatedRoute
import { DateRangePickerComponent } from '../../../public/date-range-picker-component/date-range-picker-component';
import { TripService } from '../vehicle-ec/vehicle-service-ec';
import { VehicletypeService } from '../vehicletype/vehicletype-service';

interface VehicleEmissionDisplay {
  tripId: string;
  reportId: string;
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
  // filteredData = signal<VehicleEmissionDisplay[]>([]);
  searchText = signal<string>('');

  fuelTypes: any[] = [];
  selectedFuels: string[] = [];
  fuelDropdownOpen = false;

  operationStartDate = signal<string | null>(null);
  operationEndDate = signal<string | null>(null);
  entryStartDate = signal<string | null>(null);
  entryEndDate = signal<string | null>(null);

  selectedFuelType: string = 'All';
  loadingTrips: Record<string, boolean> = {};
  vehicleTypes: any[] = [];
  selectedVehicles: string[] = [];
  vehicleDropdownOpen = false;

  totalRecordsCount = signal<number>(0);
  pageSize = 10;
  sortColumn = 'entryDate';
  sortDirection = 'DESC';
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);


  constructor(
    private service: SearchVehcileService,
    private fuelService: FueltypeService,
    private vehicleService: VehicletypeService,
    private router: Router,
    private route: ActivatedRoute      // ← added
  ) { }

  // ── ngOnInit: reads chart query params, pre-fills filters, then loads ──
  ngOnInit(): void {
    this.loadFuelTypes();
    this.loadVehicleTypes();

    this.route.queryParams.subscribe(params => {
      if (params['source'] === 'chart') {
        if (params['fuelType']) this.selectedFuels = [params['fuelType']];
        if (params['vehicleType']) this.selectedVehicles = [params['vehicleType']];
        if (params['search']) this.searchText.set(params['search']);

        if (params['startDate']) this.operationStartDate.set(params['startDate']);
        if (params['endDate']) this.operationEndDate.set(params['endDate'] + 'T23:59:59');
        if (params['entryStartDate']) this.entryStartDate.set(params['entryStartDate']);
        if (params['entryEndDate']) this.entryEndDate.set(params['entryEndDate'] + 'T23:59:59');
        // Reported date range (entry date)
        if (params['reportedStartDate']) this.entryStartDate.set(params['reportedStartDate']);
        if (params['reportedEndDate']) this.entryEndDate.set(params['reportedEndDate'] + 'T23:59:59');
      }
      this.loadTrips(1);
    });
  }


  // ─── Data Loading ────

  loadFuelTypes() {
    this.fuelService.getAll().subscribe({
      next: (res: any) => { this.fuelTypes = Array.isArray(res) ? res : res.data || []; },
      error: (err) => console.error('Error loading fuel types', err)
    });
  }
  loadVehicleTypes() {
    this.vehicleService.getAll().subscribe({
      next: (res: any) => { this.vehicleTypes = Array.isArray(res) ? res : res.data || []; },
      error: (err) => console.error('Error loading vehicle types', err)
    });
  }

  loadTrips(page: number) {
    this.service.searchTrips(
      page,
      this.pageSize,
      this.sortColumn,
      this.sortDirection,
      this.searchText() || undefined,
      this.selectedFuels.length > 0 ? this.selectedFuels : undefined,
      this.selectedVehicles.length > 0 ? this.selectedVehicles : undefined,
      this.operationStartDate() || undefined,
      this.operationEndDate() || undefined,
      this.entryStartDate() || undefined,
      this.entryEndDate() || undefined
    ).subscribe({
      next: (res: any) => {
        const mapped: VehicleEmissionDisplay[] = (res.data || []).map((e: any) => ({
          tripId: e.tripId,
          reportId: e.reportId,
          vehicleNumber: e.vehicleNumber ?? '',
          vehicleType: e.vehicleType ?? '',
          fuelType: e.fuelType ?? '',
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

        this.emissions.set(mapped);
        this.totalRecordsCount.set(res.totalRecords ?? mapped.length);
        this.totalPages.set(Math.ceil((res.totalRecords ?? mapped.length) / this.pageSize));
        this.currentPage.set(page);
      },
      error: (err) => console.error('Error loading trips', err)
    });
  }

  isLoading(tripId: string): boolean { return !!this.loadingTrips[tripId]; }


  // getEmissionClass(value: number): string {
  //   if (value <= 100)  return 'emission-low';
  //   if (value <= 500)  return 'emission-moderate';
  //   if (value <= 1000) return 'emission-high';
  //   if (value <= 5000) return 'emission-very-high';
  //   return 'emission-critical';
  // }

  // getEmissionLabel(value: number): string {
  //   if (value <= 100)  return '🟢 Low Emission';
  //   if (value <= 500)  return '🟡 Moderate Emission';
  //   if (value <= 1000) return '🟠 High Emission';
  //   if (value <= 5000) return '🔴 Very High Emission';
  //   return '🔴 Critical Emission';
  // }

  downloadTrip(tripId: string) {
    if (!tripId) return;
    this.loadingTrips[tripId] = true;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:5236/api/VehicleTripEmission/trip-pdf/${tripId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) return res.text().then(text => { throw new Error(`Server error ${res.status}: ${text}`); });
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/pdf'))
          return res.text().then(text => { throw new Error(`Expected PDF but got: ${contentType} — ${text}`); });
        return res.blob();
      })
      .then((blob: any) => {
        const now = new Date();
        const dateStr = now.getFullYear().toString() +
          String(now.getMonth() + 1).padStart(2, '0') +
          String(now.getDate()).padStart(2, '0') + '_' +
          String(now.getHours()).padStart(2, '0') +
          String(now.getMinutes()).padStart(2, '0') +
          String(now.getSeconds()).padStart(2, '0');
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `Search_Fleet&Transport_${dateStr}.pdf`;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link); window.URL.revokeObjectURL(url);
      })
      .catch(err => { console.error('PDF download error:', err); alert('PDF generation failed: ' + err.message); })
      .finally(() => { this.loadingTrips[tripId] = false; });
  }

  // ─── Fuel Multi-Select ────────────────────────────────────────

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.fuel-multiselect')) this.fuelDropdownOpen = false;
    if (!(e.target as HTMLElement).closest('.vehicle-multiselect')) this.vehicleDropdownOpen = false;
  }

  toggleFuelDropdown() { this.fuelDropdownOpen = !this.fuelDropdownOpen; }
  toggleVehicleDropdown() { this.vehicleDropdownOpen = !this.vehicleDropdownOpen; }

  toggleFuel(name: string) {
    const idx = this.selectedFuels.indexOf(name);
    if (idx > -1) this.selectedFuels.splice(idx, 1); else this.selectedFuels.push(name);
    this.currentPage.set(1);
    this.loadTrips(1);
  }

  toggleVehicle(name: string) {
    const idx = this.selectedVehicles.indexOf(name);
    if (idx > -1) this.selectedVehicles.splice(idx, 1); else this.selectedVehicles.push(name);
    this.currentPage.set(1);
    this.loadTrips(1);
  }

  isFuelSelected(name: string): boolean { return this.selectedFuels.includes(name); }
  isVehicleSelected(name: string): boolean { return this.selectedVehicles.includes(name); }

  toggleSelectAll() {
    this.selectedFuels = this.selectedFuels.length === this.fuelTypes.length
      ? []
      : this.fuelTypes.map((f: any) => f.fuel_name);
    this.loadTrips(1);
  }

  toggleSelectAllVehicles() {
    this.selectedVehicles = this.selectedVehicles.length === this.vehicleTypes.length
      ? []
      : this.vehicleTypes.map((v: any) => v.vehicle_type_name);
    this.loadTrips(1);
  }

  clearFuels() { this.selectedFuels = []; this.loadTrips(1); }
  clearVehicles() { this.selectedVehicles = []; this.loadTrips(1); }

  // ─── Search ───────────────────────────────────────────────────

  onSearch(event: any) {
    this.searchText.set(event.target.value);
    this.currentPage.set(1);
    this.loadTrips(1);
  }

  // ─── Date Range ───────────────────────────────────────────────

  onOperationDateRangeSelected(range: { startDate: Date | null, endDate: Date | null }) {
    this.operationStartDate.set(range.startDate ? range.startDate.toISOString() : null);
    this.operationEndDate.set(range.endDate ? range.endDate.toISOString() : null);
    this.loadTrips(1);
  }

  onEntryDateRangeSelected(range: { startDate: Date | null, endDate: Date | null }) {
    this.entryStartDate.set(range.startDate ? range.startDate.toISOString() : null);
    this.entryEndDate.set(range.endDate ? range.endDate.toISOString() : null);
    this.loadTrips(1);
  }

  // ─── Reset ────────────────────────────────────────────────────
  resetFilters() {
    this.selectedFuels = []; this.fuelDropdownOpen = false;
    this.selectedVehicles = []; this.vehicleDropdownOpen = false;
    this.searchText.set('');
    this.operationStartDate.set(null); this.operationEndDate.set(null);
    this.entryStartDate.set(null); this.entryEndDate.set(null);
    this.currentPage.set(1);

    this.opDatePicker?.reset();
    this.entryDatePicker?.reset();

    this.loadTrips(1);
  }


  // ─── Filters ──────────────────────────────────────────────────
  // applyFilters() {
  //   const sText = this.searchText().toLowerCase();
  //   const opStartDate = this.operationStartDate() ? new Date(this.operationStartDate()!) : null;
  //   const opEndDate = this.operationEndDate() ? new Date(this.operationEndDate()!) : null;
  //   if (opEndDate) opEndDate.setHours(23, 59, 59, 999);
  //   const enStartDate = this.entryStartDate() ? new Date(this.entryStartDate()!) : null;
  //   const enEndDate = this.entryEndDate() ? new Date(this.entryEndDate()!) : null;
  //   if (enEndDate) enEndDate.setHours(23, 59, 59, 999);

  //   const filtered = this.emissions().filter(e => {
  //     const matchesSearch =
  //       e.vehicleNumber.toLowerCase().includes(sText) ||
  //       e.vehicleType.toLowerCase().includes(sText) ||
  //       e.fuelType.toLowerCase().includes(sText);

  //     const matchesFuel =
  //       this.selectedFuels.length === 0 ||
  //       this.selectedFuels.map(f => f.toLowerCase()).includes(e.fuelType.toLowerCase());

  //     const tripStart = new Date(e.tripStartDateTime);
  //     const tripEnd = new Date(e.tripEndDateTime);
  //     let matchesOperation = true;
  //     if (opStartDate && tripEnd < opStartDate) matchesOperation = false;
  //     if (opEndDate && tripStart > opEndDate) matchesOperation = false;

  //     const entry = new Date(e.entryDate);
  //     let matchesEntry = true;
  //     if (enStartDate && entry < enStartDate) matchesEntry = false;
  //     if (enEndDate && entry > enEndDate) matchesEntry = false;

  //     const matchesVehicle =
  //       this.selectedVehicles.length === 0 ||
  //       this.selectedVehicles
  //         .map(v => v.toLowerCase())
  //         .includes(e.vehicleType.toLowerCase());

  //     return matchesSearch && matchesFuel && matchesVehicle && matchesOperation && matchesEntry;
  //   });

  //   this.filteredData.set(filtered);
  //   this.totalRecordsCount.set(filtered.length);
  //   this.totalPages.set(Math.ceil(filtered.length / this.pageSize));
  //   this.currentPage.set(1);
  // }

  // ─── Pagination ───────────────────────────────────────────────

  paginatedData(): VehicleEmissionDisplay[] { return this.emissions(); }

  totalRecords(): number { return this.totalRecordsCount(); }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.loadTrips(page);
  }

  changePageSize(event: any) {
    this.pageSize = Number(event.target.value);
    this.loadTrips(1);
  }

  // ─── Sort ─────────────────────────────────────────────────────
  sort(column: string) {
    if (this.sortColumn === column)
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    else { this.sortColumn = column; this.sortDirection = 'ASC'; }
    this.loadTrips(1);
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '↕';
    return this.sortDirection === 'ASC' ? '↑' : '↓';
  }

  // ─── Navigation ───────────────────────────────────────────────
  openTrip(tripId: string) {
    if (!tripId) return;
    this.router.navigate(['/dashboard/vehicle-ec', tripId], { queryParams: { source: 'search' } });
  }

  // ─── Export Excel ─────────────────────────────────────────────
  exportExcel() {
    this.service.exportExcel(
      this.searchText() || undefined,
      this.selectedFuels.length > 0 ? this.selectedFuels : undefined,
      this.selectedVehicles.length > 0 ? this.selectedVehicles : undefined,
      this.operationStartDate() || undefined,
      this.operationEndDate() || undefined,
      this.entryStartDate() || undefined,
      this.entryEndDate() || undefined,
      this.sortColumn,
      this.sortDirection
    ).subscribe(blob => {
      const file = new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(file);
      const a = document.createElement('a');
      const now = new Date();
      const formatted =
        ('0' + now.getDate()).slice(-2) +
        ('0' + (now.getMonth() + 1)).slice(-2) +
        now.getFullYear() + '_' +
        ('0' + now.getHours()).slice(-2) +
        ('0' + now.getMinutes()).slice(-2) +
        ('0' + now.getSeconds()).slice(-2);
      a.download = `Search_Fleet&Transport_${formatted}.xlsx`;
      a.href = url; a.click(); window.URL.revokeObjectURL(url);
    });
  }
}



