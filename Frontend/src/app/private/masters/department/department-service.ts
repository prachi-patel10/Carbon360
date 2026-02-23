import { Injectable } from '@angular/core';
import { enviornment } from '../../../enviorments/enviornment';
import { HttpClient, HttpParams } from '@angular/common/http';


export interface MasterDepartment {
  DepartmentId: string;
  DepartmentName: string;
  // DepartmentDescription :string;
  IsActive: boolean;
  IsDeleted: boolean;
  EntryBy?: number;
  UpdateBy?: number;
  EntryDate?: string;
  UpdateDate?: string;
}

@Injectable({ providedIn: 'root' })
export class DepartmentService {

  private apiUrl = `${enviornment.apiBaseUrl}/Department`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<any>(`${this.apiUrl}/All`);
  }

  // create(data: MasterDepartment) {
  //   return this.http.post(this.apiUrl, data);
  // }

  // update(payload: MasterDepartment) {
  //   return this.http.put(`${this.apiUrl}/${payload.DepartmentId}`, payload);
  // }
create(data: MasterDepartment) {

  const payload = {
    id: data.DepartmentId,  // backend expects string
    departmentName: data.DepartmentName,
    isActive: data.IsActive
  };

  return this.http.post(this.apiUrl, payload);
}

update(data: MasterDepartment) {

  const payload = {
    id: data.DepartmentId,
    departmentName: data.DepartmentName,
    isActive: data.IsActive
  };

  return this.http.put(this.apiUrl, payload);
}
  delete(id: string) {
  return this.http.delete(`${this.apiUrl}/${id}`);
}

  toggleActive(id: string) {
  return this.http.patch(`${this.apiUrl}/${id}/toggle-status`, {});
}

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
