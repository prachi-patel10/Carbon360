import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../enviorments/environment';

@Injectable({
  providedIn: 'root',
})
export class FinalformService {
  private apiUrl = `${environment.apiBaseUrl}/Finalform`;

  constructor(private http: HttpClient) {}

  getProjects() {
    return this.http.get<any[]>(`${this.apiUrl}/projects`);
  }

  getTrees() {
    return this.http.get<any[]>(`${this.apiUrl}/trees`);
  }

  getPlannedSummary(year: string, projectId: number) {
    return this.http.get<any>(`${this.apiUrl}/planner-summary?year=${year}&projectId=${projectId}`);
  }

  saveEntry(data: any) {
    return this.http.post(`${this.apiUrl}/final-entry`, data);
  }
  
}
