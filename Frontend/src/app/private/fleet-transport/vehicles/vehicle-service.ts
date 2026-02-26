import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviorments/environment';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  private vehicleUrl = `${environment.apiBaseUrl}/VehicleMaster`;
  private fuelUrl = `${environment.apiBaseUrl}/Fuel`;
  private departmentUrl = `${environment.apiBaseUrl}/Department`;
  private vehicleTypeUrl = `${environment.apiBaseUrl}/VehicleType`;

  constructor(private http: HttpClient) {}

  // ================= VEHICLE =================
  createVehicle(data: any): Observable<any> {
    return this.http.post(`${this.vehicleUrl}/create`, data);
  }

  updateVehicle(data: any): Observable<any> {
    return this.http.patch(`${this.vehicleUrl}/update/${data.vehicle_id}`, data);
  }

  searchVehicles(
    search: string,
    isActive: boolean | null,
    pageNumber: number,
    pageSize: number
  ): Observable<any> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (search) params = params.set('search', search);
    if (isActive !== null) params = params.set('isActive', isActive.toString());

    return this.http.get<any>(`${this.vehicleUrl}/search`, { params });
  }

  // ================= DROPDOWNS =================
  getFuelList(): Observable<any> {
    return this.http.get<any>(`${this.fuelUrl}/All`);
  }

  getDepartmentList(): Observable<any> {
    return this.http.get<any>(`${this.departmentUrl}/All`);
  }

  getVehicleTypeList(): Observable<any> {
    return this.http.get<any>(`${this.vehicleTypeUrl}/All`);
  }

  updateVehicleStatus(vehicleId: string, isActive: boolean) {
    return this.http.patch(`${this.vehicleUrl}/update-status/${vehicleId}`, { isActive });
  }

  deleteVehicle(id: string) {
    return this.http.delete(`${this.vehicleUrl}/delete/${id}`);
  }
}