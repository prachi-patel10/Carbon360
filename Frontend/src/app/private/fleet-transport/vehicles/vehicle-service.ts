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
    const payload = {
      vehicle_id: vehicleId,  // must match backend
      IsActive: status        // correct casing
    };

    return this.http.patch(`${this.baseUrl}/status`, payload,  { responseType: 'text' } );
  }

  searchVehicles(
    search: string,
    isActive: boolean | null,   // <-- allow null
    pageNumber: number,
    pageSize: number,
    sortColumn: string = 'vehicle_number',
    sortDirection: string = 'asc',
    vehicle_type_id?: string,
    fuel_id?: string,
    department_id?: string
  ): Observable<any> {
    const params: any = {
      search: search,
      pageNumber: pageNumber,
      pageSize: pageSize,
      sortColumn: sortColumn,
      sortDirection: sortDirection.toUpperCase()
    };

    if (isActive !== null) params.isActive = isActive; // only send if true/false
    if (vehicle_type_id) params.vehicle_type_id = vehicle_type_id;
    if (fuel_id) params.fuel_id = fuel_id;
    if (department_id) params.department_id = department_id;

    return this.http.get(`${this.baseUrl}/search`, { params });
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