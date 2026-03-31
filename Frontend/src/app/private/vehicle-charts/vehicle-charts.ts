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
  CityEmissionResponse
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
  @ViewChild('vehicleCityEmissionCanvas') cityEmissionCanvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Signals ──────────────────────────────────────────────────
  isFuelLoading = signal(false);
  isEmissionLoading = signal(false);
  isDistanceLoading = signal(false);
  isVtypeLoading = signal(false);
  isCityEmissionLoading = signal(false);

  fuelError = signal('');
  emissionError = signal('');
  distanceError = signal('');
  vtypeError = signal('');
  cityEmissionError = signal('');

  fuelLegend = signal<{ fuelType: string; color: string }[]>([]);
  emissionLegend = signal<{ label: string; color: string }[]>([]);
  pieLegend = signal<{ label: string; color: string; value: number; pct: string }[]>([]);

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
  showCityEmissionCanvas = computed(() => !this.isCityEmissionLoading() && !this.cityEmissionError());

  vtypeTotalDist = computed(() => this.vtypeTableRows()?.grandTotal ?? 0);
  vtypeTotalTrips = computed(() =>
    (this.vtypeTableRows()?.tripsMatrix ?? []).reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0));
  vtypeTotalFuel = computed(() =>
    (this.vtypeTableRows()?.fuelMatrix ?? []).reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0));

  // ── Chart instances ───────────────────────────────────────────
  private fuelChart: Chart | null = null;
  private emissionChart: Chart | null = null;
  private distanceChart: Chart | null = null;
  private distancePieChart: Chart | null = null;
  private cityEmissionChart: Chart | null = null;

  private destroy$ = new Subject<void>();
  private viewReady = false;

  private _lastFuelData: FuelCombinedChartResponse | null = null;
  private _lastEmissionData: MonthlyEmissionChartResponse | null = null;
  private _lastDistanceData: VehicleDistanceChartResponse | null = null;
  private _lastVtypeData: VehicleTypeDistancePivotResponse | null = null;
  private _lastCityEmissionData: CityEmissionResponse[] | null = null;

  private pendingFuel: FuelCombinedChartResponse | null = null;
  private pendingEmission: MonthlyEmissionChartResponse | null = null;
  private pendingDistance: VehicleDistanceChartResponse | null = null;
  private pendingVtype: VehicleTypeDistancePivotResponse | null = null;
  private pendingCityEmission: CityEmissionResponse[] | null = null;

  constructor(private svc: DashboardService, private router: Router) { }

  ngOnInit(): void { this.loadAll(); }
  ngOnDestroy(): void {
    this.destroy$.next(); this.destroy$.complete();
    this.fuelChart?.destroy(); this.emissionChart?.destroy();
    this.distanceChart?.destroy(); this.distancePieChart?.destroy();
    this.cityEmissionChart?.destroy();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.pendingFuel) { this.deferRenderFuel(this.pendingFuel); this.pendingFuel = null; }
    if (this.pendingEmission) { this.deferRenderEmission(this.pendingEmission); this.pendingEmission = null; }
    if (this.pendingDistance) { this.deferRenderDistance(this.pendingDistance); this.pendingDistance = null; }
    if (this.pendingVtype) { this.deferRenderVtype(this.pendingVtype); this.pendingVtype = null; }
    if (this.pendingCityEmission) { this.deferRenderCityEmission(this.pendingCityEmission); this.pendingCityEmission = null; }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['year'] && !changes['year'].firstChange) this.loadAll();
  }

  loadAll(): void {
    this.loadFuelChart();
    this.loadEmissionChart();
    this.loadDistanceChart();
    this.loadVtypeChart();
    this.loadCityEmissionChart();
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPER: 12 month labels
  // ═══════════════════════════════════════════════════════════════
  private getMonthLabels(): string[] {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }

  // ═══════════════════════════════════════════════════════════════
  //  DATE HELPERS
  // ═══════════════════════════════════════════════════════════════
  private buildMonthRange(monthIndex: number): { start: string; end: string } {
    const y = this.year;
    const m = monthIndex + 1;
    const mm = String(m).padStart(2, '0');
    const lastDay = new Date(y, m, 0).getDate();
    return {
      start: `${y}-${mm}-01`,
      end: `${y}-${mm}-${String(lastDay).padStart(2, '0')}`
    };
  }

  private buildYearRange(): { start: string; end: string } {
    return { start: `${this.year}-01-01`, end: `${this.year}-12-31` };
  }

  // ═══════════════════════════════════════════════════════════════
  //  CENTRAL NAVIGATION
  // ═══════════════════════════════════════════════════════════════
  private navigateToVehicleSearch(params: {
    monthIndex?: number;
    fuelType?: string;
    vehicleType?: string;
    vehicleTypeNames?: string[];
    city?: string;
    search?: string;
    opStart?: string;
    opEnd?: string;
    reportedStart?: string;
    reportedEnd?: string;
  }): void {
    const qp: Record<string, any> = { source: 'chart', year: this.year };

    if (params.fuelType) qp['fuelType'] = params.fuelType;
    if (params.city) qp['city'] = params.city;
    if (params.search) qp['search'] = params.search;

    if (params.vehicleTypeNames && params.vehicleTypeNames.length > 1) {
      qp['vehicleType'] = params.vehicleTypeNames.join(',');
    } else if (params.vehicleTypeNames && params.vehicleTypeNames.length === 1) {
      qp['vehicleType'] = params.vehicleTypeNames[0];
    } else if (params.vehicleType) {
      qp['vehicleType'] = params.vehicleType;
    }

    if (params.monthIndex !== undefined && params.monthIndex >= 0) {
      const { start, end } = this.buildMonthRange(params.monthIndex);
      qp['opStart'] = start;
      qp['opEnd'] = end;
      qp['reportedStart'] = start;
      qp['reportedEnd'] = end;
    } else {
      if (params.opStart) qp['opStart'] = params.opStart;
      if (params.opEnd) qp['opEnd'] = params.opEnd;
      if (params.reportedStart) qp['reportedStart'] = params.reportedStart;
      if (params.reportedEnd) qp['reportedEnd'] = params.reportedEnd;
    }

    this.gridRowClick.emit(qp);
    this.router.navigate(['/dashboard/searchVehicle'], { queryParams: qp });
  }

  // ═══════════════════════════════════════════════════════════════
  //  CHART-CLICK HANDLERS
  // ═══════════════════════════════════════════════════════════════
  private onFuelBarClick(monthIndex: number, fuelType: string, vehicleTypeNames: string[]): void {
    this.navigateToVehicleSearch({ monthIndex, fuelType, vehicleTypeNames });
  }

  private onEmissionPointClick(monthIndex: number): void {
    this.navigateToVehicleSearch({ monthIndex });
  }

  private onDistanceBarClick(monthIndex: number): void {
    this.navigateToVehicleSearch({ monthIndex });
  }

  onFuelGridRowClick(monthIndex: number, fuelType?: string): void {
    this.navigateToVehicleSearch({ monthIndex, fuelType });
  }

  onEmissionGridRowClick(monthIndex: number): void {
    this.navigateToVehicleSearch({ monthIndex });
  }

  onDistanceGridRowClick(monthIndex: number): void {
    this.navigateToVehicleSearch({ monthIndex });
  }

  onVtypeGridCellClick(monthIndex: number, vehicleType: string): void {
    const p: Parameters<typeof this.navigateToVehicleSearch>[0] = {};
    if (monthIndex >= 0) p.monthIndex = monthIndex;
    if (vehicleType) p.vehicleType = vehicleType;
    this.navigateToVehicleSearch(p);
  }

  onVtypeTypeTotalClick(vehicleType: string): void {
    const { start, end } = this.buildYearRange();
    this.navigateToVehicleSearch({
      vehicleType,
      opStart: start, opEnd: end,
      reportedStart: start, reportedEnd: end
    });
  }

  onVtypeMonthTotalClick(monthIndex: number): void {
    this.navigateToVehicleSearch({ monthIndex });
  }

  onPieVtypeClick(vehicleType: string): void {
    const { start, end } = this.buildYearRange();
    this.navigateToVehicleSearch({
      vehicleType,
      opStart: start, opEnd: end,
      reportedStart: start, reportedEnd: end
    });
  }

  onCityGridRowClick(cityName: string): void {
    const { start, end } = this.buildYearRange();
    this.navigateToVehicleSearch({
      city: cityName,
      opStart: start, opEnd: end,
      reportedStart: start, reportedEnd: end
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD: Fuel
  // ═══════════════════════════════════════════════════════════════
  loadFuelChart(): void {
    this.isFuelLoading.set(true);
    this.fuelError.set('');
    this.fuelChart?.destroy();
    this.fuelChart = null;

    this.svc.getVehicleFuelMonthly(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isFuelLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) {
            // ── No data: render empty chart with zero values ──
            const emptyData: FuelCombinedChartResponse = {
              labels: this.getMonthLabels(),
              datasets: []
            };
            this.vehicleTotal.set(0);
            this.topFuelType.set('-');
            this.topFuelAmount.set(0);
            this.fuelLegend.set([]);
            if (this.viewReady) this.deferRenderFuel(emptyData); else this.pendingFuel = emptyData;
            return;
          }
          this.computeFuelKpis(res.data);
          this.buildFuelLegend(res.data);
          if (this.viewReady) this.deferRenderFuel(res.data); else this.pendingFuel = res.data;
        },
        error: err => {
          // ── On error: still render empty chart ──
          const emptyData: FuelCombinedChartResponse = {
            labels: this.getMonthLabels(),
            datasets: []
          };
          this.vehicleTotal.set(0);
          this.topFuelType.set('-');
          this.topFuelAmount.set(0);
          this.fuelLegend.set([]);
          if (this.viewReady) this.deferRenderFuel(emptyData); else this.pendingFuel = emptyData;
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

    this.svc.getVehicleEmissionChart(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isEmissionLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) {
            // ── No data: render empty chart ──
            const emptyData: MonthlyEmissionChartResponse = {
              labels: this.getMonthLabels(),
              datasets: []
            };
            this.totalCO2e.set(0);
            this.emissionLegend.set([]);
            if (this.viewReady) this.deferRenderEmission(emptyData); else this.pendingEmission = emptyData;
            return;
          }
          this.computeEmissionKpi(res.data);
          this.buildEmissionLegend(res.data);
          if (this.viewReady) this.deferRenderEmission(res.data); else this.pendingEmission = res.data;
        },
        error: err => {
          const emptyData: MonthlyEmissionChartResponse = {
            labels: this.getMonthLabels(),
            datasets: []
          };
          this.totalCO2e.set(0);
          this.emissionLegend.set([]);
          if (this.viewReady) this.deferRenderEmission(emptyData); else this.pendingEmission = emptyData;
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD: Distance
  // ═══════════════════════════════════════════════════════════════
  loadDistanceChart(): void {
    this.isDistanceLoading.set(true);
    this.distanceError.set('');
    this.distanceChart?.destroy();

    this.svc.getVehicleDistanceMonthly(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isDistanceLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) {
            // ── No data: render empty chart with zero arrays ──
            const emptyData: VehicleDistanceChartResponse = {
              labels: this.getMonthLabels(),
              distanceData: new Array(12).fill(0),
              tripData: new Array(12).fill(0),
              fuelData: new Array(12).fill(0)   // ← add this
            };
            this.totalDistanceKM.set(0);
            this.totalTrips.set(0);
            if (this.viewReady) this.deferRenderDistance(emptyData); else this.pendingDistance = emptyData;
            return;
          }
          this.computeDistanceKpis(res.data);
          if (this.viewReady) this.deferRenderDistance(res.data); else this.pendingDistance = res.data;
        },
        error: err => {
          const emptyData: VehicleDistanceChartResponse = {
            labels: this.getMonthLabels(),
            distanceData: new Array(12).fill(0),
            tripData: new Array(12).fill(0),
            fuelData: new Array(12).fill(0)   // ← add this
          };
          this.totalDistanceKM.set(0);
          this.totalTrips.set(0);
          if (this.viewReady) this.deferRenderDistance(emptyData); else this.pendingDistance = emptyData;
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD: Vehicle Type Wise
  // ═══════════════════════════════════════════════════════════════
  loadVtypeChart(): void {
    this.isVtypeLoading.set(true);
    this.vtypeError.set('');
    this.vtypeTableRows.set(null);

    this.svc.getVehicleTypeWiseDistance(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isVtypeLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) {
            // ── No data: set empty pivot + empty pie ──
            const emptyData: VehicleTypeDistancePivotResponse = {
              vehicleTypes: [],
              monthLabels: this.getMonthLabels(),
              distanceMatrix: [],
              tripsMatrix: [],
              fuelMatrix: [],
              typeTotals: [],
              monthTotals: new Array(12).fill(0),
              grandTotal: 0,
              colors: []
            };
            this.vtypeTableRows.set(emptyData);
            this.pieLegend.set([]);
            if (this.viewReady) this.deferRenderVtype(emptyData); else this.pendingVtype = emptyData;
            return;
          }
          this.vtypeTableRows.set(res.data);
          this.buildPieLegend(res.data);
          if (this.viewReady) this.deferRenderVtype(res.data); else this.pendingVtype = res.data;
        },
        error: err => {
          const emptyData: VehicleTypeDistancePivotResponse = {
            vehicleTypes: [],
            monthLabels: this.getMonthLabels(),
            distanceMatrix: [],
            tripsMatrix: [],
            fuelMatrix: [],
            typeTotals: [],
            monthTotals: new Array(12).fill(0),
            grandTotal: 0,
            colors: []
          };
          this.vtypeTableRows.set(emptyData);
          this.pieLegend.set([]);
          if (this.viewReady) this.deferRenderVtype(emptyData); else this.pendingVtype = emptyData;
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD: City Emissions
  // ═══════════════════════════════════════════════════════════════
  loadCityEmissionChart(): void {
    this.isCityEmissionLoading.set(true);
    this.cityEmissionError.set('');
    this.cityEmissionChart?.destroy();
    this.cityEmissionChart = null;

    this.svc.getVehicleCityEmissions(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isCityEmissionLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data?.length) {
            // ── No data: render empty chart with empty array ──
            if (this.viewReady) this.deferRenderCityEmission([]); else this.pendingCityEmission = [];
            return;
          }
          if (this.viewReady) this.deferRenderCityEmission(res.data); else this.pendingCityEmission = res.data;
        },
        error: err => {
          if (this.viewReady) this.deferRenderCityEmission([]); else this.pendingCityEmission = [];
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  //  DEFERRED RENDERS
  // ═══════════════════════════════════════════════════════════════
  private deferRenderFuel(data: FuelCombinedChartResponse | null): void {
    if (data) this._lastFuelData = data;
    if (!this._lastFuelData) return;
    const snap = this._lastFuelData;
    setTimeout(() => this.renderFuelChart(snap), 0);
  }

  private deferRenderEmission(data: MonthlyEmissionChartResponse | null): void {
    if (data) this._lastEmissionData = data;
    if (!this._lastEmissionData) return;
    const snap = this._lastEmissionData;
    setTimeout(() => this.renderEmissionChart(snap), 0);
  }

  private deferRenderDistance(data: VehicleDistanceChartResponse | null): void {
    if (data) this._lastDistanceData = data;
    if (!this._lastDistanceData) return;
    const snap = this._lastDistanceData;
    setTimeout(() => this.renderDistanceChart(snap), 0);
  }

  private deferRenderVtype(data: VehicleTypeDistancePivotResponse | null): void {
    if (data) this._lastVtypeData = data;
    if (!this._lastVtypeData) return;
    const snap = this._lastVtypeData;
    setTimeout(() => { this.renderDistancePieChart(snap); }, 0);
  }

  private deferRenderCityEmission(data: CityEmissionResponse[] | null): void {
    if (data) this._lastCityEmissionData = data;
    if (!this._lastCityEmissionData) return;
    const snap = this._lastCityEmissionData;
    setTimeout(() => this.renderCityEmissionChart(snap), 0);
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
        label: vt, color: data.colors[i], value: data.typeTotals[i],
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
    this.fuelChart?.destroy();
    this.fuelChart = null;

    const ds = data?.datasets ?? [];

    // ── Always render the chart, even with empty datasets ──
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
          const el = elements[0];
          const ds2 = data.datasets[el.datasetIndex];
          if ((ds2?.data?.[el.index] ?? 0) > 0) {
            this.onFuelBarClick(el.index, ds2.fuelType, ds2.vehicleTypeNames ?? []);
          }
        },
        onHover: (_e: any, el: any[]) => { if (canvas) canvas.style.cursor = el.length ? 'pointer' : 'default'; },
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
                const total = items.reduce((s, i) => s + (i.parsed.y ?? 0), 0);
                return `${items[0].label}  —  ${ft}: ${total.toLocaleString()} L`;
              },
              label: (ctx: TooltipItem<'bar'>) => {
                const val = ctx.parsed.y as number;
                return val === 0 ? '' : ` ${ctx.dataset.label}: ${val.toLocaleString()} L`;
              }
            }
          }
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 0 } },
          y: {
            stacked: true, grid: { color: '#f0fdf4' },
            min: 0,
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
    this.emissionChart?.destroy();
    this.emissionChart = null;

    const ds = data?.datasets ?? [];

    // ── Always render the chart, even with empty datasets ──
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
        onHover: (_e: any, el: any[]) => { if (canvas) canvas.style.cursor = el.length ? 'pointer' : 'default'; },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#e2e8f0',
            borderColor: '#334155', borderWidth: 1, padding: 12,
            callbacks: { label: (ctx: TooltipItem<'line'>) => ` ${ctx.dataset.label}: ${(ctx.parsed.y as number).toLocaleString()} kg` }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
          y: {
            grid: { color: '#f0fdf4' },
            min: 0,
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

    const distanceData = data?.distanceData ?? new Array(12).fill(0);
    const tripData = data?.tripData ?? new Array(12).fill(0);

    // ── Always render the chart with zero values if no data ──
    this.distanceChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.labels ?? this.getMonthLabels(),
        datasets: [
          {
            label: 'Distance (km)', data: distanceData,
            backgroundColor: 'rgba(55,138,221,0.82)', borderColor: '#378ADD',
            borderWidth: 1, borderRadius: 5, borderSkipped: false as const, yAxisID: 'yDist'
          },
          {
            label: 'Trips', data: tripData,
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
        onHover: (_e: any, el: any[]) => { if (canvas) canvas.style.cursor = el.length ? 'pointer' : 'default'; },
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
            type: 'linear', position: 'left', grid: { color: '#f0fdf4' },
            min: 0,
            ticks: { color: '#64748b', font: { size: 11 }, callback: (v: any) => `${Number(v).toLocaleString()} km` },
            title: { display: true, text: 'Distance (km)', color: '#94a3b8', font: { size: 11 } }
          },
          yTrips: {
            type: 'linear', position: 'right', grid: { drawOnChartArea: false },
            min: 0,
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
    this.distancePieChart?.destroy();
    this.distancePieChart = null;

    const labels = data.vehicleTypes.filter((_, i) => data.typeTotals[i] > 0);
    const values = data.typeTotals.filter(v => v > 0);
    const colors = data.colors.filter((_, i) => data.typeTotals[i] > 0);

    // ── If truly no vehicle types, render empty doughnut with placeholder ──
    const hasData = values.length > 0;
    const chartLabels = hasData ? labels : ['No Data'];
    const chartValues = hasData ? values : [1];
    const chartColors = hasData ? colors : ['#e2e8f0'];

    this.distancePieChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [{
          data: chartValues,
          backgroundColor: chartColors,
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: hasData ? 10 : 0,
          hoverBorderWidth: hasData ? 4 : 0
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
              padding: 16, boxWidth: 12, boxHeight: 12, borderRadius: 3,
              useBorderRadius: true, font: { size: 12, family: 'Inter, sans-serif' }, color: '#475569',
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
                const pct = ((val / (data.grandTotal || 1)) * 100).toFixed(1);
                return `  ${val.toLocaleString('en-IN')} km  (${pct}%)`;
              }
            }
          }
        },
        animation: { duration: 600, easing: 'easeInOutQuart' }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: City Wise Emission Stacked Bar
  // ═══════════════════════════════════════════════════════════════
  private renderCityEmissionChart(data: CityEmissionResponse[]): void {
    const canvas = this.cityEmissionCanvasRef?.nativeElement;
    if (!canvas) return;
    if (canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderCityEmissionChart(data)); return;
    }
    this.cityEmissionChart?.destroy();
    this.cityEmissionChart = null;

    const hasData = data?.length > 0;
    const sorted = hasData ? [...data].sort((a, b) => b.totalCO2e - a.totalCO2e) : [];

    // ── Always render chart; show empty axes if no data ──
    this.cityEmissionChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: hasData ? sorted.map(d => d.cityName) : [],
        datasets: [
          {
            label: 'CO₂ (kg)', data: hasData ? sorted.map(d => d.totalCO2) : [],
            backgroundColor: '#1D9E75CC', borderColor: '#1D9E75',
            borderWidth: 1, borderRadius: 4, borderSkipped: false as const, stack: 'emission'
          },
          {
            label: 'NO₂ (kg)', data: hasData ? sorted.map(d => d.totalNO2) : [],
            backgroundColor: '#EF9F27CC', borderColor: '#EF9F27',
            borderWidth: 1, borderRadius: 4, borderSkipped: false as const, stack: 'emission'
          },
          {
            label: 'CH₄ (kg)', data: hasData ? sorted.map(d => d.totalCH4) : [],
            backgroundColor: '#D4537ECC', borderColor: '#D4537E',
            borderWidth: 1, borderRadius: 4, borderSkipped: false as const, stack: 'emission'
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (_e: any, elements: any[]) => {
          if (!elements.length || !hasData) return;
          const city = sorted[elements[0].index]?.cityName;
          if (city) this.onCityGridRowClick(city);
        },
        onHover: (_e: any, el: any[]) => { if (canvas) canvas.style.cursor = el.length ? 'pointer' : 'default'; },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: '#0f172a', titleColor: '#94a3b8', bodyColor: '#e2e8f0',
            borderColor: '#1D9E75', borderWidth: 1, padding: 12,
            callbacks: {
              title: (items: TooltipItem<'bar'>[]) => {
                const idx = items[0]?.dataIndex ?? 0;
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
            stacked: true, grid: { color: '#f0fdf4' },
            min: 0,
            ticks: { color: '#64748b', font: { size: 11 }, callback: (v: any) => `${Number(v).toLocaleString()}` },
            title: { display: true, text: 'Emissions (kg)', color: '#94a3b8', font: { size: 11 } }
          }
        },
        animation: { duration: 500, easing: 'easeInOutQuart' }
      }
    });
  }

  formatNum(value: number): string {
    return Math.round(value).toLocaleString('en-IN');
  }

  // ═══════════════════════════════════════════════════════════════
  //  EXPORTS
  // ═══════════════════════════════════════════════════════════════
  exportFuelChart() {
    this.svc.exportVehicleFuelExcel(this.year).subscribe({
      next: blob => { saveAs(blob, `FuelData_${this.year}.xlsx`); },
      error: err => { console.error('Export failed', err); }
    });
  }

  exportVehicleEmissionChartExport() {
    this.svc.exportVehicleEmissionChart(this.year).subscribe({
      next: blob => { saveAs(blob, `VehicleEmissionData_${this.year}.xlsx`); },
      error: err => { console.error('Export failed', err); }
    });
  }

  exportchartvehicletotaldistancemonthwise() {
    this.svc.ExportVehicleDistance(this.year).subscribe({
      next: blob => { saveAs(blob, `VehicleDistanceAndTrip_${this.year}.xlsx`); },
      error: err => { console.error('Export failed', err); }
    });
  }

  exportvehicletypecharttotaldistancemonthwisePivottable() {
    this.svc.ExportVehicleTypeDistance(this.year).subscribe({
      next: blob => { saveAs(blob, `VehicleDistanceAndTrip_${this.year}.xlsx`); },
      error: err => { console.error('Export failed', err); }
    });
  }

  exportvehicletypedistancePieChart() {
    this.svc.ExportVehicleTypeDistancePieChart(this.year).subscribe({
      next: blob => { saveAs(blob, `VehicleTypeDistancePieChart_${this.year}.xlsx`); },
      error: err => { console.error('Export failed', err); }
    });
  }

  exportcitywiseemissionchartlast() {
    this.svc.ExportCityWiseEmissionChart(this.year).subscribe({
      next: blob => { saveAs(blob, `CitywiseEmissionChart_${this.year}.xlsx`); },
      error: err => { console.error('Export failed', err); }
    });
  }
}