import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../enviorments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  private apiUrl = `${environment.apiBaseUrl}/AbsorptionEntry`;

  constructor(private http: HttpClient) {}

  // ✅ PROJECT DROPDOWN
  getProjectsByYear(year: number) {
    return this.http.get(`${this.apiUrl}/projects?year=${year}`);
  }

  // ✅ SEARCH API (IMPORTANT)
  getEntries(
    year: number,
    projectId: number,
    pageNumber: number,
    pageSize: number,
    search: string,
    sortColumn: string,
    sortDirection: string
  ) {
    let params = new HttpParams()
      .set('FinancialYear', year)
      .set('ProjectId', projectId || '')
      .set('PageNumber', pageNumber)
      .set('PageSize', pageSize)
      .set('Search', search || '')
      .set('SortColumn', sortColumn)
      .set('SortDirection', sortDirection);

    return this.http.get(`${this.apiUrl}/entries`, { params });
  }

  // ✅ INSERT
  saveEntry(payload: any) {
    return this.http.post(`${this.apiUrl}/save`, payload);
  }
}