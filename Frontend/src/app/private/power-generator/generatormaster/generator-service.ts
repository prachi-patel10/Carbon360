import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GeneratorService {
  private baseUrl = 'http://localhost:5236/api/generator';
  private fuelUrl = 'http://localhost:5236/api/Fuel'; 
  private siteUrl = 'http://localhost:5236/api/SiteLocation'; 
  private deptUrl = 'http://localhost:5236/api/Department'; 

  constructor(private http: HttpClient) { }

  create(data: any): Observable<any> {
    return this.http.post(this.baseUrl, data);
  }

  update(data: any): Observable<any> {
    return this.http.put(this.baseUrl, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  toggleStatus(generatorId: string, isActive: boolean) {
    const body = new URLSearchParams();
    body.set('GeneratorId', generatorId);
    body.set('IsActive', String(isActive));
    return this.http.patch(`${this.baseUrl}/toggle-status`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  search(paramsObj: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(paramsObj).forEach(key => {
      if (paramsObj[key] !== null && paramsObj[key] !== undefined) {
        params = params.set(key, paramsObj[key]);
      }
    });
    return this.http.get(`${this.baseUrl}/search`, { params });
  }
  // ================== Lookup APIs ==================
   getFuels(): Observable<any> {
    return this.http.get(`${this.fuelUrl}/All`);
  }

  getSites(): Observable<any[]> {
    return this.http.get<any>(`${this.siteUrl}/All`).pipe(
      map(res => res.data || res || [])
    );
  }

  getDepartments(): Observable<any[]> {
    return this.http.get<any>(`${this.deptUrl}/All`).pipe(
      map(res => res.data || [])
    );
  }
}