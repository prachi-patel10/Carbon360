import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../enviorments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  private apiUrl = `${environment.apiBaseUrl}/PlantationProject`;

  constructor(private http: HttpClient) {}

  getPaged(
  pageNumber: number,
  pageSize: number,
  search: string = '',
  sortColumn: string = 'ProjectName',
  sortDirection: string = 'asc'
) {
  let params = new HttpParams()
    .set('PageNumber', pageNumber)
    .set('PageSize', pageSize)
    .set('SortColumn', sortColumn)
    .set('SortDirection', sortDirection);

  if (search && search.trim() !== '') {
  params = params.set('searchText', search); // ✅ FIXED
}

  return this.http.get<any>(`${this.apiUrl}/search`, { params });
}

  create(data: any) {
    return this.http.post(`${this.apiUrl}/insert`, data, { responseType: 'text' });
  }

  update(data: any) {
    return this.http.put(`${this.apiUrl}/update`, data, { responseType: 'text' });
  }

  delete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`, { responseType: 'text' });
  }

  toggleActive(id: string) {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-status`, {});
  }
}