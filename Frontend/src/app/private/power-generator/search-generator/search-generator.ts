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

  @ViewChild('opDatePicker') opDatePicker!: DateRangePickerComponent;
  @ViewChild('entryDatePicker') entryDatePicker!: DateRangePickerComponent;

  filteredData = signal<GeneratorOperationDisplay[]>([]);

  fuelTypes: any[] = [];
  selectedFuels: string[] = [];
  fuelDropdownOpen = false;

  generatorTypes: any[] = [];
  selectedGenTypes: string[] = [];
  genDropdownOpen = false;

  searchText = signal<string>('');

  operationStartDate = signal<string | null>(null);
  operationEndDate = signal<string | null>(null);
  entryStartDate = signal<string | null>(null);
  entryEndDate = signal<string | null>(null);

  // Holds siteName from chart — sent to API, shown in search box
  chartSiteName: string | null = null;

  currentPage = signal<number>(1);
  pageSize = 10;
  totalRecordsCount = signal<number>(0);
  totalPagesCount = signal<number>(1);

  sortColumn: string = 'entryDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  loadingTrips: Record<string, boolean> = {};

  constructor(
    private service: SearchGeneratorService,
    private fuelService: FueltypeService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
  this.loadFuelTypes();
  this.loadGeneratorTypes();

  this.route.queryParams.subscribe(params => {

    // Reset everything first (IMPORTANT)
    this.selectedFuels = [];
    this.selectedGenTypes = [];
    this.chartSiteName = null;
    this.searchText.set('');
    this.operationStartDate.set(null);
    this.operationEndDate.set(null);

    if (params['source'] === 'chart') {

      // ✅ Fuel filter
      if (params['fuelType']) {
        this.selectedFuels = [params['fuelType']];
      }

      // ✅ Generator filter (Run Hours fix)
      if (params['generatorName']) {
  this.selectedGenTypes = [params['generatorName'].trim()];
}

      // ✅ Site filter (Site Emission fix)
      if (params['siteName']) {
        this.chartSiteName = params['siteName'];
        this.searchText.set(params['siteName']);
      }

      // ✅ 🎯 FINAL SEARCH TEXT (correct priority)
      if (params['search']) {
        this.searchText.set(params['search']);
      } 
      else if (params['siteName']) {
        this.searchText.set(params['siteName']);
      }
      else if (params['generatorName']) {
        this.searchText.set(params['generatorName']);
      }
      else if (params['fuelType']) {
        this.searchText.set(params['fuelType']);
      }

      // ✅ Operation date filters
      if (params['startDate']) {
        this.operationStartDate.set(params['startDate']);
      }

      if (params['endDate']) {
        const raw = params['endDate'];
        this.operationEndDate.set(
          raw.includes('T') ? raw : raw + 'T23:59:59'
        );
      }
    }

    // 🔥 DEBUG (optional but recommended)
    console.log("Filters Applied:", {
      search: this.searchText(),
      fuels: this.selectedFuels,
      generators: this.selectedGenTypes,
      site: this.chartSiteName,
      startDate: this.operationStartDate(),
      endDate: this.operationEndDate()
    });

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

  loadGeneratorTypes() {
    this.service.getGenerators().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : res.data || [];
        this.generatorTypes = data.map((g: any) => ({
          gen_name: g.gen_name || g.generatorName || g.name || 'Unknown'
        }));
      },
      error: (err) => console.error('Error loading generator types', err)
    });
  }

  loadEmissions() {

  const fuelParam = this.selectedFuels.length > 0
    ? this.selectedFuels.map(f => f.trim()).join(',')
    : undefined;

  const genParam = this.selectedGenTypes.length > 0
    ? this.selectedGenTypes.map(g => g.trim()).join(',')
    : undefined;

  const siteParam = this.chartSiteName
    ? this.chartSiteName.trim()
    : undefined;

  // ✅ FIXED LOGIC (VERY IMPORTANT)
  const isChartFilter = !!(siteParam || genParam || fuelParam);

  const searchParam = isChartFilter
    ? undefined
    : (this.searchText()?.trim() || undefined);

  console.log("FINAL API PARAMS:", {
    search: searchParam,
    fuel: fuelParam,
    generator: genParam,
    site: siteParam
  });

  this.service.searchEmissions(
    this.currentPage(),
    this.pageSize,
    searchParam,
    fuelParam,
    genParam,
    this.operationStartDate() ? this.operationStartDate()!.substring(0, 10) : undefined,
    this.operationEndDate() ? this.operationEndDate()!.substring(0, 10) : undefined,
    this.entryStartDate() ? this.entryStartDate()!.substring(0, 10) : undefined,
    this.entryEndDate() ? this.entryEndDate()!.substring(0, 10) : undefined,
    this.sortColumn,
    this.sortDirection,
    siteParam   // ✅ MUST PASS
  ).subscribe({
    next: (res: any) => {

      console.log("API RESPONSE:", res); // 🔥 DEBUG

      const records = res.data?.records ?? [];
      const total = res.data?.totalRecords ?? 0;

      this.filteredData.set(records.map((e: any) => ({
        ...e,
        generatorName: e.generatorName ?? 'Unknown Generator',
        fuelType: e.fuelType ?? 'Unknown',
        status: e.statusName ?? (e.statusId === 1 ? 'Completed' : 'Pending'),
        totalEmission: e.totalEmission ?? 0
      })));

      this.totalRecordsCount.set(total);
      this.totalPagesCount.set(Math.ceil(total / this.pageSize) || 1);
    },
    error: (err: any) => {
      console.error('Error loading emissions', err);
    }
  });
}

  // ─── Generator Multi-Select ───────────────────────────────────

  toggleGenDropdown() { this.genDropdownOpen = !this.genDropdownOpen; }

  // Always receives a plain string (gen.gen_name)
  isGenSelected(name: string): boolean {
    return this.selectedGenTypes.includes(name);
  }

  toggleGenType(name: string) {
    const idx = this.selectedGenTypes.indexOf(name);
    if (idx > -1) this.selectedGenTypes.splice(idx, 1);
    else this.selectedGenTypes.push(name);
    this.applyFilters();
  }

  toggleSelectAllGen() {
    if (this.selectedGenTypes.length === this.generatorTypes.length)
      this.selectedGenTypes = [];
    else
      this.selectedGenTypes = this.generatorTypes.map(g => g.gen_name);
    this.applyFilters();
  }

  clearGenTypes() { this.selectedGenTypes = []; this.applyFilters(); }

  // ─── Fuel Multi-Select ────────────────────────────────────────

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.fuel-multiselect')) this.fuelDropdownOpen = false;
    if (!target.closest('.gen-multiselect')) this.genDropdownOpen = false;
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

  onSearch(event: any) {
    this.searchText.set(event.target.value);
    // Clear site name if user manually types in the search box
    if (this.chartSiteName) this.chartSiteName = null;
    this.applyFilters();
  }

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
    this.selectedGenTypes = []; this.genDropdownOpen = false;
    this.chartSiteName = null;
    this.searchText.set('');
    this.operationStartDate.set(null); this.operationEndDate.set(null);
    this.entryStartDate.set(null); this.entryEndDate.set(null);
    this.currentPage.set(1);
    this.opDatePicker?.reset(); this.entryDatePicker?.reset();
    this.loadEmissions();
  }

  // ─── Apply Filters ────────────────────────────────────────────

  applyFilters() { this.currentPage.set(1); this.loadEmissions(); }

  // ─── Pagination ───────────────────────────────────────────────

  paginatedData() { return this.filteredData(); }
  totalRecords() { return this.totalRecordsCount(); }
  totalPages() { return this.totalPagesCount(); }

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
    const columnMap: Record<string, string> = {
      'generatorName': 'GeneratorName',
      'entryDate': 'EntryDate',
      'startTime': 'StartTime',
      'endTime': 'EndTime',
      'loadFactor': 'LoadFactor',
      'fuelConsumedLiters': 'FuelConsumedLiters',
      'totalEmission': 'Total_CO2E_KG'
    };
    const mappedColumn = columnMap[column] || 'EntryDate';
    if (this.sortColumn === mappedColumn)
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else { this.sortColumn = mappedColumn; this.sortDirection = 'asc'; }
    this.currentPage.set(1);
    this.loadEmissions();
  }

  getSortIcon(column: string): string {
    const columnMap: Record<string, string> = {
      'generatorName': 'GeneratorName',
      'entryDate': 'EntryDate',
      'startTime': 'StartTime',
      'endTime': 'EndTime',
      'loadFactor': 'LoadFactor',
      'fuelConsumedLiters': 'FuelConsumedLiters',
      'totalEmission': 'Total_CO2E_KG'
    };
    const mappedColumn = columnMap[column] || column;
    if (this.sortColumn !== mappedColumn) return '↕';
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
        const ct = res.headers.get('content-type');
        if (!ct || !ct.includes('application/pdf'))
          return res.text().then(text => { throw new Error(`Expected PDF but got: ${ct} — ${text}`); });
        return res.blob();
      })
      .then((blob: any) => {
        const now = new Date();
        const dateStr = now.getFullYear() +
          String(now.getMonth() + 1).padStart(2, '0') +
          String(now.getDate()).padStart(2, '0') + '_' +
          String(now.getHours()).padStart(2, '0') +
          String(now.getMinutes()).padStart(2, '0') +
          String(now.getSeconds()).padStart(2, '0');
        const url = window.URL.createObjectURL(blob);
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
    if (this.searchText()) params.search = this.searchText();
    if (this.selectedFuels.length > 0) params.fuelTypes = this.selectedFuels.join(',');
    if (this.selectedGenTypes.length > 0) params.generatorTypes = this.selectedGenTypes.join(',');
    if (this.chartSiteName) params.siteNames = this.chartSiteName;
    if (this.operationStartDate()) params.startDate = this.operationStartDate();
    if (this.operationEndDate()) params.endDate = this.operationEndDate();
    if (this.entryStartDate()) params.entryStartDate = this.entryStartDate();
    if (this.entryEndDate()) params.entryEndDate = this.entryEndDate();
    params.isExport = true;

    this.service.exportExcel(params).subscribe(blob => {
      const file = new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(file);
      const a = document.createElement('a');
      const now = new Date();
      const formatted = ('0' + now.getDate()).slice(-2) +
        ('0' + (now.getMonth() + 1)).slice(-2) + now.getFullYear() + '_' +
        ('0' + now.getHours()).slice(-2) + ('0' + now.getMinutes()).slice(-2) +
        ('0' + now.getSeconds()).slice(-2);
      a.download = `Search_PowerGenerator_${formatted}.xlsx`;
      a.href = url; a.click(); window.URL.revokeObjectURL(url);
    });
  }
}