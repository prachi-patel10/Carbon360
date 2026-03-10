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

  getFuels(): Observable<any> {
    return this.http.get(`${this.apiUrl}/Fuel/All`);
  }

  getCities(): Observable<any> {
    return this.http.get(`${this.apiUrl}/City/All`);
  }

  getEmissionFactors(): Observable<any> {
  return this.http.get(`${this.apiUrl}/EmissionFactor/List`);
}

   addTrip(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/VehicleTripEmission`, data);
  }

  updateTripStatus(data: any): Observable<any> {
  return this.http.put(
    `${this.apiUrl}/VehicleTripEmission/status`,
    data
  );
}

 getTripById(hashId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/VehicleTripEmission/${hashId}`
    );
  }

// updateTrip(hashId: string, data: any): Observable<any> {
//   return this.http.put(
//     `${this.apiUrl}/VehicleTripEmission/${hashId}`,
//     data
//   );
// }

  // deleteTrip(hashId: string): Observable<any> {
  //   return this.http.delete(
  //     `${this.apiUrl}/VehicleTripEmission/${hashId}`
  //   );
  // }


}