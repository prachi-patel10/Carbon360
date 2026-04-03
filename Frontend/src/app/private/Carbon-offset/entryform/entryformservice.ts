import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  private api = 'https://your-api-url/api/report';

  constructor(private http: HttpClient) {}

  // Get projects based on year
  getProjectsByYear(year: number) {
    return this.http.get(`${this.api}/projects?year=${year}`);
  }

  // Get tree + emission + summary data
  getReportData(year: number, projectId: string) {
    return this.http.get(`${this.api}/data?year=${year}&projectId=${projectId}`);
  }

  // Save entry
  saveEntry(data: any) {
    return this.http.post(`${this.api}/save`, data);
  }
}