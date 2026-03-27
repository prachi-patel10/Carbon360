import {
  Component, OnInit, AfterViewInit, signal, ViewChild, HostListener
} from '@angular/core';
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
export class SearchGenerator implements OnInit, AfterViewInit {

  @ViewChild('opDatePicker')    opDatePicker!:    DateRangePickerComponent;
  @ViewChild('entryDatePicker') entryDatePicker!: DateRangePickerComponent;

  filteredData = signal<GeneratorOperationDisplay[]>([]);

  fuelTypes: any[]        = [];
  selectedFuels: string[] = [];
  fuelDropdownOpen        = false;

  generatorTypes: any[]      = [];
  selectedGenTypes: string[] = [];
  genDropdownOpen            = false;

  searchText = signal<string>('');

  operationStartDate = signal<string | null>(null);
  operationEndDate   = signal<string | null>(null);
  entryStartDate     = signal<string | null>(null);
  entryEndDate       = signal<string | null>(null);

  // ✅ Site name from site chart click
  chartSiteName: string | null = null;

  currentPage       = signal<number>(1);
  pageSize          = 10;
  totalRecordsCount = signal<number>(0);
  totalPagesCount   = signal<number>(1);

  private readonly columnMap: Record<string, string> = {
    generatorName:      'GeneratorName',
    reportId:           'ReportId',
    entryDate:          'EntryDate',
    startTime:          'StartTime',
    endTime:            'EndTime',
    loadFactor:         'LoadFactor',
    fuelConsumedLiters: 'FuelConsumedLiters',
    totalEmission:      'Total_CO2E_KG',
  };

  sortColumn:    string          = 'EntryDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  loadingTrips: Record<string, boolean> = {};

  private _pendingOpStart:    string | null = null;
  private _pendingOpEnd:      string | null = null;
  private _pendingEntryStart: string | null = null;
  private _pendingEntryEnd:   string | null = null;
  private _viewReady = false;

  constructor(
    private service:     SearchGeneratorService,
    private fuelService: FueltypeService,
    private router:      Router,
    private route:       ActivatedRoute,
  ) { }

  // ── Helpers ────────────────────────────────────────────────────

