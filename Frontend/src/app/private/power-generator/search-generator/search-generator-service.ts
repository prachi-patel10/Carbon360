import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../enviorments/environment';

export interface GeneratorOperation {
  operationId: number;
  generatorId: number;
  generatorName: string;
  operationDate: string;
  startTime: string;
  endTime: string;
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
}

@Injectable({
  providedIn: 'root',
})
export class SearchGeneratorService {
  private apiUrl = `${environment.apiBaseUrl}/GeneratorOperation`;

  constructor(private http: HttpClient) {}

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

  getEmissions(): Observable<GeneratorOperation[]> {
  return this.http.get<any>(`${this.apiUrl}/All`).pipe(
    map(res => res.data)  // <- unwrap the data array
  );
}

  getGenerators(): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/generator`);
  }

  getFuels(): Observable<any[]> {
  return this.http.get<any>(`${environment.apiBaseUrl}/Fuel/All`).pipe(
    map(res => res.data)
  );
}
}