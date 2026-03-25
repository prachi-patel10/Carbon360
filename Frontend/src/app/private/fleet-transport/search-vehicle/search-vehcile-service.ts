import { Injectable } from '@angular/core';
import { environment } from '../../../enviorments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SearchVehcileService {
  private apiUrl = `${environment.apiBaseUrl}/VehicleTripEmission`;

  constructor(private http: HttpClient) {}

  /*GET ALL TRIPS (WITH PAGING LIKE GENERATOR SEARCH)*/
//   searchTrips(): Observable<any> {
//   return this.http.get<any>(`${this.apiUrl}/Search?pageNumber=1&pageSize=10`);
// }
searchTrips(
  pageNumber: number = 1,
  pageSize: number = 10,
  sortColumn: string = 'entryDate',
  sortDirection: string = 'DESC',
  search?: string,
  fuelType?: string[],
  vehicleType?: string[],
  startDate?: string,
  endDate?: string,
  entryStartDate?: string,
  entryEndDate?: string
): Observable<any> {

  let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize)
      .set('sortColumn', sortColumn)
      .set('sortDirection', sortDirection);
 
    if (search)         params = params.set('search', search);
    if (startDate)      params = params.set('startDate', startDate);
    if (endDate)        params = params.set('endDate', endDate);
    if (entryStartDate) params = params.set('entryStartDate', entryStartDate);
    if (entryEndDate)   params = params.set('entryEndDate', entryEndDate);
 
    if (fuelType && fuelType.length > 0) {
      fuelType.forEach(f => params = params.append('fuelType', f));
    }
    if (vehicleType && vehicleType.length > 0) {
      vehicleType.forEach(v => params = params.append('vehicleType', v));
    }
 
    return this.http.get<any>(`${this.apiUrl}/search`, { params });
  }

  /*GET SINGLE TRIP BY ID*/
  getTripById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /*CREATE TRIP*/
  createTrip(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, data);
  }

  /*UPDATE TRIP*/
  updateTrip(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  /*DELETE TRIP*/
  deleteTrip(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
 
  getFuels(): Observable<any[]> {
      return this.http.get<any>(`${environment.apiBaseUrl}/Fuel/All`).pipe(
        map(res => res.data)
      );
    }

   exportExcel(
    search?: string,
    fuelType?: string[],
    vehicleType?: string[],
    startDate?: string,
    endDate?: string,
    entryStartDate?: string,
    entryEndDate?: string,
    sortColumn: string = 'entryDate',
    sortDirection: string = 'DESC'
  ): Observable<Blob> {
    let params = new HttpParams()
      .set('sortColumn', sortColumn)
      .set('sortDirection', sortDirection);
 
    if (search)         params = params.set('search', search);
    if (startDate)      params = params.set('startDate', startDate);
    if (endDate)        params = params.set('endDate', endDate);
    if (entryStartDate) params = params.set('entryStartDate', entryStartDate);
    if (entryEndDate)   params = params.set('entryEndDate', entryEndDate);
 
    if (fuelType && fuelType.length > 0) {
      fuelType.forEach(f => params = params.append('fuelType', f));
    }
    if (vehicleType && vehicleType.length > 0) {
      vehicleType.forEach(v => params = params.append('vehicleType', v));
    }
 
    return this.http.get(`${this.apiUrl}/export-excel`, {
      params,
      responseType: 'blob'
    });
  }
}

