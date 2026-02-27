import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../enviorments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeneratorecService {

  private apiUrl = `${environment.apiBaseUrl}/GeneratorOperation`;

  constructor(private http: HttpClient) {}

  // ================= GET ALL =================
  getAll(): Observable<any> {
    return this.http.get(`${this.apiUrl}/All`);
  }

  // ================= GET BY ID =================
  getById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  // ================= CREATE =================
  create(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, data);
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
}