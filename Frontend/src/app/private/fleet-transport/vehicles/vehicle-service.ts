import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviorments/environment';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private vehicleUrl = `${environment.apiBaseUrl}/VehicleMaster`;
  private fuelUrl = `${environment.apiBaseUrl}/Fuel`;
  private departmentUrl = `${environment.apiBaseUrl}/Department`;
  private vehicleTypeUrl = `${environment.apiBaseUrl}/VehicleType`;

  constructor(private http: HttpClient) {}

  createVehicle(data: any): Observable<any> {
    return this.http.post(`${this.vehicleUrl}/create`, data);
  }

  updateVehicle(data: any): Observable<any> {
    return this.http.patch(`${this.vehicleUrl}/update/${data.vehicle_id}`, data);
  }

  updateVehicleStatus(vehicleId: string, status: boolean) {
    return this.http.patch(`${this.vehicleUrl}/update-status/${vehicleId}`, { isActive: status });
  }

  searchVehicles(search: string, isActive: boolean | null, pageNumber: number, pageSize: number) {
    let params: any = { pageNumber, pageSize };
    if (search) params.search = search;
    if (isActive !== null) params.isActive = isActive;
    return this.http.get<any>(`${this.vehicleUrl}/search`, { params });
  }

  getFuelList(): Observable<any> {
    return this.http.get(`${this.fuelUrl}/All`);
  }

  getDepartmentList(): Observable<any> {
    return this.http.get(`${this.departmentUrl}/All`);
  }

  getVehicleTypeList(): Observable<any> {
    return this.http.get(`${this.vehicleTypeUrl}/All`);
  }

  deleteVehicle(vehicleId: string) {
    return this.http.delete(`${this.vehicleUrl}/delete/${vehicleId}`);
  }
}