import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SiteLocationMasterService {
   private baseUrl = 'http://localhost:5236/api/SiteLocation'; // change if needed

  constructor(private http: HttpClient) {}

  // ================= CREATE =================
  create(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}`, data);
  }

  // ================= UPDATE =================
  update(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, data);
  }

  // ================= DELETE =================
  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  // // ================= TOGGLE STATUS =================
  // toggleStatus(id: string, isActive: boolean): Observable<any> {
  //   const formData = new FormData();
  //   formData.append('siteId', id);
  //   formData.append('isActive', isActive.toString());

  //   return this.http.patch(`${this.baseUrl}/toggle-status`, formData);
  // }

  // ================= TOGGLE STATUS =================
  toggleStatus(id: string, isActive: boolean): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/${id}/toggle-status`,
      null,
      {
        params: { isActive: isActive }
      }
    );
  }

  // ================= SEARCH =================
  search(paramsObj: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(paramsObj).forEach(key => {
      if (paramsObj[key] !== null && paramsObj[key] !== undefined) {
        params = params.set(key, paramsObj[key]);
      }
    });
    return this.http.get(`${this.baseUrl}/search`, { params });
  }

  // ================= ADVANCED SEARCH =================
  advancedSearch(filter: any, pageNumber: number, pageSize: number): Observable<any> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    Object.keys(filter).forEach(key => {
      if (filter[key] !== null && filter[key] !== undefined && filter[key] !== '') {
        params = params.set(key, filter[key]);
      }
    });

    return this.http.get(`${this.baseUrl}/advanced-search`, { params });
  }
}