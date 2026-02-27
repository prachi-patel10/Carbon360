import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GeneratorService {
  private baseUrl = 'http://localhost:5236/api/generator';

  constructor(private http: HttpClient) { }

  create(data: any): Observable<any> {
    return this.http.post(this.baseUrl, data);
  }

  update(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  toggleStatus(generatorId: string, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${generatorId}/toggle-status?isActive=${isActive}`, {});
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

  getFuels(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/fuel/all`);
  }

  getSites(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/site/all`);
  }

  getDepartments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/department/all`);
  }
}