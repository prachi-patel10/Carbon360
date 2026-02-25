import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviorments/environment';

@Injectable({
  providedIn: 'root'
})
export class TripService {

  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getVehicles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/VehicleMaster/getalllist`);
  }

  getCities(): Observable<any> {
    return this.http.get(`${this.apiUrl}/City/All`);
  }

  getEmissionFactorByFuelType(fuelType: string) {
  return this.http.get<any>(
    `http://localhost:5236/api/EmissionFactor?fuelType=${fuelType}`
  );
}

  addTrip(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/VehicleTrip/AddTrip`, data);
  }

}