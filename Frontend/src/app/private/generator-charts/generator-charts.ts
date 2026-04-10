import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, Input, OnChanges, SimpleChanges,
  signal, computed, Output, EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Chart, registerables, TooltipItem } from 'chart.js';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  DashboardService,
  FuelCombinedChartResponse,
  MonthlyEmissionChartResponse,
  GeneratorRunHoursChartResponse,
  GeneratorLoadFactorChartResponse,
  GeneratorRunHoursMonthlyPivotResponse,
  SiteEmissionResponse
} from '../dashboard/dashboard-service';
import { SearchGeneratorService } from '../power-generator/search-generator/search-generator-service';
import { saveAs } from 'file-saver';

Chart.register(...registerables);

interface RunHoursLegendItem { name: string; color: string; hours: number; pct: string; site: string; }
interface LoadFactorLegendItem { name: string; color: string; }

@Component({
  selector: 'app-generator-charts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generator-charts.html',
  styleUrls: ['./generator-charts.css']
})
export class GeneratorCharts implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  @Input() year: number = new Date().getFullYear();
  @Input() fromDate?: string;
  @Input() toDate?: string;
  @Output() gridRowClick = new EventEmitter<Record<string, any>>();

  @ViewChild('generatorFuelCanvas') fuelCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('generatorEmissionCanvas') emissionCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('generatorRunHoursCanvas') runHoursCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('generatorSiteEmissionCanvas') siteEmissionCanvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Signals ────────────────────────────────────────────────────
  isFuelLoading = signal(false);
  isEmissionLoading = signal(false);
  isRunHoursLoading = signal(false);
  isLoadFactorLoading = signal(false);
  isRunHoursMonthlyLoading = signal(false);
  isSiteEmissionLoading = signal(false);

  fuelError = signal('');
  emissionError = signal('');
  runHoursError = signal('');
  loadFactorError = signal('');
  runHoursMonthlyError = signal('');
  siteEmissionError = signal('');

  fuelLegend = signal<{ fuelType: string; color: string }[]>([]);
  emissionLegend = signal<{ label: string; color: string }[]>([]);
  runHoursLegend = signal<RunHoursLegendItem[]>([]);
  loadFactorLegend = signal<LoadFactorLegendItem[]>([]);

  generatorTotal = signal(0);
  topFuelType = signal('-');
  topFuelAmount = signal(0);
  totalCO2e = signal(0);
  totalRunHours = signal(0);
  totalPowerOutput = signal(0);

  runHoursMonthlyData = signal<GeneratorRunHoursMonthlyPivotResponse | null>(null);

  showFuelCanvas = computed(() => !this.isFuelLoading() && !this.fuelError());
  showEmissionCanvas = computed(() => !this.isEmissionLoading() && !this.emissionError());
  showRunHoursCanvas = computed(() => !this.isRunHoursLoading() && !this.runHoursError());
  showLoadFactorCanvas = computed(() => !this.isLoadFactorLoading() && !this.loadFactorError());
  showRunHoursMonthlyTable = computed(() => !this.isRunHoursMonthlyLoading() && !this.runHoursMonthlyError());
  showSiteEmissionCanvas = computed(() => !this.isSiteEmissionLoading() && !this.siteEmissionError());

  // ── Chart instances ────────────────────────────────────────────
  private fuelChart: Chart | null = null;
  private emissionChart: Chart | null = null;
  private runHoursChart: Chart | null = null;
  private loadFactorChart: Chart | null = null;
  private siteEmissionChart: Chart | null = null;

  private destroy$ = new Subject<void>();
  private viewReady = false;

  private _lastFuelData: FuelCombinedChartResponse | null = null;
  private _lastEmissionData: MonthlyEmissionChartResponse | null = null;
  private _lastRunHoursData: GeneratorRunHoursChartResponse | null = null;
  private _lastLoadFactorData: GeneratorLoadFactorChartResponse | null = null;
  private _lastSiteEmissionData: SiteEmissionResponse[] | null = null;

  private pendingFuel: FuelCombinedChartResponse | null = null;
  private pendingEmission: MonthlyEmissionChartResponse | null = null;
  private pendingRunHours: GeneratorRunHoursChartResponse | null = null;
  private pendingLoadFactor: GeneratorLoadFactorChartResponse | null = null;
  private pendingSiteEmission: SiteEmissionResponse[] | null = null;

  constructor(
    private svc: DashboardService,
    private searchSvc: SearchGeneratorService,
    private router: Router
  ) { }

  ngOnInit(): void { this.loadAll(); }
  ngOnDestroy(): void {
    this.destroy$.next(); this.destroy$.complete();
    this.fuelChart?.destroy();
    this.emissionChart?.destroy();
    this.runHoursChart?.destroy();
    this.loadFactorChart?.destroy();
    this.siteEmissionChart?.destroy();
  }

  ngOnChanges(c: SimpleChanges): void {
    const yearChanged = c['year'] && !c['year'].firstChange;
    const fromChanged = c['fromDate'] && !c['fromDate'].firstChange;
    const toChanged = c['toDate'] && !c['toDate'].firstChange;
    if (yearChanged || fromChanged || toChanged) this.loadAll();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.pendingFuel) { this.deferRender('fuel', this.pendingFuel); this.pendingFuel = null; }
    if (this.pendingEmission) { this.deferRender('emission', this.pendingEmission); this.pendingEmission = null; }
    if (this.pendingRunHours) { this.deferRender('runHours', this.pendingRunHours); this.pendingRunHours = null; }
    if (this.pendingSiteEmission) { this.deferRender('siteEmission', this.pendingSiteEmission); this.pendingSiteEmission = null; }
  }

  loadAll(): void {
    this.loadFuelChart();
    this.loadEmissionChart();
    this.loadRunHoursChart();
    this.loadRunHoursMonthlyChart();
    this.loadSiteEmissionChart();
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPER: month labels — no UTC timezone shift
  // ═══════════════════════════════════════════════════════════════
  private getMonthLabels(): string[] {
    if (this.fromDate && this.toDate) {
      const labels: string[] = [];
      // Split string directly — avoids new Date("yyyy-MM-dd") UTC shift
      const [fy, fm] = this.fromDate.split('-').map(Number);
      const [ty, tm] = this.toDate.split('-').map(Number);
      let curYear = fy, curMonth = fm; // curMonth is 1-based
      while (curYear < ty || (curYear === ty && curMonth <= tm)) {
        // new Date(y, m-1, 1) = local midnight — no UTC shift
        const d = new Date(curYear, curMonth - 1, 1);
        labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        curMonth++;
        if (curMonth > 12) { curMonth = 1; curYear++; }
      }
      return labels;
    }
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }

  // ═══════════════════════════════════════════════════════════════
  //  NAVIGATION — label-based (no slot-index bugs)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Parse "Apr 26" → { year: 2026, month: 4 }
   * Single source of truth for all month drill-downs.
   */
  private parseLabelToYearMonth(label: string): { year: number; month: number } | null {
    if (!label) return null;

    const monthMap: Record<string, number> = {
      Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
      Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
    };

    const parts = label.trim().split(' ');

    // ── "Apr 26" format (fromDate/toDate range) ──
    if (parts.length === 2) {
      const month = monthMap[parts[0]];
      const year = 2000 + parseInt(parts[1], 10);
      if (month && !isNaN(year)) return { year, month };
    }

    // ── "Apr" format (year-only mode, fallback labels) ──
    if (parts.length === 1) {
      const month = monthMap[parts[0]];
      if (month) return { year: this.year, month };
    }

    console.warn('[GeneratorCharts] parseLabelToYearMonth: failed for label:', label);
    return null;
  }

  /**
   * Core: build exact startDate/endDate from year+month and navigate.
   */
  private navigateByYearMonth(
    year: number,
    month: number,
    extras: { fuelType?: string; generatorName?: string } = {}
  ): void {
    // new Date(year, month, 0) = day 0 of next month = last day of THIS month
    const lastDay = new Date(year, month, 0).getDate();
    const mm = String(month).padStart(2, '0');
    const dd = String(lastDay).padStart(2, '0');

    const queryParams: Record<string, any> = {
      source: 'chart',
      startDate: `${year}-${mm}-01`,
      endDate: `${year}-${mm}-${dd}`,
    };

    if (extras.fuelType) queryParams['fuelType'] = extras.fuelType.trim();
    if (extras.generatorName) queryParams['generatorName'] = extras.generatorName.trim();

    // ✅ Debug — remove after confirming fix
    console.log('[GeneratorCharts] navigateByYearMonth →', queryParams);

    this.router.navigate(['/dashboard/searchGenerator'], { queryParams });
  }

  /** Navigate using chart label string e.g. "Apr 26" */
  navigateByLabel(label: string, extras: { fuelType?: string; generatorName?: string } = {}): void {
    const ym = this.parseLabelToYearMonth(label);
    if (!ym) {
      console.warn('[GeneratorCharts] navigateByLabel: cannot parse label:', label);
      return;
    }
    this.navigateByYearMonth(ym.year, ym.month, extras);
  }

  navigateByLabelAndFuel(label: string, fuelType: string): void {
    this.navigateByLabel(label, { fuelType });
  }

  /**
   * Navigate with full selected range — for site/generator/legend
   * clicks that have no specific month.
   */
  private navigateToGeneratorSearch(params: {
    fuelType?: string;
    generatorName?: string;
    siteNames?: string;
    search?: string;
  }): void {
    const queryParams: Record<string, any> = { source: 'chart' };

    if (params.fuelType) queryParams['fuelType'] = params.fuelType.trim();
    if (params.generatorName) queryParams['generatorName'] = params.generatorName.trim();
    if (params.siteNames) queryParams['siteNames'] = params.siteNames.trim();
    if (params.search) queryParams['search'] = params.search.trim();

    if (this.fromDate && this.toDate) {
      queryParams['startDate'] = this.fromDate; // already "yyyy-MM-dd" — no conversion needed
      queryParams['endDate'] = this.toDate;
    } else {
      queryParams['startDate'] = `${this.year}-01-01`;
      queryParams['endDate'] = `${this.year}-12-31`;
    }

    console.log('[GeneratorCharts] navigateToGeneratorSearch →', queryParams);
    this.router.navigate(['/dashboard/searchGenerator'], { queryParams });
  }

  // ── Public click handlers ──────────────────────────────────────

  onFuelGridRowClick(label: string, fuelType?: string): void {
    this.navigateByLabel(label, fuelType ? { fuelType } : {});
  }

  onEmissionGridRowClick(label: string): void {
    this.navigateByLabel(label);
  }

  // ── Pivot table clicks ─────────────────────────────────────────

  onRunHoursGridCellClick(monthIndex: number, generatorName: string): void {
    const pivotData = this.runHoursMonthlyData();
    const rawLabel = pivotData?.monthLabels?.[monthIndex] ?? '';

    // Normalize "Jan25" → "Jan 25" so parseLabelToYearMonth works
    const label = rawLabel.replace(/^([A-Za-z]{3})(\d{2})$/, '$1 $2');

    const ym = this.parseLabelToYearMonth(label);
    if (!ym) {
      console.warn('[GeneratorCharts] onRunHoursGridCellClick: cannot parse label:', rawLabel);
      return;
    }

    const lastDay = new Date(ym.year, ym.month, 0).getDate();
    const mm = String(ym.month).padStart(2, '0');

    const queryParams: Record<string, any> = {
      source: 'chart',
      startDate: `${ym.year}-${mm}-01`,
      endDate: `${ym.year}-${mm}-${String(lastDay).padStart(2, '0')}`,
    };

    if (generatorName && generatorName !== 'Unknown Generator')
      queryParams['generatorName'] = generatorName.trim();

    console.log('[GeneratorCharts] onRunHoursGridCellClick →', queryParams);
    this.router.navigate(['/dashboard/searchGenerator'], { queryParams });
  }

  onRunHoursGeneratorTotalClick(generatorName: string): void {
    if (!generatorName || generatorName === 'Unknown Generator') {
      this.navigateToGeneratorSearch({});
      return;
    }
    this.navigateToGeneratorSearch({ generatorName: generatorName.trim() });
  }

  onRunHoursMonthTotalClick(monthIndex: number): void {
  const pivotData = this.runHoursMonthlyData();
  const rawLabel = pivotData?.monthLabels?.[monthIndex] ?? '';
  
  // Normalize "Jan25" → "Jan 25" so parseLabelToYearMonth works
  const label = rawLabel.replace(/^([A-Za-z]{3})(\d{2})$/, '$1 $2');
  
  console.log('[GeneratorCharts] onRunHoursMonthTotalClick label:', label);
  this.navigateByLabel(label);
}

  onRunHoursLegendClick(generatorName: string, fuelType?: string): void {
    const p: { generatorName?: string; fuelType?: string } = {};
    if (generatorName && generatorName !== 'Unknown Generator')
      p.generatorName = generatorName.trim();
    if (fuelType) p.fuelType = fuelType.trim();
    this.navigateToGeneratorSearch(p);
  }

  onSiteGridRowClick(siteName: string): void {
    this.navigateToGeneratorSearch({ siteNames: siteName });
  }

  // ═══════════════════════════════════════════════════════════════
  //  DEFERRED RENDER DISPATCHER
  // ═══════════════════════════════════════════════════════════════
  private deferRender(
    type: 'fuel' | 'emission' | 'runHours' | 'siteEmission',
    data: any
  ): void {
    switch (type) {
      case 'fuel':
        if (data) this._lastFuelData = data;
        if (!this._lastFuelData) return;
        setTimeout(() => this.renderFuelChart(this._lastFuelData!), 0);
        break;
      case 'emission':
        if (data) this._lastEmissionData = data;
        if (!this._lastEmissionData) return;
        setTimeout(() => this.renderEmissionChart(this._lastEmissionData!), 0);
        break;
      case 'runHours':
        if (data) this._lastRunHoursData = data;
        if (!this._lastRunHoursData) return;
        setTimeout(() => this.renderRunHoursChart(this._lastRunHoursData!), 0);
        break;
      case 'siteEmission':
        if (data) this._lastSiteEmissionData = data;
        if (!this._lastSiteEmissionData) return;
        setTimeout(() => this.renderSiteEmissionChart(this._lastSiteEmissionData!), 0);
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD: Fuel
  // ═══════════════════════════════════════════════════════════════
  loadFuelChart(): void {
    this.isFuelLoading.set(true);
    this.fuelError.set('');
    this.fuelChart?.destroy();
    this.fuelChart = null;

    this.svc.getGeneratorFuelMonthly(this.year, this.fromDate, this.toDate)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isFuelLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) {
            const emptyData: FuelCombinedChartResponse = { labels: this.getMonthLabels(), datasets: [] };
            this.generatorTotal.set(0); this.topFuelType.set('-');
            this.topFuelAmount.set(0); this.fuelLegend.set([]);
            if (this.viewReady) this.deferRender('fuel', emptyData); else this.pendingFuel = emptyData;
            return;
          }
          this.computeFuelKpis(res.data);
          this.buildFuelLegend(res.data);
          if (this.viewReady) this.deferRender('fuel', res.data); else this.pendingFuel = res.data;
        },
        error: () => {
          const emptyData: FuelCombinedChartResponse = { labels: this.getMonthLabels(), datasets: [] };
          this.generatorTotal.set(0); this.topFuelType.set('-');
          this.topFuelAmount.set(0); this.fuelLegend.set([]);
          if (this.viewReady) this.deferRender('fuel', emptyData); else this.pendingFuel = emptyData;
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD: Emission
  // ═══════════════════════════════════════════════════════════════
  loadEmissionChart(): void {
    this.isEmissionLoading.set(true);
    this.emissionError.set('');
    this.emissionChart?.destroy();
    this.emissionChart = null;

    this.svc.getGeneratorEmissionChart(this.year, this.fromDate, this.toDate)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isEmissionLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) {
            const emptyData: MonthlyEmissionChartResponse = { labels: this.getMonthLabels(), datasets: [] };
            this.totalCO2e.set(0); this.emissionLegend.set([]);
            if (this.viewReady) this.deferRender('emission', emptyData); else this.pendingEmission = emptyData;
            return;
          }
          this.computeEmissionKpi(res.data);
          this.buildEmissionLegend(res.data);
          if (this.viewReady) this.deferRender('emission', res.data); else this.pendingEmission = res.data;
        },
        error: () => {
          const emptyData: MonthlyEmissionChartResponse = { labels: this.getMonthLabels(), datasets: [] };
          this.totalCO2e.set(0); this.emissionLegend.set([]);
          if (this.viewReady) this.deferRender('emission', emptyData); else this.pendingEmission = emptyData;
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD: Run Hours (Doughnut)
  // ═══════════════════════════════════════════════════════════════
  loadRunHoursChart(): void {
    this.isRunHoursLoading.set(true);
    this.runHoursError.set('');
    this.runHoursChart?.destroy();
    this.runHoursChart = null;

    this.svc.getGeneratorRunHours(this.year, this.fromDate, this.toDate)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isRunHoursLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) {
            const emptyData: GeneratorRunHoursChartResponse = {
              labels: [], data: [], colors: [],
              siteNames: [], fuelTypes: [], fuelConsumed: [], powerOutput: []
            };
            this.totalRunHours.set(0); this.totalPowerOutput.set(0); this.runHoursLegend.set([]);
            if (this.viewReady) this.deferRender('runHours', emptyData); else this.pendingRunHours = emptyData;
            return;
          }
          this.computeRunHoursKpis(res.data);
          this.buildRunHoursLegend(res.data);
          if (this.viewReady) this.deferRender('runHours', res.data); else this.pendingRunHours = res.data;
        },
        error: () => {
          const emptyData: GeneratorRunHoursChartResponse = {
            labels: [], data: [], colors: [],
            siteNames: [], fuelTypes: [], fuelConsumed: [], powerOutput: []
          };
          this.totalRunHours.set(0); this.totalPowerOutput.set(0); this.runHoursLegend.set([]);
          if (this.viewReady) this.deferRender('runHours', emptyData); else this.pendingRunHours = emptyData;
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD: Run Hours Monthly Pivot
  // ═══════════════════════════════════════════════════════════════
  loadRunHoursMonthlyChart(): void {
    this.isRunHoursMonthlyLoading.set(true);
    this.runHoursMonthlyError.set('');
    this.runHoursMonthlyData.set(null);

    this.svc.getGeneratorRunHoursMonthly(this.year, this.fromDate, this.toDate)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isRunHoursMonthlyLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) { this.runHoursMonthlyData.set(null); return; }
          this.runHoursMonthlyData.set(res.data);
        },
        error: () => { this.runHoursMonthlyData.set(null); }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD: Site Emission
  // ═══════════════════════════════════════════════════════════════
  loadSiteEmissionChart(): void {
    this.isSiteEmissionLoading.set(true);
    this.siteEmissionError.set('');
    this.siteEmissionChart?.destroy();
    this.siteEmissionChart = null;

    this.svc.getGeneratorSiteEmissions(this.year, this.fromDate, this.toDate)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isSiteEmissionLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data?.length) {
            if (this.viewReady) this.deferRender('siteEmission', []); else this.pendingSiteEmission = [];
            return;
          }
          if (this.viewReady) this.deferRender('siteEmission', res.data); else this.pendingSiteEmission = res.data;
        },
        error: () => {
          if (this.viewReady) this.deferRender('siteEmission', []); else this.pendingSiteEmission = [];
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  //  KPIs
  // ═══════════════════════════════════════════════════════════════
  private computeFuelKpis(data: FuelCombinedChartResponse): void {
    const ds = data?.datasets ?? [];
    this.generatorTotal.set(ds.reduce((t, d) => t + (d.data ?? []).reduce((a, b) => a + b, 0), 0));
    const ft: Record<string, number> = {};
    ds.forEach(d => { ft[d.fuelType] = (ft[d.fuelType] ?? 0) + (d.data ?? []).reduce((a, b) => a + b, 0); });
    const top = Object.entries(ft).sort((a, b) => b[1] - a[1])[0];
    this.topFuelType.set(top?.[0] ?? '-');
    this.topFuelAmount.set(top?.[1] ?? 0);
  }

  private computeEmissionKpi(data: MonthlyEmissionChartResponse): void {
    const ds = (data?.datasets ?? []).find(d => d.emissionType === 'Total');
    this.totalCO2e.set(ds ? (ds.data ?? []).reduce((a, b) => a + b, 0) : 0);
  }

  private computeRunHoursKpis(data: GeneratorRunHoursChartResponse): void {
    this.totalRunHours.set((data?.data ?? []).reduce((a, b) => a + b, 0));
    this.totalPowerOutput.set((data?.powerOutput ?? []).reduce((a, b) => a + b, 0));
  }

  private buildFuelLegend(data: FuelCombinedChartResponse): void {
    const seen = new Set<string>();
    const leg: { fuelType: string; color: string }[] = [];
    (data?.datasets ?? []).forEach(d => {
      if (!seen.has(d.fuelType)) { seen.add(d.fuelType); leg.push({ fuelType: d.fuelType, color: d.color }); }
    });
    this.fuelLegend.set(leg);
  }

  private buildEmissionLegend(data: MonthlyEmissionChartResponse): void {
    this.emissionLegend.set((data?.datasets ?? []).map(d => ({ label: d.label, color: d.color })));
  }

  private buildRunHoursLegend(data: GeneratorRunHoursChartResponse): void {
    const total = (data?.data ?? []).reduce((a, b) => a + b, 0);
    this.runHoursLegend.set((data?.labels ?? []).map((name, i) => ({
      name,
      color: (data.colors ?? [])[i] ?? '#888',
      hours: (data.data ?? [])[i] ?? 0,
      pct: total > 0 ? (((data.data ?? [])[i] ?? 0) / total * 100).toFixed(1) : '0',
      site: (data.siteNames ?? [])[i] ?? '-',
    })));
  }

  private buildLoadFactorLegend(data: GeneratorLoadFactorChartResponse): void {
    this.loadFactorLegend.set((data?.datasets ?? []).map(d => ({ name: d.generatorName, color: d.color })));
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: Stacked Bar (Fuel)
  // ═══════════════════════════════════════════════════════════════
  private renderFuelChart(data: FuelCombinedChartResponse): void {
    const canvas = this.fuelCanvasRef?.nativeElement;
    if (!canvas || canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderFuelChart(data)); return;
    }
    this.fuelChart?.destroy();
    this.fuelChart = null;

    const ds = data?.datasets ?? [];

    this.fuelChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.labels ?? this.getMonthLabels(),
        datasets: ds.map(d => ({
          label: d.label,
          data: d.data,
          backgroundColor: d.color,
          borderColor: d.color.length > 7 ? d.color.substring(0, 7) : d.color,
          borderWidth: 1, borderRadius: 5,
          borderSkipped: false as const,
          stack: d.fuelType
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (_e: any, elements: any[]) => {
          if (!elements.length) return;

          const { datasetIndex, index } = elements[0];
          const dataset = data.datasets[datasetIndex];
          const rawLabel = (data.labels ?? [])[index] ?? '';

          // Normalize "Jan26" → "Jan 26" so parseLabelToYearMonth works
          const label = rawLabel.replace(/^([A-Za-z]{3})(\d{2})$/, '$1 $2');

          console.log('[FuelChart] onClick label:', label, '| fuelType:', dataset?.fuelType);

          if (label && dataset?.fuelType) {
            this.navigateByLabelAndFuel(label, dataset.fuelType);
          }
        },
        onHover: (_e: any, elements: any[]) => {
          if (canvas) canvas.style.cursor = elements.length ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'nearest', intersect: true,
            backgroundColor: '#451a00', titleColor: '#fed7aa', bodyColor: '#ffedd5',
            borderColor: '#92400e', borderWidth: 1, padding: 10,
            filter: (item: TooltipItem<'bar'>) => (item.parsed.y ?? 0) > 0,
            callbacks: {
              title: (items: TooltipItem<'bar'>[]) => {
                if (!items.length) return '';
                const ft = (items[0].dataset as any).stack;
                const total = items.reduce((s, i) => s + (i.parsed.y ?? 0), 0);
                // Normalize label in tooltip title too
                const rawLbl = items[0].label ?? '';
                const lbl = rawLbl.replace(/^([A-Za-z]{3})(\d{2})$/, '$1 $2');
                return `${lbl} — ${ft}: ${total.toLocaleString()} L`;
              },
              label: (ctx: TooltipItem<'bar'>) => {
                const val = ctx.parsed.y as number;
                return val === 0 ? '' : ` ${ctx.dataset.label}: ${val.toLocaleString()} L`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true, grid: { display: false },
            ticks: {
              color: '#64748b',
              font: { size: 11 },
              maxRotation: 35,
              minRotation: 35,
              autoSkip: false,
              callback: (_val: any, index: number) => {
                const raw = (data.labels ?? this.getMonthLabels())[index] ?? '';
                return raw.replace(/^([A-Za-z]{3})(\d{2})$/, '$1 $2');
              }
            }
          },
          y: {
            stacked: true, grid: { color: '#fff7ed' }, min: 0,
            ticks: {
              color: '#64748b',
              font: { size: 11 },
              callback: (v: any) => `${Number(v).toLocaleString()} L`
            },
            title: { display: true, text: 'Litres', color: '#94a3b8', font: { size: 11 } }
          }
        },
        animation: { duration: 400, easing: 'easeInOutQuart' }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: Line (Emission)
  // ═══════════════════════════════════════════════════════════════
  private renderEmissionChart(data: MonthlyEmissionChartResponse): void {
    const canvas = this.emissionCanvasRef?.nativeElement;
    if (!canvas || canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderEmissionChart(data)); return;
    }
    this.emissionChart?.destroy();
    this.emissionChart = null;

    const ds = data?.datasets ?? [];

    this.emissionChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.labels ?? this.getMonthLabels(),
        datasets: ds.map(d => ({
          label: d.label,
          data: d.data,
          borderColor: d.color,
          backgroundColor: d.color + '22',
          borderWidth: 2, pointRadius: 3, pointHoverRadius: 5,
          tension: 0.4, fill: false as const
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (_e: any, elements: any[]) => {
          console.log('[EmissionChart] onClick elements:', elements);
          if (!elements.length) return;
          const label = (data.labels ?? [])[elements[0].index] ?? '';
          console.log('[EmissionChart] label:', label);
          this.navigateByLabel(label);
        },
        onHover: (_e: any, elements: any[]) => {
          if (canvas) canvas.style.cursor = elements.length ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#e2e8f0',
            borderColor: '#334155', borderWidth: 1, padding: 10,
            callbacks: {
              label: (ctx: TooltipItem<'line'>) =>
                ` ${ctx.dataset.label}: ${(ctx.parsed.y as number).toLocaleString()} kg`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
          y: {
            grid: { color: '#fff7ed' }, min: 0,
            ticks: { color: '#64748b', font: { size: 10 }, callback: (v: any) => `${Number(v).toLocaleString()}` },
            title: { display: true, text: 'kg', color: '#94a3b8', font: { size: 10 } }
          }
        },
        animation: { duration: 500, easing: 'easeInOutQuart' }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: Doughnut (Run Hours)
  // ═══════════════════════════════════════════════════════════════
  private renderRunHoursChart(data: GeneratorRunHoursChartResponse): void {
    const canvas = this.runHoursCanvasRef?.nativeElement;
    if (!canvas || canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderRunHoursChart(data)); return;
    }
    this.runHoursChart?.destroy();
    this.runHoursChart = null;

    const oldTip = canvas.parentNode?.querySelector('#rh-tooltip');
    if (oldTip) oldTip.remove();

    const hasData = (data?.data ?? []).some(v => v > 0);
    const chartLabels = hasData ? (data.labels ?? []) : ['No Data'];
    const chartValues = hasData ? (data.data ?? []) : [1];
    const chartColors = hasData ? (data.colors ?? []) : ['#e2e8f0'];

    const getOrCreateTooltip = (chart: Chart): HTMLDivElement => {
      let el = chart.canvas.parentNode?.querySelector<HTMLDivElement>('#rh-tooltip');
      if (!el) {
        el = document.createElement('div');
        el.id = 'rh-tooltip';
        Object.assign(el.style, {
          position: 'absolute', pointerEvents: 'none',
          transition: 'opacity 0.15s ease', opacity: '0',
          background: '#1e293b', border: '2px solid #38bdf8',
          borderRadius: '10px', padding: '12px 16px',
          minWidth: '200px', boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
          zIndex: '9999', whiteSpace: 'nowrap',
        });
        const wrapper = chart.canvas.parentNode as HTMLElement;
        wrapper.style.position = 'relative';
        wrapper.appendChild(el);
      }
      return el;
    };

    this.runHoursChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [{
          data: chartValues,
          backgroundColor: chartColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: hasData ? 10 : 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '68%',
        onClick: (_e: any, elements: any[]) => {
          if (!elements.length || !hasData) return;
          const idx = elements[0].index;
          const genName = (data.labels ?? [])[idx] ?? '';
          const fuel = (data.fuelTypes ?? [])[idx] ?? '';
          if (genName) this.onRunHoursLegendClick(genName, fuel || undefined);
        },
        onHover: (_e: any, elements: any[]) => {
          if (canvas) canvas.style.cursor = (elements.length && hasData) ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: context => {
              if (!hasData) return;
              const { chart, tooltip } = context;
              const el = getOrCreateTooltip(chart);
              if (tooltip.opacity === 0) { el.style.opacity = '0'; return; }
              const idx = tooltip.dataPoints?.[0]?.dataIndex ?? 0;
              const hrs = (data.data ?? [])[idx] ?? 0;
              const total = (data.data ?? []).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((hrs / total) * 100).toFixed(1) : '0';
              const site = (data.siteNames ?? [])[idx] ?? '-';
              const fuel = (data.fuelConsumed ?? [])[idx] ?? 0;
              const color = (data.colors ?? [])[idx] ?? '#888';
              const name = (data.labels ?? [])[idx] ?? '';
              el.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px;">
                  <span style="display:inline-block;width:11px;height:11px;border-radius:50%;
                        background:${color};flex-shrink:0;box-shadow:0 0 0 2px rgba(255,255,255,0.3);"></span>
                  <span style="font-size:13px;font-weight:700;color:#f1f5f9;font-family:Inter,sans-serif;">${name}</span>
                </div>
                <div style="font-size:12px;font-family:Inter,sans-serif;line-height:2.1;">
                  <div style="color:#94a3b8;">Run Hours &nbsp;
                    <span style="color:#38bdf8;font-weight:600;">${Number(hrs).toLocaleString()} hrs</span>
                    &nbsp;<span style="color:#64748b;">(${pct}%)</span></div>
                  <div style="color:#94a3b8;">Site &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <span style="color:#e2e8f0;">${site}</span></div>
                  <div style="color:#94a3b8;">Fuel &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <span style="color:#e2e8f0;">${Number(fuel).toLocaleString()} L</span></div>
                </div>`;
              const wrapperRect = (chart.canvas.parentNode as HTMLElement).getBoundingClientRect();
              const canvasRect = chart.canvas.getBoundingClientRect();
              el.style.opacity = '1';
              el.style.left = `${canvasRect.left - wrapperRect.left + tooltip.caretX + 18}px`;
              el.style.top = `${canvasRect.top - wrapperRect.top + tooltip.caretY - 24}px`;
            }
          }
        },
        animation: { duration: 600, easing: 'easeInOutQuart' }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: Site Wise Emission Stacked Bar
  // ═══════════════════════════════════════════════════════════════
  private renderSiteEmissionChart(data: SiteEmissionResponse[]): void {
    const canvas = this.siteEmissionCanvasRef?.nativeElement;
    if (!canvas) return;
    if (canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderSiteEmissionChart(data)); return;
    }
    this.siteEmissionChart?.destroy();
    this.siteEmissionChart = null;

    const hasData = data?.length > 0;
    const sorted = hasData ? [...data].sort((a, b) => b.totalCO2e - a.totalCO2e) : [];

    this.siteEmissionChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: hasData ? sorted.map(d => d.siteName) : [],
        datasets: [
          {
            label: 'CO₂e (kg)', data: hasData ? sorted.map(d => d.totalCO2e) : [],
            backgroundColor: '#6366F1CC', borderColor: '#6366F1',
            borderWidth: 1, borderRadius: 4, borderSkipped: false as const,
          },
          {
            label: 'CO₂ (kg)', data: hasData ? sorted.map(d => d.totalCO2) : [],
            backgroundColor: '#1D9E75CC', borderColor: '#1D9E75',
            borderWidth: 1, borderRadius: 4, borderSkipped: false as const,
          },
          {
            label: 'NO₂ (kg)', data: hasData ? sorted.map(d => d.totalNO2) : [],
            backgroundColor: '#EF9F27CC', borderColor: '#EF9F27',
            borderWidth: 1, borderRadius: 4, borderSkipped: false as const,
          },
          {
            label: 'CH₄ (kg)', data: hasData ? sorted.map(d => d.totalCH4) : [],
            backgroundColor: '#D4537ECC', borderColor: '#D4537E',
            borderWidth: 1, borderRadius: 4, borderSkipped: false as const,
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (_e: any, elements: any[]) => {
          if (!elements.length || !hasData) return;
          const site = sorted[elements[0].index]?.siteName;
          if (site) this.onSiteGridRowClick(site);
        },
        onHover: (_e: any, elements: any[]) => {
          if (canvas) canvas.style.cursor = elements.length ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: '#0f172a', titleColor: '#94a3b8', bodyColor: '#e2e8f0',
            borderColor: '#d97706', borderWidth: 1, padding: 12,
            callbacks: {
              title: (items: TooltipItem<'bar'>[]) => {
                const total = sorted[items[0]?.dataIndex ?? 0]?.totalCO2e ?? 0;
                return `${items[0]?.label}   —   CO₂e: ${total.toLocaleString('en-IN', {
                  minimumFractionDigits: 2, maximumFractionDigits: 5
                })} kg`;
              },
              label: (ctx: TooltipItem<'bar'>) => {
                const val = ctx.parsed.y as number;
                if (val === 0) return '';
                return ` ${ctx.dataset.label}: ${val.toLocaleString('en-IN', {
                  minimumFractionDigits: 2, maximumFractionDigits: 5
                })} kg`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 35, minRotation: 0 }
          },
          y: {
            position: 'left' as const, grid: { color: '#fff7ed' }, min: 0,
            ticks: { color: '#64748b', font: { size: 11 }, callback: (v: any) => `${Number(v).toLocaleString('en-IN')}` },
            title: { display: true, text: 'CO₂e (kg)', color: '#94a3b8', font: { size: 11 } }
          },
          y1: {
            position: 'right' as const, grid: { drawOnChartArea: false }, min: 0,
            ticks: { color: '#94a3b8', font: { size: 10 }, callback: (v: any) => `${Number(v).toFixed(5)}` },
            title: { display: true, text: 'CO₂ / NO₂ / CH₄ (kg)', color: '#94a3b8', font: { size: 10 } }
          }
        },
        animation: { duration: 500, easing: 'easeInOutQuart' }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD FACTOR ZONE PLUGIN
  // ═══════════════════════════════════════════════════════════════
  private loadFactorZonePlugin() {
    return {
      id: 'loadFactorZones',
      beforeDraw(chart: Chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return;
        const yScale = scales['y'];
        if (!yScale) return;
        const toY = (val: number) => yScale.getPixelForValue(val);
        const { left, right } = chartArea;
        ctx.fillStyle = 'rgba(220,38,38,0.06)'; ctx.fillRect(left, toY(30), right - left, toY(0) - toY(30));
        ctx.fillStyle = 'rgba(234,179,8,0.06)'; ctx.fillRect(left, toY(75), right - left, toY(30) - toY(75));
        ctx.fillStyle = 'rgba(34,197,94,0.10)'; ctx.fillRect(left, toY(90), right - left, toY(75) - toY(90));
        ctx.fillStyle = 'rgba(249,115,22,0.07)'; ctx.fillRect(left, toY(100), right - left, toY(90) - toY(100));
        ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(220,38,38,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(left, toY(30)); ctx.lineTo(right, toY(30)); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(34,197,94,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(left, toY(75)); ctx.lineTo(right, toY(75)); ctx.stroke(); ctx.restore();
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  UTILS
  // ═══════════════════════════════════════════════════════════════
  formatNum(value: number): string {
    return Math.round(value).toLocaleString('en-IN');
  }

  // ═══════════════════════════════════════════════════════════════
  //  EXPORTS
  // ═══════════════════════════════════════════════════════════════
  exportfueltypewiseMonthlyConsumptionFirstChart(): void {
    this.svc.ExportGeneratorFuelTypeWiseMonthlyConsumptionFirstChart(
      this.year, this.fromDate, this.toDate
    ).subscribe({
      next: blob => saveAs(blob, `GeneratorFuelWiseMonthlyConsumption_${this.fromDate}_${this.toDate}.xlsx`),
      error: err => console.error('Export failed', err)
    });
  }

  exportMonthlyEmissionTrendSecondChart(): void {
    this.svc.ExportGeneratorMonthlyEmissionTrend(
      this.year, this.fromDate, this.toDate
    ).subscribe({
      next: blob => saveAs(blob, `GeneratorMonthlyEmissionTrend_${this.fromDate}_${this.toDate}.xlsx`),
      error: err => console.error('Export failed', err)
    });
  }

  ExportGeneratorRunHoursMonthWisePivotTbl(): void {
    this.svc.ExportGeneratorRunHoursMonthWisePivotTbl(
      this.year, this.fromDate, this.toDate
    ).subscribe({
      next: blob => saveAs(blob, `GeneratorRunHoursMonthWisePivotTbl_${this.fromDate}_${this.toDate}.xlsx`),
      error: err => console.error('Export failed', err)
    });
  }

  exportGeneratorRunHoursDistributionChart(): void {
    this.svc.ExportGeneratorRunHoursDistribution(
      this.year, this.fromDate, this.toDate
    ).subscribe({
      next: blob => saveAs(blob, `GeneratorRunHoursDistribution_${this.fromDate}_${this.toDate}.xlsx`),
      error: err => console.error('Export failed', err)
    });
  }

  exportGeneratorSiteWiseEmissionProfile(): void {
    this.svc.ExportGeneratorSiteWiseEmissionProfile(
      this.year, this.fromDate, this.toDate
    ).subscribe({
      next: blob => saveAs(blob, `GeneratorSiteWiseEmissionProfile_${this.fromDate}_${this.toDate}.xlsx`),
      error: err => console.error('Export failed', err)
    });
  }
}