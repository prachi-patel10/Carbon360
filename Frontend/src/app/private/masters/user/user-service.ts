import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviorments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {

  private apiUrl = `${environment.apiBaseUrl}/User`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /* ================= GET PAGED ================= */
 getPaged(
  pageNumber: number,
  pageSize: number,
  searchText?: string,
  onlyActive?: boolean,
  departmentIds?: string,
  roleIds?: string,
  sortColumn?: string,
  sortDirection?: string
) {
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

  let params = new HttpParams()
    .set('pageNumber', pageNumber)
    .set('pageSize', pageSize);

  if (searchText?.trim())   params = params.set('searchText',    searchText.trim());
  if (onlyActive !== undefined) params = params.set('isActive',  onlyActive);
  if (departmentIds && departmentIds !== 'undefined')params = params.set('departmentIds', departmentIds);
  if (roleIds && roleIds !== 'undefined')params = params.set('roleIds', roleIds);
  if (sortColumn)           params = params.set('sortColumn',    sortColumn);
  if (sortDirection)        params = params.set('sortDirection', sortDirection);

  return this.http.get<any>(`${this.apiUrl}/Search`, { headers, params });
}
  /* ================= CREATE ================= */
  create(data: any) {
    return this.http.post(
      `${this.apiUrl}/Create`,
      data,
      { headers: this.getAuthHeaders() }
    );
  }

  /* ================= UPDATE ================= */
  update(payload: any) {
    return this.http.put(
      `${this.apiUrl}/Update`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  /* ================= DELETE ================= */
  delete(id: string) {
    return this.http.delete(
      `${this.apiUrl}/Delete/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /* ================= UPDATE STATUS ================= */
  updateStatus(userId: string, isActive: boolean) {
    return this.http.patch(
      `${this.apiUrl}/Status`,
      { userId, isActive },
      { headers: this.getAuthHeaders() }
    );
  }

  /* ================= LOAD DEPARTMENTS ================= */
  getDepartments(): Observable<any> {
    return this.http.get(
      `${environment.apiBaseUrl}/Department/All`,
      { headers: this.getAuthHeaders() }
    );
  }

  /* ================= LOAD ROLES ================= */
  getRoles(): Observable<any> {
    return this.http.get(
      `${environment.apiBaseUrl}/Role/All`,
      { headers: this.getAuthHeaders() }
    );
  }
}