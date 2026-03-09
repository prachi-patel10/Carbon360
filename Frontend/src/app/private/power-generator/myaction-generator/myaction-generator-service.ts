import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GeneratorOp {
  id: number;
  name: string;
  opDate: string;
  runHours: number;
  loadFactor: number;
  fuelConsumed: number;
  totalCO2: number;
  totalNO2: number;
  totalCH4: number;
  totalEmission: number;
  status: 'Reported' | 'Approved' | 'Rejected';
  fuelType: string;
}

export interface GeneratorOpResponse {
  data: GeneratorOp[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeneratorOperationService {
  private baseUrl = '/api/GeneratorOperation';

  constructor(private http: HttpClient) {}

  // Fetch data with filters, pagination
  fetchOperations(
    page: number = 1,
    limit: number = 10,
    name: string = '',
    fuelType: string = '',
    status: string = ''
  ): Observable<GeneratorOpResponse> {
    let params = new HttpParams()
      .set('pageNumber', page.toString())
      .set('pageSize', limit.toString())
      .set('search', name)
      .set('fuelType', fuelType)
      .set('statusId', status); // Map to your backend (Reported=1, Approved=2, Rejected=3)

    return this.http.get<GeneratorOpResponse>(`${this.baseUrl}/search`, { params });
  }

  // Update status
  updateStatus(id: number, statusId: number): Observable<boolean> {
    return this.http.patch<boolean>(`${this.baseUrl}/status/${id}`, { statusId });
  }
}