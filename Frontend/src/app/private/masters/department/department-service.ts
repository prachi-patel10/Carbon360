import { Injectable } from '@angular/core';
import { enviornment } from '../../../enviorments/enviornment';
import { HttpClient, HttpParams } from '@angular/common/http';


export interface MasterDepartment {
  DepartmentId: number;
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
  delete(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  toggleActive(id: number) {
    return this.http.put(`${this.apiUrl}/toggle/${id}`, {});
  }

  getPaged(
    pageNumber: number,
    requestedRecords: number,
    search: string,
    onlyActive?: boolean | null
  ) {
    let params = new HttpParams()
      .set('page', pageNumber.toString())
      .set('pageSize', requestedRecords.toString());

    if (search) params = params.set('search', search);
    if (onlyActive === true) params = params.set('isActive', 'true');

    return this.http.get<any>(`${this.apiUrl}/search`, { params });
  }
}
