import { Injectable } from '@angular/core';
import { environment } from '../../../enviorments/environment';
import { HttpClient } from '@angular/common/http';
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
  sortColumn: string = 'tripstartdatetime',
  sortDirection: string = 'DESC'
): Observable<any> {

  return this.http.get<any>(
    `${this.apiUrl}/search?pageNumber=${pageNumber}&pageSize=${pageSize}&sortColumn=${sortColumn}&sortDirection=${sortDirection}`
  );
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

    exportExcel(params: any) {
  return this.http.get(`${this.apiUrl}/export-excel`, {
    params,
    responseType: 'blob'
  });
}
}
