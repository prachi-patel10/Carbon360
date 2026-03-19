import { Injectable } from '@angular/core';
import { environment } from '../../../enviorments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class VehiclePdfService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  //  downloadTripPdf(tripId: string) {
  //   return this.http.get(`${this.apiUrl}/trip-pdf/${tripId}`, {
  //     responseType: 'blob'  
  //   });
  // }
}
