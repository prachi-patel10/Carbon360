import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../enviorments/environment';

// ── Raw row — VehicleMonthly / GeneratorMonthly APIs ─────────
export interface FuelMonthlyRawRow {
  fuelType: string; source: string;
  monthNumber: number; monthName: string;
  totalFuelConsumed: number;
}

export interface FuelStackDataset {
  label: string; fuelType: string; source: string; color: string; data: number[];
}
export interface FuelCombinedChartResponse {
  labels: string[]; datasets: FuelStackDataset[];
}

export interface EmissionLineDataset {
  label: string; emissionType: string; color: string; data: number[];
}
export interface MonthlyEmissionChartResponse {
  labels: string[]; datasets: EmissionLineDataset[];
}

export interface GeneratorRunHoursChartResponse {
  labels: string[]; data: number[]; colors: string[];
  siteNames: string[]; fuelConsumed: number[]; powerOutput: number[];
}

export interface VehicleDistanceChartResponse {
  labels: string[]; distanceData: number[]; tripData: number[]; fuelData: number[];
}

// ── Load Factor ───────────────────────────────────────────────
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

// ── Vehicle Type Wise Distance (pivot) ───────────────────────
export interface VehicleTypeDistancePivotResponse {
  monthLabels:    string[];
  vehicleTypes:   string[];
  colors:         string[];
  distanceMatrix: number[][];
  tripsMatrix:    number[][];
  fuelMatrix:     number[][];
  monthTotals:    number[];
  typeTotals:     number[];
  grandTotal:     number;
}

// ── Generator Run Hours Monthly Pivot ────────────────────────
export interface GeneratorRunHoursMonthlyPivotResponse {
  monthLabels:      string[];
  generatorNames:   string[];
  colors:           string[];
  runHoursMatrix:   number[][];
  fuelMatrix:       number[][];
  powerMatrix:      number[][];
  monthTotals:      number[];
  generatorTotals:  number[];
  grandTotal:       number;
}

// ── City Wise Emissions (Vehicle) ────────────────────────────
export interface CityEmissionResponse {
  cityName:    string;
  totalCO2:    number;
  totalNO2:    number;
  totalCH4:    number;
  totalCO2e:   number;
}

// ── Site Wise Emissions (Generator) ─────────────────────────
export interface SiteEmissionResponse {
  siteName:    string;
  totalCO2:    number;
  totalNO2:    number;
  totalCH4:    number;
  totalCO2e:   number;
}

// ── Dashboard Summary (combined) ─────────────────────────────
export interface DashboardSummaryResponse {
  totalCO2e:         number;
  totalCO2:          number;
  totalNO2:          number;
  totalCH4:          number;
  totalFuelConsumed: number;
  totalDistanceKM:   number;
  /** Only populated for generator summary */
  totalPowerOutputKWH?: number;
}

export interface ApiResponse<T> { status: boolean; data: T; }

