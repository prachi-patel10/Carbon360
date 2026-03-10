import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../enviorments/environment';

@Injectable({
  providedIn: 'root',
})
export class CityService {
  
  private apiUrl = `${environment.apiBaseUrl}/City`;

  constructor(private http: HttpClient) {}

  // ================= GET ALL =================
  getAll() {
    return this.http.get<any>(`${this.apiUrl}/All`);
  }

  // ================= CREATE =================
  create(data: any) {
    const payload = {
      cityName: data.cityName,
      stateName: data.stateName,
      shortCode:data.shortCode
    };

    return this.http.post(`${this.apiUrl}`, payload);
  }

  // ================= UPDATE =================
  update(data: any) {
    const payload = {
      cityId: data.cityId,
      cityName: data.cityName,
      stateName: data.stateName,
      shortCode:data.shortCode
    };

    return this.http.put(`${this.apiUrl}/UpdateCity`, payload);
  }

  // ================= DELETE =================
  delete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // ================= TOGGLE STATUS =================
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

    if (search)
      params = params.set('searchText', search);

    if (onlyActive === true)
      params = params.set('isActive', 'true');

    return this.http.get<any>(`${this.apiUrl}/Search`, { params });
  }
}
