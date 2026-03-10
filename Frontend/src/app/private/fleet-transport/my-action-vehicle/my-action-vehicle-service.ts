import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../enviorments/environment';

export interface VehicleTrip {

  tripId: string
  vehicleId: string
  vehicleName: string
  fromCityId: string
  fromCity:string
  toCityId: string
  toCity:string
  tripStartDateTime: string
  tripEndDateTime: string
  distanceKm: number
  fuelConsumedLtr: number
  totalEmission: number
  statusId: number

}

@Injectable({
  providedIn: 'root',
})
export class MyActionVehicleService {

  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // getTrips(): Observable<VehicleTrip[]> {

  //   return this.http.get<VehicleTrip[]>(
  //     `${this.apiUrl}/VehicleTripEmission/my-actions`
  //   );

  // }
  getTrips(page: number, limit: number): Observable<any> {

  return this.http.get<any>(
    `${this.apiUrl}/VehicleTripEmission/my-actions?pageNumber=${page}&pageSize=${limit}`
  );

}

  
  // private apiUrl = environment.apiBaseUrl;

  // constructor(private http: HttpClient) {}

  // // GET ALL TRIPS
  // getTrips(): Observable<VehicleTrip[]> {

  //   return this.http
  //     .get<any>(`${this.apiUrl}/VehicleTripEmission/All`)
  //     .pipe(
  //       map(res => res.data)
  //     );

  // }

}

