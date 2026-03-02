import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FueltypeService {
   private baseUrl = 'http://localhost:5236/api/Fuel';

  constructor(private http: HttpClient) {}

  createFuel(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Create`, data);
  }

  updateFuel(data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/Update`, data);
  }

  deleteFuel(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getAll(): Observable<any> {
    return this.http.get(`${this.baseUrl}/All`);
  }

  updateStatus(data: any): Observable<any> {
  return this.http.patch(
    `${this.baseUrl}/UpdateStatus`,
    data,
    { responseType: 'text' }  
  );
}

  updateGenerator(data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/UpdateGenerator`, data, { responseType: 'text' } );
  }

  search(payload: any): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/search`,
      payload
    );
  }
}
