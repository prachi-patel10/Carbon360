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

Chart.register(...registerables);

interface RunHoursLegendItem   { name: string; color: string; hours: number; pct: string; site: string; }
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

  @Output() gridRowClick = new EventEmitter<Record<string, any>>();

  @ViewChild('generatorFuelCanvas')         fuelCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('generatorEmissionCanvas')     emissionCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('generatorRunHoursCanvas')     runHoursCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('generatorSiteEmissionCanvas') siteEmissionCanvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Signals ────────────────────────────────────────────────────
  isFuelLoading            = signal(false);
  isEmissionLoading        = signal(false);
  isRunHoursLoading        = signal(false);
  isLoadFactorLoading      = signal(false);
  isRunHoursMonthlyLoading = signal(false);
  isSiteEmissionLoading    = signal(false);

  fuelError            = signal('');
  emissionError        = signal('');
  runHoursError        = signal('');
  loadFactorError      = signal('');
  runHoursMonthlyError = signal('');
  siteEmissionError    = signal('');

  fuelLegend       = signal<{ fuelType: string; color: string }[]>([]);
  emissionLegend   = signal<{ label: string; color: string }[]>([]);
  runHoursLegend   = signal<RunHoursLegendItem[]>([]);
  loadFactorLegend = signal<LoadFactorLegendItem[]>([]);

  generatorTotal   = signal(0);
  topFuelType      = signal('-');
  topFuelAmount    = signal(0);
  totalCO2e        = signal(0);
  totalRunHours    = signal(0);
  totalPowerOutput = signal(0);

  runHoursMonthlyData = signal<GeneratorRunHoursMonthlyPivotResponse | null>(null);

  showFuelCanvas           = computed(() => !this.isFuelLoading()            && !this.fuelError());
  showEmissionCanvas       = computed(() => !this.isEmissionLoading()        && !this.emissionError());
  showRunHoursCanvas       = computed(() => !this.isRunHoursLoading()        && !this.runHoursError());
  showLoadFactorCanvas     = computed(() => !this.isLoadFactorLoading()      && !this.loadFactorError());
  showRunHoursMonthlyTable = computed(() => !this.isRunHoursMonthlyLoading() && !this.runHoursMonthlyError());
  showSiteEmissionCanvas   = computed(() => !this.isSiteEmissionLoading()    && !this.siteEmissionError());

  // ── Chart instances ────────────────────────────────────────────
  private fuelChart:         Chart | null = null;
  private emissionChart:     Chart | null = null;
  private runHoursChart:     Chart | null = null;
  private loadFactorChart:   Chart | null = null;
  private siteEmissionChart: Chart | null = null;

  private destroy$  = new Subject<void>();
  private viewReady = false;

  private _lastFuelData:         FuelCombinedChartResponse        | null = null;
  private _lastEmissionData:     MonthlyEmissionChartResponse     | null = null;
  private _lastRunHoursData:     GeneratorRunHoursChartResponse   | null = null;
  private _lastLoadFactorData:   GeneratorLoadFactorChartResponse | null = null;
  private _lastSiteEmissionData: SiteEmissionResponse[]           | null = null;

  private pendingFuel:         FuelCombinedChartResponse        | null = null;
  private pendingEmission:     MonthlyEmissionChartResponse     | null = null;
  private pendingRunHours:     GeneratorRunHoursChartResponse   | null = null;
  private pendingLoadFactor:   GeneratorLoadFactorChartResponse | null = null;
  private pendingSiteEmission: SiteEmissionResponse[]           | null = null;

  constructor(private svc: DashboardService, private router: Router) {}

  ngOnInit(): void { this.loadAll(); }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.pendingFuel)         { this.deferRender('fuel',         this.pendingFuel);         this.pendingFuel         = null; }
    if (this.pendingEmission)     { this.deferRender('emission',     this.pendingEmission);     this.pendingEmission     = null; }
    if (this.pendingRunHours)     { this.deferRender('runHours',     this.pendingRunHours);     this.pendingRunHours     = null; }
    if (this.pendingLoadFactor)   { this.deferRender('loadFactor',   this.pendingLoadFactor);   this.pendingLoadFactor   = null; }
    if (this.pendingSiteEmission) { this.deferRender('siteEmission', this.pendingSiteEmission); this.pendingSiteEmission = null; }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['year'] && !changes['year'].firstChange) this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next(); this.destroy$.complete();
    this.fuelChart?.destroy();
    this.emissionChart?.destroy();
    this.runHoursChart?.destroy();
    this.loadFactorChart?.destroy();
    this.siteEmissionChart?.destroy();
  }

  loadAll(): void {
    this.loadFuelChart();
    this.loadEmissionChart();
    this.loadRunHoursChart();
    this.loadLoadFactorChart();
    this.loadRunHoursMonthlyChart();
    this.loadSiteEmissionChart();
  }

  // ════════════════════════════════════════════════════════════════
  //  NAVIGATION — central helper used by every chart / grid click
  // ════════════════════════════════════════════════════════════════

  /**
   * Builds query params and navigates to the generator search page.
   *
   * Rules:
   *  • fuelType / generatorName  → forwarded as their own params;
   *    the search page populates their respective multi-select dropdowns.
   *  • siteName                  → forwarded as its own param;
   *    the search page populates the search box (no site dropdown exists).
   *  • month specified           → sends a precise month date range.
   *  • month NOT specified       → ✅ sends a full-year date range so results
   *    are scoped to the currently displayed year (previously missing!).
   */
  private navigateToGeneratorSearch(params: {
    month?: number;
    fuelType?: string;
    generatorName?: string;
    siteName?: string;
    search?: string;
  }): void {

    const queryParams: Record<string, any> = {
      source: 'chart',
      year:   this.year,
    };

    if (params.fuelType)      queryParams['fuelType']      = params.fuelType.trim();
    if (params.generatorName) queryParams['generatorName'] = params.generatorName.trim();
    if (params.siteName)      queryParams['siteName']      = params.siteName.trim();
    if (params.search)        queryParams['search']        = params.search.trim();

    // ✅ Always include a date range so the search page is scoped to this year.
    const y = this.year;

    if (params.month) {
      // ── Month-level: first → last day of that month ───────────
      const m       = params.month;
      const lastDay = new Date(y, m, 0).getDate();
      queryParams['startDate'] = `${y}-${String(m).padStart(2, '0')}-01`;
      queryParams['endDate']   = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else {
      // ── Year-level: Jan 1 → Dec 31 ────────────────────────────
      queryParams['startDate'] = `${y}-01-01`;
      queryParams['endDate']   = `${y}-12-31`;
    }

    console.log('NAVIGATING WITH:', queryParams);
    this.router.navigate(['/dashboard/searchGenerator'], { queryParams });
  }

  // ── Convenience wrappers ──────────────────────────────────────

  navigateByGeneratorMonth(monthIndex: number): void {
    this.navigateToGeneratorSearch({ month: monthIndex + 1 });
  }

  navigateByGeneratorMonthAndFuel(monthIndex: number, fuelType: string): void {
    this.navigateToGeneratorSearch({ month: monthIndex + 1, fuelType });
  }

  // ── Grid / legend click handlers (called from HTML template) ─

  /** Fuel stacked-bar grid row: month + optional fuel type */
  onFuelGridRowClick(monthIndex: number, fuelType?: string): void {
    this.navigateToGeneratorSearch({ month: monthIndex + 1, fuelType });
  }

  /** Monthly emission grid row: month only */
  onEmissionGridRowClick(monthIndex: number): void {
    this.navigateToGeneratorSearch({ month: monthIndex + 1 });
  }

  /**
   * Run-hours monthly pivot table cell.
   * @param monthIndex   0-based month index  (-1 = totals row, skip month filter)
   * @param generatorName generator name       ('' = month-total column, skip gen filter)
   */
  onRunHoursGridCellClick(monthIndex: number, generatorName: string): void {
    const p: { month?: number; generatorName?: string } = {};
    if (monthIndex >= 0) p.month         = monthIndex + 1;
    if (generatorName)  p.generatorName  = generatorName;
    this.navigateToGeneratorSearch(p);
  }

  /** Run-hours pivot: generator-total column header clicked */
  onRunHoursGeneratorTotalClick(generatorName: string): void {
    this.navigateToGeneratorSearch({ generatorName });
  }

  /** Run-hours pivot: month-total row cell clicked */
  onRunHoursMonthTotalClick(monthIndex: number): void {
    this.navigateToGeneratorSearch({ month: monthIndex + 1 });
  }

  /** Run-hours doughnut legend item clicked */
  onRunHoursLegendClick(generatorName: string): void {
    this.navigateToGeneratorSearch({ generatorName });
  }

  /** Site-emission bar chart bar / grid row clicked */
  onSiteGridRowClick(siteName: string): void {
    this.navigateToGeneratorSearch({ siteName });
  }

  // ── Deferred render dispatcher ────────────────────────────────

  private deferRender(
    type: 'fuel' | 'emission' | 'runHours' | 'loadFactor' | 'siteEmission',
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

  // ── Load: Fuel ────────────────────────────────────────────────

  loadFuelChart(): void {
    this.isFuelLoading.set(true); this.fuelError.set('');
    this.fuelChart?.destroy(); this.fuelChart = null;
    this.svc.getGeneratorFuelMonthly(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isFuelLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) { this.fuelError.set('No data returned.'); return; }
          this.computeFuelKpis(res.data); this.buildFuelLegend(res.data);
          if (this.viewReady) this.deferRender('fuel', res.data); else this.pendingFuel = res.data;
        },
        error: err => this.fuelError.set(err?.message ?? 'Failed to load fuel chart.')
      });
  }

  // ── Load: Emission ────────────────────────────────────────────

  loadEmissionChart(): void {
    this.isEmissionLoading.set(true); this.emissionError.set('');
    this.emissionChart?.destroy(); this.emissionChart = null;
    this.svc.getGeneratorEmissionChart(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isEmissionLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) { this.emissionError.set('No data returned.'); return; }
          this.computeEmissionKpi(res.data); this.buildEmissionLegend(res.data);
          if (this.viewReady) this.deferRender('emission', res.data); else this.pendingEmission = res.data;
        },
        error: err => this.emissionError.set(err?.message ?? 'Failed to load emission chart.')
      });
  }

  // ── Load: Run Hours ───────────────────────────────────────────

  loadRunHoursChart(): void {
    this.isRunHoursLoading.set(true); this.runHoursError.set('');
    this.runHoursChart?.destroy(); this.runHoursChart = null;
    this.svc.getGeneratorRunHours(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isRunHoursLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) { this.runHoursError.set('No data returned.'); return; }
          this.computeRunHoursKpis(res.data); this.buildRunHoursLegend(res.data);
          if (this.viewReady) this.deferRender('runHours', res.data); else this.pendingRunHours = res.data;
        },
        error: err => this.runHoursError.set(err?.message ?? 'Failed to load run hours chart.')
      });
  }

  // ── Load: Load Factor ─────────────────────────────────────────

  loadLoadFactorChart(): void {
    this.isLoadFactorLoading.set(true); this.loadFactorError.set('');
    this.loadFactorChart?.destroy(); this.loadFactorChart = null;
    this.svc.getGeneratorLoadFactor(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadFactorLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) { this.loadFactorError.set('No data returned.'); return; }
          this.buildLoadFactorLegend(res.data);
          if (this.viewReady) this.deferRender('loadFactor', res.data); else this.pendingLoadFactor = res.data;
        },
        error: err => this.loadFactorError.set(err?.message ?? 'Failed to load load factor chart.')
      });
  }

  // ── Load: Run Hours Monthly Pivot ─────────────────────────────

  loadRunHoursMonthlyChart(): void {
    this.isRunHoursMonthlyLoading.set(true); this.runHoursMonthlyError.set('');
    this.runHoursMonthlyData.set(null);
    this.svc.getGeneratorRunHoursMonthly(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isRunHoursMonthlyLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) { this.runHoursMonthlyError.set('No data returned.'); return; }
          this.runHoursMonthlyData.set(res.data);
        },
        error: err => this.runHoursMonthlyError.set(err?.message ?? 'Failed to load run hours monthly data.')
      });
  }

  // ── Load: Site Emissions ──────────────────────────────────────

  loadSiteEmissionChart(): void {
    this.isSiteEmissionLoading.set(true); this.siteEmissionError.set('');
    this.siteEmissionChart?.destroy(); this.siteEmissionChart = null;
    this.svc.getGeneratorSiteEmissions(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isSiteEmissionLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data?.length) { this.siteEmissionError.set('No data returned.'); return; }
          if (this.viewReady) this.deferRender('siteEmission', res.data); else this.pendingSiteEmission = res.data;
        },
        error: err => this.siteEmissionError.set(err?.message ?? 'Failed to load site emission chart.')
      });
  }

  // ── KPIs ──────────────────────────────────────────────────────

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
      color: (data.colors ?? [])[i]    ?? '#888',
      hours: (data.data   ?? [])[i]    ?? 0,
      pct:   total > 0
        ? (((data.data ?? [])[i] ?? 0) / total * 100).toFixed(1)
        : '0',
      site:  (data.siteNames ?? [])[i] ?? '-',
    })));
  }

  private buildLoadFactorLegend(data: GeneratorLoadFactorChartResponse): void {
    this.loadFactorLegend.set((data?.datasets ?? []).map(d => ({ name: d.generatorName, color: d.color })));
  }

  // ── Render: Stacked Bar (Fuel) ────────────────────────────────

  private renderFuelChart(data: FuelCombinedChartResponse): void {
    const canvas = this.fuelCanvasRef?.nativeElement;
    if (!canvas || canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderFuelChart(data)); return;
    }
    this.fuelChart?.destroy(); this.fuelChart = null;
    const ds = data?.datasets ?? [];
    if (!ds.length) { this.fuelError.set('No fuel data for this year.'); return; }

    this.fuelChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: ds.map(d => ({
          label: d.label, data: d.data,
          backgroundColor: d.color,
          borderColor: d.color.length > 7 ? d.color.substring(0, 7) : d.color,
          borderWidth: 1, borderRadius: 5, borderSkipped: false as const, stack: d.fuelType
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (_e: any, elements: any[]) => {
          if (!elements.length) return;
          const el  = elements[0];
          const ds2 = data.datasets[el.datasetIndex];
          if ((ds2?.data?.[el.index] ?? 0) > 0)
            this.navigateByGeneratorMonthAndFuel(el.index, ds2.fuelType);
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
                const ft    = (items[0].dataset as any).stack;
                const total = items.reduce((s, i) => s + (i.parsed.y ?? 0), 0);
                return `${items[0].label} — ${ft}: ${total.toLocaleString()} L`;
              },
              label: (ctx: TooltipItem<'bar'>) => {
                const val = ctx.parsed.y as number;
                return val === 0 ? '' : ` ${ctx.dataset.label}: ${val.toLocaleString()} L`;
              }
            }
          }
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 0 } },
          y: {
            stacked: true, grid: { color: '#fff7ed' },
            ticks: { color: '#64748b', font: { size: 10 }, callback: (v: any) => `${Number(v).toLocaleString()} L` },
            title: { display: true, text: 'Litres', color: '#94a3b8', font: { size: 10 } }
          }
        },
        animation: { duration: 400, easing: 'easeInOutQuart' }
      }
    });
  }

  // ── Render: Line (Emission) ───────────────────────────────────

  private renderEmissionChart(data: MonthlyEmissionChartResponse): void {
    const canvas = this.emissionCanvasRef?.nativeElement;
    if (!canvas || canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderEmissionChart(data)); return;
    }
    this.emissionChart?.destroy(); this.emissionChart = null;
    const ds = data?.datasets ?? [];
    if (!ds.length) { this.emissionError.set('No emission data for this year.'); return; }

    this.emissionChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: ds.map(d => ({
          label: d.label, data: d.data,
          borderColor: d.color, backgroundColor: d.color + '22',
          borderWidth: 2, pointRadius: 3, pointHoverRadius: 5,
          tension: 0.4, fill: false as const
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (_e: any, elements: any[]) => {
          if (!elements.length) return;
          this.navigateByGeneratorMonth(elements[0].index);
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
            grid: { color: '#fff7ed' },
            ticks: { color: '#64748b', font: { size: 10 }, callback: (v: any) => `${Number(v).toLocaleString()}` },
            title: { display: true, text: 'kg', color: '#94a3b8', font: { size: 10 } }
          }
        },
        animation: { duration: 500, easing: 'easeInOutQuart' }
      }
    });
  }

  // ── Render: Doughnut (Run Hours) ──────────────────────────────

  private renderRunHoursChart(data: GeneratorRunHoursChartResponse): void {
    const canvas = this.runHoursCanvasRef?.nativeElement;
    if (!canvas || canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderRunHoursChart(data)); return;
    }
    this.runHoursChart?.destroy(); this.runHoursChart = null;
    if (!(data?.data ?? []).some(v => v > 0)) { this.runHoursError.set('No run hours data for this year.'); return; }

    const oldTip = canvas.parentNode?.querySelector('#rh-tooltip');
    if (oldTip) oldTip.remove();

    const getOrCreateTooltip = (chart: Chart): HTMLDivElement => {
      let el = chart.canvas.parentNode?.querySelector<HTMLDivElement>('#rh-tooltip');
      if (!el) {
        el = document.createElement('div'); el.id = 'rh-tooltip';
        Object.assign(el.style, {
          position: 'absolute', pointerEvents: 'none', transition: 'opacity 0.15s ease', opacity: '0',
          background: '#1e293b', border: '2px solid #38bdf8', borderRadius: '10px', padding: '12px 16px',
          minWidth: '190px', boxShadow: '0 8px 28px rgba(0,0,0,0.5)', zIndex: '9999',
        });
        (chart.canvas.parentNode as HTMLElement).style.position = 'relative';
        chart.canvas.parentNode?.appendChild(el);
      }
      return el;
    };

    canvas.width  = 140; canvas.height = 140;
    canvas.style.width = '140px'; canvas.style.height = '140px';

    this.runHoursChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{ data: data.data, backgroundColor: data.colors, borderColor: '#ffffff', borderWidth: 2, hoverOffset: 10 }]
      },
      options: {
        responsive: false, maintainAspectRatio: true, cutout: '68%',
        onClick: (_e: any, elements: any[]) => {
          if (!elements.length) return;
          const genName = (data.labels ?? [])[elements[0].index] ?? '';
          if (genName) this.onRunHoursLegendClick(genName);
        },
        onHover: (_e: any, elements: any[]) => {
          if (canvas) canvas.style.cursor = elements.length ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: context => {
              const { chart, tooltip } = context;
              const el = getOrCreateTooltip(chart);
              if (tooltip.opacity === 0) { el.style.opacity = '0'; return; }
              const idx   = tooltip.dataPoints?.[0]?.dataIndex ?? 0;
              const hrs   = (data.data      ?? [])[idx] ?? 0;
              const total = (data.data      ?? []).reduce((a, b) => a + b, 0);
              const pct   = total > 0 ? ((hrs / total) * 100).toFixed(1) : '0';
              const site  = (data.siteNames ?? [])[idx] ?? '-';
              const fuel  = (data.fuelConsumed ?? [])[idx] ?? 0;
              const color = (data.colors    ?? [])[idx] ?? '#888';
              const name  = (data.labels    ?? [])[idx] ?? '';
              el.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px;">
                  <span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${color};flex-shrink:0;box-shadow:0 0 0 2px rgba(255,255,255,0.3);"></span>
                  <span style="font-size:13px;font-weight:700;color:#f1f5f9;font-family:Inter,sans-serif;">${name}</span>
                </div>
                <div style="font-size:12px;font-family:Inter,sans-serif;line-height:2;">
                  <div style="color:#94a3b8;">Run Hours &nbsp;<span style="color:#38bdf8;font-weight:600;">${Number(hrs).toLocaleString()} hrs</span> &nbsp;<span style="color:#64748b;">(${pct}%)</span></div>
                  <div style="color:#94a3b8;">Site &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#e2e8f0;">${site}</span></div>
                  <div style="color:#94a3b8;">Fuel &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#e2e8f0;">${Number(fuel).toLocaleString()} L</span></div>
                </div>`;
              el.style.opacity = '1';
              el.style.left    = `${tooltip.caretX + 16}px`;
              el.style.top     = `${tooltip.caretY - 20}px`;
            }
          }
        },
        animation: { duration: 600, easing: 'easeInOutQuart' }
      }
    });
  }

  // ── Render: Site Wise Emission Stacked Bar ────────────────────

  private renderSiteEmissionChart(data: SiteEmissionResponse[]): void {
    const canvas = this.siteEmissionCanvasRef?.nativeElement;
    if (!canvas) return;
    if (canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderSiteEmissionChart(data)); return;
    }
    this.siteEmissionChart?.destroy(); this.siteEmissionChart = null;
    if (!data?.length) { this.siteEmissionError.set('No site emission data for this year.'); return; }

    const sorted = [...data].sort((a, b) => b.totalCO2e - a.totalCO2e);
    const labels = sorted.map(d => d.siteName);

    this.siteEmissionChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'CO₂ (kg)',
            data: sorted.map(d => d.totalCO2),
            backgroundColor: '#1D9E75CC', borderColor: '#1D9E75',
            borderWidth: 1, borderRadius: 4, borderSkipped: false as const, stack: 'emission'
          },
          {
            label: 'NO₂ (kg)',
            data: sorted.map(d => d.totalNO2),
            backgroundColor: '#EF9F27CC', borderColor: '#EF9F27',
            borderWidth: 1, borderRadius: 4, borderSkipped: false as const, stack: 'emission'
          },
          {
            label: 'CH₄ (kg)',
            data: sorted.map(d => d.totalCH4),
            backgroundColor: '#D4537ECC', borderColor: '#D4537E',
            borderWidth: 1, borderRadius: 4, borderSkipped: false as const, stack: 'emission'
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (_e: any, elements: any[]) => {
          if (!elements.length) return;
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
                const idx   = items[0]?.dataIndex ?? 0;
                const total = sorted[idx]?.totalCO2e ?? 0;
                return `${items[0]?.label}   —   CO2e: ${total.toLocaleString('en-IN')} kg`;
              },
              label: (ctx: TooltipItem<'bar'>) => {
                const val = ctx.parsed.y as number;
                return val === 0 ? '' : ` ${ctx.dataset.label}: ${val.toLocaleString('en-IN')} kg`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true, grid: { display: false },
            ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 35, minRotation: 0 }
          },
          y: {
            stacked: true, grid: { color: '#fff7ed' },
            ticks: { color: '#64748b', font: { size: 11 }, callback: (v: any) => `${Number(v).toLocaleString()}` },
            title: { display: true, text: 'Emissions (kg)', color: '#94a3b8', font: { size: 11 } }
          }
        },
        animation: { duration: 500, easing: 'easeInOutQuart' }
      }
    });
  }

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
        ctx.fillStyle = 'rgba(220,38,38,0.06)';  ctx.fillRect(left, toY(30),  right - left, toY(0)   - toY(30));
        ctx.fillStyle = 'rgba(234,179,8,0.06)';  ctx.fillRect(left, toY(75),  right - left, toY(30)  - toY(75));
        ctx.fillStyle = 'rgba(34,197,94,0.10)';  ctx.fillRect(left, toY(90),  right - left, toY(75)  - toY(90));
        ctx.fillStyle = 'rgba(249,115,22,0.07)'; ctx.fillRect(left, toY(100), right - left, toY(90)  - toY(100));
        ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(220,38,38,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(left, toY(30)); ctx.lineTo(right, toY(30)); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(34,197,94,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(left, toY(75)); ctx.lineTo(right, toY(75)); ctx.stroke(); ctx.restore();
      }
    };
  }

  formatNum(value: number): string {
    return Math.round(value).toLocaleString('en-IN');
  }
}