// ── Color map ─────────────────────────────────────────────────
const FUEL_COLORS: Record<string, string> = {
  Diesel: '#378ADD', Petrol: '#1D9E75', CNG: '#EF9F27',
  LPG: '#D4537E', HSD: '#534AB7', Biomass: '#D85A30',
};
const DEFAULT_COLOR = '#888888';
const MONTH_LABELS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function transformFuelRows(rows: FuelMonthlyRawRow[], source: 'Vehicle' | 'Generator'): FuelCombinedChartResponse {
  const fuelTypes = [...new Set(rows.map(r => r.fuelType))];
  const datasets: FuelStackDataset[] = fuelTypes.map(ft => {
    const baseColor = FUEL_COLORS[ft] ?? DEFAULT_COLOR;
    const data = new Array<number>(12).fill(0);
    rows.filter(r => r.fuelType === ft).forEach(r => { data[r.monthNumber - 1] += Number(r.totalFuelConsumed); });
    return { label: ft, fuelType: ft, source, color: baseColor, data };
  });
  return { labels: MONTH_LABELS, datasets };
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) {}

  getVehicleFuelMonthly(year: number): Observable<ApiResponse<FuelCombinedChartResponse>> {
    return this.http.get<ApiResponse<FuelMonthlyRawRow[]>>(`${this.base}/Chart/VehicleMonthly?year=${year}`)
      .pipe(map(res => ({ status: res.status, data: transformFuelRows(res.data ?? [], 'Vehicle') })));
  }

  getGeneratorFuelMonthly(year: number): Observable<ApiResponse<FuelCombinedChartResponse>> {
    return this.http.get<ApiResponse<FuelMonthlyRawRow[]>>(`${this.base}/Chart/GeneratorMonthly?year=${year}`)
      .pipe(map(res => ({ status: res.status, data: transformFuelRows(res.data ?? [], 'Generator') })));
  }

  getCombinedFuelChart(year: number): Observable<ApiResponse<FuelCombinedChartResponse>> {
    return this.http.get<ApiResponse<FuelCombinedChartResponse>>(`${this.base}/Chart/CombinedFuelChart?year=${year}`);
  }

  getVehicleEmissionChart(year: number): Observable<ApiResponse<MonthlyEmissionChartResponse>> {
    return this.http.get<ApiResponse<MonthlyEmissionChartResponse>>(`${this.base}/Chart/VehicleEmissionChart?year=${year}`);
  }

  getGeneratorEmissionChart(year: number): Observable<ApiResponse<MonthlyEmissionChartResponse>> {
    return this.http.get<ApiResponse<MonthlyEmissionChartResponse>>(`${this.base}/Chart/GeneratorEmissionChart?year=${year}`);
  }

  getGeneratorRunHours(year: number): Observable<ApiResponse<GeneratorRunHoursChartResponse>> {
    return this.http.get<ApiResponse<GeneratorRunHoursChartResponse>>(`${this.base}/Chart/GeneratorRunHours?year=${year}`);
  }

  getVehicleDistanceMonthly(year: number): Observable<ApiResponse<VehicleDistanceChartResponse>> {
    return this.http.get<ApiResponse<VehicleDistanceChartResponse>>(`${this.base}/Chart/VehicleDistanceMonthly?year=${year}`);
  }

  getGeneratorLoadFactor(year: number): Observable<ApiResponse<GeneratorLoadFactorChartResponse>> {
    return this.http.get<ApiResponse<GeneratorLoadFactorChartResponse>>(`${this.base}/Chart/GeneratorLoadFactor?year=${year}`);
  }

  getVehicleTypeWiseDistance(year: number): Observable<ApiResponse<VehicleTypeDistancePivotResponse>> {
    return this.http.get<ApiResponse<VehicleTypeDistancePivotResponse>>(
      `${this.base}/Chart/VehicleTypeDistance?year=${year}`
    );
  }

  getGeneratorRunHoursMonthly(year: number): Observable<ApiResponse<GeneratorRunHoursMonthlyPivotResponse>> {
    return this.http.get<ApiResponse<GeneratorRunHoursMonthlyPivotResponse>>(
      `${this.base}/Chart/GeneratorRunHoursMonthly?year=${year}`
    );
  }

  getVehicleCityEmissions(year: number): Observable<ApiResponse<CityEmissionResponse[]>> {
    return this.http.get<ApiResponse<CityEmissionResponse[]>>(
      `${this.base}/Chart/VehicleCityEmissions?year=${year}`
    );
  }

  getGeneratorSiteEmissions(year: number): Observable<ApiResponse<SiteEmissionResponse[]>> {
    return this.http.get<ApiResponse<SiteEmissionResponse[]>>(
      `${this.base}/Chart/GeneratorSiteEmissions?year=${year}`
    );
  }

  // ── Combined (both) summary — kept for backwards-compat ──────────────────────
  getDashboardSummary(year: number): Observable<ApiResponse<DashboardSummaryResponse>> {
    return this.http.get<ApiResponse<DashboardSummaryResponse>>(
      `${this.base}/Chart/DashboardSummary?year=${year}`
    );
  }

  // ── Vehicle-only summary ──────────────────────────────────────────────────────
  getVehicleSummary(year: number): Observable<ApiResponse<DashboardSummaryResponse>> {
    return this.http.get<ApiResponse<DashboardSummaryResponse>>(
      `${this.base}/Chart/VehicleSummary?year=${year}`
    );
  }

  // ── Generator-only summary ────────────────────────────────────────────────────
  getGeneratorSummary(year: number): Observable<ApiResponse<DashboardSummaryResponse>> {
    return this.http.get<ApiResponse<DashboardSummaryResponse>>(
      `${this.base}/Chart/GeneratorSummary?year=${year}`
    );
  }
}