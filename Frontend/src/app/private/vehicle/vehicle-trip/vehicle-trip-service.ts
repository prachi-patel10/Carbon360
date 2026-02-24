import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { enviornment } from '../../../enviorments/enviornment';


interface VehicleTrip {
  TripId?: number;
  VehicleNo: string;
  FromCity: string;
  ToCity: string;
  TripStartDateTime: string;
  TripEndDateTime: string;
  DistanceKm: number;
  FuelConsumedLtr: number;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleTripService {

  private apiUrl = `${enviornment.apiBaseUrl}/Department`;

  constructor(private http: HttpClient) { }

  // ================== CREATE ==================
  create(trip: VehicleTrip): Observable<any> {
    return this.http.post(`${this.apiUrl}`, trip);
  }

  // ================== UPDATE ==================
  update(tripId: number, trip: VehicleTrip): Observable<any> {
    return this.http.put(`${this.apiUrl}/${tripId}`, trip);
  }

  // ================== DELETE ==================
  delete(tripId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${tripId}`);
  }

  // ================== GET BY ID ==================
  getById(tripId: number): Observable<VehicleTrip> {
    return this.http.get<VehicleTrip>(`${this.apiUrl}/${tripId}`);
  }

  // ================== OPTIONAL: GET ALL ==================
  getAll(): Observable<VehicleTrip[]> {
    return this.http.get<VehicleTrip[]>(`${this.apiUrl}`);
  }
}