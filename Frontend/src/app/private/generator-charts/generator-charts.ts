import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, Input, OnChanges, SimpleChanges,
  signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables, TooltipItem } from 'chart.js';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  DashboardService,
  FuelCombinedChartResponse,
  MonthlyEmissionChartResponse,
  GeneratorRunHoursChartResponse,
  GeneratorLoadFactorChartResponse,
  LoadFactorLineDataset
} from '../dashboard/dashboard-service';

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

  @ViewChild('generatorFuelCanvas')       fuelCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('generatorEmissionCanvas')   emissionCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('generatorRunHoursCanvas')   runHoursCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('generatorLoadFactorCanvas') loadFactorCanvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Signals ───────────────────────────────────────────────────
  isFuelLoading       = signal(false);
  isEmissionLoading   = signal(false);
  isRunHoursLoading   = signal(false);
  isLoadFactorLoading = signal(false);

  fuelError        = signal('');
  emissionError    = signal('');
  runHoursError    = signal('');
  loadFactorError  = signal('');

  fuelLegend        = signal<{ fuelType: string; color: string }[]>([]);
  emissionLegend    = signal<{ label: string; color: string }[]>([]);
  runHoursLegend    = signal<RunHoursLegendItem[]>([]);
  loadFactorLegend  = signal<LoadFactorLegendItem[]>([]);

  generatorTotal    = signal(0);
  topFuelType       = signal('-');
  topFuelAmount     = signal(0);
  totalCO2e         = signal(0);
  totalRunHours     = signal(0);
  totalPowerOutput  = signal(0);

  showFuelCanvas       = computed(() => !this.isFuelLoading()       && !this.fuelError());
  showEmissionCanvas   = computed(() => !this.isEmissionLoading()   && !this.emissionError());
  showRunHoursCanvas   = computed(() => !this.isRunHoursLoading()   && !this.runHoursError());
  showLoadFactorCanvas = computed(() => !this.isLoadFactorLoading() && !this.loadFactorError());

  private fuelChart:       Chart | null = null;
  private emissionChart:   Chart | null = null;
  private runHoursChart:   Chart | null = null;
  private loadFactorChart: Chart | null = null;
  private destroy$  = new Subject<void>();
  private viewReady = false;

  private _lastFuelData:       FuelCombinedChartResponse          | null = null;
  private _lastEmissionData:   MonthlyEmissionChartResponse       | null = null;
  private _lastRunHoursData:   GeneratorRunHoursChartResponse     | null = null;
  private _lastLoadFactorData: GeneratorLoadFactorChartResponse   | null = null;

  private pendingFuel:       FuelCombinedChartResponse          | null = null;
  private pendingEmission:   MonthlyEmissionChartResponse       | null = null;
  private pendingRunHours:   GeneratorRunHoursChartResponse     | null = null;
  private pendingLoadFactor: GeneratorLoadFactorChartResponse   | null = null;

  constructor(private svc: DashboardService) {}

  ngOnInit(): void { this.loadAll(); }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.pendingFuel)       { this.deferRender('fuel',       this.pendingFuel);       this.pendingFuel       = null; }
    if (this.pendingEmission)   { this.deferRender('emission',   this.pendingEmission);   this.pendingEmission   = null; }
    if (this.pendingRunHours)   { this.deferRender('runHours',   this.pendingRunHours);   this.pendingRunHours   = null; }
    if (this.pendingLoadFactor) { this.deferRender('loadFactor', this.pendingLoadFactor); this.pendingLoadFactor = null; }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['year'] && !changes['year'].firstChange) this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next(); this.destroy$.complete();
    this.fuelChart?.destroy(); this.emissionChart?.destroy();
    this.runHoursChart?.destroy(); this.loadFactorChart?.destroy();
  }

  loadAll(): void {
    this.loadFuelChart(); this.loadEmissionChart();
    this.loadRunHoursChart(); this.loadLoadFactorChart();
  }

  refreshCharts(): void {
    this.deferRender('fuel',       null);
    this.deferRender('emission',   null);
    this.deferRender('runHours',   null);
    this.deferRender('loadFactor', null);
  }

  // ── Generic deferred render dispatcher ───────────────────────
  private deferRender(type: 'fuel' | 'emission' | 'runHours' | 'loadFactor', data: any): void {
    switch (type) {
      case 'fuel':
        if (data) this._lastFuelData = data;
        if (!this._lastFuelData) return;
        setTimeout(() => this.renderFuelChart(this._lastFuelData!), 0); break;
      case 'emission':
        if (data) this._lastEmissionData = data;
        if (!this._lastEmissionData) return;
        setTimeout(() => this.renderEmissionChart(this._lastEmissionData!), 0); break;
      case 'runHours':
        if (data) this._lastRunHoursData = data;
        if (!this._lastRunHoursData) return;
        setTimeout(() => this.renderRunHoursChart(this._lastRunHoursData!), 0); break;
      case 'loadFactor':
        if (data) this._lastLoadFactorData = data;
        if (!this._lastLoadFactorData) return;
        setTimeout(() => this.renderLoadFactorChart(this._lastLoadFactorData!), 0); break;
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
        error: err => this.fuelError.set(err?.message || 'Failed to load fuel chart.')
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
        error: err => this.emissionError.set(err?.message || 'Failed to load emission chart.')
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
        error: err => this.runHoursError.set(err?.message || 'Failed to load run hours chart.')
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
        error: err => this.loadFactorError.set(err?.message || 'Failed to load load factor chart.')
      });
  }

  // ── KPIs ──────────────────────────────────────────────────────
  private computeFuelKpis(data: FuelCombinedChartResponse): void {
    const ds = data?.datasets ?? [];
    this.generatorTotal.set(ds.reduce((t, d) => t + (d.data ?? []).reduce((a, b) => a + b, 0), 0));
    const ft: Record<string, number> = {};
    ds.forEach(d => { ft[d.fuelType] = (ft[d.fuelType] ?? 0) + (d.data ?? []).reduce((a, b) => a + b, 0); });
    const top = Object.entries(ft).sort((a, b) => b[1] - a[1])[0];
    this.topFuelType.set(top?.[0] ?? '-'); this.topFuelAmount.set(top?.[1] ?? 0);
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
    const seen = new Set<string>(); const leg: { fuelType: string; color: string }[] = [];
    (data?.datasets ?? []).forEach(d => { if (!seen.has(d.fuelType)) { seen.add(d.fuelType); leg.push({ fuelType: d.fuelType, color: d.color }); } });
    this.fuelLegend.set(leg);
  }

  private buildEmissionLegend(data: MonthlyEmissionChartResponse): void {
    this.emissionLegend.set((data?.datasets ?? []).map(d => ({ label: d.label, color: d.color })));
  }

  private buildRunHoursLegend(data: GeneratorRunHoursChartResponse): void {
    const total = (data?.data ?? []).reduce((a, b) => a + b, 0);
    this.runHoursLegend.set((data?.labels ?? []).map((name, i) => ({
      name, color: (data.colors ?? [])[i] ?? '#888',
      hours: (data.data ?? [])[i] ?? 0,
      pct:   total > 0 ? (((data.data ?? [])[i] ?? 0) / total * 100).toFixed(1) : '0',
      site:  (data.siteNames ?? [])[i] ?? '-'
    })));
  }

  private buildLoadFactorLegend(data: GeneratorLoadFactorChartResponse): void {
    this.loadFactorLegend.set((data?.datasets ?? []).map(d => ({ name: d.generatorName, color: d.color })));
  }

  // ── Render: Stacked Bar (Fuel) ────────────────────────────────
  private renderFuelChart(data: FuelCombinedChartResponse): void {
    const canvas = this.fuelCanvasRef?.nativeElement;
    if (!canvas || canvas.offsetParent === null || canvas.offsetWidth === 0) { requestAnimationFrame(() => this.renderFuelChart(data)); return; }
    this.fuelChart?.destroy(); this.fuelChart = null;
    const ds = data?.datasets ?? [];
    if (!ds.length) { this.fuelError.set('No fuel data for this year.'); return; }
    this.fuelChart = new Chart(canvas, {
      type: 'bar',
      data: { labels: data.labels, datasets: ds.map(d => ({ label: d.label, data: d.data, backgroundColor: d.color, borderColor: d.color.length > 7 ? d.color.substring(0,7) : d.color, borderWidth: 1, borderRadius: 5, borderSkipped: false as const, stack: d.fuelType })) },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'nearest', intersect: true, backgroundColor: '#451a00', titleColor: '#fed7aa', bodyColor: '#ffedd5', borderColor: '#92400e', borderWidth: 1, padding: 10, filter: (item: TooltipItem<'bar'>) => (item.parsed.y ?? 0) > 0, callbacks: { title: (items: TooltipItem<'bar'>[]) => { if (!items.length) return ''; const ft = (items[0].dataset as any).stack; const total = items.reduce((s,i) => s + (i.parsed.y ?? 0), 0); return `${items[0].label} — ${ft}: ${total.toLocaleString()} L`; }, label: (ctx: TooltipItem<'bar'>) => { const val = ctx.parsed.y as number; return val === 0 ? '' : ` ${ctx.dataset.label}: ${val.toLocaleString()} L`; } } } },
        scales: { x: { stacked: true, grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 0 } }, y: { stacked: true, grid: { color: '#fff7ed' }, ticks: { color: '#64748b', font: { size: 10 }, callback: (v: any) => `${Number(v).toLocaleString()} L` }, title: { display: true, text: 'Litres', color: '#94a3b8', font: { size: 10 } } } },
        animation: { duration: 400, easing: 'easeInOutQuart' }
      }
    });
  }

  // ── Render: Line (Emission) ───────────────────────────────────
  private renderEmissionChart(data: MonthlyEmissionChartResponse): void {
    const canvas = this.emissionCanvasRef?.nativeElement;
    if (!canvas || canvas.offsetParent === null || canvas.offsetWidth === 0) { requestAnimationFrame(() => this.renderEmissionChart(data)); return; }
    this.emissionChart?.destroy(); this.emissionChart = null;
    const ds = data?.datasets ?? [];
    if (!ds.length) { this.emissionError.set('No emission data for this year.'); return; }
    this.emissionChart = new Chart(canvas, {
      type: 'line',
      data: { labels: data.labels, datasets: ds.map(d => ({ label: d.label, data: d.data, borderColor: d.color, backgroundColor: d.color + '22', borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, tension: 0.4, fill: false as const })) },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#e2e8f0', borderColor: '#334155', borderWidth: 1, padding: 10, callbacks: { label: (ctx: TooltipItem<'line'>) => ` ${ctx.dataset.label}: ${(ctx.parsed.y as number).toLocaleString()} kg` } } },
        scales: { x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } }, y: { grid: { color: '#fff7ed' }, ticks: { color: '#64748b', font: { size: 10 }, callback: (v: any) => `${Number(v).toLocaleString()}` }, title: { display: true, text: 'kg', color: '#94a3b8', font: { size: 10 } } } },
        animation: { duration: 500, easing: 'easeInOutQuart' }
      }
    });
  }

  // ── Render: Doughnut (Run Hours) ──────────────────────────────
  private renderRunHoursChart(data: GeneratorRunHoursChartResponse): void {
    const canvas = this.runHoursCanvasRef?.nativeElement;
    if (!canvas || canvas.offsetParent === null || canvas.offsetWidth === 0) { requestAnimationFrame(() => this.renderRunHoursChart(data)); return; }
    this.runHoursChart?.destroy(); this.runHoursChart = null;
    if (!(data?.data ?? []).some(v => v > 0)) { this.runHoursError.set('No run hours data for this year.'); return; }
    this.runHoursChart = new Chart(canvas, {
      type: 'doughnut',
      data: { labels: data.labels, datasets: [{ data: data.data, backgroundColor: data.colors, borderColor: '#ffffff', borderWidth: 2, hoverOffset: 8 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#e2e8f0', borderColor: '#334155', borderWidth: 1, padding: 12, callbacks: { label: (ctx: TooltipItem<'doughnut'>) => { const idx = ctx.dataIndex; const hrs = ctx.parsed; const total = (data.data ?? []).reduce((a,b) => a+b, 0); const pct = total > 0 ? ((hrs/total)*100).toFixed(1) : '0'; return [` ${Number(hrs).toLocaleString()} hrs (${pct}%)`, ` Site: ${data.siteNames?.[idx] ?? '-'}`, ` Fuel: ${Number(data.fuelConsumed?.[idx] ?? 0).toLocaleString()} L`]; } } } },
        animation: { duration: 600, easing: 'easeInOutQuart' }
      }
    });
  }

  // ── Render: Multi-line (Load Factor) — THE NEW CHART ─────────
  private renderLoadFactorChart(data: GeneratorLoadFactorChartResponse): void {
    const canvas = this.loadFactorCanvasRef?.nativeElement;
    if (!canvas || canvas.offsetParent === null || canvas.offsetWidth === 0) { requestAnimationFrame(() => this.renderLoadFactorChart(data)); return; }
    this.loadFactorChart?.destroy(); this.loadFactorChart = null;
    const ds = data?.datasets ?? [];
    if (!ds.length) { this.loadFactorError.set('No load factor data for this year.'); return; }

    // One line per generator (avg load factor)
    const datasets = ds.map(d => ({
      label:            d.generatorName,
      data:             d.avgData,
      borderColor:      d.color,
      backgroundColor:  d.color + '18',
      borderWidth:      2.5,
      pointRadius:      4,
      pointHoverRadius: 6,
      tension:          0.4,
      fill:             false as const
    }));

    this.loadFactorChart = new Chart(canvas, {
      type: 'line',
      data: { labels: data.labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: '#0f172a', titleColor: '#94a3b8',
            bodyColor: '#e2e8f0', borderColor: '#334155', borderWidth: 1, padding: 12,
            callbacks: {
              title: (items: TooltipItem<'line'>[]) => items[0]?.label ?? '',
              label: (ctx: TooltipItem<'line'>) => {
                const val   = ctx.parsed.y as number;
                const dsData = data.datasets[ctx.datasetIndex];
                const ops   = dsData?.opCountData?.[ctx.dataIndex] ?? 0;
                const max   = dsData?.maxData?.[ctx.dataIndex]     ?? 0;
                const min   = dsData?.minData?.[ctx.dataIndex]     ?? 0;
                return [
                  ` ${ctx.dataset.label}: ${val.toFixed(1)}% avg`,
                  `   Max: ${max.toFixed(1)}%  Min: ${min.toFixed(1)}%`,
                  `   Operations: ${ops}`
                ];
              }
            }
          },
          // Zone annotation plugin — drawn manually as chart areas
          annotation: undefined
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 10 } }
          },
          y: {
            min: 0, max: 100,
            grid: { color: '#f1f5f9' },
            ticks: {
              color: '#64748b', font: { size: 10 },
              stepSize: 25,
              callback: (v: any) => `${v}%`
            },
            title: { display: true, text: 'Avg Load Factor (%)', color: '#94a3b8', font: { size: 10 } }
          }
        },
        animation: { duration: 500, easing: 'easeInOutQuart' }
      },
      plugins: [this.loadFactorZonePlugin()]
    });
  }

  // Custom Chart.js plugin: draws optimal / warning / critical bands
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

        // Critical zone  0–30   light red
        ctx.fillStyle = 'rgba(220,38,38,0.06)';
        ctx.fillRect(left, toY(30), right - left, toY(0) - toY(30));

        // Warning zone  30–75  light amber
        ctx.fillStyle = 'rgba(234,179,8,0.06)';
        ctx.fillRect(left, toY(75), right - left, toY(30) - toY(75));

        // Optimal zone  75–90  light green
        ctx.fillStyle = 'rgba(34,197,94,0.1)';
        ctx.fillRect(left, toY(90), right - left, toY(75) - toY(90));

        // Overload zone 90–100 light orange
        ctx.fillStyle = 'rgba(249,115,22,0.07)';
        ctx.fillRect(left, toY(100), right - left, toY(90) - toY(100));

        // Dashed threshold line at 30%
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = 'rgba(220,38,38,0.4)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(left,  toY(30));
        ctx.lineTo(right, toY(30));
        ctx.stroke();
        ctx.restore();

        // Dashed threshold line at 75%
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = 'rgba(34,197,94,0.5)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(left,  toY(75));
        ctx.lineTo(right, toY(75));
        ctx.stroke();
        ctx.restore();
      }
    };
  }

  formatNum(value: number): string {
    return Math.round(value).toLocaleString('en-IN');
  }
}