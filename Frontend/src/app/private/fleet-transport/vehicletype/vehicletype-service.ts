import { Injectable } from '@angular/core';
import { environment } from '../../../enviorments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface VehicleType {
  vehicle_type_id: string;
  vehicle_type_name: string;
  categoryName: string;
  description?: string;
  isActive: boolean;
  entryBy?: number;
}


@Injectable({
  providedIn: 'root',
})
export class VehicletypeService {

    private apiUrl = `${environment.apiBaseUrl}/VehicleType`;

  constructor(private http: HttpClient) {}

  // ================= GET ALL =================
  getAll() {
    return this.http.get<any>(`${this.apiUrl}/All`);
  }

  // ================= CREATE =================
  create(data: any) {
    const payload = {
      vehicle_type_name: data.vehicle_type_name,
      categoryId: data.categoryId,
      description: data.description
    };

    return this.http.post(`${this.apiUrl}/Create`, payload);
  }

  // ================= UPDATE =================
  update(data: any) {
    const payload = {
      vehicle_type_id: data.vehicle_type_id,
      vehicle_type_name: data.vehicle_type_name,
      categoryId: data.categoryId,
      description: data.description
    };

    return this.http.put(`${this.apiUrl}/Update`, payload);
  }

  // ================= DELETE =================
  delete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // ================= TOGGLE =================
  toggleActive(id: string) {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-status`, {});
  }

  // ================= SEARCH + PAGINATION =================
  getPaged(
    pageNumber: number,
    pageSize: number,
    search: string = '',
    onlyActive?: boolean
  ) {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (search) params = params.set('searchText', search);
    if (onlyActive) params = params.set('isActive', 'true');

    return this.http.get<any>(`${this.apiUrl}/Search`, { params });
  }
  
}