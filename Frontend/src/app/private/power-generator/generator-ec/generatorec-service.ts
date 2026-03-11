import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../enviorments/environment';
import { Observable } from 'rxjs';
import { GeneratorOperation } from '../search-generator/search-generator-service';

@Injectable({
  providedIn: 'root'
})
export class GeneratorecService {

  private apiUrl = `${environment.apiBaseUrl}/GeneratorOperation`;

  constructor(private http: HttpClient) { }

  // ================= GET ALL =================
  getAll(): Observable<any> {
    return this.http.get(`${this.apiUrl}/All`);
  }

  // ================= GET BY ID =================
  // 


  //    getOperationById(hashId: string): Observable<any> {
  //     return this.http.get(
  //       `${this.apiUrl}/VehicleTripEmission/${hashId}`
  //     );
  //   }

  // ================= CREATE =================
  create(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, data);
  }

  // ================= UPDATE =================
  update(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  // ================= DELETE =================
  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getGenerators(): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/generator`);
  }

  getFuels(): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/Fuel/All`);
  }

  updateStatus(operationId: string, actionId: number) {
    return this.http.patch(`${this.apiUrl}/status/${operationId}?actionId=${actionId}`, {});
  }

  getOperationById(operationId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${operationId}`);
  }

  getById(id: string): Observable<GeneratorOperation> {
    return this.http.get<GeneratorOperation>(`${this.apiUrl}/${id}`);
  }

}