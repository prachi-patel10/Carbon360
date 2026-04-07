import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviorments/environment';

export interface VehicleTrip {
  tripId:             string;
  reportId:           string;   // ✅ added — needed for table display
  vehicleId:          string;
  vehicleName:        string;
  vehicleNumber:      string;   // ✅ added — SP returns VehicleNumber
  fromCityId:         string;
  fromCity:           string;
  toCityId:           string;
  toCity:             string;
  tripStartDateTime:  string;
  tripEndDateTime:    string;
  distanceKm:         number;
  fuelConsumedLtr:    number;
  totalEmission:      number;
  statusId:           number;
  entryDate:          string;
  fuelType:           string;
}

@Injectable({ providedIn: 'root' })
export class MyActionVehicleService {

  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getTrips(
    page:          number,
    limit:         number,
    sortColumn:    string,
    sortDirection: string
  ): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/VehicleTripEmission/myactions` +
      `?pageNumber=${page}&pageSize=${limit}` +
      `&sortColumn=${sortColumn}&sortDirection=${sortDirection}`
    );
  }
}