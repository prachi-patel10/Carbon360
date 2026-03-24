import { Component, HostListener, OnInit, ViewChild, signal } from '@angular/core';
import { FueltypeService } from '../../masters/fueltype/fueltype-service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SearchVehcileService } from './search-vehcile-service';
import { Router, ActivatedRoute } from '@angular/router';   // ← added ActivatedRoute
import { DateRangePickerComponent } from '../../../public/date-range-picker-component/date-range-picker-component';

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

  emissions    = signal<VehicleEmissionDisplay[]>([]);
  filteredData = signal<VehicleEmissionDisplay[]>([]);
  searchText   = signal<string>('');

  fuelTypes: any[]        = [];
  selectedFuels: string[] = [];
  fuelDropdownOpen        = false;

  operationStartDate = signal<string | null>(null);
  operationEndDate   = signal<string | null>(null);
  entryStartDate     = signal<string | null>(null);
  entryEndDate       = signal<string | null>(null);

  selectedFuelType: string = 'All';
  loadingTrips: Record<string, boolean> = {};

  totalRecordsCount = signal<number>(0);
  pageSize          = 10;
  sortColumn        = 'entryDate';
  sortDirection     = 'DESC';
  currentPage       = signal<number>(1);
  totalPages        = signal<number>(1);

  constructor(
    private service: SearchVehcileService,
    private fuelService: FueltypeService,
    private router: Router,
    private route: ActivatedRoute      // ← added
  ) { }

  // ── ngOnInit: reads chart query params, pre-fills filters, then loads ──
  ngOnInit(): void {
    this.loadFuelTypes();

    this.route.queryParams.subscribe(params => {
      if (params['source'] === 'chart') {
        if (params['fuelType'])  this.selectedFuels = [params['fuelType']];
        if (params['startDate']) this.operationStartDate.set(params['startDate']);
        if (params['endDate'])   this.operationEndDate.set(params['endDate'] + 'T23:59:59');
        if (params['search'])    this.searchText.set(params['search']);
      }
      this.loadTrips();
    });
  }

  // ─── Data Loading ─────────────────────────────────────────────

  loadFuelTypes() {
    this.fuelService.getAll().subscribe({
      next: (res: any) => { this.fuelTypes = Array.isArray(res) ? res : res.data || []; },
      error: (err) => console.error('Error loading fuel types', err)
    });
  }

  loadTrips() {
    this.service.searchTrips(1, 10000, 'entryDate', 'DESC').subscribe({
      next: (res: any) => {
        const mapped = res.data.map((e: any) => ({
          tripId:            e.tripId,
          reportId:          e.reportId,
          vehicleNumber:     e.vehicleNumber,
          vehicleType:       e.vehicleType,
          fuelType:          e.fuelType,
          entryDate:         e.entryDate,
          distanceKm:        e.distanceKm        ?? 0,
          fuelConsumedLtr:   e.fuelConsumedLtr   ?? 0,
          statusId:          e.statusId,
          tripStartDateTime: e.tripStartDateTime,
          tripEndDateTime:   e.tripEndDateTime,
          totalCO2:          e.totalCO2          ?? 0,
          totalNO2:          e.totalNO2          ?? 0,
          totalCH4:          e.totalCH4          ?? 0,
          totalEmission:     e.totalEmission     ?? 0
        }));
        this.emissions.set(mapped);
        this.applyFilters();
      }
    });
  }

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
  }

  toggleFuelDropdown() { this.fuelDropdownOpen = !this.fuelDropdownOpen; }

  toggleFuel(name: string) {
    const idx = this.selectedFuels.indexOf(name);
    if (idx > -1) this.selectedFuels.splice(idx, 1); else this.selectedFuels.push(name);
    this.applyFilters();
  }

  isFuelSelected(name: string): boolean { return this.selectedFuels.includes(name); }

  toggleSelectAll() {
    if (this.selectedFuels.length === this.fuelTypes.length) this.selectedFuels = [];
    else this.selectedFuels = this.fuelTypes.map((f: any) => f.fuel_name);
    this.applyFilters();
  }

  clearFuels() { this.selectedFuels = []; this.applyFilters(); }

  // ─── Search ───────────────────────────────────────────────────

  onSearch(event: any) { this.searchText.set(event.target.value); this.applyFilters(); }

  // ─── Date Range ───────────────────────────────────────────────

  onOperationDateRangeSelected(range: { startDate: Date | null, endDate: Date | null }) {
    this.operationStartDate.set(range.startDate ? range.startDate.toISOString() : null);
    this.operationEndDate.set(range.endDate ? range.endDate.toISOString() : null);
    this.currentPage.set(1); this.applyFilters();
  }

  onEntryDateRangeSelected(range: { startDate: Date | null, endDate: Date | null }) {
    this.entryStartDate.set(range.startDate ? range.startDate.toISOString() : null);
    this.entryEndDate.set(range.endDate ? range.endDate.toISOString() : null);
    this.currentPage.set(1); this.applyFilters();
  }

  // ─── Reset ────────────────────────────────────────────────────

  resetFilters() {
    this.selectedFuels = []; this.fuelDropdownOpen = false;
    this.searchText.set('');
    this.operationStartDate.set(null); this.operationEndDate.set(null);
    this.entryStartDate.set(null);     this.entryEndDate.set(null);
    this.currentPage.set(1);
    this.opDatePicker?.reset(); this.entryDatePicker?.reset();
    this.filteredData.set(this.emissions());
  }

  // ─── Filters ──────────────────────────────────────────────────

  applyFilters() {
    const sText       = this.searchText().toLowerCase();
    const opStartDate = this.operationStartDate() ? new Date(this.operationStartDate()!) : null;
    const opEndDate   = this.operationEndDate()   ? new Date(this.operationEndDate()!)   : null;
    if (opEndDate) opEndDate.setHours(23, 59, 59, 999);
    const enStartDate = this.entryStartDate() ? new Date(this.entryStartDate()!) : null;
    const enEndDate   = this.entryEndDate()   ? new Date(this.entryEndDate()!)   : null;
    if (enEndDate) enEndDate.setHours(23, 59, 59, 999);

    const filtered = this.emissions().filter(e => {
      const matchesSearch =
        e.vehicleNumber.toLowerCase().includes(sText) ||
        e.vehicleType.toLowerCase().includes(sText)   ||
        e.fuelType.toLowerCase().includes(sText);

      const matchesFuel =
        this.selectedFuels.length === 0 ||
        this.selectedFuels.map(f => f.toLowerCase()).includes(e.fuelType.toLowerCase());

      const tripStart = new Date(e.tripStartDateTime);
      const tripEnd   = new Date(e.tripEndDateTime);
      let matchesOperation = true;
      if (opStartDate && tripEnd   < opStartDate) matchesOperation = false;
      if (opEndDate   && tripStart > opEndDate)   matchesOperation = false;

      const entry = new Date(e.entryDate);
      let matchesEntry = true;
      if (enStartDate && entry < enStartDate) matchesEntry = false;
      if (enEndDate   && entry > enEndDate)   matchesEntry = false;

      return matchesSearch && matchesFuel && matchesOperation && matchesEntry;
    });

    this.filteredData.set(filtered);
    this.totalRecordsCount.set(filtered.length);
    this.totalPages.set(Math.ceil(filtered.length / this.pageSize));
    this.currentPage.set(1);
  }

  // ─── Pagination ───────────────────────────────────────────────

  paginatedData() {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredData().slice(start, start + this.pageSize);
  }

  totalRecords() { return this.totalRecordsCount(); }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  changePageSize(event: any) {
    this.pageSize = Number(event.target.value);
    this.currentPage.set(1);
    this.totalPages.set(Math.ceil(this.filteredData().length / this.pageSize));
  }

  // ─── Sort ─────────────────────────────────────────────────────

  sort(column: string) {
    if (this.sortColumn === column)
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    else { this.sortColumn = column; this.sortDirection = 'ASC'; }

    const sorted = [...this.filteredData()].sort((a: any, b: any) => {
      let valA = a[column] ?? '', valB = b[column] ?? '';
      if (column === 'entryDate' || column === 'tripStartDateTime' || column === 'tripEndDateTime') {
        valA = new Date(valA).getTime(); valB = new Date(valB).getTime();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase(); valB = valB.toLowerCase();
      }
      if (valA < valB) return this.sortDirection === 'ASC' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'ASC' ?  1 : -1;
      return 0;
    });
    this.filteredData.set(sorted);
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
    const params: any = {};
    if (this.searchText())               params.search         = this.searchText();
    if (this.selectedFuelType !== 'All') params.fuelType       = this.selectedFuelType;
    if (this.operationStartDate())       params.startDate      = this.operationStartDate();
    if (this.operationEndDate())         params.endDate        = this.operationEndDate();
    if (this.entryStartDate())           params.entryStartDate = this.entryStartDate();
    if (this.entryEndDate())             params.entryEndDate   = this.entryEndDate();
    params.sortColumn    = this.sortColumn;
    params.sortDirection = this.sortDirection;

    this.service.exportExcel(params).subscribe(blob => {
      const file = new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(file);
      const a   = document.createElement('a');
      const now = new Date();
      const day     = ('0' + now.getDate()).slice(-2);
      const month   = ('0' + (now.getMonth() + 1)).slice(-2);
      const year    = now.getFullYear();
      const hours   = ('0' + now.getHours()).slice(-2);
      const minutes = ('0' + now.getMinutes()).slice(-2);
      const seconds = ('0' + now.getSeconds()).slice(-2);
      const formatted = `${day}${month}${year}_${hours}${minutes}${seconds}`;
      a.download = `Search_Fleet&Transport_${formatted}.xlsx`;
      a.href = url; a.click(); window.URL.revokeObjectURL(url);
    });
  }
}