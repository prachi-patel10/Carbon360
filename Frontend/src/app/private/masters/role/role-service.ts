import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviorments/environment'; // 👈 import this

export interface MasterRole {
  RoleId: number;
  roleName: string;
  roleDescription: string;
  IsActive: boolean;
  IsDeleted: boolean;
  EntryBy?: string;
  UpdateBy?: string;
  EntryDate?: string;
  UpdateDate?: string;
}

@Injectable({ providedIn: 'root' })
export class RoleService {

  // ✅ Now using environment
  private apiUrl = `${environment.apiBaseUrl}/Role`;

  constructor(private http: HttpClient) {}

getAll() {
  return this.http.get<any>(`${this.apiUrl}/All`);
}
  search(searchText: string): Observable<MasterRole[]> {
    const params = new HttpParams().set('q', searchText);
    return this.http.get<MasterRole[]>(`${this.apiUrl}/search`, { params });
  }

  create(data: MasterRole) {
    return this.http.post(this.apiUrl, data);
  }

  update(payload: any) {
    return this.http.put(`${this.apiUrl}/${payload.RoleId}`, payload);
  }

  delete(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getPaged(
    pageNumber: number,
    requestedRecords: number,
    search: string,
    onlyActive?: boolean | null,
    sortColumn?: string,
    sortDirection?: string
  ) {
    let params = new HttpParams()
      .set('page', pageNumber.toString())
      .set('pageSize', requestedRecords.toString());

    if (search) params = params.set('search', search);
    if (onlyActive === true) params = params.set('isActive', 'true');
    if (sortColumn) params = params.set('sortColumn', sortColumn);
    if (sortDirection) params = params.set('sortDirection', sortDirection);

    return this.http.get<any>(`${this.apiUrl}/search`, { params });
  }


  toggleActive(id: number) {
    return this.http.put(`${this.apiUrl}/toggle/${id}`, {});
  }

  getRoles(): Observable<any[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<any[]>(this.apiUrl, { headers });
  }
}