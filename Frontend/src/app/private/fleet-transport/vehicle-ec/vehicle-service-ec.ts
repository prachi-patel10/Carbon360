import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { enviornment } from '../../../enviorments/enviornment';

@Injectable({
  providedIn: 'root'
})
export class TripService {

  private apiUrl = enviornment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getVehicles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/VehicleMaster/getalllist`);
  }

  getCities(): Observable<any> {
    return this.http.get(`${this.apiUrl}/City/All`);
  }

  addTrip(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/VehicleTrip/AddTrip`, data);
  }

}