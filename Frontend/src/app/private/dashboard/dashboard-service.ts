import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../enviorments/environment';

export interface FuelMonthlyRawRow {
  fuelType: string;
  source: string;
  vehicleTypeName: string;
  monthNumber: number;
  yearNumber: number;
  monthName: string;
  totalFuelConsumed: number;
}

export interface FuelStackDataset {
  label: string;
  fuelType: string;
  source: string;
  color: string;
  data: number[];
  vehicleTypeName: string;
  vehicleTypeNames: string[];
}

export interface FuelCombinedChartResponse {
  labels: string[];
  datasets: FuelStackDataset[];
}

export interface EmissionLineDataset {
  label: string; emissionType: string; color: string; data: number[];
}
export interface MonthlyEmissionChartResponse {
  labels: string[]; datasets: EmissionLineDataset[];
}

export interface GeneratorRunHoursChartResponse {
  labels: string[]; data: number[]; colors: string[];
  siteNames: string[]; fuelConsumed: number[]; powerOutput: number[]; fuelTypes: string[];
}

export interface VehicleDistanceChartResponse {
  labels: string[]; distanceData: number[]; tripData: number[]; fuelData: number[];
}

export interface LoadFactorLineDataset {
  generatorName: string;
  color: string;
  avgData: number[];
  maxData: number[];
  minData: number[];
  opCountData: number[];
}
export interface GeneratorLoadFactorChartResponse {
  labels: string[];
  datasets: LoadFactorLineDataset[];
}

export interface VehicleTypeDistancePivotResponse {
  monthLabels: string[];
  vehicleTypes: string[];
  colors: string[];
  distanceMatrix: number[][];
  tripsMatrix: number[][];
  fuelMatrix: number[][];
  monthTotals: number[];
  typeTotals: number[];
  grandTotal: number;
}

export interface GeneratorRunHoursMonthlyPivotResponse {
  monthLabels: string[];
  generatorNames: string[];
  colors: string[];
  runHoursMatrix: number[][];
  fuelMatrix: number[][];
  powerMatrix: number[][];
  monthTotals: number[];
  generatorTotals: number[];
  grandTotal: number;
}

export interface VehicleCategoryChartResponse {
  labels: string[];
  distanceData: number[];
  emissionData: number[];
  colors: string[];
}

export interface SiteEmissionResponse {
  siteName: string;
  totalCO2: number;
  totalNO2: number;
  totalCH4: number;
  totalCO2e: number;
}

export interface DashboardSummaryResponse {
  totalCO2e: number;
  totalCO2: number;
  totalNO2: number;
  totalCH4: number;
  totalFuelConsumed: number;
  totalDistanceKM: number;
  totalPowerOutputKWH?: number;
}

export interface ApiResponse<T> { status: boolean; data: T; }

// ── Constants ──────────────────────────────────────────────────
const FUEL_COLORS: Record<string, string> = {
  Diesel: '#378ADD', Petrol: '#1D9E75', CNG: '#EF9F27',
  LPG: '#D4537E', HSD: '#534AB7', Biomass: '#D85A30',
};
const DEFAULT_COLOR = '#888888';
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Helper: build date range from year ─────────────────────────
function yearToRange(year: number): { fromDate: string; toDate: string } {
  return { fromDate: `${year}-01-01`, toDate: `${year}-12-31` };
}

// ── Helper: build query string ─────────────────────────────────
function dateParams(fromDate: string, toDate: string): string {
  return `fromDate=${fromDate}&toDate=${toDate}`;
}

// ── Helper: build ordered month slots from date range ──────────
function buildSlots(
  fromDate?: string,
  toDate?: string,
  year?: number
): { month: number; year: number; label: string }[] {
  let startYear: number, startMonth: number, endYear: number, endMonth: number;

  if (fromDate && toDate) {
    const [fy, fm] = fromDate.split('-').map(Number);
    const [ty, tm] = toDate.split('-').map(Number);
    startYear = fy;
    startMonth = fm;
    endYear = ty;
    endMonth = tm;
  } else {
    const y = year ?? new Date().getFullYear();
    startYear = y; startMonth = 1;
    endYear = y; endMonth = 12;
  }

  const slots: { month: number; year: number; label: string }[] = [];
  let y = startYear, m = startMonth;

  while (y < endYear || (y === endYear && m <= endMonth)) {
    slots.push({
      month: m,
      year: y,
      label: `${MONTH_SHORT[m - 1]}${String(y).slice(-2)}`
    });
    m++;
    if (m > 12) { m = 1; y++; }
  }

  return slots;
}