  private toDateOnly(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const clean = raw.trim().substring(0, 10);
    return clean.length === 10 ? clean : null;
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadFuelTypes();
    this.loadGeneratorTypes();

    this.route.queryParams.subscribe(params => {

      // Full reset on every navigation
      this.selectedFuels    = [];
      this.selectedGenTypes = [];
      this.chartSiteName    = null;
      this.searchText.set('');
      this.operationStartDate.set(null);
      this.operationEndDate.set(null);
      this.entryStartDate.set(null);
      this.entryEndDate.set(null);
      this.currentPage.set(1);
      this._pendingOpStart    = null;
      this._pendingOpEnd      = null;
      this._pendingEntryStart = null;
      this._pendingEntryEnd   = null;

      if (this._viewReady) {
        this.opDatePicker?.reset();
        this.entryDatePicker?.reset();
      }

      if (params['source'] === 'chart') {

        // ── Build search box label parts ─────────────────────────
        // ✅ We collect label parts and join them so the search box
        //    shows e.g. "Steel pvt" or "Petrol" or "Smart Control Generator"
        //    or combinations depending on what was clicked
        const labelParts: string[] = [];

        // ── Fuel type filter ─────────────────────────────────────
        if (params['fuelType']) {
          const fuel  = params['fuelType'].trim();
          const match = this.fuelTypes.find(
            f => f.fuel_name.toLowerCase() === fuel.toLowerCase()
          );
          this.selectedFuels = [match ? match.fuel_name : fuel];
          // ✅ Add fuel to label
          labelParts.push(fuel);
        }

        // ── Generator filter ─────────────────────────────────────
        if (params['generatorName'] && !params['siteNames']) {
          const genName = params['generatorName'].trim();
          this.selectedGenTypes = [genName];
          // ✅ Add generator name to label
          labelParts.push(genName);
        }

        // ── Site filter ──────────────────────────────────────────
        if (params['siteNames']) {
          this.chartSiteName = params['siteNames'].trim();
          // ✅ Add site name to label
          labelParts.push(params['siteNames'].trim());
        }

        if (params['search']) {
          this.searchText.set(params['search'].trim());
        } else {
          // ✅ Set search box to show all active filter labels
          this.searchText.set(labelParts.join(' — '));
        }

        // ── Operation Date ───────────────────────────────────────
        const opStart = this.toDateOnly(params['startDate']);
        const opEnd   = this.toDateOnly(params['endDate']);
        if (opStart) { this.operationStartDate.set(opStart); this._pendingOpStart = opStart; }
        if (opEnd)   { this.operationEndDate.set(opEnd);     this._pendingOpEnd   = opEnd;   }

        // ── Reported / Entry Date ────────────────────────────────
        const esDate = this.toDateOnly(params['entryStartDate']);
        const eeDate = this.toDateOnly(params['entryEndDate']);
        if (esDate) { this.entryStartDate.set(esDate); this._pendingEntryStart = esDate; }
        if (eeDate) { this.entryEndDate.set(eeDate);   this._pendingEntryEnd   = eeDate; }

        this.applyPickersIfReady();
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
      if (this._pendingEntryStart && this._pendingEntryEnd)
        this.setPickerRange(
          this.entryDatePicker,
          new Date(this._pendingEntryStart),
          new Date(this._pendingEntryEnd)
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
      this.fuelTypes = Array.isArray(res) ? res : res.data || [];
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

    // ✅ Never send generatorNames when chartSiteName is active
    const genParam = (this.selectedGenTypes.length > 0 && !this.chartSiteName)
      ? this.selectedGenTypes.map(g => g.trim()).join(',')
      : undefined;

    const siteParam = this.chartSiteName ? this.chartSiteName.trim() : undefined;

    // ✅ Do NOT send searchText as @Search when chart filter is active
    const hasChartFilter = !!(fuelParam || genParam || siteParam);
    const searchParam    = hasChartFilter
      ? undefined
      : (this.searchText()?.trim() || undefined);

    const opStart    = this.operationStartDate() || undefined;
    const opEnd      = this.operationEndDate()   || undefined;
    const entryStart = this.entryStartDate()     || undefined;
    const entryEnd   = this.entryEndDate()       || undefined;

    console.log('loadEmissions() params →', {
      siteParam, genParam, fuelParam, searchParam,
      opStart, opEnd, entryStart, entryEnd
    });

    this.service.searchEmissions(
      this.currentPage(), this.pageSize,
      searchParam, fuelParam, genParam,
      opStart, opEnd,
      entryStart, entryEnd,
      this.sortColumn, this.sortDirection,
      siteParam
    ).subscribe({
      next: (res: any) => {
        const records = res.data         ?? [];
        const total   = res.totalRecords ?? 0;

        const mapped = records.map((e: any) => ({
          ...e,
          generatorName: e.generatorName ?? 'Unknown Generator',
          fuelType:      e.fuelType      ?? 'Unknown',
          status:        e.statusName    ?? (e.statusId === 1 ? 'Completed' : 'Pending'),
          totalEmission: e.totalEmission ?? 0,
        }));

        this.filteredData.set(mapped);
        this.totalRecordsCount.set(total);
        this.totalPagesCount.set(Math.ceil(total / this.pageSize) || 1);

        // ✅ When navigated from site chart bar click —
        //    Extract all unique generator names from filtered response
        //    and pre-select them in Generator dropdown
        if (this.chartSiteName && mapped.length > 0) {
          const uniqueGenNames: string[] = [
            ...new Set<string>(
              mapped
                .map((r: any) => r.generatorName as string)
                .filter((n: string) => !!n && n !== 'Unknown Generator')
            )
          ];

          // ✅ Pre-select in generator dropdown
          this.selectedGenTypes = uniqueGenNames;

          // ✅ Add to generatorTypes list if not already present
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

  // ── Multi-Select: Generator ────────────────────────────────────

  toggleGenDropdown(): void { this.genDropdownOpen = !this.genDropdownOpen; }
  isGenSelected(name: string): boolean { return this.selectedGenTypes.includes(name); }

  toggleGenType(gen: any): void {
    const name = typeof gen === 'string' ? gen : (gen.gen_name || gen.generatorName);
    if (this.selectedGenTypes.includes(name))
      this.selectedGenTypes = this.selectedGenTypes.filter(g => g !== name);
    else
      this.selectedGenTypes.push(name);
    this.chartSiteName = null;
    this.applyFilters();
  }

  toggleSelectAllGen(): void {
    this.selectedGenTypes = this.selectedGenTypes.length === this.generatorTypes.length
      ? [] : this.generatorTypes.map(g => g.gen_name);
    this.chartSiteName = null;
    this.applyFilters();
  }

  clearGenTypes(): void {
    this.selectedGenTypes = [];
    this.chartSiteName    = null;
    this.applyFilters();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.fuel-multiselect')) this.fuelDropdownOpen = false;
    if (!t.closest('.gen-multiselect'))  this.genDropdownOpen  = false;
  }

  // ── Search ─────────────────────────────────────────────────────

  onSearch(event: any): void {
    this.searchText.set(event.target.value);
    this.chartSiteName    = null;
    this.selectedFuels    = [];
    this.selectedGenTypes = [];
    this.applyFilters();
  }

  // ── Date Range: Operation Date ─────────────────────────────────

  onDateRangeSelected(range: { startDate: Date | null; endDate: Date | null }): void {
    this.operationStartDate.set(
      range.startDate ? range.startDate.toISOString().substring(0, 10) : null
    );
    this.operationEndDate.set(
      range.endDate ? range.endDate.toISOString().substring(0, 10) : null
    );
    this.applyFilters();
  }

  // ── Date Range: Reported / Entry Date ─────────────────────────

  onEntryDateRangeSelected(range: { startDate: Date | null; endDate: Date | null }): void {
    this.entryStartDate.set(
      range.startDate ? range.startDate.toISOString().substring(0, 10) : null
    );
    this.entryEndDate.set(
      range.endDate ? range.endDate.toISOString().substring(0, 10) : null
    );
    this.applyFilters();
  }

  // ── Reset ──────────────────────────────────────────────────────

  resetFilters(): void {
    this.selectedFuels    = []; this.fuelDropdownOpen = false;
    this.selectedGenTypes = []; this.genDropdownOpen  = false;
    this.chartSiteName    = null;
    this.searchText.set('');
    this.operationStartDate.set(null); this.operationEndDate.set(null);
    this.entryStartDate.set(null);     this.entryEndDate.set(null);
    this._pendingOpStart    = null;    this._pendingOpEnd      = null;
    this._pendingEntryStart = null;    this._pendingEntryEnd   = null;
    this.currentPage.set(1);
    this.opDatePicker?.reset();
    this.entryDatePicker?.reset();
    this.loadEmissions();
  }

  // ── Apply Filters ──────────────────────────────────────────────

  applyFilters(): void { this.currentPage.set(1); this.loadEmissions(); }

  // ── Pagination ─────────────────────────────────────────────────

  paginatedData() { return this.filteredData(); }
  totalRecords()  { return this.totalRecordsCount(); }
  totalPages()    { return this.totalPagesCount(); }

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
        const ts  = now.getFullYear()
          + String(now.getMonth() + 1).padStart(2, '0')
          + String(now.getDate()).padStart(2, '0') + '_'
          + String(now.getHours()).padStart(2, '0')
          + String(now.getMinutes()).padStart(2, '0')
          + String(now.getSeconds()).padStart(2, '0');
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `Search_PowerGenerator_${ts}.pdf`;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link); URL.revokeObjectURL(url);
      })
      .catch(err  => { console.error('PDF download error:', err); alert('PDF generation failed: ' + err.message); })
      .finally(() => { this.loadingTrips[operationId] = false; });
  }

  // ── Export Excel ───────────────────────────────────────────────

  exportExcel(): void {
    const params: any = {};
    if (this.searchText() && !this.chartSiteName)
                                         params.search         = this.searchText();
    if (this.selectedFuels.length > 0)   params.fuelTypes      = this.selectedFuels.join(',');
    if (this.selectedGenTypes.length > 0 && !this.chartSiteName)
                                         params.generatorTypes = this.selectedGenTypes.join(',');
    if (this.chartSiteName)              params.siteNames      = this.chartSiteName;
    if (this.operationStartDate())       params.startDate      = this.operationStartDate();
    if (this.operationEndDate())         params.endDate        = this.operationEndDate();
    if (this.entryStartDate())           params.entryStartDate = this.entryStartDate();
    if (this.entryEndDate())             params.entryEndDate   = this.entryEndDate();
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
      a.href = url; a.click(); URL.revokeObjectURL(url);
    });
  }
}