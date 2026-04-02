import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../enviorments/environment';

// ── Raw row — VehicleMonthly / GeneratorMonthly APIs ─────────
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

// ── Generator Run Hours Monthly Pivot ────────────────────────
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

// ── Vehicle Category Wise — NEW flat DTO ──────────────────────
// X-axis = vehicle categories, Y1 = distance, Y2 = emission
export interface VehicleCategoryChartResponse {
  labels:       string[];
  distanceData: number[];
  emissionData: number[];
  colors:       string[];
}

// ── Site Wise Emissions (Generator) ─────────────────────────
export interface SiteEmissionResponse {
  siteName: string;
  totalCO2: number;
  totalNO2: number;
  totalCH4: number;
  totalCO2e: number;
}

// ── Dashboard Summary (combined) ─────────────────────────────
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

// ── Color map ─────────────────────────────────────────────────
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


@Injectable({ providedIn: 'root' })
export class DashboardService {
  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) { }

  getVehicleFuelMonthly(year: number): Observable<ApiResponse<FuelCombinedChartResponse>> {
    return this.http.get<ApiResponse<FuelMonthlyRawRow[]>>(
      `${this.base}/Chart/VehicleMonthly?year=${year}`
    ).pipe(map(res => {
      console.log('RAW VehicleMonthly sample row:', JSON.stringify(res.data?.[0]));
      const transformed = transformFuelRows(res.data ?? [], 'Vehicle');
      return { status: res.status, data: transformed };
    }));
  }

  getGeneratorFuelMonthly(year: number): Observable<ApiResponse<FuelCombinedChartResponse>> {
    return this.http.get<ApiResponse<FuelMonthlyRawRow[]>>(
      `${this.base}/Chart/GeneratorMonthly?year=${year}`
    ).pipe(map(res => ({ status: res.status, data: transformFuelRows(res.data ?? [], 'Generator') })));
  }

  getCombinedFuelChart(year: number): Observable<ApiResponse<FuelCombinedChartResponse>> {
    return this.http.get<ApiResponse<FuelCombinedChartResponse>>(
      `${this.base}/Chart/CombinedFuelChart?year=${year}`
    );
  }

  getVehicleEmissionChart(year: number): Observable<ApiResponse<MonthlyEmissionChartResponse>> {
    return this.http.get<ApiResponse<MonthlyEmissionChartResponse>>(
      `${this.base}/Chart/VehicleEmissionChart?year=${year}`
    );
  }

  getGeneratorEmissionChart(year: number): Observable<ApiResponse<MonthlyEmissionChartResponse>> {
    return this.http.get<ApiResponse<MonthlyEmissionChartResponse>>(
      `${this.base}/Chart/GeneratorEmissionChart?year=${year}`
    );
  }

  getGeneratorRunHours(year: number): Observable<ApiResponse<GeneratorRunHoursChartResponse>> {
    return this.http.get<ApiResponse<GeneratorRunHoursChartResponse>>(
      `${this.base}/Chart/GeneratorRunHours?year=${year}`
    );
  }

  getVehicleDistanceMonthly(year: number): Observable<ApiResponse<VehicleDistanceChartResponse>> {
    return this.http.get<ApiResponse<VehicleDistanceChartResponse>>(
      `${this.base}/Chart/VehicleDistanceMonthly?year=${year}`
    );
  }

  getGeneratorLoadFactor(year: number): Observable<ApiResponse<GeneratorLoadFactorChartResponse>> {
    return this.http.get<ApiResponse<GeneratorLoadFactorChartResponse>>(
      `${this.base}/Chart/GeneratorLoadFactor?year=${year}`
    );
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

  getGeneratorSiteEmissions(year: number): Observable<ApiResponse<SiteEmissionResponse[]>> {
    return this.http.get<ApiResponse<SiteEmissionResponse[]>>(
      `${this.base}/Chart/GeneratorSiteEmissions?year=${year}`
    );
  }

  getDashboardSummary(year: number): Observable<ApiResponse<DashboardSummaryResponse>> {
    return this.http.get<ApiResponse<DashboardSummaryResponse>>(
      `${this.base}/Chart/DashboardSummary?year=${year}`
    );
  }

  getVehicleSummary(year: number): Observable<ApiResponse<DashboardSummaryResponse>> {
    return this.http.get<ApiResponse<DashboardSummaryResponse>>(
      `${this.base}/Chart/VehicleSummary?year=${year}`
    );
  }

  getGeneratorSummary(year: number): Observable<ApiResponse<DashboardSummaryResponse>> {
    return this.http.get<ApiResponse<DashboardSummaryResponse>>(
      `${this.base}/Chart/GeneratorSummary?year=${year}`
    );
  }

  // ── Vehicle Category Wise ────────────────────────────────────
  getVehicleCategoryEmission(year: number): Observable<ApiResponse<VehicleCategoryChartResponse>> {
    return this.http.get<ApiResponse<VehicleCategoryChartResponse>>(
      `${this.base}/Chart/VehicleCategoryEmission?year=${year}`
    );
  }

  ExportVehicleCategoryEmission(year: number): Observable<Blob> {
    return this.http.get(
      `${this.base}/Chart/ExportVehicleCategoryEmission?year=${year}`,
      { responseType: 'blob' }
    );
  }

  // ── Excel exports ─────────────────────────────────────────────
  exportVehicleFuelExcel(year: number) {
    return this.http.get(`${this.base}/Chart/ExportVehicleFuel?year=${year}`, { responseType: 'blob' });
  }
  exportVehicleEmissionChart(year: number) {
    return this.http.get(`${this.base}/Chart/ExportVehicleEmission?year=${year}`, { responseType: 'blob' });
  }
  ExportVehicleDistance(year: number) {
    return this.http.get(`${this.base}/Chart/ExportVehicleDistance?year=${year}`, { responseType: 'blob' });
  }
  ExportVehicleTypeDistance(year: number) {
    return this.http.get(`${this.base}/Chart/ExportVehicleTypeDistance?year=${year}`, { responseType: 'blob' });
  }
  ExportVehicleTypeDistancePieChart(year: number) {
    return this.http.get(`${this.base}/Chart/ExportVehicleTypeDistancePieChart?year=${year}`, { responseType: 'blob' });
  }
  ExportCityWiseEmissionChart(year: number) {
    return this.http.get(`${this.base}/Chart/ExportCityWiseEmissionChart?year=${year}`, { responseType: 'blob' });
  }

    //SERVICE FOR GENERATOR MODULE
  //1st chart
  ExportGeneratorFuelTypeWiseMonthlyConsumptionFirstChart(year: number) {
    return this.http.get(`${this.base}/Chart/ExportGeneratorFuel?year=${year}`, { responseType: 'blob' });
  }

  //2nd chart
  ExportGeneratorMonthlyEmissionTrend(year: number) {
    return this.http.get(`${this.base}/Chart/ExportGeneratorEmissionLineChart?year=${year}`, { responseType: 'blob' });
  }

  //3rd chart
  ExportGeneratorRunHoursMonthWisePivotTbl(year: number) {
    return this.http.get(`${this.base}/Chart/ExportGeneratorRunHoursMonthWisePivotTbl?year=${year}`, { responseType: 'blob' });
  }

  //4rd chart
  ExportGeneratorRunHoursDistribution(year: number) {
    return this.http.get(`${this.base}/Chart/ExportGeneratorPie?year=${year}`, { responseType: 'blob' });
  }

  //5th chart
  ExportGeneratorSiteWiseEmissionProfile(year: number) {
    return this.http.get(`${this.base}/Chart/export-site-emission-chart?year=${year}`, { responseType: 'blob' });
  }
}