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

  fuelTypes: any[]      = [];
  selectedFuels: string[] = [];
  fuelDropdownOpen      = false;

  generatorTypes: any[] = [];
  selectedGenTypes: string[] = [];
  genDropdownOpen       = false;

  searchText = signal<string>('');

  operationStartDate = signal<string | null>(null);
  operationEndDate   = signal<string | null>(null);
  entryStartDate     = signal<string | null>(null);
  entryEndDate       = signal<string | null>(null);

  /** Site name received from a chart click — sent to API as `siteNames` param */
  chartSiteName: string | null = null;

  currentPage          = signal<number>(1);
  pageSize             = 10;
  totalRecordsCount    = signal<number>(0);
  totalPagesCount      = signal<number>(1);

  sortColumn: string           = 'EntryDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  loadingTrips: Record<string, boolean> = {};

  constructor(
    private service: SearchGeneratorService,
    private fuelService: FueltypeService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.loadFuelTypes();
    this.loadGeneratorTypes();

    this.route.queryParams.subscribe(params => {

      // ── 1. Full reset every time query params change ──────────
      this.selectedFuels    = [];
      this.selectedGenTypes = [];
      this.chartSiteName    = null;
      this.searchText.set('');
      this.operationStartDate.set(null);
      this.operationEndDate.set(null);
      this.entryStartDate.set(null);  
      this.entryEndDate.set(null);     
      this.currentPage.set(1);

      // ── 2. Apply chart-driven filters ─────────────────────────
      if (params['source'] === 'chart') {

        // Fuel filter → shows as tag in the Fuel multi-select dropdown
        if (params['fuelType']) {
          this.selectedFuels = [params['fuelType'].trim()];
          // ✅ Do NOT set searchText here — fuel has its own dropdown display
        }

        // Generator filter → shows as tag in the Generator multi-select dropdown
        if (params['generatorName']) {
          this.selectedGenTypes = [params['generatorName'].trim()];
          // ✅ Do NOT set searchText here — generator has its own dropdown display
        }

        // Site filter → no dedicated dropdown, so show in the search box
        if (params['siteName']) {
          this.chartSiteName = params['siteName'].trim();
          this.searchText.set(params['siteName'].trim());
        }

        // Explicit search override (highest priority for search box)
        if (params['search']) {
          this.searchText.set(params['search'].trim());
        }

        // Operation date range (month-level OR year-level from chart)
        if (params['startDate']) {
          this.operationStartDate.set(params['startDate']);
        }
        if (params['endDate']) {
          const raw = params['endDate'] as string;
          this.operationEndDate.set(raw.includes('T') ? raw : raw + 'T23:59:59');
        }
      }

      console.log('Filters Applied:', {
        search:    this.searchText(),
        fuels:     this.selectedFuels,
        generators: this.selectedGenTypes,
        site:      this.chartSiteName,
        startDate: this.operationStartDate(),
        endDate:   this.operationEndDate(),
      });

      this.loadEmissions();
    });
  }

  // ─── Data Loading ──────────────────────────────────────────────

 loadFuelTypes() {
    this.fuelService.getAll().subscribe(res => {
      this.fuelTypes = Array.isArray(res) ? res : res.data || [];
    });
  }

  loadGeneratorTypes() {
    this.service.getGenerators().subscribe(res => {
      const data = Array.isArray(res) ? res : res.data || [];
      this.generatorTypes = data.map((g: any) => ({
        gen_name: g.gen_name || g.generatorName || g.name
      }));
    });
  }
  loadEmissions(): void {
    const fuelParam = this.selectedFuels.length > 0
      ? this.selectedFuels.map(f => f.trim()).join(',')
      : undefined;

    const genParam = this.selectedGenTypes.length > 0
      ? this.selectedGenTypes.map(g => g.trim()).join(',')
      : undefined;

    const siteParam = this.chartSiteName
      ? this.chartSiteName.trim()
      : undefined;

    const hasChartFilter = !!(fuelParam || genParam || siteParam);
    const searchParam    = hasChartFilter
      ? undefined
      : (this.searchText()?.trim() || undefined);

    console.log('FINAL API PARAMS:', {
      search:    searchParam,
      fuel:      fuelParam,
      generator: genParam,
      site:      siteParam,
      startDate: this.operationStartDate(),
      endDate:   this.operationEndDate(),
    });

    this.service.searchEmissions(
      this.currentPage(),
      this.pageSize,
      searchParam,
        //  this.searchText() || undefined,
      fuelParam,
      genParam,
      this.operationStartDate() ? this.operationStartDate()!.substring(0, 10) : undefined,
      this.operationEndDate()   ? this.operationEndDate()!.substring(0, 10)   : undefined,
      this.entryStartDate()     ? this.entryStartDate()!.substring(0, 10)     : undefined,
      this.entryEndDate()       ? this.entryEndDate()!.substring(0, 10)       : undefined,
      this.sortColumn,
      this.sortDirection,
      siteParam
    ).subscribe({
      next: (res: any) => {
        console.log('API RESPONSE:', res);
       const records = res.data ?? [];
const total   = res.totalRecords ?? 0;
        this.filteredData.set(records.map((e: any) => ({
          ...e,
          generatorName: e.generatorName ?? 'Unknown Generator',
          fuelType:      e.fuelType      ?? 'Unknown',
          status:        e.statusName    ?? (e.statusId === 1 ? 'Completed' : 'Pending'),
          totalEmission: e.totalEmission ?? 0,
        })));

        this.totalRecordsCount.set(total);
        this.totalPagesCount.set(Math.ceil(total / this.pageSize) || 1);
      },
      error: err => console.error('Error loading emissions', err)
    });
  }

  // ─── Multi-Select ────────────────────────────────────
  toggleFuel(name: string) {
    const i = this.selectedFuels.indexOf(name);
    i > -1 ? this.selectedFuels.splice(i, 1) : this.selectedFuels.push(name);
    this.applyFilters();
  }
  toggleGenDropdown(): void { this.genDropdownOpen = !this.genDropdownOpen; }

  isGenSelected(name: string): boolean {
    return this.selectedGenTypes.includes(name);
  }

  
