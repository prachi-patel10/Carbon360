import { Component, OnInit, signal, ViewChild, HostListener } from '@angular/core';
import { GeneratorOperation, SearchGeneratorService } from './search-generator-service';
import { FueltypeService } from '../../masters/fueltype/fueltype-service';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DateRangePickerComponent } from '../../../public/date-range-picker-component/date-range-picker-component';

interface GeneratorOperationDisplay extends GeneratorOperation {
  status: string;
  totalEmission: number;
  fuelType: string;
}

@Component({
  selector: 'app-search-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, DateRangePickerComponent],
  templateUrl: './search-generator.html',
  styleUrls: ['./search-generator.css']
})
export class SearchGenerator implements OnInit {

  @ViewChild('opDatePicker')    opDatePicker!: DateRangePickerComponent;
  @ViewChild('entryDatePicker') entryDatePicker!: DateRangePickerComponent;

  filteredData = signal<GeneratorOperationDisplay[]>([]);

  fuelTypes: any[]        = [];
  selectedFuels: string[] = [];
  fuelDropdownOpen        = false;

  searchText = signal<string>('');

  operationStartDate = signal<string | null>(null);
  operationEndDate   = signal<string | null>(null);
  entryStartDate     = signal<string | null>(null);
  entryEndDate       = signal<string | null>(null);

  currentPage       = signal<number>(1);
  pageSize          = 10;
  totalRecordsCount = signal<number>(0);
  totalPagesCount   = signal<number>(1);

  sortColumn:    string          = 'entryDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  loadingTrips: Record<string, boolean> = {};

  constructor(
    private service: SearchGeneratorService,
    private fuelService: FueltypeService,
    private router: Router,
    private route: ActivatedRoute,
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
      this.loadEmissions();
    });
  }

  // ─── Data Loading ─────────────────────────────────────────────

  loadFuelTypes() {
    this.fuelService.getAll().subscribe({
      next: (res: any) => { this.fuelTypes = Array.isArray(res) ? res : res.data || []; },
      error: (err) => console.error('Error loading fuel types', err)
    });
  }

  loadEmissions() {
    const fuelParam = this.selectedFuels.length > 0 ? this.selectedFuels.join(',') : undefined;

    this.service.searchEmissions(
      this.currentPage(),
      this.pageSize,
      this.searchText() || undefined,
      fuelParam,
      this.operationStartDate() ? this.operationStartDate()!.substring(0, 10) : undefined,
      this.operationEndDate()   ? this.operationEndDate()!.substring(0, 10)   : undefined,
      this.entryStartDate()     ? this.entryStartDate()!.substring(0, 10)     : undefined,
      this.entryEndDate()       ? this.entryEndDate()!.substring(0, 10)       : undefined
    ).subscribe({
      next: (res: any) => {
        const records = res.data?.records     ?? [];
        const total   = res.data?.totalRecords ?? 0;
        const mapped: GeneratorOperationDisplay[] = records.map((e: any) => ({
          ...e,
          generatorName: e.generatorName ?? 'Unknown Generator',
          fuelType:      e.fuelType      ?? 'Unknown',
          status:        e.statusName    ?? (e.statusId === 1 ? 'Completed' : 'Pending'),
          totalEmission: e.totalEmission ?? 0
        }));
        this.filteredData.set(mapped);
        this.totalRecordsCount.set(total);
        this.totalPagesCount.set(Math.ceil(total / this.pageSize));
      },
      error: (err) => console.error('Error loading emissions', err)
    });
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

  onDateRangeSelected(range: { startDate: Date | null; endDate: Date | null }) {
    this.operationStartDate.set(range.startDate ? range.startDate.toISOString() : null);
    this.operationEndDate.set(range.endDate ? range.endDate.toISOString() : null);
    this.applyFilters();
  }

  onEntryDateRangeSelected(range: { startDate: Date | null; endDate: Date | null }) {
    this.entryStartDate.set(range.startDate ? range.startDate.toISOString() : null);
    this.entryEndDate.set(range.endDate ? range.endDate.toISOString() : null);
    this.applyFilters();
  }

  // ─── Reset ────────────────────────────────────────────────────

  resetFilters() {
    this.selectedFuels = []; this.fuelDropdownOpen = false;
    this.searchText.set('');
    this.operationStartDate.set(null); this.operationEndDate.set(null);
    this.entryStartDate.set(null);     this.entryEndDate.set(null);
    this.currentPage.set(1);
    this.opDatePicker?.reset(); this.entryDatePicker?.reset();
    this.loadEmissions();
  }

  // ─── Apply Filters ────────────────────────────────────────────

  applyFilters() { this.currentPage.set(1); this.loadEmissions(); }

  // ─── Pagination ───────────────────────────────────────────────

  paginatedData() { return this.filteredData(); }
  totalRecords()  { return this.totalRecordsCount(); }
  totalPages()    { return this.totalPagesCount(); }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page); this.loadEmissions();
  }

  changePageSize(event: any) {
    this.pageSize = Number(event.target.value);
    this.currentPage.set(1); this.loadEmissions();
  }

  // ─── Sort ─────────────────────────────────────────────────────

  sortBy(column: string) {
    if (this.sortColumn === column)
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else { this.sortColumn = column; this.sortDirection = 'asc'; }
    this.currentPage.set(1); this.loadEmissions();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '↕';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  // ─── Navigation ───────────────────────────────────────────────

  goToDetail(operationId: string) {
    this.router.navigate(
      ['/dashboard/generator-ec', operationId],
      { queryParams: { mode: 'view', page: 'search' } }
    );
  }

  // ─── PDF Download ─────────────────────────────────────────────

  isLoading(operationId: string): boolean { return !!this.loadingTrips[operationId]; }

  downloadTrip(operationId: string) {
    if (!operationId) return;
    this.loadingTrips[operationId] = true;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:5236/api/GeneratorOperation/generate-pdf/${operationId}`, {
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
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `Search_PowerGenerator_${dateStr}.pdf`;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); window.URL.revokeObjectURL(url);
    })
    .catch(err => { console.error('PDF download error:', err); alert('PDF generation failed: ' + err.message); })
    .finally(() => { this.loadingTrips[operationId] = false; });
  }

  // ─── Export Excel ─────────────────────────────────────────────

  exportExcel() {
    const params: any = {};
    if (this.searchText())            params.search       = this.searchText();
    if (this.selectedFuels.length > 0) params.fuelTypes   = this.selectedFuels.join(',');
    if (this.operationStartDate())    params.startDate    = this.operationStartDate();
    if (this.operationEndDate())      params.endDate      = this.operationEndDate();
    if (this.entryStartDate())        params.entryStartDate = this.entryStartDate();
    if (this.entryEndDate())          params.entryEndDate   = this.entryEndDate();
    params.isExport = true;

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
      a.download = `Search_PowerGenerator_${formatted}.xlsx`;
      a.href = url; a.click(); window.URL.revokeObjectURL(url);
    });
  }
}