import {
  Component, OnInit, AfterViewInit, signal, ViewChild, HostListener
} from '@angular/core';
import { GeneratorOperation, SearchGeneratorService } from './search-generator-service';
import { FueltypeService } from '../../masters/fueltype/fueltype-service';
import { SiteLocationMasterService } from '../sitelocationmaster/site-location-master-service';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { DateRangePickerComponent } from '../../../public/date-range-picker-component/date-range-picker-component';

interface GeneratorOperationDisplay extends GeneratorOperation {
  status: string;
  totalEmission: number;
  fuelType: string;
  blinkFlag: boolean;
}

@Component({
  selector: 'app-search-generator',
  standalone: true,
  imports: [FormsModule, DatePipe, DateRangePickerComponent],
  templateUrl: './search-generator.html',
  styleUrls: ['./search-generator.css']
})
export class SearchGenerator implements OnInit, AfterViewInit {

  @ViewChild('opDatePicker') opDatePicker!: DateRangePickerComponent;
  @ViewChild('entryDatePicker') entryDatePicker!: DateRangePickerComponent;

  filteredData = signal<GeneratorOperationDisplay[]>([]);

  // ── Fuel ───────────────────────────────────────────────────────
  fuelTypes: any[] = [];
  selectedFuels: string[] = [];
  fuelDropdownOpen = false;

  // ── Site ───────────────────────────────────────────────────────
  Sitename: any[] = [];
  selectedSite: string[] = [];
  SiteDropdownOpen = false;

  chartSiteName = signal<string | null>(null);

  // ── Generator ──────────────────────────────────────────────────
  generatorTypes: any[] = [];
  selectedGenTypes: string[] = [];
  genDropdownOpen = false;

  // ── Search text ────────────────────────────────────────────────
  searchText = signal<string>('');

  // ── Dates ──────────────────────────────────────────────────────
  operationStartDate = signal<string | null>(null);
  operationEndDate = signal<string | null>(null);
  entryStartDate = signal<string | null>(null);
  entryEndDate = signal<string | null>(null);

  // ── Pagination ─────────────────────────────────────────────────
  currentPage = signal<number>(1);
  pageSize = 10;
  totalRecordsCount = signal<number>(0);
  totalPagesCount = signal<number>(1);

  // ── Sort ───────────────────────────────────────────────────────
  private readonly columnMap: Record<string, string> = {
    generatorName: 'GeneratorName',
    reportId: 'ReportId',
    entryDate: 'EntryDate',
    startTime: 'StartTime',
    endTime: 'EndTime',
    loadFactor: 'LoadFactor',
    fuelConsumedLiters: 'FuelConsumedLiters',
    totalEmission: 'Total_CO2E_KG',
  };

  sortColumn: string = 'EntryDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  loadingTrips: Record<string, boolean> = {};

  // ── Internal state ─────────────────────────────────────────────
  private _pendingOpStart: string | null = null;
  private _pendingOpEnd: string | null = null;
  private _viewReady = false;
  private _chartParamsConsumed = false;