toggleGenType(gen: any) {
  const name = typeof gen === 'string' ? gen : (gen.gen_name || gen.generatorName);

  if (this.selectedGenTypes.includes(name)) {
    this.selectedGenTypes = this.selectedGenTypes.filter(g => g !== name);
  } else {
    this.selectedGenTypes.push(name);
  }

  this.applyFilters(); 
}
  toggleSelectAllGen(): void {
    this.selectedGenTypes = this.selectedGenTypes.length === this.generatorTypes.length
      ? []
      : this.generatorTypes.map(g => g.gen_name);
    this.applyFilters();
  }

  clearGenTypes(): void { this.selectedGenTypes = []; this.applyFilters(); }

  // ─── Fuel Multi-Select ─────────────────────────────────────────

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.fuel-multiselect')) this.fuelDropdownOpen = false;
    if (!t.closest('.gen-multiselect'))  this.genDropdownOpen  = false;
  }

  toggleFuelDropdown(): void { this.fuelDropdownOpen = !this.fuelDropdownOpen; }

 
  isFuelSelected(name: string): boolean { return this.selectedFuels.includes(name); }

  toggleSelectAll(): void {
    this.selectedFuels = this.selectedFuels.length === this.fuelTypes.length
      ? []
      : this.fuelTypes.map((f: any) => f.fuel_name);
    this.applyFilters();
  }

  clearFuels(): void { this.selectedFuels = []; this.applyFilters(); }

  // ─── Search ────────────────────────────────────────────────────

  onSearch(event: any): void {
    this.searchText.set(event.target.value);
    // Clear site-name chart filter when user manually types in the search box
    if (this.chartSiteName) this.chartSiteName = null;
    this.applyFilters();
  }

  // ─── Date Range ────────────────────────────────────────────────

  onDateRangeSelected(range: { startDate: Date | null; endDate: Date | null }): void {
    this.operationStartDate.set(range.startDate ? range.startDate.toISOString() : null);
    this.operationEndDate.set(range.endDate   ? range.endDate.toISOString()   : null);
    this.applyFilters();
  }

  onEntryDateRangeSelected(range: { startDate: Date | null; endDate: Date | null }): void {
    this.entryStartDate.set(range.startDate ? range.startDate.toISOString() : null);
    this.entryEndDate.set(range.endDate     ? range.endDate.toISOString()   : null);
    this.applyFilters();
  }

  // ─── Reset ─────────────────────────────────────────────────────

  resetFilters(): void {
    this.selectedFuels    = [];   this.fuelDropdownOpen = false;
    this.selectedGenTypes = [];   this.genDropdownOpen  = false;
    this.chartSiteName    = null;
    this.searchText.set('');
    this.operationStartDate.set(null); this.operationEndDate.set(null);
    this.entryStartDate.set(null);     this.entryEndDate.set(null);
    this.currentPage.set(1);
    this.opDatePicker?.reset();
    this.entryDatePicker?.reset();
    this.loadEmissions();
  }

  // ─── Apply Filters ─────────────────────────────────────────────

  applyFilters(): void { this.currentPage.set(1); this.loadEmissions(); }

  // ─── Pagination ────────────────────────────────────────────────

  paginatedData()  { return this.filteredData(); }
  totalRecords()   { return this.totalRecordsCount(); }
  totalPages()     { return this.totalPagesCount(); }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadEmissions();
  }

  changePageSize(event: any): void {
    this.pageSize = Number(event.target.value);
    this.currentPage.set(1);
    this.loadEmissions();
  }

  // ─── Sort ──────────────────────────────────────────────────────

  /** Maps template column keys to the API sort column names. */
  private readonly columnMap: Record<string, string> = {
    generatorName:       'GeneratorName',
    reportId:            'ReportId',          // ✅ was missing
    entryDate:           'EntryDate',
    startTime:           'StartTime',
    endTime:             'EndTime',
    loadFactor:          'LoadFactor',
    fuelConsumedLiters:  'FuelConsumedLiters',
    totalEmission:       'Total_CO2E_KG',
  };

  sortBy(column: string): void {
    const mapped = this.columnMap[column] ?? 'EntryDate';
    if (this.sortColumn === mapped) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn    = mapped;
      this.sortDirection = 'asc';
    }
    this.currentPage.set(1);
    this.loadEmissions();
  }

  getSortIcon(column: string): string {
    const mapped = this.columnMap[column] ?? column;
    if (this.sortColumn !== mapped) return '↕';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  // ─── Navigation ────────────────────────────────────────────────

  goToDetail(operationId: string): void {
    this.router.navigate(
      ['/dashboard/generator-ec', operationId],
      { queryParams: { mode: 'view', page: 'search' } }
    );
  }

  // ─── PDF Download ──────────────────────────────────────────────

  isLoading(operationId: string): boolean { return !!this.loadingTrips[operationId]; }

  downloadTrip(operationId: string): void {
    if (!operationId) return;
    this.loadingTrips[operationId] = true;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:5236/api/GeneratorOperation/generate-pdf/${operationId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) return res.text().then(t => { throw new Error(`Server error ${res.status}: ${t}`); });
        const ct = res.headers.get('content-type');
        if (!ct?.includes('application/pdf'))
          return res.text().then(t => { throw new Error(`Expected PDF but got: ${ct} — ${t}`); });
        return res.blob();
      })
      .then((blob: any) => {
        const now = new Date();
        const ts  = now.getFullYear()
          + String(now.getMonth() + 1).padStart(2, '0')
          + String(now.getDate()).padStart(2, '0') + '_'
          + String(now.getHours()).padStart(2, '0')
          + String(now.getMinutes()).padStart(2, '0')
          + String(now.getSeconds()).padStart(2, '0');
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `Search_PowerGenerator_${ts}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('PDF download error:', err);
        alert('PDF generation failed: ' + err.message);
      })
      .finally(() => { this.loadingTrips[operationId] = false; });
  }

  // ─── Export Excel ──────────────────────────────────────────────

  exportExcel(): void {
    const params: any = {};
    if (this.searchText())             params.search         = this.searchText();
    if (this.selectedFuels.length > 0) params.fuelTypes      = this.selectedFuels.join(',');
    if (this.selectedGenTypes.length > 0) params.generatorTypes = this.selectedGenTypes.join(',');
    if (this.chartSiteName)            params.siteNames      = this.chartSiteName;
    if (this.operationStartDate())     params.startDate      = this.operationStartDate();
    if (this.operationEndDate())       params.endDate        = this.operationEndDate();
    if (this.entryStartDate())         params.entryStartDate = this.entryStartDate();
    if (this.entryEndDate())           params.entryEndDate   = this.entryEndDate();
    params.isExport = true;

    this.service.exportExcel(params).subscribe(blob => {
      const file = new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(file);
      const a   = document.createElement('a');
      const now = new Date();
      const ts  = ('0' + now.getDate()).slice(-2)
        + ('0' + (now.getMonth() + 1)).slice(-2) + now.getFullYear() + '_'
        + ('0' + now.getHours()).slice(-2)
        + ('0' + now.getMinutes()).slice(-2)
        + ('0' + now.getSeconds()).slice(-2);
      a.download = `Search_PowerGenerator_${ts}.xlsx`;
      a.href     = url;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}