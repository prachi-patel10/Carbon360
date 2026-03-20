import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../enviorments/environment';

export interface GeneratorOperation {
  operationId: string;
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
    fuelTypes?: string,
    startDate?: string,
    endDate?: string,
    entryStartDate?: string,
    entryEndDate?: string
  ): Observable<any> {
    let params = `pageNumber=${pageNumber}&pageSize=${pageSize}`;

    if (search)         params += `&search=${encodeURIComponent(search)}`;
    if (fuelTypes)      params += `&fuelTypes=${encodeURIComponent(fuelTypes)}`;
    if (startDate)      params += `&startDate=${startDate}`;
    if (endDate)        params += `&endDate=${endDate}`;
    if (entryStartDate) params += `&entryStartDate=${entryStartDate}`;
    if (entryEndDate)   params += `&entryEndDate=${entryEndDate}`;

    return this.http.get<any>(`${this.apiUrl}/search?${params}`);
  }

}