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

  /**
   * Emitted whenever the user clicks a grid row / chart element.
   * The parent (DashboardComponent) navigates to searchVehicle with these queryParams.
   */
  @Output() gridRowClick = new EventEmitter<Record<string, any>>();

  @ViewChild('vehicleFuelCanvas')          fuelCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('vehicleEmissionCanvas')      emissionCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('vehicleDistanceCanvas')      distanceCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('vehicleDistancePieCanvas')   distancePieCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('vehicleCityEmissionCanvas')  cityEmissionCanvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Signals ──────────────────────────────────────────────────
  isFuelLoading         = signal(false);
  isEmissionLoading     = signal(false);
  isDistanceLoading     = signal(false);
  isVtypeLoading        = signal(false);
  isCityEmissionLoading = signal(false);

  fuelError             = signal('');
  emissionError         = signal('');
  distanceError         = signal('');
  vtypeError            = signal('');
  cityEmissionError     = signal('');

  fuelLegend      = signal<{ fuelType: string; color: string }[]>([]);
  emissionLegend  = signal<{ label: string; color: string }[]>([]);
  pieLegend       = signal<{ label: string; color: string; value: number; pct: string }[]>([]);

  vehicleTotal    = signal(0);
  topFuelType     = signal('-');
  topFuelAmount   = signal(0);
  totalCO2e       = signal(0);
  totalDistanceKM = signal(0);
  totalTrips      = signal(0);

  vtypeTableRows = signal<VehicleTypeDistancePivotResponse | null>(null);

  showFuelCanvas         = computed(() => !this.isFuelLoading()         && !this.fuelError());
  showEmissionCanvas     = computed(() => !this.isEmissionLoading()     && !this.emissionError());
  showDistanceCanvas     = computed(() => !this.isDistanceLoading()     && !this.distanceError());
  showVtypeTable         = computed(() => !this.isVtypeLoading()        && !this.vtypeError());
  showCityEmissionCanvas = computed(() => !this.isCityEmissionLoading() && !this.cityEmissionError());

  vtypeTotalDist  = computed(() => this.vtypeTableRows()?.grandTotal ?? 0);
  vtypeTotalTrips = computed(() =>
    (this.vtypeTableRows()?.tripsMatrix ?? []).reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0));
  vtypeTotalFuel  = computed(() =>
    (this.vtypeTableRows()?.fuelMatrix  ?? []).reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0));

  // ── Chart instances ───────────────────────────────────────────
  private fuelChart:         Chart | null = null;
  private emissionChart:     Chart | null = null;
  private distanceChart:     Chart | null = null;
  private distancePieChart:  Chart | null = null;
  private cityEmissionChart: Chart | null = null;

  private destroy$  = new Subject<void>();
  private viewReady = false;

  private _lastFuelData:         FuelCombinedChartResponse        | null = null;
  private _lastEmissionData:     MonthlyEmissionChartResponse     | null = null;
  private _lastDistanceData:     VehicleDistanceChartResponse     | null = null;
  private _lastVtypeData:        VehicleTypeDistancePivotResponse | null = null;
  private _lastCityEmissionData: CityEmissionResponse[]           | null = null;

  private pendingFuel:         FuelCombinedChartResponse        | null = null;
  private pendingEmission:     MonthlyEmissionChartResponse     | null = null;
  private pendingDistance:     VehicleDistanceChartResponse     | null = null;
  private pendingVtype:        VehicleTypeDistancePivotResponse | null = null;
  private pendingCityEmission: CityEmissionResponse[]           | null = null;

  constructor(private svc: DashboardService, private router: Router) {}

  ngOnInit(): void { this.loadAll(); }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.pendingFuel)         { this.deferRenderFuel(this.pendingFuel);                 this.pendingFuel         = null; }
    if (this.pendingEmission)     { this.deferRenderEmission(this.pendingEmission);         this.pendingEmission     = null; }
    if (this.pendingDistance)     { this.deferRenderDistance(this.pendingDistance);         this.pendingDistance     = null; }
    if (this.pendingVtype)        { this.deferRenderVtype(this.pendingVtype);               this.pendingVtype        = null; }
    if (this.pendingCityEmission) { this.deferRenderCityEmission(this.pendingCityEmission); this.pendingCityEmission = null; }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['year'] && !changes['year'].firstChange) this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next(); this.destroy$.complete();
    this.fuelChart?.destroy();
    this.emissionChart?.destroy();
    this.distanceChart?.destroy();
    this.distancePieChart?.destroy();
    this.cityEmissionChart?.destroy();
  }

  loadAll(): void {
    this.loadFuelChart();
    this.loadEmissionChart();
    this.loadDistanceChart();
    this.loadVtypeChart();
    this.loadCityEmissionChart();
  }

  // ═══════════════════════════════════════════════════════════════
  //  NAVIGATION HELPERS — used by both chart clicks & grid clicks
  // ═══════════════════════════════════════════════════════════════

  /**
   * Central navigation method. Builds query params and either
   * emits the gridRowClick output (so the parent can navigate)
   * OR navigates directly — both are kept for flexibility.
   */
  private navigateToVehicleSearch(params: {
    month?:       number;
    fuelType?:    string;
    vehicleType?: string;
    city?:        string;
    search?:      string;
  }): void {
    const queryParams: Record<string, any> = { source: 'chart', year: this.year };

    if (params.fuelType)    queryParams['fuelType']    = params.fuelType;
    if (params.vehicleType) queryParams['vehicleType'] = params.vehicleType;
    if (params.city)        queryParams['city']        = params.city;
    if (params.search)      queryParams['search']      = params.search;

    if (params.month) {
      const y = this.year, m = params.month;
      const lastDay = new Date(y, m, 0).getDate();
      queryParams['startDate'] = `${y}-${String(m).padStart(2, '0')}-01`;
      queryParams['endDate']   = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    // Emit to parent (DashboardComponent) so it can navigate
    this.gridRowClick.emit(queryParams);

    // Also navigate directly (works when used standalone, parent handler is a no-op duplicate)
    this.router.navigate(['/dashboard/searchVehicle'], { queryParams });
  }

  // ── Convenience wrappers (called from chart onClick) ─────────
  navigateByVehicleMonth(monthIndex: number): void {
    this.navigateToVehicleSearch({ month: monthIndex + 1 });
  }

  navigateByVehicleMonthAndFuel(monthIndex: number, fuelType: string): void {
    this.navigateToVehicleSearch({ month: monthIndex + 1, fuelType });
  }

  // ── Grid row click handlers (called from HTML template) ──────

  /** Fuel grid row clicked: month + optional fuelType */
  onFuelGridRowClick(monthIndex: number, fuelType?: string): void {
    this.navigateToVehicleSearch({ month: monthIndex + 1, fuelType });
  }

  /** Emission grid row clicked: month */
  onEmissionGridRowClick(monthIndex: number): void {
    this.navigateToVehicleSearch({ month: monthIndex + 1 });
  }

  /** Distance grid row clicked: month */
  onDistanceGridRowClick(monthIndex: number): void {
    this.navigateToVehicleSearch({ month: monthIndex + 1 });
  }

  /**
   * Vehicle-type pivot table cell clicked.
   * @param monthIndex  0-based month index (pass -1 for the column-total row)
   * @param vehicleType vehicle type name (pass '' for the row-total column)
   */
  onVtypeGridCellClick(monthIndex: number, vehicleType: string): void {
    const params: { month?: number; vehicleType?: string } = {};
    if (monthIndex >= 0) params.month       = monthIndex + 1;
    if (vehicleType)     params.vehicleType = vehicleType;
    this.navigateToVehicleSearch(params);
  }

  /** Vehicle-type total row (bottom totals bar) clicked */
  onVtypeTypeTotalClick(vehicleType: string): void {
    this.navigateToVehicleSearch({ vehicleType });
  }

  /** Vehicle-type month total column clicked */
  onVtypeMonthTotalClick(monthIndex: number): void {
    this.navigateToVehicleSearch({ month: monthIndex + 1 });
  }

  /** City emission grid row clicked */
  onCityGridRowClick(cityName: string): void {
    this.navigateToVehicleSearch({ city: cityName });
  }

  // ── Load: Fuel ────────────────────────────────────────────────
  loadFuelChart(): void {
    this.isFuelLoading.set(true); this.fuelError.set('');
    this.fuelChart?.destroy(); this.fuelChart = null;
    this.svc.getVehicleFuelMonthly(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isFuelLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) { this.fuelError.set('No data returned.'); return; }
          this.computeFuelKpis(res.data); this.buildFuelLegend(res.data);
          if (this.viewReady) this.deferRenderFuel(res.data); else this.pendingFuel = res.data;
        },
        error: err => this.fuelError.set(err?.message || 'Failed to load fuel chart.')
      });
  }

  // ── Load: Emission ────────────────────────────────────────────
  loadEmissionChart(): void {
    this.isEmissionLoading.set(true); this.emissionError.set('');
    this.emissionChart?.destroy(); this.emissionChart = null;
    this.svc.getVehicleEmissionChart(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isEmissionLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) { this.emissionError.set('No data returned.'); return; }
          this.computeEmissionKpi(res.data); this.buildEmissionLegend(res.data);
          if (this.viewReady) this.deferRenderEmission(res.data); else this.pendingEmission = res.data;
        },
        error: err => this.emissionError.set(err?.message || 'Failed to load emission chart.')
      });
  }

  // ── Load: Distance ────────────────────────────────────────────
  loadDistanceChart(): void {
    this.isDistanceLoading.set(true); this.distanceError.set('');
    this.distanceChart?.destroy();
    this.svc.getVehicleDistanceMonthly(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isDistanceLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) { this.distanceError.set('No data returned.'); return; }
          this.computeDistanceKpis(res.data);
          if (this.viewReady) this.deferRenderDistance(res.data); else this.pendingDistance = res.data;
        },
        error: err => this.distanceError.set(err?.message || 'Failed to load distance chart.')
      });
  }

  // ── Load: Vehicle Type Wise ───────────────────────────────────
  loadVtypeChart(): void {
    this.isVtypeLoading.set(true); this.vtypeError.set('');
    this.vtypeTableRows.set(null);
    this.svc.getVehicleTypeWiseDistance(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isVtypeLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data) { this.vtypeError.set('No data returned.'); return; }
          this.vtypeTableRows.set(res.data);
          this.buildPieLegend(res.data);
          if (this.viewReady) this.deferRenderVtype(res.data); else this.pendingVtype = res.data;
        },
        error: err => this.vtypeError.set(err?.message || 'Failed to load vehicle type chart.')
      });
  }

  // ── Load: City Emissions ──────────────────────────────────────
  loadCityEmissionChart(): void {
    this.isCityEmissionLoading.set(true); this.cityEmissionError.set('');
    this.cityEmissionChart?.destroy(); this.cityEmissionChart = null;
    this.svc.getVehicleCityEmissions(this.year)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isCityEmissionLoading.set(false)))
      .subscribe({
        next: res => {
          if (!res.status || !res.data?.length) { this.cityEmissionError.set('No data returned.'); return; }
          if (this.viewReady) this.deferRenderCityEmission(res.data); else this.pendingCityEmission = res.data;
        },
        error: err => this.cityEmissionError.set(err?.message || 'Failed to load city emission chart.')
      });
  }

  // ── Deferred renders ──────────────────────────────────────────
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

  // ── KPIs ──────────────────────────────────────────────────────
  private computeFuelKpis(data: FuelCombinedChartResponse): void {
    const ds = data?.datasets ?? [];
    this.vehicleTotal.set(ds.reduce((t, d) => t + (d.data ?? []).reduce((a, b) => a + b, 0), 0));
    const ft: Record<string, number> = {};
    ds.forEach(d => { ft[d.fuelType] = (ft[d.fuelType] ?? 0) + (d.data ?? []).reduce((a, b) => a + b, 0); });
    const top = Object.entries(ft).sort((a, b) => b[1] - a[1])[0];
    this.topFuelType.set(top?.[0] ?? '-'); this.topFuelAmount.set(top?.[1] ?? 0);
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
    const seen = new Set<string>(); const leg: { fuelType: string; color: string }[] = [];
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
      .map((vt, i) => ({ label: vt, color: data.colors[i], value: data.typeTotals[i], pct: ((data.typeTotals[i] / grand) * 100).toFixed(1) }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
    this.pieLegend.set(items);
  }

  // ── Render: Stacked Bar (Fuel) ────────────────────────────────
  private renderFuelChart(data: FuelCombinedChartResponse): void {
    const canvas = this.fuelCanvasRef?.nativeElement;
    if (!canvas) return;
    if (canvas.offsetParent === null || canvas.offsetWidth === 0) {
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
          if ((ds2?.data?.[el.index] ?? 0) > 0) this.navigateByVehicleMonthAndFuel(el.index, ds2.fuelType);
        },
        onHover: (_e: any, elements: any[]) => { if (canvas) canvas.style.cursor = elements.length ? 'pointer' : 'default'; },
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
            ticks: { color: '#64748b', font: { size: 11 }, callback: (v: any) => `${Number(v).toLocaleString()} L` },
            title: { display: true, text: 'Fuel Consumed (Litres)', color: '#94a3b8', font: { size: 11 } }
          }
        },
        animation: { duration: 400, easing: 'easeInOutQuart' }
      }
    });
  }

  // ── Render: Line (Emission) ───────────────────────────────────
  private renderEmissionChart(data: MonthlyEmissionChartResponse): void {
    const canvas = this.emissionCanvasRef?.nativeElement;
    if (!canvas) return;
    if (canvas.offsetParent === null || canvas.offsetWidth === 0) {
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
          borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6,
          tension: 0.4, fill: false as const
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (_e: any, elements: any[]) => { if (!elements.length) return; this.navigateByVehicleMonth(elements[0].index); },
        onHover: (_e: any, elements: any[]) => { if (canvas) canvas.style.cursor = elements.length ? 'pointer' : 'default'; },
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
            ticks: { color: '#64748b', font: { size: 11 }, callback: (v: any) => `${Number(v).toLocaleString()}` },
            title: { display: true, text: 'Emissions (kg)', color: '#94a3b8', font: { size: 11 } }
          }
        },
        animation: { duration: 500, easing: 'easeInOutQuart' }
      }
    });
  }

  // ── Render: Dual-axis Bar (Distance) ─────────────────────────
  private renderDistanceChart(data: VehicleDistanceChartResponse): void {
    const canvas = this.distanceCanvasRef?.nativeElement;
    if (!canvas) return;
    if (canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderDistanceChart(data)); return;
    }
    this.distanceChart?.destroy();
    if (!(data?.distanceData ?? []).some(v => v > 0)) { this.distanceError.set('No distance data for this year.'); return; }

    this.distanceChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Distance (km)', data: data.distanceData,
            backgroundColor: 'rgba(55,138,221,0.82)', borderColor: '#378ADD',
            borderWidth: 1, borderRadius: 5, borderSkipped: false as const, yAxisID: 'yDist'
          },
          {
            label: 'Trips', data: data.tripData,
            type: 'line' as const,
            borderColor: '#1D9E75', backgroundColor: '#1D9E7520',
            borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6,
            tension: 0.4, fill: false as const, yAxisID: 'yTrips'
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (_e: any, elements: any[]) => { if (!elements.length) return; this.navigateByVehicleMonth(elements[0].index); },
        onHover: (_e: any, elements: any[]) => { if (canvas) canvas.style.cursor = elements.length ? 'pointer' : 'default'; },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#e2e8f0',
            borderColor: '#334155', borderWidth: 1, padding: 12,
            callbacks: {
              label: (ctx: TooltipItem<'bar'>) => {
                const val = ctx.parsed.y as number;
                return ctx.datasetIndex === 0 ? ` Distance: ${val.toLocaleString()} km` : ` Trips: ${val.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 0 } },
          yDist: {
            type: 'linear', position: 'left', grid: { color: '#f0fdf4' },
            ticks: { color: '#64748b', font: { size: 11 }, callback: (v: any) => `${Number(v).toLocaleString()} km` },
            title: { display: true, text: 'Distance (km)', color: '#94a3b8', font: { size: 11 } }
          },
          yTrips: {
            type: 'linear', position: 'right', grid: { drawOnChartArea: false },
            ticks: { color: '#1D9E75', font: { size: 11 } },
            title: { display: true, text: 'Trips', color: '#1D9E75', font: { size: 11 } }
          }
        },
        animation: { duration: 400, easing: 'easeInOutQuart' }
      }
    });
  }

  // ── Render: Doughnut Pie (Vehicle Type Distance Share) ────────
  private renderDistancePieChart(data: VehicleTypeDistancePivotResponse): void {
    const canvas = this.distancePieCanvasRef?.nativeElement;
    if (!canvas) return;
    if (canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderDistancePieChart(data)); return;
    }
    this.distancePieChart?.destroy(); this.distancePieChart = null;

    const labels = data.vehicleTypes.filter((_, i) => data.typeTotals[i] > 0);
    const values = data.typeTotals.filter(v => v > 0);
    const colors = data.colors.filter((_, i) => data.typeTotals[i] > 0);
    if (!values.length) return;

    this.distancePieChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderColor: '#ffffff', borderWidth: 3, hoverOffset: 10, hoverBorderWidth: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        onClick: (_e: any, elements: any[]) => {
          if (!elements.length) return;
          const vt = labels[elements[0].index];
          if (vt) this.onVtypeTypeTotalClick(vt);
        },
        onHover: (_e: any, elements: any[]) => { if (canvas) canvas.style.cursor = elements.length ? 'pointer' : 'default'; },
        plugins: {
          legend: {
            display: true, position: 'bottom',
            labels: { padding: 16, boxWidth: 12, boxHeight: 12, borderRadius: 3, useBorderRadius: true, font: { size: 12, family: 'Inter, sans-serif' }, color: '#475569' }
          },
          tooltip: {
            backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#e2e8f0',
            borderColor: '#334155', borderWidth: 1, padding: 12,
            callbacks: {
              label: (ctx: TooltipItem<'doughnut'>) => {
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

  // ── Render: City Wise Emission Stacked Bar ────────────────────
  private renderCityEmissionChart(data: CityEmissionResponse[]): void {
    const canvas = this.cityEmissionCanvasRef?.nativeElement;
    if (!canvas) return;
    if (canvas.offsetParent === null || canvas.offsetWidth === 0) {
      requestAnimationFrame(() => this.renderCityEmissionChart(data)); return;
    }
    this.cityEmissionChart?.destroy(); this.cityEmissionChart = null;
    if (!data?.length) { this.cityEmissionError.set('No city emission data for this year.'); return; }

    const sorted = [...data].sort((a, b) => b.totalCO2e - a.totalCO2e);
    const labels  = sorted.map(d => d.cityName);

    this.cityEmissionChart = new Chart(canvas, {
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
          const city = sorted[elements[0].index]?.cityName;
          if (city) this.onCityGridRowClick(city);
        },
        onHover: (_e: any, elements: any[]) => { if (canvas) canvas.style.cursor = elements.length ? 'pointer' : 'default'; },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: '#0f172a', titleColor: '#94a3b8', bodyColor: '#e2e8f0',
            borderColor: '#1D9E75', borderWidth: 1, padding: 12,
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
            stacked: true, grid: { color: '#f0fdf4' },
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
}