  constructor(
    private service: SearchGeneratorService,
    private fuelService: FueltypeService,
    private SiteService: SiteLocationMasterService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────

  private toDateOnly(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const clean = raw.trim().substring(0, 10);
    return clean.length === 10 ? clean : null;
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadFuelTypes();
    this.loadSiteName();
    this.loadGeneratorTypes();

    const toIsoDate = (raw: string | null): string | null => {
      if (!raw) return null;
      const clean = raw.trim().substring(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : null;
    };

    this.route.queryParams.subscribe(params => {

      if (this._chartParamsConsumed) {
        this._chartParamsConsumed = false;
        return;
      }

      // ── Full reset ──────────────────────────────────────────
      this.selectedFuels = [];
      this.selectedGenTypes = [];
      this.selectedSite = [];
      this.chartSiteName.set(null);
      this.searchText.set('');
      this.operationStartDate.set(null);
      this.operationEndDate.set(null);
      this.entryStartDate.set(null);
      this.entryEndDate.set(null);
      this.currentPage.set(1);

      if (this._viewReady) {
        this.opDatePicker?.reset();
        this.entryDatePicker?.reset();
      }

      if (params['source'] === 'chart') {

        if (params['fuelType']) this.selectedFuels = [params['fuelType'].trim()];
        if (params['generatorName']) this.selectedGenTypes = [params['generatorName'].trim()];
        if (params['siteNames']) this.chartSiteName.set(params['siteNames'].trim());

        this.searchText.set('');

        const opStart = toIsoDate(params['startDate']);
        const opEnd = toIsoDate(params['endDate']);
        if (opStart) this.operationStartDate.set(opStart);
        if (opEnd) this.operationEndDate.set(opEnd);

        this.applyPickersIfReady();

        this._chartParamsConsumed = true;

        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }

      this.loadEmissions();
    });
  }

  ngAfterViewInit(): void {
    this._viewReady = true;
    this.applyPickersIfReady();
  }

  private applyPickersIfReady(): void {
    if (!this._viewReady) return;
    setTimeout(() => {
      if (this._pendingOpStart && this._pendingOpEnd)
        this.setPickerRange(
          this.opDatePicker,
          new Date(this._pendingOpStart),
          new Date(this._pendingOpEnd)
        );
    }, 0);
  }

  private setPickerRange(picker: DateRangePickerComponent, start: Date, end: Date): void {
    if (!picker || isNaN(start.getTime()) || isNaN(end.getTime())) return;
    picker.setRange(start, end);
  }

  // ── Data Loading ───────────────────────────────────────────────

  loadFuelTypes(): void {
    this.fuelService.getAll().subscribe(res => {
      const data = Array.isArray(res) ? res : res.data || [];
      this.fuelTypes = data.filter((f: any) =>
        (f.isActive === true || f.isActive === 1) &&
        (f.isapplicable === true || f.isapplicable === 1)
      );
    });
  }

  loadSiteName(): void {
    this.service.getSiteNames().subscribe({
      next: data => { this.Sitename = data; },
      error: () => {
        this.SiteService.getAll().subscribe(res => {
          const raw = Array.isArray(res) ? res : res.data || [];
          this.Sitename = raw.filter((f: any) => f.isActive === true || f.isActive === 1);
        });
      }
    });
  }

  loadGeneratorTypes(): void {
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

    const genParam = (this.selectedGenTypes.length > 0 && !this.chartSiteName())
      ? this.selectedGenTypes.map(g => g.trim()).join(',')
      : undefined;

    const siteParam = this.chartSiteName()
      ? this.chartSiteName()!.trim()
      : this.selectedSite.length > 0
        ? this.selectedSite.map(s => s.trim()).join(',')
        : undefined;

    const hasChartSiteFilter = !!this.chartSiteName();
    const searchParam = hasChartSiteFilter
      ? undefined
      : (this.searchText()?.trim() || undefined);

    const opStart = this.operationStartDate()?.substring(0, 10) || undefined;
    const opEnd = this.operationEndDate()?.substring(0, 10) || undefined;
    const entryStart = this.entryStartDate() || undefined;
    const entryEnd = this.entryEndDate() || undefined;

    this.service.searchEmissions(
      this.currentPage(), this.pageSize,
      searchParam, fuelParam, genParam,
      opStart, opEnd,
      entryStart, entryEnd,
      this.sortColumn, this.sortDirection,
      siteParam
    ).subscribe({
      next: (res: any) => {
        const records = res.data ?? [];
        const total = res.totalRecords ?? 0;

        const mapped = records.map((e: any) => ({
          ...e,
          generatorName: e.generatorName ?? 'Unknown Generator',
          fuelType: e.fuelType ?? 'Unknown',
          status: e.statusName ?? (e.statusId === 1 ? 'Completed' : 'Pending'),
          totalEmission: e.totalEmission ?? 0,
          blinkFlag: e.blinkFlag === 1
        }));

        this.filteredData.set(mapped);
        this.totalRecordsCount.set(total);
        this.totalPagesCount.set(Math.ceil(total / this.pageSize) || 1);

        if (this.selectedGenTypes.length > 0) {
          this.selectedGenTypes.forEach(name => {
            const exists = this.generatorTypes.some(g => g.gen_name === name);
            if (!exists) this.generatorTypes.push({ gen_name: name });
          });
        }

        if (this.chartSiteName() && mapped.length > 0) {
          const uniqueGenNames: string[] = [
            ...new Set<string>(
              mapped
                .map((r: any) => r.generatorName as string)
                .filter((n: string) => !!n && n !== 'Unknown Generator')
            )
          ];
          this.selectedGenTypes = uniqueGenNames;
          uniqueGenNames.forEach(name => {
            const exists = this.generatorTypes.some(g => g.gen_name === name);
            if (!exists) this.generatorTypes.push({ gen_name: name });
          });
        }
      },
      error: err => console.error('Error loading emissions', err)
    });
  }

  // ── Multi-Select: Fuel ─────────────────────────────────────────

  toggleFuelDropdown(): void { this.fuelDropdownOpen = !this.fuelDropdownOpen; }
  isFuelSelected(name: string): boolean { return this.selectedFuels.includes(name); }

  toggleFuel(name: string): void {
    const i = this.selectedFuels.indexOf(name);
    i > -1 ? this.selectedFuels.splice(i, 1) : this.selectedFuels.push(name);
    this.applyFilters();
  }

  toggleSelectAll(): void {
    this.selectedFuels = this.selectedFuels.length === this.fuelTypes.length
      ? [] : this.fuelTypes.map((f: any) => f.fuel_name);
    this.applyFilters();
  }

  clearFuels(): void { this.selectedFuels = []; this.applyFilters(); }

  // ── Multi-Select: Site ─────────────────────────────────────────

  toggleSiteDropDown(): void {
    this.SiteDropdownOpen = !this.SiteDropdownOpen;
    if (this.SiteDropdownOpen && this.chartSiteName()) {
      const name = this.chartSiteName()!;
      if (!this.selectedSite.includes(name)) {
        this.selectedSite = [name];
      }
    }
  }

  isSiteSelected(name: string): boolean {
    return this.selectedSite.includes(name) ||
      (!!this.chartSiteName() && this.chartSiteName() === name);
  }

  toggleSite(name: string): void {
    if (this.chartSiteName() === name) {
      this.chartSiteName.set(null);
    }
    const i = this.selectedSite.indexOf(name);
    i > -1 ? this.selectedSite.splice(i, 1) : this.selectedSite.push(name);
    this.applyFilters();
  }

  toggleSelectAllSite(): void {
    this.chartSiteName.set(null);
    this.selectedSite = this.selectedSite.length === this.Sitename.length
      ? [] : this.Sitename.map((s: any) => s.siteName ?? s.SiteName ?? s.site_name ?? s.name);
    this.applyFilters();
  }

  clearSite(): void {
    this.selectedSite = [];
    this.chartSiteName.set(null);
    this.applyFilters();
  }

  clearChartSite(): void {
    this.chartSiteName.set(null);
    this.selectedSite = [];
    this.selectedGenTypes = [];
    this.applyFilters();
  }

  // ── Multi-Select: Generator ────────────────────────────────────

  toggleGenDropdown(): void { this.genDropdownOpen = !this.genDropdownOpen; }
  isGenSelected(name: string): boolean { return this.selectedGenTypes.includes(name); }

  toggleGenType(gen: any): void {
    const name = typeof gen === 'string' ? gen : (gen.gen_name || gen.generatorName);
    if (this.selectedGenTypes.includes(name))
      this.selectedGenTypes = this.selectedGenTypes.filter(g => g !== name);
    else
      this.selectedGenTypes.push(name);
    this.chartSiteName.set(null);
    this.applyFilters();
  }

  toggleSelectAllGen(): void {
    this.selectedGenTypes = this.selectedGenTypes.length === this.generatorTypes.length
      ? [] : this.generatorTypes.map(g => g.gen_name);
    this.chartSiteName.set(null);
    this.applyFilters();
  }

  clearGenTypes(): void {
    this.selectedGenTypes = [];
    this.chartSiteName.set(null);
    this.applyFilters();
  }

  // ── Close dropdowns on outside click ──────────────────────────

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.fuel-multiselect')) this.fuelDropdownOpen = false;
    if (!t.closest('.site-multiselect')) this.SiteDropdownOpen = false;
    if (!t.closest('.gen-multiselect')) this.genDropdownOpen = false;
  }

  // ── Search ─────────────────────────────────────────────────────

  onSearch(event: any): void {
    this.searchText.set(event.target.value);
    this.chartSiteName.set(null);
    this.applyFilters();
  }

  // ── Date Range: Operation Date ─────────────────────────────────

  onDateRangeSelected(range: { startDate: Date | null; endDate: Date | null }): void {
    this.operationStartDate.set(
      range.startDate ? this.toLocalDateString(range.startDate) : null
    );
    this.operationEndDate.set(
      range.endDate ? this.toLocalDateString(range.endDate) : null
    );
    this.applyFilters();
  }

  // ── Date Range: Reported / Entry Date ─────────────────────────

  onEntryDateRangeSelected(range: { startDate: Date | null; endDate: Date | null }): void {
    this.entryStartDate.set(
      range.startDate ? this.toLocalDateString(range.startDate) : null
    );
    this.entryEndDate.set(
      range.endDate ? this.toLocalDateString(range.endDate) : null
    );
    this.applyFilters();
  }

  // ── Reset ──────────────────────────────────────────────────────

  resetFilters(): void {
    this.selectedFuels = []; this.fuelDropdownOpen = false;
    this.selectedSite = []; this.SiteDropdownOpen = false;
    this.selectedGenTypes = []; this.genDropdownOpen = false;
    this.chartSiteName.set(null);
    this.searchText.set('');
    this.operationStartDate.set(null); this.operationEndDate.set(null);
    this.entryStartDate.set(null); this.entryEndDate.set(null);
    this._pendingOpStart = null; this._pendingOpEnd = null;
    this.currentPage.set(1);
    this.opDatePicker?.reset();
    this.entryDatePicker?.reset();
    this.loadEmissions();
  }

  // ── Apply Filters ──────────────────────────────────────────────

  applyFilters(): void { this.currentPage.set(1); this.loadEmissions(); }

  // ── Pagination ─────────────────────────────────────────────────

  paginatedData() { return this.filteredData(); }
  totalRecords() { return this.totalRecordsCount(); }
  totalPages() { return this.totalPagesCount(); }

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

  // ── Sort ───────────────────────────────────────────────────────

  sortBy(column: string): void {
    const mapped = this.columnMap[column] ?? 'EntryDate';
    if (this.sortColumn === mapped)
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else { this.sortColumn = mapped; this.sortDirection = 'asc'; }
    this.currentPage.set(1);
    this.loadEmissions();
  }

  getSortIcon(column: string): string {
    const mapped = this.columnMap[column] ?? column;
    if (this.sortColumn !== mapped) return '↕';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  // ── Navigation ─────────────────────────────────────────────────

  goToDetail(operationId: string): void {
    this.router.navigate(
      ['/dashboard/generator-ec', operationId],
      { queryParams: { mode: 'view', page: 'search' } }
    );
  }

  // ── PDF Download ───────────────────────────────────────────────

  isLoading(operationId: string): boolean { return !!this.loadingTrips[operationId]; }

  downloadTrip(operationId: string): void {
    if (!operationId) return;
    this.loadingTrips[operationId] = true;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:5236/api/GeneratorOperation/generate-pdf/${operationId}`, {
      method: 'GET', headers: { Authorization: `Bearer ${token}` }
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
        const ts = now.getFullYear()
          + String(now.getMonth() + 1).padStart(2, '0')
          + String(now.getDate()).padStart(2, '0') + '_'
          + String(now.getHours()).padStart(2, '0')
          + String(now.getMinutes()).padStart(2, '0')
          + String(now.getSeconds()).padStart(2, '0');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `Search_PowerGenerator_${ts}.pdf`;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link); URL.revokeObjectURL(url);
      })
      .catch(err => { console.error('PDF download error:', err); alert('PDF generation failed: ' + err.message); })
      .finally(() => { this.loadingTrips[operationId] = false; });
  }

  // ── Export Excel ───────────────────────────────────────────────

  exportExcel(): void {
    const params: any = {};
    if (this.searchText() && !this.chartSiteName())
      params.search = this.searchText();
    if (this.selectedFuels.length > 0)
      params.fuelTypes = this.selectedFuels.join(',');
    if (this.selectedGenTypes.length > 0 && !this.chartSiteName())
      params.generatorTypes = this.selectedGenTypes.join(',');
    if (this.chartSiteName())
      params.siteNames = this.chartSiteName();
    else if (this.selectedSite.length > 0)
      params.siteNames = this.selectedSite.join(',');
    if (this.operationStartDate()) params.startDate = this.operationStartDate();
    if (this.operationEndDate()) params.endDate = this.operationEndDate();
    if (this.entryStartDate()) params.entryStartDate = this.entryStartDate();
    if (this.entryEndDate()) params.entryEndDate = this.entryEndDate();
    params.isExport = true;

    this.service.exportExcel(params).subscribe(blob => {
      const file = new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      const now = new Date();
      const ts = ('0' + now.getDate()).slice(-2)
        + ('0' + (now.getMonth() + 1)).slice(-2) + now.getFullYear() + '_'
        + ('0' + now.getHours()).slice(-2)
        + ('0' + now.getMinutes()).slice(-2)
        + ('0' + now.getSeconds()).slice(-2);
      a.download = `Search_PowerGenerator_${ts}.xlsx`;
      a.href = url; a.click(); URL.revokeObjectURL(url);
    });
  }

  private toLocalDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}