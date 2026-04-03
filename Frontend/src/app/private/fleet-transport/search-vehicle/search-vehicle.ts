import { Component, HostListener, OnInit, ViewChild, signal } from '@angular/core';
import { FueltypeService } from '../../masters/fueltype/fueltype-service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SearchVehcileService } from './search-vehcile-service';
import { Router, ActivatedRoute } from '@angular/router';
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
  searchText = signal<string>('');

  // ── Fuel ──────────────────────────────────────────────────────
  fuelTypes: any[] = [];
  selectedFuels: string[] = [];
  fuelDropdownOpen = false;

  // ── Vehicle Category (static) ─────────────────────────────────
  vehicleCategories: { name: string }[] = [
    { name: 'LDV' },
    { name: 'MDV' },
    { name: 'HDV' }
  ];
  selectedCategories: string[] = [];
  categoryDropdownOpen = false;

  // ── Vehicle Type ──────────────────────────────────────────────
  vehicleTypes: any[] = [];
  selectedVehicles: string[] = [];
  vehicleDropdownOpen = false;

  chartCategory = signal<string | null>(null);

  // ── Dates ─────────────────────────────────────────────────────
  operationStartDate = signal<string | null>(null);
  operationEndDate = signal<string | null>(null);
  entryStartDate = signal<string | null>(null);
  entryEndDate = signal<string | null>(null);

  // ── Pagination / Sort ─────────────────────────────────────────
  loadingTrips: Record<string, boolean> = {};
  totalRecordsCount = signal<number>(0);
  pageSize = 10;
  sortColumn = 'entryDate';
  sortDirection = 'DESC';
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);

  private pendingChartParams: Record<string, any> | null = null;
  private fuelTypesLoaded = false;
  private vehicleTypesLoaded = false;

  constructor(
    private service: SearchVehcileService,
    private fuelService: FueltypeService,
    private vehicleService: VehicletypeService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  // ═══════════════════════════════════════════════════════════════
  //  LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.loadFuelTypes();
    this.loadVehicleTypes();

    this.route.queryParams.subscribe(params => {
      if (params['source'] === 'chart') {
        this.pendingChartParams = { ...params };
        this.applyChartParamsWhenReady();
      } else {
        this.loadTrips(1);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  CHART PARAM APPLICATION
  // ═══════════════════════════════════════════════════════════════

  private applyChartParamsWhenReady(): void {
    if (!this.fuelTypesLoaded || !this.vehicleTypesLoaded) return;
    const params = this.pendingChartParams;
    if (!params) return;
    this.pendingChartParams = null;
    this.applyChartParams(params);
    this.loadTrips(1);
  }

  private applyChartParams(params: Record<string, any>): void {

    // ── Reset all filters first so no stale values bleed in ──────
    this.selectedFuels = [];
    this.selectedVehicles = [];
    this.selectedCategories = [];
    this.chartCategory.set(null);
    this.searchText.set('');
    this.operationStartDate.set(null);
    this.operationEndDate.set(null);
    this.entryStartDate.set(null);   // ← always clear reported date
    this.entryEndDate.set(null);     // ← always clear reported date

    // ── vehicleCategory: stored in dedicated signal, not searchText ──
    if (params['vehicleCategory']) {
      this.chartCategory.set(params['vehicleCategory']);
    }

    // ── fuelType ────────────────────────────────────────────────
    if (params['fuelType']) {
      const raw = (params['fuelType'] as string).trim();
      const matched = this.fuelTypes.find(
        (f: any) => (f.fuel_name ?? '').toLowerCase() === raw.toLowerCase()
      );
      this.selectedFuels = [matched ? matched.fuel_name : raw];
    }

    // ── vehicleType ─────────────────────────────────────────────
    if (params['vehicleType']) {
      const rawList = (params['vehicleType'] as string)
        .split(',')
        .map((v: string) => v.trim())
        .filter((v: string) => v.length > 0);

      this.selectedVehicles = rawList.map((raw: string) => {
        const matched = this.vehicleTypes.find(
          (v: any) =>
            (v.vehicle_type_name ?? v.vehicleTypeName ?? v.name ?? '')
              .toLowerCase() === raw.toLowerCase()
        );
        return matched
          ? (matched.vehicle_type_name ?? matched.vehicleTypeName ?? matched.name)
          : raw;
      });
    }

    // ── free-text search ─────────────────────────────────────────
    if (params['search']) this.searchText.set(params['search']);

    // ── Operation date: apply if explicitly passed ───────────────
    if (params['opStart']) this.operationStartDate.set(params['opStart']);
    if (params['opEnd']) this.operationEndDate.set(params['opEnd']);
  }

  // ═══════════════════════════════════════════════════════════════
  //  API DATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private opStartForApi(): string | undefined {
    const v = this.operationStartDate();
    return v ? `${v}T00:00:00` : undefined;
  }

  private opEndForApi(): string | undefined {
    const v = this.operationEndDate();
    return v ? `${v}T23:59:59` : undefined;
  }

  private entryStartForApi(): string | undefined {
    const v = this.entryStartDate();
    return v ? `${v}T00:00:00` : undefined;
  }

  private entryEndForApi(): string | undefined {
    const v = this.entryEndDate();
    return v ? `${v}T23:59:59` : undefined;
  }

  // ═══════════════════════════════════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════════════════════════════════

  loadFuelTypes() {
    this.fuelService.getAll().subscribe({
      next: (res: any) => {
        this.fuelTypes = Array.isArray(res) ? res : res.data || [];
        this.fuelTypesLoaded = true;
        this.applyChartParamsWhenReady();
      },
      error: () => {
        this.fuelTypesLoaded = true;
        this.applyChartParamsWhenReady();
      }
    });
  }

  loadVehicleTypes() {
    this.vehicleService.getAll().subscribe({
      next: (res: any) => {
        this.vehicleTypes = Array.isArray(res) ? res : res.data || [];
        this.vehicleTypesLoaded = true;
        this.applyChartParamsWhenReady();
      },
      error: () => {
        this.vehicleTypesLoaded = true;
        this.applyChartParamsWhenReady();
      }
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
      this.selectedCategories.length > 0 ? this.selectedCategories : undefined,
      this.selectedVehicles.length > 0 ? this.selectedVehicles : undefined,
      this.opStartForApi() || undefined,
      this.opEndForApi() || undefined,
      this.entryStartForApi() || undefined,   // null when coming from category drill-down
      this.entryEndForApi() || undefined,   // null when coming from category drill-down
      this.chartCategory() || undefined
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
        const ct = res.headers.get('content-type');
        if (!ct || !ct.includes('application/pdf'))
          return res.text().then(text => { throw new Error(`Expected PDF but got: ${ct} — ${text}`); });
        return res.blob();
      })
      .then((blob: any) => {
        const now = new Date();
        const ds =
          now.getFullYear().toString() +
          String(now.getMonth() + 1).padStart(2, '0') +
          String(now.getDate()).padStart(2, '0') + '_' +
          String(now.getHours()).padStart(2, '0') +
          String(now.getMinutes()).padStart(2, '0') +
          String(now.getSeconds()).padStart(2, '0');
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Search_Fleet&Transport_${ds}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('PDF download error:', err);
        alert('PDF generation failed: ' + err.message);
      })
      .finally(() => { this.loadingTrips[tripId] = false; });
  }

  // ═══════════════════════════════════════════════════════════════
  //  DROPDOWN — CLOSE ON OUTSIDE CLICK
  // ═══════════════════════════════════════════════════════════════

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.fuel-multiselect')) this.fuelDropdownOpen = false;
    if (!(e.target as HTMLElement).closest('.category-multiselect')) this.categoryDropdownOpen = false;
    if (!(e.target as HTMLElement).closest('.vehicle-multiselect')) this.vehicleDropdownOpen = false;
  }

  // ═══════════════════════════════════════════════════════════════
  //  FUEL MULTI-SELECT
  // ═══════════════════════════════════════════════════════════════

  toggleFuelDropdown() { this.fuelDropdownOpen = !this.fuelDropdownOpen; }

  isFuelSelected(name: string): boolean { return this.selectedFuels.includes(name); }

  toggleFuel(name: string) {
    const idx = this.selectedFuels.indexOf(name);
    if (idx > -1) this.selectedFuels.splice(idx, 1); else this.selectedFuels.push(name);
    this.currentPage.set(1);
    this.loadTrips(1);
  }

  toggleSelectAll() {
    this.selectedFuels = this.selectedFuels.length === this.fuelTypes.length
      ? []
      : this.fuelTypes.map((f: any) => f.fuel_name);
    this.loadTrips(1);
  }

  clearFuels() { this.selectedFuels = []; this.loadTrips(1); }

  // ═══════════════════════════════════════════════════════════════
  //  VEHICLE CATEGORY MULTI-SELECT
  // ═══════════════════════════════════════════════════════════════

  toggleCategoryDropdown() { this.categoryDropdownOpen = !this.categoryDropdownOpen; }

  isCategorySelected(name: string): boolean { return this.selectedCategories.includes(name); }

  toggleCategory(name: string) {
    const idx = this.selectedCategories.indexOf(name);
    if (idx > -1) this.selectedCategories.splice(idx, 1); else this.selectedCategories.push(name);
    this.currentPage.set(1);
    this.loadTrips(1);
  }

  toggleSelectAllCategories() {
    this.selectedCategories = this.selectedCategories.length === this.vehicleCategories.length
      ? []
      : this.vehicleCategories.map(c => c.name);
    this.loadTrips(1);
  }

  clearCategories() { this.selectedCategories = []; this.loadTrips(1); }

  // ═══════════════════════════════════════════════════════════════
  //  VEHICLE TYPE MULTI-SELECT
  // ═══════════════════════════════════════════════════════════════

  toggleVehicleDropdown() { this.vehicleDropdownOpen = !this.vehicleDropdownOpen; }

  isVehicleSelected(name: string): boolean { return this.selectedVehicles.includes(name); }

  toggleVehicle(name: string) {
    const idx = this.selectedVehicles.indexOf(name);
    if (idx > -1) this.selectedVehicles.splice(idx, 1); else this.selectedVehicles.push(name);
    this.currentPage.set(1);
    this.loadTrips(1);
  }

  toggleSelectAllVehicles() {
    this.selectedVehicles = this.selectedVehicles.length === this.vehicleTypes.length
      ? []
      : this.vehicleTypes.map((v: any) => v.vehicle_type_name);
    this.loadTrips(1);
  }

  clearVehicles() { this.selectedVehicles = []; this.loadTrips(1); }

  // ═══════════════════════════════════════════════════════════════
  //  SEARCH
  // ═══════════════════════════════════════════════════════════════

  onSearch(event: any) {
    this.searchText.set(event.target.value);
    this.currentPage.set(1);
    this.loadTrips(1);
  }

  // ═══════════════════════════════════════════════════════════════
  //  DATE RANGE EVENTS
  // ═══════════════════════════════════════════════════════════════

  onOperationDateRangeSelected(range: { startDate: Date | null; endDate: Date | null }) {
    this.operationStartDate.set(range.startDate ? this.toDateStr(range.startDate) : null);
    this.operationEndDate.set(range.endDate ? this.toDateStr(range.endDate) : null);
    this.loadTrips(1);
  }

  onEntryDateRangeSelected(range: { startDate: Date | null; endDate: Date | null }) {
    this.entryStartDate.set(range.startDate ? this.toDateStr(range.startDate) : null);
    this.entryEndDate.set(range.endDate ? this.toDateStr(range.endDate) : null);
    this.loadTrips(1);
  }

  private toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  // ═══════════════════════════════════════════════════════════════
  //  RESET
  // ═══════════════════════════════════════════════════════════════

  resetFilters() {
    this.selectedFuels = []; this.fuelDropdownOpen = false;
    this.selectedCategories = []; this.categoryDropdownOpen = false;
    this.selectedVehicles = []; this.vehicleDropdownOpen = false;
    this.chartCategory.set(null);
    this.searchText.set('');
    this.operationStartDate.set(null); this.operationEndDate.set(null);
    this.entryStartDate.set(null); this.entryEndDate.set(null);
    this.currentPage.set(1);
    this.opDatePicker?.reset();
    this.entryDatePicker?.reset();
    this.loadTrips(1);
  }

  // ═══════════════════════════════════════════════════════════════
  //  PAGINATION
  // ═══════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════
  //  SORT
  // ═══════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════════════════════════

  openTrip(tripId: string) {
    if (!tripId) return;
    this.router.navigate(
      ['/dashboard/vehicle-ec', tripId],
      { queryParams: { mode: 'view', page: 'search' } } 
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  EXPORT EXCEL
  // ═══════════════════════════════════════════════════════════════

  exportExcel() {
    this.service.exportExcel(
      this.searchText() || undefined,
      this.selectedFuels.length > 0 ? this.selectedFuels : undefined,
      this.selectedCategories.length > 0 ? this.selectedCategories : undefined,
      this.selectedVehicles.length > 0 ? this.selectedVehicles : undefined,
      this.opStartForApi() || undefined,
      this.opEndForApi() || undefined,
      this.entryStartForApi() || undefined,
      this.entryEndForApi() || undefined,
      this.sortColumn,
      this.sortDirection
    ).subscribe(blob => {
      const file = new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(file);
      const a = document.createElement('a');
      const now = new Date();
      const fmt =
        ('0' + now.getDate()).slice(-2) +
        ('0' + (now.getMonth() + 1)).slice(-2) +
        now.getFullYear() + '_' +
        ('0' + now.getHours()).slice(-2) +
        ('0' + now.getMinutes()).slice(-2) +
        ('0' + now.getSeconds()).slice(-2);
      a.download = `Search_Fleet&Transport_${fmt}.xlsx`;
      a.href = url;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  clearChartCategory() {
    this.chartCategory.set(null);
    this.currentPage.set(1);
    this.loadTrips(1);
  }
}