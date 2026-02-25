import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  private baseUrl = 'http://localhost:5236/api/VehicleMaster';

  constructor(private http: HttpClient) {}

  createVehicle(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/create`, data);
  }

  searchVehicles(
    search: string,
    isActive: boolean | null,
    pageNumber: number,
    pageSize: number
  ): Observable<any> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (search) params = params.set('search', search);
    if (isActive !== null)
      params = params.set('isActive', isActive);

    return this.http.get(`${this.baseUrl}/search`, { params });
  }
}