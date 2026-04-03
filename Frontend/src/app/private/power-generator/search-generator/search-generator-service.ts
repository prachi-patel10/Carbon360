import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../enviorments/environment';

export interface GeneratorOperation {
  operationId: string;
  reportId?: string;
  generatorId: string;
  generatorName: string | null;
  entryDate: string;
  operationDate: string;
  startTime: Date;
  endTime: Date;
  runHours?: number;
  loadFactor?: number;
  powerOutputKWH?: number;
  fuelConsumedLiters?: number;
  co2_kg?: number;
  no2_kg?: number;
  ch4_kg?: number;
  total_co2e_kg?: number;
  statusId: number;
  statusName?: string;
  fuelType?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SearchGeneratorService {
  private apiUrl = `${environment.apiBaseUrl}/GeneratorOperation`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<GeneratorOperation[]> {
    return this.http.get<GeneratorOperation[]>(`${this.apiUrl}/All`);
  }

  getById(id: string): Observable<GeneratorOperation> {
    return this.http.get<GeneratorOperation>(`${this.apiUrl}/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, data);
  }

  update(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // getEmissions(): Observable<GeneratorOperation[]> {
  //   return this.http.get<any>(`${this.apiUrl}/search?pageNumber=1&pageSize=1000`).pipe(
  //     map(res => res.data.records)
  //   );
  // }

  getEmissions(): Observable<GeneratorOperation[]> {
    return this.http.get<GeneratorOperation[]>(`${this.apiUrl}/allgenerator`);
  }

  getGenerators(): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/generator`);
  }

  getFuels(): Observable<any[]> {
    return this.http.get<any>(`${environment.apiBaseUrl}/Fuel/All`).pipe(
      map(res => res.data)
    );
  }

  // ================= SEARCH API =================
  searchEmissions(
  pageNumber: number = 1,
  pageSize: number = 10,
  search?: string,
  fuelType?: string,
  generatorName?: string,
  operationStartDate?: string,
  operationEndDate?: string,
  entryStartDate?: string,
  entryEndDate?: string,
  sortColumn?: string,
  sortDirection?: 'asc' | 'desc',
  siteNames?: string
): Observable<any> {

  let params = new HttpParams()
    .set('pageNumber', pageNumber)
    .set('pageSize', pageSize)
    .set('sortColumn', sortColumn || 'EntryDate')
    .set('sortDirection', (sortDirection || 'desc').toUpperCase());

  if (search) params = params.set('search', search);
    if (fuelType) params = params.set('fuelType', fuelType);
  if (generatorName) params = params.set('generatorName', generatorName);
  if (operationStartDate) params = params.set('startDate', operationStartDate);
  if (operationEndDate) params = params.set('endDate', operationEndDate);
  if (entryStartDate) params = params.set('entryStartDate', entryStartDate);
  if (entryEndDate) params = params.set('entryEndDate', entryEndDate);
  if (siteNames) params = params.set('siteNames', siteNames);

  return this.http.get<any>(`${this.apiUrl}/search`, { params });
}

  exportExcel(params: any) {
    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }

  //get all sitenames
   getSiteNames(): Observable<any[]> {
    return this.http.get<any>(`${environment.apiBaseUrl}/SiteLocation/All`).pipe(
      map(res => {
        const data = Array.isArray(res) ? res : (res.data ?? []);
        return data.filter((s: any) => s.isActive === true || s.isActive === 1);
      })
    );
  }

}