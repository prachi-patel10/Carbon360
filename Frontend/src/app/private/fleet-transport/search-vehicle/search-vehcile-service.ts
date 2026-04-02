// search-vehcile-service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviorments/environment';

@Injectable({ providedIn: 'root' })
export class SearchVehcileService {

  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  searchTrips(
    page:          number,
    pageSize:      number,
    sortColumn:    string,
    sortDirection: string,
    search?:       string,
    fuelTypes?:    string[],
    vehicleCategories?: string[],  
    vehicleTypes?: string[],       
    opStart?:      string,
    opEnd?:        string,
    entryStart?:   string,
    entryEnd?:     string
  ): Observable<any> {

    let params = new HttpParams()
      .set('page',          page.toString())
      .set('pageSize',      pageSize.toString())
      .set('sortColumn',    sortColumn)
      .set('sortDirection', sortDirection);

    if (search)     params = params.set('search',     search);
    if (opStart)    params = params.set('opStart',    opStart);
    if (opEnd)      params = params.set('opEnd',      opEnd);
    if (entryStart) params = params.set('entryStart', entryStart);
    if (entryEnd)   params = params.set('entryEnd',   entryEnd);

    fuelTypes?.forEach(f    => { params = params.append('fuelType',    f); });
    vehicleCategories?.forEach(c   => { params = params.append('vehicleCategory',   c); });
    vehicleTypes?.forEach(v => { params = params.append('vehicleType', v); });

    return this.http.get(`${this.base}/VehicleTripEmission/search`, { params });
  }

  exportExcel(
    search?:        string,
    fuelTypes?:     string[],
    vehicleCategories?:   string[],
    vehicleTypes?:  string[],
    opStart?:       string,
    opEnd?:         string,
    entryStart?:    string,
    entryEnd?:      string,
    sortColumn?:    string,
    sortDirection?: string
  ): Observable<Blob> {

    let params = new HttpParams();

    if (search)        params = params.set('search',        search);
    if (opStart)       params = params.set('opStart',       opStart);
    if (opEnd)         params = params.set('opEnd',         opEnd);
    if (entryStart)    params = params.set('entryStart',    entryStart);
    if (entryEnd)      params = params.set('entryEnd',      entryEnd);
    if (sortColumn)    params = params.set('sortColumn',    sortColumn);
    if (sortDirection) params = params.set('sortDirection', sortDirection);

    fuelTypes?.forEach(f    => { params = params.append('fuelType',    f); });
    vehicleCategories?.forEach(c  => { params = params.append('vehicleCategory',  c); });
    vehicleTypes?.forEach(v => { params = params.append('vehicleType', v); });

    return this.http.get(`${this.base}/VehicleTripEmission/export-excel`, {
      params,
      responseType: 'blob'
    });
  }
}