import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface GeneratorOp {
  id: string;          // operationId
  name: string;        // generatorName
  opDate: string;      // operationDate
  runHours: number;
  loadFactor: number;
  fuelConsumed: number;
  totalCO2: number;
  totalNO2: number;
  totalCH4: number;
  totalEmission: number;
  status: number;      // statusId from backend
  fuelType: string;
}

export interface GeneratorOpResponse {
  records: GeneratorOp[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class GeneratorOperationService {
  // private baseUrl = '/api/GeneratorOperation';
  private baseUrl = 'http://localhost:5236/api/GeneratorOperation';

  constructor(private http: HttpClient) { }

  fetchOperations(
    page: number = 1,
    limit: number = 10,
    name: string = '',
    fuelType: string = '',
    status: string = ''
  ): Observable<GeneratorOpResponse> {

    let statusId = '';
    if (status === 'Reported') statusId = '1';
    if (status === 'Approved') statusId = '2';
    if (status === 'Rejected') statusId = '3';

    const params = new HttpParams()
      .set('pageNumber', page.toString())
      .set('pageSize', limit.toString())
      .set('search', name)
      .set('fuelType', fuelType)
      .set('statusId', statusId);

    return this.http.get<any>(`${this.baseUrl}/search`, { params }).pipe(
      map(res => ({
        // Notice the capital "Records" from backend
        records: res.data.records.map((r: any) => ({
          id: r.operationId,
          name: r.generatorName,
          opDate: r.operationDate,
          runHours: r.runHours,
          loadFactor: r.loadFactor,
          fuelConsumed: r.fuelConsumedLiters,
          totalCO2: r.totalCO2,
          totalNO2: r.totalNO2,
          totalCH4: r.totalCH4,
          totalEmission: r.totalEmission,
          status: r.statusId,
          fuelType: r.fuelType
        })),
        totalRecords: res.data.TotalRecords,
        pageNumber: res.data.PageNumber,
        pageSize: res.data.PageSize
      }))
    );
  }

  updateStatus(id: string, statusId: number): Observable<boolean> {
    return this.http.patch<boolean>(`${this.baseUrl}/status/${id}`, { statusId });
  }
}