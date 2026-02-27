import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviorments/environment';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private baseUrl = `${environment.apiBaseUrl}/VehicleMaster`;
  private fuelUrl = `${environment.apiBaseUrl}/Fuel`;
  private departmentUrl = `${environment.apiBaseUrl}/Department`;
  private vehicleTypeUrl = `${environment.apiBaseUrl}/VehicleType`;

  constructor(private http: HttpClient) { }

  createVehicle(vehicle: any) {
    return this.http.post<any>(`${this.baseUrl}/create`, vehicle);  // remove { dto: ... }
  }

  updateVehicle(vehicle: any) {
    return this.http.put<any>(`${this.baseUrl}/update`, vehicle);  // remove { dto: ... }
  }

  updateVehicleStatus(vehicleId: string, status: boolean) {
    return this.http.patch(`${this.baseUrl}/update-status/${vehicleId}`, { isActive: status });
  }

  searchVehicles(search: string, isActive: boolean | null, pageNumber: number, pageSize: number) {
    let params: any = { pageNumber, pageSize };
    if (search) params.search = search;
    if (isActive !== null) params.isActive = isActive;
    return this.http.get<any>(`${this.baseUrl}/search`, { params });
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
    return this.http.delete(`${this.baseUrl}/delete/${vehicleId}`);
  }
}