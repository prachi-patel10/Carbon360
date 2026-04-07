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
  VehicleDistanceChartResponse,
  VehicleTypeDistancePivotResponse,
  VehicleCategoryChartResponse
} from '../dashboard/dashboard-service';
import { saveAs } from 'file-saver';

Chart.register(...registerables);

@Component({
  selector: 'app-vehicle-charts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vehicle-charts.html',
  styleUrls: ['./vehicle-charts.css']
})
export class VehicleCharts implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  @Input() year: number = new Date().getFullYear();
  @Output() gridRowClick = new EventEmitter<Record<string, any>>();

  @ViewChild('vehicleFuelCanvas') fuelCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('vehicleEmissionCanvas') emissionCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('vehicleDistanceCanvas') distanceCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('vehicleDistancePieCanvas') distancePieCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('vehicleCategoryCanvas') categoryCanvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Signals ──────────────────────────────────────────────────
  isFuelLoading = signal(false);
  isEmissionLoading = signal(false);
  isDistanceLoading = signal(false);
  isVtypeLoading = signal(false);
  isCategoryLoading = signal(false);

  fuelError = signal('');
  emissionError = signal('');
  distanceError = signal('');
  vtypeError = signal('');
  categoryError = signal('');

  fuelLegend = signal<{ fuelType: string; color: string }[]>([]);
  emissionLegend = signal<{ label: string; color: string }[]>([]);
  pieLegend = signal<{ label: string; color: string; value: number; pct: string }[]>([]);
  categoryLegend = signal<{ category: string; color: string; distance: number; emission: number }[]>([]);

  vehicleTotal = signal(0);
  topFuelType = signal('-');
  topFuelAmount = signal(0);
  totalCO2e = signal(0);
  totalDistanceKM = signal(0);
  totalTrips = signal(0);

  vtypeTableRows = signal<VehicleTypeDistancePivotResponse | null>(null);

  showFuelCanvas = computed(() => !this.isFuelLoading() && !this.fuelError());
  showEmissionCanvas = computed(() => !this.isEmissionLoading() && !this.emissionError());
  showDistanceCanvas = computed(() => !this.isDistanceLoading() && !this.distanceError());
  showVtypeTable = computed(() => !this.isVtypeLoading() && !this.vtypeError());
  showCategoryCanvas = computed(() => !this.isCategoryLoading() && !this.categoryError());

  vtypeTotalDist = computed(() => this.vtypeTableRows()?.grandTotal ?? 0);
  vtypeTotalTrips = computed(() =>
    (this.vtypeTableRows()?.tripsMatrix ?? []).reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0));
  vtypeTotalFuel = computed(() =>
    (this.vtypeTableRows()?.fuelMatrix ?? []).reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0));

  // ── Chart instances ───────────────────────────────────────────
  private fuelChart?: Chart;
  private emissionChart?: Chart;
  private distanceChart?: Chart;
  private distancePieChart?: Chart;
  private categoryChart?: Chart;

  private destroy$ = new Subject<void>();
  private viewReady = false;

  private _lastFuelData?: FuelCombinedChartResponse;
  private _lastEmissionData?: MonthlyEmissionChartResponse;
  private _lastDistanceData?: VehicleDistanceChartResponse;
  private _lastVtypeData?: VehicleTypeDistancePivotResponse;
  private _lastCategoryData?: VehicleCategoryChartResponse;

  private pendingFuel?: FuelCombinedChartResponse;
  private pendingEmission?: MonthlyEmissionChartResponse;
  private pendingDistance?: VehicleDistanceChartResponse;
  private pendingVtype?: VehicleTypeDistancePivotResponse;
  private pendingCategory?: VehicleCategoryChartResponse;

  // ── View-mode signals (one per chart card) ────────────────────
  fuelView = signal<'chart' | 'details'>('chart');
  emissionView = signal<'chart' | 'details'>('chart');
  distanceView = signal<'chart' | 'details'>('chart');
  pieView = signal<'chart' | 'details'>('chart');
  categoryView = signal<'chart' | 'details'>('chart');

  constructor(private svc: DashboardService, private router: Router) { }

  ngOnInit(): void { this.loadAll(); }

  ngOnDestroy(): void {
    this.destroy$.next(); this.destroy$.complete();
    this.fuelChart?.destroy();
    this.emissionChart?.destroy();
    this.distanceChart?.destroy();
    this.distancePieChart?.destroy();
    this.categoryChart?.destroy();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.pendingFuel) { this.deferRenderFuel(this.pendingFuel); this.pendingFuel = undefined; }
    if (this.pendingEmission) { this.deferRenderEmission(this.pendingEmission); this.pendingEmission = undefined; }
    if (this.pendingDistance) { this.deferRenderDistance(this.pendingDistance); this.pendingDistance = undefined; }
    if (this.pendingVtype) { this.deferRenderVtype(this.pendingVtype); this.pendingVtype = undefined; }
    if (this.pendingCategory) { this.deferRenderCategory(this.pendingCategory); this.pendingCategory = undefined; }
  }

  ngOnChanges(c: SimpleChanges): void {
    if (c['year'] && !c['year'].firstChange) this.loadAll();
  }

  loadAll(): void {
    this.loadFuelChart();
    this.loadEmissionChart();
    this.loadDistanceChart();
    this.loadVtypeChart();
    this.loadCategoryChart();
  }

  private getMonthLabels(): string[] {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }

  // ── Date helpers ──────────────────────────────────────────────
  private buildMonthRange(mi: number): { start: string; end: string } {
    const y = this.year, m = mi + 1, mm = String(m).padStart(2, '0');
    const lastDay = new Date(y, m, 0).getDate();
    return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(lastDay).padStart(2, '0')}` };
  }

  private buildYearRange(): { start: string; end: string } {
    return { start: `${this.year}-01-01`, end: `${this.year}-12-31` };
  }

  // ── Central navigation ────────────────────────────────────────
  private navigateToVehicleSearch(params: {
    monthIndex?: number;
    fuelType?: string;
    vehicleType?: string;
    vehicleTypeNames?: string[];
    vehicleCategory?: string;
    city?: string;
    search?: string;
    opStart?: string;
    opEnd?: string;
  }): void {
    const qp: Record<string, any> = { source: 'chart', year: this.year };

    if (params.fuelType) qp['fuelType'] = params.fuelType;
    if (params.city) qp['city'] = params.city;
    if (params.search) qp['search'] = params.search;
    if (params.vehicleCategory) qp['vehicleCategory'] = params.vehicleCategory;

    if (params.vehicleTypeNames && params.vehicleTypeNames.length > 1)
      qp['vehicleType'] = params.vehicleTypeNames.join(',');
    else if (params.vehicleTypeNames?.length === 1)
      qp['vehicleType'] = params.vehicleTypeNames[0];
    else if (params.vehicleType)
      qp['vehicleType'] = params.vehicleType;

    if (params.monthIndex !== undefined && params.monthIndex >= 0) {
      const { start, end } = this.buildMonthRange(params.monthIndex);
      qp['opStart'] = start; qp['opEnd'] = end;
      qp['reportedStart'] = start; qp['reportedEnd'] = end;
    } else {
      const yr = this.buildYearRange();
      qp['opStart'] = params.opStart ?? yr.start;
      qp['opEnd'] = params.opEnd ?? yr.end;
    }

    this.gridRowClick.emit(qp);
    this.router.navigate(['/dashboard/searchVehicle'], { queryParams: qp });
  }

  // ── Click handlers ────────────────────────────────────────────
  private onFuelBarClick(mi: number, fuelType: string, vtNames: string[]): void {
    this.navigateToVehicleSearch({ monthIndex: mi, fuelType, vehicleTypeNames: vtNames });
  }
  private onEmissionPointClick(mi: number): void { this.navigateToVehicleSearch({ monthIndex: mi }); }
  private onDistanceBarClick(mi: number): void { this.navigateToVehicleSearch({ monthIndex: mi }); }

  onCategoryBarClick(categoryName: string): void {
    // Only filter by vehicleCategory + operation year
    // Do NOT pass reportedStart/reportedEnd — the SP only uses tripstartdatetime
    this.gridRowClick.emit({ vehicleCategory: categoryName, year: this.year });
    this.router.navigate(['/dashboard/searchVehicle'], {
      queryParams: {
        source: 'chart',
        year: this.year,
        vehicleCategory: categoryName,
        opStart: `${this.year}-01-01`,
        opEnd: `${this.year}-12-31`
      }
    });
  }

  onFuelGridRowClick(mi: number, fuelType?: string): void { this.navigateToVehicleSearch({ monthIndex: mi, fuelType }); }
  onEmissionGridRowClick(mi: number): void { this.navigateToVehicleSearch({ monthIndex: mi }); }
  onDistanceGridRowClick(mi: number): void { this.navigateToVehicleSearch({ monthIndex: mi }); }

  onVtypeGridCellClick(mi: number, vehicleType: string): void {
    const p: Parameters<typeof this.navigateToVehicleSearch>[0] = {};
    if (mi >= 0) p.monthIndex = mi;
    if (vehicleType) p.vehicleType = vehicleType;
    this.navigateToVehicleSearch(p);
  }

  onVtypeTypeTotalClick(vehicleType: string): void {
    const { start, end } = this.buildYearRange();
    this.navigateToVehicleSearch({ vehicleType, opStart: start, opEnd: end });
  }

  onVtypeMonthTotalClick(mi: number): void { this.navigateToVehicleSearch({ monthIndex: mi }); }

  onPieVtypeClick(vehicleType: string): void {
    const { start, end } = this.buildYearRange();
    this.navigateToVehicleSearch({ vehicleType, opStart: start, opEnd: end });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD: Fuel
  // ═══════════════════════════════════════════════════════════════
  loadFuelChart(): void {
    this.isFuelLoading.set(true); this.fuelError.set('');
    this.fuelChart?.destroy(); this.fuelChart = undefined;
    const empty: FuelCombinedChartResponse = { labels: this.getMonthLabels(), datasets: [] };
    this.svc.getVehicleFuelMonthly(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isFuelLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) {
            this.vehicleTotal.set(0); this.topFuelType.set('-');
            this.topFuelAmount.set(0); this.fuelLegend.set([]);
            this.viewReady ? this.deferRenderFuel(empty) : (this.pendingFuel = empty); return;
          }
          this.computeFuelKpis(res.data); this.buildFuelLegend(res.data);
          this.viewReady ? this.deferRenderFuel(res.data) : (this.pendingFuel = res.data);
        },
        error: () => {
          this.vehicleTotal.set(0); this.topFuelType.set('-');
          this.topFuelAmount.set(0); this.fuelLegend.set([]);
          this.viewReady ? this.deferRenderFuel(empty) : (this.pendingFuel = empty);
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD: Emission
  // ═══════════════════════════════════════════════════════════════
  loadEmissionChart(): void {
    this.isEmissionLoading.set(true); this.emissionError.set('');
    this.emissionChart?.destroy(); this.emissionChart = undefined;
    const empty: MonthlyEmissionChartResponse = { labels: this.getMonthLabels(), datasets: [] };
    this.svc.getVehicleEmissionChart(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isEmissionLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) {
            this.totalCO2e.set(0); this.emissionLegend.set([]);
            this.viewReady ? this.deferRenderEmission(empty) : (this.pendingEmission = empty); return;
          }
          this.computeEmissionKpi(res.data); this.buildEmissionLegend(res.data);
          this.viewReady ? this.deferRenderEmission(res.data) : (this.pendingEmission = res.data);
        },
        error: () => {
          this.totalCO2e.set(0); this.emissionLegend.set([]);
          this.viewReady ? this.deferRenderEmission(empty) : (this.pendingEmission = empty);
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD: Distance
  // ═══════════════════════════════════════════════════════════════
  loadDistanceChart(): void {
    this.isDistanceLoading.set(true); this.distanceError.set('');
    this.distanceChart?.destroy();
    const empty: VehicleDistanceChartResponse = {
      labels: this.getMonthLabels(),
      distanceData: new Array(12).fill(0),
      tripData: new Array(12).fill(0),
      fuelData: new Array(12).fill(0)
    };
    this.svc.getVehicleDistanceMonthly(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isDistanceLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) {
            this.totalDistanceKM.set(0); this.totalTrips.set(0);
            this.viewReady ? this.deferRenderDistance(empty) : (this.pendingDistance = empty); return;
          }
          this.computeDistanceKpis(res.data);
          this.viewReady ? this.deferRenderDistance(res.data) : (this.pendingDistance = res.data);
        },
        error: () => {
          this.totalDistanceKM.set(0); this.totalTrips.set(0);
          this.viewReady ? this.deferRenderDistance(empty) : (this.pendingDistance = empty);
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD: Vehicle Type Wise
  // ═══════════════════════════════════════════════════════════════
  loadVtypeChart(): void {
    this.isVtypeLoading.set(true); this.vtypeError.set('');
    this.vtypeTableRows.set(null);
    const empty: VehicleTypeDistancePivotResponse = {
      vehicleTypes: [], monthLabels: this.getMonthLabels(),
      distanceMatrix: [], tripsMatrix: [], fuelMatrix: [],
      typeTotals: [], monthTotals: new Array(12).fill(0), grandTotal: 0, colors: []
    };
    this.svc.getVehicleTypeWiseDistance(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isVtypeLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) {
            this.vtypeTableRows.set(empty); this.pieLegend.set([]);
            this.viewReady ? this.deferRenderVtype(empty) : (this.pendingVtype = empty); return;
          }
          this.vtypeTableRows.set(res.data); this.buildPieLegend(res.data);
          this.viewReady ? this.deferRenderVtype(res.data) : (this.pendingVtype = res.data);
        },
        error: () => {
          this.vtypeTableRows.set(empty); this.pieLegend.set([]);
          this.viewReady ? this.deferRenderVtype(empty) : (this.pendingVtype = empty);
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD: Category Wise Emission + Distance
  // ═══════════════════════════════════════════════════════════════
  loadCategoryChart(): void {
    this.isCategoryLoading.set(true);
    this.categoryError.set('');
    this.categoryChart?.destroy();
    this.categoryChart = undefined;

    this.svc.getVehicleCategoryEmission(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isCategoryLoading.set(false)))
      .subscribe({
        next: res => {
          const d = res?.data as any;
          if (!res?.status || !d) {
            this.categoryError.set('No data returned from server.');
            this.categoryLegend.set([]);
            return;
          }

          const labels: string[] = d.labels ?? [];
          const distanceData: number[] = (d.distanceData ?? []).map(Number);
          const emissionData: number[] = (d.emissionData ?? []).map(Number);
          const colors: string[] = d.colors ?? [];

          if (!labels.length) {
            this.categoryError.set('No category data found for this year.');
            this.categoryLegend.set([]);
            return;
          }

          const mapped: VehicleCategoryChartResponse = {
            labels, distanceData, emissionData, colors
          };

          this.categoryLegend.set(
            labels.map((cat, i) => ({
              category: cat,
              color: colors[i] ?? '#888888',
              distance: distanceData[i] ?? 0,
              emission: emissionData[i] ?? 0,
            }))
          );

          if (this.viewReady) this.deferRenderCategory(mapped);
          else this.pendingCategory = mapped;
        },
        error: err => {
          this.categoryLegend.set([]);
          this.categoryError.set(
            err?.error?.message ?? err?.message ?? 'Failed to load category data.'
          );
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  //  DEFERRED RENDERS
  // ═══════════════════════════════════════════════════════════════
  private deferRenderFuel(d: FuelCombinedChartResponse): void {
    this._lastFuelData = d;
    setTimeout(() => this.renderFuelChart(d), 0);
  }
  private deferRenderEmission(d: MonthlyEmissionChartResponse): void {
    this._lastEmissionData = d;
    setTimeout(() => this.renderEmissionChart(d), 0);
  }
  private deferRenderDistance(d: VehicleDistanceChartResponse): void {
    this._lastDistanceData = d;
    setTimeout(() => this.renderDistanceChart(d), 0);
  }
  private deferRenderVtype(d: VehicleTypeDistancePivotResponse): void {
    this._lastVtypeData = d;
    setTimeout(() => this.renderDistancePieChart(d), 0);
  }
  private deferRenderCategory(d: VehicleCategoryChartResponse | undefined): void {
    if (d) this._lastCategoryData = d;
    if (!this._lastCategoryData) return;
    const snap = this._lastCategoryData;
    setTimeout(() => this.renderCategoryChart(snap), 0);
  }

  // ═══════════════════════════════════════════════════════════════
  //  KPIs
  // ═══════════════════════════════════════════════════════════════
  private computeFuelKpis(data: FuelCombinedChartResponse): void {
    const ds = data?.datasets ?? [];
    this.vehicleTotal.set(ds.reduce((t, d) => t + (d.data ?? []).reduce((a, b) => a + b, 0), 0));
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

  private computeDistanceKpis(data: VehicleDistanceChartResponse): void {
    this.totalDistanceKM.set((data?.distanceData ?? []).reduce((a, b) => a + b, 0));
    this.totalTrips.set((data?.tripData ?? []).reduce((a, b) => a + b, 0));
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

  private buildPieLegend(data: VehicleTypeDistancePivotResponse): void {
    const grand = data.grandTotal || 1;
    const items = data.vehicleTypes
      .map((vt, i) => ({
        label: vt, color: data.colors[i],
        value: data.typeTotals[i],
        pct: ((data.typeTotals[i] / grand) * 100).toFixed(1)
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
    this.pieLegend.set(items);
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: Stacked Bar (Fuel)
  // ═══════════════════════════════════════════════════════════════
  private renderFuelChart(data: FuelCombinedChartResponse): void {
    const canvas = this.fuelCanvasRef?.nativeElement;
    if (!canvas) return;
    if (canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderFuelChart(data)); return;
    }
    this.fuelChart?.destroy(); this.fuelChart = undefined;
    const ds = data?.datasets ?? [];
    this.fuelChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.labels ?? this.getMonthLabels(),
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
          const el = elements[0]; const ds2 = data.datasets[el.datasetIndex];
          if ((ds2?.data?.[el.index] ?? 0) > 0)
            this.onFuelBarClick(el.index, ds2.fuelType, ds2.vehicleTypeNames ?? []);
        },
        onHover: (_e: any, el: any[]) => {
          if (canvas) canvas.style.cursor = el.length ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'nearest', intersect: true,
            backgroundColor: '#0f5132', titleColor: '#c5f2d7', bodyColor: '#e0f2f1',
            borderColor: '#1b7d55', borderWidth: 1, padding: 12,
            filter: (item: TooltipItem<'bar'>) => (item.parsed.y ?? 0) > 0,
            callbacks: {
              title: (items: TooltipItem<'bar'>[]) => {
                if (!items.length) return '';
                const ft = (items[0].dataset as any).stack;
                return `${items[0].label}  —  ${ft}: ${items.reduce((s, i) => s + (i.parsed.y ?? 0), 0).toLocaleString()} L`;
              },
              label: (ctx: TooltipItem<'bar'>) => {
                const v = ctx.parsed.y as number;
                return v === 0 ? '' : ` ${ctx.dataset.label}: ${v.toLocaleString()} L`;
              }
            }
          }
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 0 } },
          y: {
            stacked: true, grid: { color: '#f0fdf4' }, min: 0,
            ticks: { color: '#64748b', font: { size: 11 }, callback: (v: any) => `${Number(v).toLocaleString()} L` },
            title: { display: true, text: 'Fuel Consumed (Litres)', color: '#94a3b8', font: { size: 11 } }
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
    if (!canvas) return;
    if (canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderEmissionChart(data)); return;
    }
    this.emissionChart?.destroy(); this.emissionChart = undefined;
    const ds = data?.datasets ?? [];
    this.emissionChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.labels ?? this.getMonthLabels(),
        datasets: ds.map(d => ({
          label: d.label, data: d.data,
          borderColor: d.color, backgroundColor: d.color + '22',
          borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6,
          tension: 0.4, fill: false as const
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (_e: any, elements: any[]) => {
          if (!elements.length) return;
          this.onEmissionPointClick(elements[0].index);
        },
        onHover: (_e: any, el: any[]) => {
          if (canvas) canvas.style.cursor = el.length ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#e2e8f0',
            borderColor: '#334155', borderWidth: 1, padding: 12,
            callbacks: {
              label: (ctx: TooltipItem<'line'>) =>
                ` ${ctx.dataset.label}: ${(ctx.parsed.y as number).toLocaleString()} kg`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
          y: {
            grid: { color: '#f0fdf4' }, min: 0,
            ticks: { color: '#64748b', font: { size: 11 }, callback: (v: any) => `${Number(v).toLocaleString()}` },
            title: { display: true, text: 'Emissions (kg)', color: '#94a3b8', font: { size: 11 } }
          }
        },
        animation: { duration: 500, easing: 'easeInOutQuart' }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: Dual-axis Bar (Distance)
  // ═══════════════════════════════════════════════════════════════
  private renderDistanceChart(data: VehicleDistanceChartResponse): void {
    const canvas = this.distanceCanvasRef?.nativeElement;
    if (!canvas) return;
    if (canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderDistanceChart(data)); return;
    }
    this.distanceChart?.destroy();
    this.distanceChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.labels ?? this.getMonthLabels(),
        datasets: [
          {
            label: 'Distance (km)', data: data?.distanceData ?? new Array(12).fill(0),
            backgroundColor: 'rgba(55,138,221,0.82)', borderColor: '#378ADD',
            borderWidth: 1, borderRadius: 5, borderSkipped: false as const, yAxisID: 'yDist'
          },
          {
            label: 'Trips', data: data?.tripData ?? new Array(12).fill(0),
            type: 'line' as const,
            borderColor: '#1D9E75', backgroundColor: '#1D9E7520',
            borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6,
            tension: 0.4, fill: false as const, yAxisID: 'yTrips'
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (_e: any, elements: any[]) => {
          if (!elements.length) return;
          this.onDistanceBarClick(elements[0].index);
        },
        onHover: (_e: any, el: any[]) => {
          if (canvas) canvas.style.cursor = el.length ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#e2e8f0',
            borderColor: '#334155', borderWidth: 1, padding: 12,
            callbacks: {
              label: (ctx: TooltipItem<'bar'>) => {
                const val = ctx.parsed.y as number;
                return ctx.datasetIndex === 0
                  ? ` Distance: ${val.toLocaleString()} km`
                  : ` Trips: ${val.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 0 } },
          yDist: {
            type: 'linear', position: 'left', grid: { color: '#f0fdf4' }, min: 0,
            ticks: { color: '#64748b', font: { size: 11 }, callback: (v: any) => `${Number(v).toLocaleString()} km` },
            title: { display: true, text: 'Distance (km)', color: '#94a3b8', font: { size: 11 } }
          },
          yTrips: {
            type: 'linear', position: 'right', grid: { drawOnChartArea: false }, min: 0,
            ticks: { color: '#1D9E75', font: { size: 11 } },
            title: { display: true, text: 'Trips', color: '#1D9E75', font: { size: 11 } }
          }
        },
        animation: { duration: 400, easing: 'easeInOutQuart' }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: Doughnut Pie (Vehicle Type Distance Share)
  // ═══════════════════════════════════════════════════════════════
  private renderDistancePieChart(data: VehicleTypeDistancePivotResponse): void {
    const canvas = this.distancePieCanvasRef?.nativeElement;
    if (!canvas) return;
    if (canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderDistancePieChart(data)); return;
    }
    this.distancePieChart?.destroy(); this.distancePieChart = undefined;
    const labels = data.vehicleTypes.filter((_, i) => data.typeTotals[i] > 0);
    const values = data.typeTotals.filter(v => v > 0);
    const colors = data.colors.filter((_, i) => data.typeTotals[i] > 0);
    const hasData = values.length > 0;
    this.distancePieChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: hasData ? labels : ['No Data'],
        datasets: [{
          data: hasData ? values : [1],
          backgroundColor: hasData ? colors : ['#e2e8f0'],
          borderColor: '#ffffff', borderWidth: 3,
          hoverOffset: hasData ? 10 : 0, hoverBorderWidth: hasData ? 4 : 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        onClick: (_e: any, elements: any[]) => {
          if (!elements.length || !hasData) return;
          const vt = labels[elements[0].index];
          if (vt) this.onPieVtypeClick(vt);
        },
        onHover: (_e: any, el: any[]) => {
          if (canvas) canvas.style.cursor = (el.length && hasData) ? 'pointer' : 'default';
        },
        plugins: {
          legend: {
            display: true, position: 'bottom',
            labels: {
              padding: 16, boxWidth: 12, boxHeight: 12,
              borderRadius: 3, useBorderRadius: true,
              font: { size: 12, family: 'Inter, sans-serif' }, color: '#475569',
              filter: (item) => hasData ? true : item.text !== 'No Data'
            }
          },
          tooltip: {
            enabled: hasData,
            backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#e2e8f0',
            borderColor: '#334155', borderWidth: 1, padding: 12,
            callbacks: {
              label: (ctx: TooltipItem<'doughnut'>) => {
                if (!hasData) return ' No data available';
                const val = ctx.parsed as number;
                return `  ${val.toLocaleString('en-IN')} km  (${((val / (data.grandTotal || 1)) * 100).toFixed(1)}%)`;
              }
            }
          }
        },
        animation: { duration: 600, easing: 'easeInOutQuart' }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: Category Wise — bar (distance) + line (emission)
  //  Chart.js auto-generates clean decimal ticks on the emission
  //  Y-axis — no afterBuildTicks override needed.
  // ═══════════════════════════════════════════════════════════════
  private renderCategoryChart(data: VehicleCategoryChartResponse): void {
    const canvas = this.categoryCanvasRef?.nativeElement;
    if (!canvas) return;
    if (canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderCategoryChart(data)); return;
    }
    this.categoryChart?.destroy(); this.categoryChart = undefined;

    const hasData = data.labels?.length > 0;

    // ── Clean step size based on emission magnitude ───────────
    const rawMax = hasData ? Math.max(...(data.emissionData ?? [0])) : 1;

    const getCleanStep = (max: number): number => {
      if (max <= 100) return 20;
      if (max <= 500) return 100;
      if (max <= 1000) return 200;
      if (max <= 2000) return 500;
      if (max <= 5000) return 1000;
      if (max <= 10000) return 2000;
      if (max <= 20000) return 5000;
      if (max <= 50000) return 10000;
      return 20000;
    };

    const cleanStep = getCleanStep(rawMax);
    const maxEmission = Math.ceil(rawMax / cleanStep) * cleanStep;

    this.categoryChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: hasData ? data.labels : ['No Data'],
        datasets: hasData ? [
          // ── Bars: Distance ──────────────────────────────────
          {
            type: 'bar' as const,
            label: 'Distance (km)',
            data: data.distanceData,
            backgroundColor: data.colors.map(c => c + 'CC'),
            borderColor: data.colors,
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false as const,
            yAxisID: 'yDist',
            order: 2,
          },
          // ── Line: Emission ──────────────────────────────────
          {
            type: 'line' as const,
            label: 'Emission (kg)',
            data: data.emissionData,
            borderColor: data.colors,
            backgroundColor: data.colors.map(c => c + '33'),
            pointBackgroundColor: data.colors,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 7,
            pointHoverRadius: 9,
            borderWidth: 2.5,
            borderDash: [6, 4],
            fill: false as const,
            tension: 0,
            yAxisID: 'yEmission',
            order: 1,
          }
        ] : [{ type: 'bar' as const, label: 'No Data', data: [], backgroundColor: [] }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        onClick: (_e: any, elements: any[]) => {
          if (!elements.length || !hasData) return;
          const categoryName = data.labels[elements[0].index];
          if (categoryName) this.onCategoryBarClick(categoryName);
        },
        onHover: (_e: any, el: any[]) => {
          if (canvas) canvas.style.cursor = (el.length && hasData) ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#e2e8f0',
            borderColor: '#334155', borderWidth: 1, padding: 14,
            callbacks: {
              title: (items: TooltipItem<'bar'>[]) =>
                `${items[0]?.label ?? ''} — click to drill down`,
              label: (ctx: TooltipItem<'bar'>) => {
                const val = ctx.parsed.y as number;
                if (ctx.dataset.label === 'Distance (km)')
                  return `  Distance : ${val.toLocaleString('en-IN')} km`;
                if (ctx.dataset.label === 'Emission (kg)')
                  return `  Emission : ${val.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })} kg`;
                return ` ${ctx.dataset.label}: ${val.toLocaleString('en-IN')}`;
              },
              afterBody: () => ['', '  🔍 Click bar to view records']
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 12, weight: 600 }, maxRotation: 0 },
            title: { display: true, text: 'Vehicle Category', color: '#94a3b8', font: { size: 11 } }
          },
          yDist: {
            type: 'linear', position: 'left',
            grid: { color: '#f0fdf4' }, min: 0,
            ticks: {
              color: '#64748b', font: { size: 11 },
              callback: (v: any) => `${Number(v).toLocaleString('en-IN')} km`
            },
            title: { display: true, text: 'Distance (km)', color: '#94a3b8', font: { size: 11 } }
          },
          yEmission: {
            type: 'linear', position: 'right',
            grid: { drawOnChartArea: false },
            min: 0,
            max: maxEmission,
            ticks: {
              color: '#c2410c', font: { size: 11 },
              stepSize: cleanStep,  // ✅ clean 0, 2000, 4000, 6000...
              callback: (v: any) => {
                const num = Number(v);
                if (num === 0) return '0 kg';
                return `${num.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} kg`;
              }
            },
            title: {
              display: true,
              text: 'Emission (kg CO₂e)',
              color: '#c2410c',
              font: { size: 11 }
            }
          }
        },
        animation: { duration: 500, easing: 'easeInOutQuart' }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  FORMAT HELPERS
  // ═══════════════════════════════════════════════════════════════

  /** For whole-number values like distance, trip counts etc. */
  formatNum(value: number): string {
    return Math.round(value).toLocaleString('en-IN');
  }

  /**
   * For emission values which can be small decimals.
   * Shows up to 5 decimal places, stripping trailing zeros.
   */
  formatEmission(value: number): string {
    return Number(value).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 5
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  EXPORTS
  // ═══════════════════════════════════════════════════════════════
  exportFuelChart(): void {
    this.svc.exportVehicleFuelExcel(this.year)
      .subscribe({ next: blob => saveAs(blob, `FuelData_${this.year}.xlsx`), error: err => console.error(err) });
  }
  exportVehicleEmissionChartExport(): void {
    this.svc.exportVehicleEmissionChart(this.year)
      .subscribe({ next: blob => saveAs(blob, `VehicleEmissionData_${this.year}.xlsx`), error: err => console.error(err) });
  }
  exportchartvehicletotaldistancemonthwise(): void {
    this.svc.ExportVehicleDistance(this.year)
      .subscribe({ next: blob => saveAs(blob, `VehicleDistanceAndTrip_${this.year}.xlsx`), error: err => console.error(err) });
  }
  exportvehicletypecharttotaldistancemonthwisePivottable(): void {
    this.svc.ExportVehicleTypeDistance(this.year)
      .subscribe({ next: blob => saveAs(blob, `VehicleDistanceAndTrip_${this.year}.xlsx`), error: err => console.error(err) });
  }
  exportvehicletypedistancePieChart(): void {
    this.svc.ExportVehicleTypeDistancePieChart(this.year)
      .subscribe({ next: blob => saveAs(blob, `VehicleTypeDistancePieChart_${this.year}.xlsx`), error: err => console.error(err) });
  }
  exportCategoryEmission(): void {
    this.svc.ExportVehicleCategoryEmission(this.year)
      .subscribe({ next: blob => saveAs(blob, `CategoryEmission_${this.year}.xlsx`), error: err => console.error(err) });
  }
}