// ═══════════════════════════════════════════════════════════════
//  transformFuelRows
// ═══════════════════════════════════════════════════════════════
function transformFuelRows(
  rows: FuelMonthlyRawRow[],
  source: 'Vehicle' | 'Generator',
  fromDate?: string,
  toDate?: string
): FuelCombinedChartResponse {

  const slots = buildSlots(fromDate, toDate);
  const labels = slots.map(s => s.label);
  const slotCount = slots.length;

  const slotIndex = new Map<string, number>();
  slots.forEach((s, i) => slotIndex.set(`${s.year}-${s.month}`, i));

  if (!rows || rows.length === 0) {
    return { labels, datasets: [] };
  }

  const fuelTypes = [...new Set(rows.map(r => r.fuelType))];

  const datasets: FuelStackDataset[] = fuelTypes.map(ft => {
    const data = new Array<number>(slotCount).fill(0);
    const rowsForFuel = rows.filter(r => r.fuelType === ft);

    rowsForFuel.forEach(r => {
      const key = `${r.yearNumber}-${r.monthNumber}`;
      const idx = slotIndex.get(key);
      if (idx !== undefined) {
        data[idx] += Number(r.totalFuelConsumed);
      }
    });

    const vehicleTypeNames = [
      ...new Set(
        rowsForFuel
          .map(r => r.vehicleTypeName ?? (r as any).vehicleType ?? '')
          .filter(v => v.trim() !== '')
      )
    ];

    return {
      label: ft,
      fuelType: ft,
      source,
      color: FUEL_COLORS[ft] ?? DEFAULT_COLOR,
      data,
      vehicleTypeName: vehicleTypeNames[0] ?? '',
      vehicleTypeNames,
    };
  });

  return { labels, datasets };
}

// ═══════════════════════════════════════════════════════════════
//  normalizeVehicleMonthLabels
//  Vehicle API returns "Mar 25" — convert to "Mar25" (remove space)
// ═══════════════════════════════════════════════════════════════
function normalizeVehicleMonthLabels(labels: string[]): string[] {
  return labels.map(lbl => lbl.replace(' ', ''));
}

// ═══════════════════════════════════════════════════════════════
//  reorderGeneratorPivot
//  Generator API always returns 12 fixed rows (Jan=0...Dec=11)
//  regardless of date range. This reorders all matrix rows to
//  match the correct chronological slot order from the date range.
// ═══════════════════════════════════════════════════════════════
function reorderGeneratorPivot(
  data: GeneratorRunHoursMonthlyPivotResponse,
  fromDate?: string,
  toDate?: string,
  year?: number
): GeneratorRunHoursMonthlyPivotResponse {

  const slots = buildSlots(fromDate, toDate, year);
  const genCount = data.generatorNames.length;

  const newMonthLabels: string[] = [];
  const newMonthTotals: number[] = [];
  const newRunHoursMatrix: number[][] = [];
  const newFuelMatrix: number[][] = [];
  const newPowerMatrix: number[][] = [];

  slots.forEach(slot => {
    // API row index: Jan=0, Feb=1 ... Dec=11
    const apiRowIndex = slot.month - 1;

    newMonthLabels.push(slot.label);
    newMonthTotals.push(
      data.monthTotals[apiRowIndex] ?? 0
    );
    newRunHoursMatrix.push(
      data.runHoursMatrix[apiRowIndex] ?? new Array(genCount).fill(0)
    );
    newFuelMatrix.push(
      data.fuelMatrix[apiRowIndex] ?? new Array(genCount).fill(0)
    );
    newPowerMatrix.push(
      data.powerMatrix[apiRowIndex] ?? new Array(genCount).fill(0)
    );
  });

  return {
    ...data,
    monthLabels: newMonthLabels,
    monthTotals: newMonthTotals,
    runHoursMatrix: newRunHoursMatrix,
    fuelMatrix: newFuelMatrix,
    powerMatrix: newPowerMatrix,
  };
}

