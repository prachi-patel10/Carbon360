import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../enviorments/environment';

export interface FilterOption {
  id:    string;
  value: string;
}

@Injectable({
  providedIn: 'root',
})
export class SiteLocationMasterService {

  private baseUrl = `${environment.apiBaseUrl}/SiteLocation`;

  constructor(private http: HttpClient) {}

  // ================= GET ALL =================
  getAll(): Observable<any> {
    return this.http.get(`${this.baseUrl}/all`);
  }

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

  // ================= TOGGLE STATUS =================
  toggleStatus(id: string, isActive: boolean): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/${id}/toggle-status`,
      null,
      { params: { isActive: isActive } }
    );
  }

  // ================= SEARCH =================
  search(paramsObj: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(paramsObj).forEach(key => {
      const val = paramsObj[key];
      if (val !== null && val !== undefined && val !== '') {
        // Convert arrays to comma-separated string
        if (Array.isArray(val)) {
          if (val.length > 0)
            params = params.set(key, val.join(','));
        } else {
          params = params.set(key, val);
        }
      }
    });
    return this.http.get(`${this.baseUrl}/search`, { params });
  }

  // ================= FILTER OPTIONS =================
  // Builds SiteName + City filter lists from getAll() — no extra endpoint needed
  getFilterOptions(): Observable<{ siteNames: FilterOption[]; cities: FilterOption[] }> {
    return this.getAll().pipe(
      map((res: any) => {
        const list: any[] = Array.isArray(res) ? res : (res.data ?? res);

        // Distinct site names
        const siteNames: FilterOption[] = Array.from(
          new Map(
            list
              .filter(v => v.siteName && v.siteName !== 'N/A')
              .map(v => [v.siteName, { id: v.siteName, value: v.siteName }])
          ).values()
        ).sort((a, b) => a.value.localeCompare(b.value));

        // Distinct cities
        const cities: FilterOption[] = Array.from(
          new Map(
            list
              .filter(v => v.city && v.city !== 'N/A')
              .map(v => [v.city, { id: v.city, value: v.city }])
          ).values()
        ).sort((a, b) => a.value.localeCompare(b.value));

        return { siteNames, cities };
      })
    );
  }
}