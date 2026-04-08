import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../enviorments/environment';

export interface FuelMonthlyRawRow {
  fuelType: string;
  source: string;
  vehicleTypeName: string;
  monthNumber: number;
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

const FUEL_COLORS: Record<string, string> = {
  Diesel: '#378ADD', Petrol: '#1D9E75', CNG: '#EF9F27',
  LPG: '#D4537E', HSD: '#534AB7', Biomass: '#D85A30',
};
const DEFAULT_COLOR = '#888888';
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function transformFuelRows(
  rows: FuelMonthlyRawRow[],
  source: 'Vehicle' | 'Generator'
): FuelCombinedChartResponse {
  const fuelTypes = [...new Set(rows.map(r => r.fuelType))];
  const datasets: FuelStackDataset[] = fuelTypes.map(ft => {
    const baseColor = FUEL_COLORS[ft] ?? DEFAULT_COLOR;
    const data = new Array<number>(12).fill(0);
    const rowsForFuel = rows.filter(r => r.fuelType === ft);
    rowsForFuel.forEach(r => { data[r.monthNumber - 1] += Number(r.totalFuelConsumed); });
    const vehicleTypeNames = [
      ...new Set(
        rowsForFuel
          .map(r => (r.vehicleTypeName ?? (r as any).vehicleType ?? ''))
          .filter(v => v.trim() !== '')
      )
    ];
    return {
      label: ft, fuelType: ft, source, color: baseColor,
      data, vehicleTypeName: vehicleTypeNames[0] ?? '', vehicleTypeNames,
    };
  });
  return { labels: MONTH_LABELS, datasets };
}

// ── Helper: build date range string from year ─────────────────
function yearToRange(year: number): { fromDate: string; toDate: string } {
  return {
    fromDate: `${year}-01-01`,
    toDate: `${year}-12-31`
  };
}

// ── Helper: build query string from date range ─────────────────
function dateParams(fromDate: string, toDate: string): string {
  return `fromDate=${fromDate}&toDate=${toDate}`;
}


@Injectable({ providedIn: 'root' })
export class DashboardService {
  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) { }

  // ── Fuel ──────────────────────────────────────────────────────
  getVehicleFuelMonthly(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<FuelCombinedChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<FuelMonthlyRawRow[]>>(
      `${this.base}/Chart/VehicleMonthly?${dateParams(range.fromDate, range.toDate)}`
    ).pipe(map(res => {
      const transformed = transformFuelRows(res.data ?? [], 'Vehicle');
      return { status: res.status, data: transformed };
    }));
  }

  getGeneratorFuelMonthly(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<FuelCombinedChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<FuelMonthlyRawRow[]>>(
      `${this.base}/Chart/GeneratorMonthly?${dateParams(range.fromDate, range.toDate)}`
    ).pipe(map(res => ({ status: res.status, data: transformFuelRows(res.data ?? [], 'Generator') })));
  }

  getCombinedFuelChart(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<FuelCombinedChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<FuelCombinedChartResponse>>(
      `${this.base}/Chart/CombinedFuelChart?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  getVehicleEmissionChart(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<MonthlyEmissionChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<MonthlyEmissionChartResponse>>(
      `${this.base}/Chart/VehicleEmissionChart?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  getGeneratorEmissionChart(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<MonthlyEmissionChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<MonthlyEmissionChartResponse>>(
      `${this.base}/Chart/GeneratorEmissionChart?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  getGeneratorRunHours(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<GeneratorRunHoursChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<GeneratorRunHoursChartResponse>>(
      `${this.base}/Chart/GeneratorRunHours?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  getVehicleDistanceMonthly(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<VehicleDistanceChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<VehicleDistanceChartResponse>>(
      `${this.base}/Chart/VehicleDistanceMonthly?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  getGeneratorLoadFactor(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<GeneratorLoadFactorChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<GeneratorLoadFactorChartResponse>>(
      `${this.base}/Chart/GeneratorLoadFactor?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  getVehicleTypeWiseDistance(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<VehicleTypeDistancePivotResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<VehicleTypeDistancePivotResponse>>(
      `${this.base}/Chart/VehicleTypeDistance?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  getGeneratorRunHoursMonthly(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<GeneratorRunHoursMonthlyPivotResponse>> {
  const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
  return this.http.get<ApiResponse<GeneratorRunHoursMonthlyPivotResponse>>(
    `${this.base}/Chart/GeneratorRunHoursMonthly?${dateParams(range.fromDate, range.toDate)}`
  );
}

  getGeneratorSiteEmissions(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<SiteEmissionResponse[]>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<SiteEmissionResponse[]>>(
      `${this.base}/Chart/GeneratorSiteEmissions?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  getDashboardSummary(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<DashboardSummaryResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<DashboardSummaryResponse>>(
      `${this.base}/Chart/DashboardSummary?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  getVehicleSummary(fromDate: Date, toDate: Date): Observable<ApiResponse<DashboardSummaryResponse>> {
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];
    return this.http.get<ApiResponse<DashboardSummaryResponse>>(
      `${this.base}/Chart/VehicleSummary?${dateParams(from, to)}`
    );
  }

  getGeneratorSummary(fromDate: Date, toDate: Date): Observable<ApiResponse<DashboardSummaryResponse>> {
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];
    return this.http.get<ApiResponse<DashboardSummaryResponse>>(
      `${this.base}/Chart/GeneratorSummary?${dateParams(from, to)}`
    );
  }

  getVehicleCategoryEmission(year: number, fromDate?: string, toDate?: string): Observable<ApiResponse<VehicleCategoryChartResponse>> {
    const range = fromDate && toDate ? { fromDate, toDate } : yearToRange(year);
    return this.http.get<ApiResponse<VehicleCategoryChartResponse>>(
      `${this.base}/Chart/VehicleCategoryEmission?${dateParams(range.fromDate, range.toDate)}`
    );
  }

  // ── Exports ───────────────────────────────────────────────────
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