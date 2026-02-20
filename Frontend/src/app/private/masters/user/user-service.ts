import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { enviornment } from '../../../enviorments/enviornment';

export interface MasterUser {
  UserId: number;
  fname: string;
  Lname: string;
  UserName: string;
  Email: string;
  DepartmentId: number;
  DepartmentName?: string;
  RoleIds: number[];
  RoleNames?: string;
  IsActive: boolean;
  IsDeleted: boolean;
  EntryBy?: string;
  UpdateBy?: string;
  EntryDate?: string;
  UpdateDate?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {

  // ✅ Using environment
  private apiUrl = `${enviornment.apiBaseUrl}/User`;

  constructor(private http: HttpClient) {}

  /* ================= GET ALL ================= */
 getAll() {
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`
  });
  return this.http.get<any[]>(`${this.apiUrl}/All`, { headers });
}


  /* ================= SEARCH ================= */
  search(searchText: string): Observable<MasterUser[]> {
    const params = new HttpParams().set('q', searchText);
    return this.http.get<MasterUser[]>(`${this.apiUrl}/search`, { params });
  }

  /* ================= CREATE ================= */
create(data: any) {
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  return this.http.post(`${this.apiUrl}/Create`, data, { headers });
}
  /* ================= UPDATE ================= */
  update(payload: any) {
    return this.http.put(`${this.apiUrl}/Update`, payload);
  }

  /* ================= DELETE ================= */
  delete(id: number) {
    return this.http.delete(`${this.apiUrl}/Delete/${id}`);
  }

  /* ================= PAGINATION ================= */
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

    if (search)
      params = params.set('search', search);

    if (onlyActive === true)
      params = params.set('isActive', 'true');

    if (sortColumn)
      params = params.set('sortColumn', sortColumn);

    if (sortDirection)
      params = params.set('sortDirection', sortDirection);

    return this.http.get<any>(`${this.apiUrl}/search`, { params });
  }

  /* ================= TOGGLE ACTIVE ================= */
  toggleActive(id: number) {
    return this.http.put(`${this.apiUrl}/toggle/${id}`, {});
  }

  /* ================= LOAD DEPARTMENTS ================= */
  getDepartments(): Observable<any[]> {
  const token = localStorage.getItem('token');

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  return this.http.get<any[]>(`${enviornment.apiBaseUrl}/Department/All`, { headers });
}

  /* ================= LOAD ROLES ================= */
  getRoles(): Observable<any[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<any[]>(
      `${enviornment.apiBaseUrl}/Role/All`,
      { headers }
    );
  }
}
