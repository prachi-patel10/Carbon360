import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../enviorments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  private apiUrl = `${environment.apiBaseUrl}/OffsetEntry`;

  constructor(private http: HttpClient) {}

  getProjectsByYear(year: number) {
  return this.http.post<any>(
    `${environment.apiBaseUrl}/PlantationProject/get-by-year`,
    {
      financialYear: year.toString()   // ✅ must be string
    }
  );
}
// ✅ Save Draft API
saveDraft(payload: any) {
  return this.http.post(`${this.apiUrl}/save-draft`, payload);
}

  getTreeMaster() {
    return this.http.get(`${environment.apiBaseUrl}/Tree/Search?pageNumber=1&pageSize=50&sortColumn=TreeName&sortDirection=ASC`);
  }

 getEntries(page: number, pageSize: number, search: string = '', year?: number) {
  let params = new HttpParams()
    .set('page', page)
    .set('pageSize', pageSize)
    .set('search', search);

  if (year) {
    params = params.set('financialYear', year.toString());
  }

  return this.http.get<any>(`${this.apiUrl}/list`, { params });
}

  saveOffsetEntry(payload: any) {
    return this.http.post(`${this.apiUrl}/insert`, payload);
  }

getTreeDetails(treeId: string, treeCount: number) {
  return this.http.post<any>(
    `${environment.apiBaseUrl}/Tree/get-tree-details`,
    {
      treeId: treeId,     
      treeCount: treeCount 
    }
  );
}

}