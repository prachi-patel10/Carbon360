import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviorments/environment';

export interface PlantationProjectSearchResult {
  offsetEntryId: number;
  projectName: string;
  financialYear: string;
  totalOffset: number;
  status: string;
  entryDate: string;
  entryBy: string;
}

@Injectable({
  providedIn: 'root',
})
export class SearchPlantationProjectService {

  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

 search(
    page: number,
    pageSize: number,
    sortColumn: string,
    sortDirection: string,
    search?: string,
    financialYear?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('pageNumber',    page.toString())
      .set('pageSize',      pageSize.toString())
      .set('sortColumn',    sortColumn)
      .set('sortDirection', sortDirection);

    if (search)        params = params.set('search',        search);
    if (financialYear) params = params.set('financialYear', financialYear);

    return this.http.get(`${this.base}/OffsetEntry/search`, { params });
  }
}