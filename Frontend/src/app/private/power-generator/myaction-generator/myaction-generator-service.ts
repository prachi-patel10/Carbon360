import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface GeneratorOp {
  operationId: string;
  reportId?: string;
  generatorId: string;
  generatorName: string;
  fuelType: string;
  entryDate: string;
  runHours: number;
  loadFactor: number;
  fuelConsumedLiters: number; 
  totalEmission: number;
   statusId: number; 
  status: number;
   blink:number;
}

export interface GeneratorOpResponse {
  records: GeneratorOp[];
  totalRecords: number;
}

@Injectable({ providedIn: 'root' })
export class GeneratorOperationService {

  private baseUrl = 'http://localhost:5236/api/GeneratorOperation';

  constructor(private http: HttpClient) { }

  //   fetchOperations(
  //     page: number = 1,
  //     limit: number = 10,
  //     name: string = '',
  //     fuelType: string = '',
  //     status: string = ''
  //   ): Observable<GeneratorOpResponse> {

  //     let statusId = '';
  //     if (status === 'Reported') statusId = '1';
  //     if (status === 'Approved') statusId = '2';
  //     if (status === 'Rejected') statusId = '3';

  //     const params = new HttpParams()
  //       .set('pageNumber', page)
  //       .set('pageSize', limit)
  //       .set('search', name)
  //       .set('fuelType', fuelType)
  //       .set('statusId', statusId);

  //     return this.http.get<any>(`${this.baseUrl}/search`, { params }).pipe(
  //       map(res => ({
  //         records: res.data.records.map((r: any) => ({
  //           operationId: r.operationId,
  //           generatorId: r.generatorId,
  //           generatorName: r.generatorName,
  //           fuelType: r.fuelType,
  //           opDate: r.operationDate,
  //           runHours: r.runHours,
  //           loadFactor: r.loadFactor,
  //           fuelConsumed: r.fuelConsumedLiters,
  //           totalEmission: r.totalEmission,
  //          status: Number(r.statusId)
  //         })),
  //         totalRecords: res.data.totalRecords
  //       }))
  //     );
  //   }

  //   getById(id:string){
  //   return this.http.get<any>(`${this.baseUrl}/GetById/${id}`)
  // }

  //  updateStatus(id: string, statusId: number): Observable<any> {

  //   const params = new HttpParams().set('statusId', statusId);

  //   return this.http.patch(
  //     `${this.baseUrl}/status/${id}`,
  //     null,
  //     { params }
  //   );

  // }

  fetchOperations(
    page: number = 1,
    limit: number = 10,
    name: string = '',
    fuelType: string = '',
    status: string = ''
  ): Observable<GeneratorOpResponse> {

    let statusId = '';
    if (status === 'Reported') statusId = '1';   // DB ID for Reported
    if (status === 'Approved') statusId = '2';   // DB ID for Approved
    if (status === 'Rejected') statusId = '3';   // DB ID for Rejected

    const params = new HttpParams()
      .set('pageNumber', page)
      .set('pageSize', limit)
      .set('search', name)
      .set('fuelType', fuelType)
      .set('statusId', statusId);

    return this.http.get<any>(`${this.baseUrl}/search`, { params }).pipe(
      map(res => ({
        records: res.data.records.map((r: any) => ({
          operationId: r.operationId,
          generatorId: r.generatorId,
          generatorName: r.generatorName,
          fuelType: r.fuelType,
          entryDate: r.entryDate,
          runHours: r.runHours,
          loadFactor: r.loadFactor,
          fuelConsumedLiters: r.fuelConsumedLiters,
          totalEmission: r.totalEmission,
          status: Number(r.statusId) // Must match backend DB
        })),
        totalRecords: res.data.totalRecords
      }))
    );
  }

  getById(id: string) {
    return this.http.get<any>(`${this.baseUrl}/GetById/${id}`);
  }

  updateStatus(id: string, statusId: number): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/status/${id}`,
      {},
      { params: new HttpParams().set('statusId', statusId.toString()) }
    );
  }

  // Add this method inside GeneratorOperationService
getAllGenerators(): Observable<GeneratorOp[]> {
  return this.http.get<GeneratorOp[]>(`${this.baseUrl}/allgenerator`);
}

getMyActions(
  pageNumber: number = 1,
  pageSize: number = 10,
  sortColumn: string = 'EntryDate',
  sortDirection: string = 'DESC'
): Observable<{ records: GeneratorOp[], totalRecords: number }> {
  return this.http.get<any>(
    `${this.baseUrl}/myactions?pageNumber=${pageNumber}&pageSize=${pageSize}&sortColumn=${sortColumn}&sortDirection=${sortDirection}`
  ).pipe(
    map(res => {
      const data = res.data ?? res; // handle both wrapped and unwrapped
      const records = (data.records ?? data).map((r: any) => ({
        ...r,
        status: Number(r.statusId), // map statusId → status for HTML
        blink: r.blinkFlag === 1
      }));
      return {
        records,
        totalRecords: data.totalRecords ?? records.length
      };
    })
  );
}


}
