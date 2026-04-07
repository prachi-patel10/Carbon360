import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../enviorments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  private apiUrl = `${environment.apiBaseUrl}/OffsetEntry`;

  constructor(private http: HttpClient) {}

  getProjectsByYear(year: number) {
    return this.http.get(`${environment.apiBaseUrl}/PlantationProject/by-year?year=${year}`);
  }

  getTreeMaster() {
    return this.http.get(`${environment.apiBaseUrl}/Tree/Search?pageNumber=1&pageSize=50&sortColumn=TreeName&sortDirection=ASC`);
  }

  getEntries(pageNumber: number, pageSize: number, search: string) {
    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize)
      .set('search', search || '');

    return this.http.get(`${this.apiUrl}/list`, { params });
  }

  saveOffsetEntry(payload: any) {
    return this.http.post(`${this.apiUrl}/insert`, payload);
  }
}