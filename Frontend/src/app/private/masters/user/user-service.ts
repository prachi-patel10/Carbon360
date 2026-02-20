import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { enviornment } from '../../../enviorments/enviornment';

// export interface MasterUser {
//   UserId: number;
//   fname: string;
//   Lname: string;
//   UserName: string;
//   Email: string;
//   DepartmentId: number;
//   DepartmentName?: string;
//   RoleIds: number[];
//   RoleNames?: string;
//   IsActive: boolean;
//   IsDeleted: boolean;
//   EntryBy?: string;
//   UpdateBy?: string;
//   EntryDate?: string;
//   UpdateDate?: string;
// }

export interface MasterUser {
  UserId: string;
  Fname: string;
  Lname: string;
  UserName: string;
  Email: string;
  DepartmentId: number | null;
  DepartmentName?: string;
  RoleIds: number[];
  RoleNames?: string;
  IsActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserService {

  // ✅ Using environment
  private apiUrl = `${enviornment.apiBaseUrl}/User`;

  constructor(private http: HttpClient) { }

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
  delete(id: string) {
  return this.http.delete(`${this.apiUrl}/Delete/${id}`);
}

  /* ================= PAGINATION ================= */
  getPaged(
    pageNumber: number,
    pageSize: number,
    searchText?: string,
    onlyActive?: boolean,
    sortColumn?: string,
    sortDirection?: string
  ) {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (searchText)
      params = params.set('searchText', searchText);

    if (onlyActive !== undefined && onlyActive !== null)
      params = params.set('isActive', onlyActive);

    if (sortColumn)
      params = params.set('sortColumn', sortColumn);

    if (sortDirection)
      params = params.set('sortDirection', sortDirection);

    return this.http.get<any>(
      `${this.apiUrl}/Search`,
      { headers, params }
    );
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

  updateStatus(userId: string, isActive: boolean) {

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.patch(
      `${this.apiUrl}/Status`,
      { userId: userId, isActive: isActive },
      { headers }
    );
  }
}
