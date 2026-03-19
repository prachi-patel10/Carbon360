import { Injectable } from '@angular/core';
import { SearchVehcileService } from '../fleet-transport/search-vehicle/search-vehcile-service';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../enviorments/environment';

@Injectable({
  providedIn: 'root',
})
export class ExcelService {

  private apiUrl = `${environment.apiBaseUrl}/VehicleTripEmission`;

  constructor(
    private vehicleService: SearchVehcileService,
    private http: HttpClient   // ✅ ADD THIS
  ) {}

  getTrips(
    pageNumber: number,
    pageSize: number,
    sortColumn: string,
    sortDirection: string
  ): Observable<any> {
    return this.vehicleService.searchTrips(
      pageNumber,
      pageSize,
      sortColumn,
      sortDirection
    );
  }

  exportExcel(params: any) {
  return this.http.get(`${this.apiUrl}/export-excel`, {
    params,
    responseType: 'blob'
  });
}
}