// ═══════════════════════════════════════════════════════════════
//  SERVICE
// ═══════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) { }

  // ── Vehicle Fuel ───────────────────────────────────────────────
  getVehicleFuelMonthly(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<FuelCombinedChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<FuelMonthlyRawRow[]>>(
      `${this.base}/Chart/VehicleMonthly?${dateParams(range.fromDate, range.toDate)}`
    ).pipe(map(res => ({
      status: res.status,
      data: transformFuelRows(res.data ?? [], 'Vehicle', range.fromDate, range.toDate)
    })));
  }

  // ── Generator Fuel ─────────────────────────────────────────────
  getGeneratorFuelMonthly(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<FuelCombinedChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<FuelMonthlyRawRow[]>>(
      `${this.base}/Chart/GeneratorMonthly?${dateParams(range.fromDate, range.toDate)}`
    ).pipe(map(res => ({
      status: res.status,
      data: transformFuelRows(res.data ?? [], 'Generator', range.fromDate, range.toDate)
    })));
  }

  // ── Combined Fuel ──────────────────────────────────────────────
  getCombinedFuelChart(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<FuelCombinedChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<FuelCombinedChartResponse>>(
      `${this.base}/Chart/CombinedFuelChart?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  // ── Vehicle Emission ───────────────────────────────────────────
  getVehicleEmissionChart(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<MonthlyEmissionChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<MonthlyEmissionChartResponse>>(
      `${this.base}/Chart/VehicleEmissionChart?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  // ── Generator Emission ─────────────────────────────────────────
  getGeneratorEmissionChart(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<MonthlyEmissionChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<MonthlyEmissionChartResponse>>(
      `${this.base}/Chart/GeneratorEmissionChart?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  // ── Generator Run Hours ────────────────────────────────────────
  getGeneratorRunHours(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<GeneratorRunHoursChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<GeneratorRunHoursChartResponse>>(
      `${this.base}/Chart/GeneratorRunHours?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  // ── Vehicle Distance Monthly ───────────────────────────────────
  getVehicleDistanceMonthly(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<VehicleDistanceChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<VehicleDistanceChartResponse>>(
      `${this.base}/Chart/VehicleDistanceMonthly?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  // ── Generator Load Factor ──────────────────────────────────────
  getGeneratorLoadFactor(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<GeneratorLoadFactorChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<GeneratorLoadFactorChartResponse>>(
      `${this.base}/Chart/GeneratorLoadFactor?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  // ── Vehicle Type Wise Distance ─────────────────────────────────
  getVehicleTypeWiseDistance(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<VehicleTypeDistancePivotResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<VehicleTypeDistancePivotResponse>>(
      `${this.base}/Chart/VehicleTypeDistance?${dateParams(range.fromDate, range.toDate)}`
    ).pipe(map(res => {
      if (res.status && res.data) {
        res.data.monthLabels = normalizeVehicleMonthLabels(res.data.monthLabels);
      }
      return res;
    }));
  }

  // ── Generator Run Hours Monthly ────────────────────────────────
  getGeneratorRunHoursMonthly(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<GeneratorRunHoursMonthlyPivotResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<GeneratorRunHoursMonthlyPivotResponse>>(
      `${this.base}/Chart/GeneratorRunHoursMonthly?${dateParams(range.fromDate, range.toDate)}`
    ).pipe(map(res => {
      if (res.status && res.data) {
        res.data = reorderGeneratorPivot(res.data, range.fromDate, range.toDate, year);
      }
      return res;
    }));
  }

  // ── Generator Site Emissions ───────────────────────────────────
  getGeneratorSiteEmissions(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<SiteEmissionResponse[]>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<SiteEmissionResponse[]>>(
      `${this.base}/Chart/GeneratorSiteEmissions?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  // ── Dashboard Summary ──────────────────────────────────────────
  getDashboardSummary(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<DashboardSummaryResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<DashboardSummaryResponse>>(
      `${this.base}/Chart/DashboardSummary?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  // ── Vehicle Summary ────────────────────────────────────────────
  getVehicleSummary(fromDate: Date, toDate: Date): Observable<ApiResponse<DashboardSummaryResponse>> {
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];
    return this.http.get<ApiResponse<DashboardSummaryResponse>>(
      `${this.base}/Chart/VehicleSummary?${dateParams(from, to)}`
    );
  }

  // ── Generator Summary ──────────────────────────────────────────
  getGeneratorSummary(fromDate: Date, toDate: Date): Observable<ApiResponse<DashboardSummaryResponse>> {
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];
    return this.http.get<ApiResponse<DashboardSummaryResponse>>(
      `${this.base}/Chart/GeneratorSummary?${dateParams(from, to)}`
    );
  }

  // ── Vehicle Category Emission ──────────────────────────────────
  getVehicleCategoryEmission(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<VehicleCategoryChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<VehicleCategoryChartResponse>>(
      `${this.base}/Chart/VehicleCategoryEmission?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  // ── Exports ────────────────────────────────────────────────────
  exportVehicleFuelExcel(year: number, fromDate?: string, toDate?: string): Observable<Blob> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get(`${this.base}/Chart/ExportVehicleFuel?${dateParams(range.fromDate, range.toDate)}`, { responseType: 'blob' });
  }

  exportVehicleEmissionChart(year: number, fromDate?: string, toDate?: string): Observable<Blob> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get(`${this.base}/Chart/ExportVehicleEmission?${dateParams(range.fromDate, range.toDate)}`, { responseType: 'blob' });
  }

  ExportVehicleDistance(year: number, fromDate?: string, toDate?: string): Observable<Blob> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get(`${this.base}/Chart/ExportVehicleDistance?${dateParams(range.fromDate, range.toDate)}`, { responseType: 'blob' });
  }

  ExportVehicleTypeDistance(year: number, fromDate?: string, toDate?: string): Observable<Blob> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get(`${this.base}/Chart/ExportVehicleTypeDistance?${dateParams(range.fromDate, range.toDate)}`, { responseType: 'blob' });
  }

  ExportVehicleTypeDistancePieChart(year: number, fromDate?: string, toDate?: string): Observable<Blob> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get(`${this.base}/Chart/ExportVehicleTypeDistancePieChart?${dateParams(range.fromDate, range.toDate)}`, { responseType: 'blob' });
  }

  ExportCityWiseEmissionChart(year: number, fromDate?: string, toDate?: string): Observable<Blob> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get(`${this.base}/Chart/ExportCityWiseEmissionChart?${dateParams(range.fromDate, range.toDate)}`, { responseType: 'blob' });
  }

  ExportVehicleCategoryEmission(year: number, fromDate?: string, toDate?: string): Observable<Blob> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get(`${this.base}/Chart/ExportVehicleCategoryEmission?${dateParams(range.fromDate, range.toDate)}`, { responseType: 'blob' });
  }

  ExportGeneratorFuelTypeWiseMonthlyConsumptionFirstChart(year: number, fromDate?: string, toDate?: string): Observable<Blob> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get(`${this.base}/Chart/ExportGeneratorFuel?${dateParams(range.fromDate, range.toDate)}`, { responseType: 'blob' });
  }

  ExportGeneratorMonthlyEmissionTrend(year: number, fromDate?: string, toDate?: string): Observable<Blob> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get(`${this.base}/Chart/ExportGeneratorEmissionLineChart?${dateParams(range.fromDate, range.toDate)}`, { responseType: 'blob' });
  }

  ExportGeneratorRunHoursMonthWisePivotTbl(year: number, fromDate?: string, toDate?: string): Observable<Blob> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get(`${this.base}/Chart/ExportGeneratorRunHoursMonthWisePivotTbl?${dateParams(range.fromDate, range.toDate)}`, { responseType: 'blob' });
  }

  ExportGeneratorRunHoursDistribution(year: number, fromDate?: string, toDate?: string): Observable<Blob> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get(`${this.base}/Chart/ExportGeneratorPie?${dateParams(range.fromDate, range.toDate)}`, { responseType: 'blob' });
  }

  ExportGeneratorSiteWiseEmissionProfile(year: number, fromDate?: string, toDate?: string): Observable<Blob> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get(`${this.base}/Chart/export-site-emission-chart?${dateParams(range.fromDate, range.toDate)}`, { responseType: 'blob' });
  }
}