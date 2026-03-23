import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../enviorments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeneratorecService {

  private apiUrl = `${environment.apiBaseUrl}/GeneratorOperation`;

  constructor(private http: HttpClient) { }

  // ================= GET ALL OPERATIONS =================
  getAll(): Observable<any> {
    return this.http.get(`${this.apiUrl}/All`);
  }

  // ================= GET OPERATION BY ID =================
  getById(id: string) {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  // ================= CREATE =================
  create(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, data);
  }

  // ================= UPDATE =================
  update(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${id}`, data);
  }

  // ================= DELETE =================
  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // ================= GET ALL GENERATORS =================
  getGenerators(): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/generator`);
  }

  getGeneratorsBySite(siteId: string): Observable<any> {
    return this.http.get(`http://localhost:5236/api/generator/site/${siteId}`);
  }
  // ================= GET ALL SITES =================
  getSites(): Observable<any> {
    return this.http.get(`http://localhost:5236/api/SiteLocation/all`);
  }

  getFuels(): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/Fuel/All`);
  }

  updateStatus(id: string, workflowId: number) {
  return this.http.patch(`${this.apiUrl}/status/${id}?workflowId=${workflowId}`, null,
    { responseType: 'text' }
  );
}

  // GET workflow actions for a specific operation
  getWorkflowActions(operationId: string) {
  return this.http.get(`${this.apiUrl}/${operationId}/actions`);
}

downloadTripPdf(operationId: string) {
    return this.http.get(`${this.apiUrl}/generate-pdf/${operationId}`, {
      responseType: 'blob'  
    });
  }

  getTripFullDetails(operationId: string): Observable<any> {
  return this.http.get(`${this.apiUrl}/pdf/${operationId}`);
}
}