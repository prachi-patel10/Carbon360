import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviorments/environment';

@Injectable({ providedIn: 'root' })
export class SearchVehcileService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  searchTrips(
  page: number, pageSize: number,
  sortColumn: string, sortDirection: string,
  search?: string,
  fuelTypes?: string[],
  vehicleTypes?: string[],
  city?: string,              // ADD
  opStart?: string, opEnd?: string,
  entryStart?: string, entryEnd?: string
) {
  let params = new HttpParams()
    .set('pageNumber', page)
    .set('pageSize', pageSize)
    .set('sortColumn', sortColumn)
    .set('sortDirection', sortDirection);

  if (search)     params = params.set('search',    search);
  if (city)       params = params.set('city',      city);   
  if (opStart)    params = params.set('startDate', opStart);
  if (opEnd)      params = params.set('endDate',   opEnd);
  if (entryStart) params = params.set('entryStart', entryStart);
  if (entryEnd)   params = params.set('entryEnd',   entryEnd);

  fuelTypes?.forEach((f: string)    => params = params.append('fuelType',    f));
  vehicleTypes?.forEach((v: string) => params = params.append('vehicleType', v));

  return this.http.get(`${this.base}/VehicleTripEmission/search`, { params });
}
  exportExcel(
    search?: string,
    fuelTypes?: string[],
    vehicleTypes?: string[],
    startDate?: string,
    endDate?: string,
    entryStartDate?: string,
    entryEndDate?: string,
    sortColumn?: string,
    sortDirection?: string
  ): Observable<Blob> {
    let params = new HttpParams();

    if (search)        params = params.set('search',        search);
    if (sortColumn)    params = params.set('sortColumn',    sortColumn);
    if (sortDirection) params = params.set('sortDirection', sortDirection);

    if (fuelTypes?.length) {
      fuelTypes.forEach(f => { params = params.append('fuelType', f); });
    }

    if (vehicleTypes?.length) {
      vehicleTypes.forEach(v => { params = params.append('vehicleType', v); });
    }

    if (startDate)      params = params.set('startDate',      startDate);
    if (endDate)        params = params.set('endDate',        endDate);
    if (entryStartDate) params = params.set('entryStartDate', entryStartDate);
    if (entryEndDate)   params = params.set('entryEndDate',   entryEndDate);

    return this.http.get(
      `${this.base}/VehicleTripEmission/export-excel`,
      { params, responseType: 'blob' }
    );
  }
}