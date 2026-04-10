import { Injectable } from '@angular/core';
import { environment } from '../../../enviorments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface MasterTree {
  TreeId: string;
  TreeName: string;
  Co2AbsorptionPerYear: number;
 Co2AbsorptionPerMonth: number;
Co2AbsorptionPerDaily: number;
  IsActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class MasterTreeService {

  private apiUrl = `${environment.apiBaseUrl}/Tree`;

  constructor(private http: HttpClient) {}

  // ✅ GET PAGED (IMPORTANT - same as Department)
 getPaged(
  pageNumber: number,
  pageSize: number,
  search: string = '',
  onlyActive?: boolean,
  sortColumn: string = 'TreeName',
  sortDirection: string = 'asc'
) {
  let params = new HttpParams()
    .set('pageNumber', pageNumber)
    .set('pageSize', pageSize)
    .set('sortColumn', sortColumn)
    .set('sortDirection', sortDirection);

  // ✅ FIX HERE (MATCH BACKEND)
  if (search && search.trim() !== '') {
    params = params.set('searchText', search);
  }

  if (onlyActive !== undefined) {
    params = params.set('isActive', onlyActive);
  }

  return this.http.get<any>(`${this.apiUrl}/Search`, { params });
}

  // ✅ CREATE
  create(data: MasterTree) {
    return this.http.post(`${this.apiUrl}/Create`,  data, {
    responseType: 'text' 
  });
  }

  // ✅ UPDATE
  update(data: MasterTree) {
    return this.http.put(`${this.apiUrl}/Update`,  data, {
    responseType: 'text' 
  });
  }

  // ✅ DELETE
  delete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`, {
    responseType: 'text'   // ✅ FIX
  });
  }

  // ✅ TOGGLE ACTIVE
  toggleActive(id: string) {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-status`, {});
  }
}