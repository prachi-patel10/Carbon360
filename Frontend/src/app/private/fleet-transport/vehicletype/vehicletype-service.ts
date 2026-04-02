import { Injectable } from '@angular/core';
import { environment } from '../../../enviorments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';

export interface VehicleType {
  vehicle_type_id: string;
  vehicle_type_name: string;
  categoryName: string;
  description?: string;
  isActive: boolean;
  entryBy?: number;
}

export interface FilterOption {
  id: string;     // for category: "1","2","3"  | for vehicleName: same as value
  value: string;  // display label: "LDV","MDV","HDV" | "Bike","Bus" etc.
}

// Must match your DB: 1=LDV, 2=MDV, 3=HDV
const CATEGORY_MAP: Record<string, string> = {
  'LDV': '1',
  'MDV': '2',
  'HDV': '3'
};

@Injectable({ providedIn: 'root' })
export class VehicletypeService {

  private apiUrl = `${environment.apiBaseUrl}/VehicleType`;

  constructor(private http: HttpClient) {}

  // ================= GET ALL =================
  getAll() {
    return this.http.get<any>(`${this.apiUrl}/All`);
  }

  // ================= CREATE =================
  create(data: any) {
    const payload = {
      vehicle_type_name: data.vehicle_type_name,
      categoryId:        data.categoryId,
      description:       data.description
    };
    return this.http.post<any>(`${this.apiUrl}/Create`, payload);
  }

  // ================= UPDATE =================
  update(data: any) {
    const payload = {
      vehicle_type_id:   data.vehicle_type_id,
      vehicle_type_name: data.vehicle_type_name,
      categoryId:        data.categoryId,
      description:       data.description
    };
    return this.http.put<any>(`${this.apiUrl}/Update`, payload);
  }

  // ================= DELETE =================
  delete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`, { responseType: 'text' });
  }

  // ================= TOGGLE =================
  toggleActive(id: string) {
    return this.http.patch(
      `${this.apiUrl}/${id}/toggle-status`, {},
      { responseType: 'text' }
    );
  }

  // ================= SEARCH + PAGINATION =================
  getPaged(
    pageNumber:      number,
    pageSize:        number,
    search:          string   = '',
    onlyActive?:     boolean,
    sortColumn:      string   = 'vehicle_type_name',
    sortDirection:   string   = 'ASC',
    selectedCategoryIds?: string[],   // numeric IDs: ["1","2"]
    selectedVehicleNames?: string[]   // names: ["Bike","Bus"]
  ) {
    let params = new HttpParams()
      .set('pageNumber',    pageNumber.toString())
      .set('pageSize',      pageSize.toString())
      .set('sortColumn',    sortColumn)
      .set('sortDirection', sortDirection.toUpperCase());

    if (search)
      params = params.set('searchText', search);

    if (onlyActive !== undefined)
      params = params.set('isActive', onlyActive.toString());

    // Send numeric category IDs to SP  e.g. "1,2"
    if (selectedCategoryIds && selectedCategoryIds.length > 0)
      params = params.set('categoryIds', selectedCategoryIds.join(','));

    // Send vehicle names to SP  e.g. "Bike,Bus"
    if (selectedVehicleNames && selectedVehicleNames.length > 0)
      params = params.set('vehicleNames', selectedVehicleNames.join(','));

    return this.http.get<any>(`${this.apiUrl}/Search`, { params });
  }

  // ================= FILTER OPTIONS =================
  // Builds filter lists from getAll() — no extra endpoint needed
  getFilterOptions() {
    return this.getAll().pipe(
      map((res: any) => {
        const list: VehicleType[] = Array.isArray(res) ? res : (res.data ?? []);

        // Distinct vehicle type names
        const vehicleNames: FilterOption[] = Array.from(
          new Map(
            list.map(v => [
              v.vehicle_type_name,
              { id: v.vehicle_type_name, value: v.vehicle_type_name }
            ])
          ).values()
        ).sort((a, b) => a.value.localeCompare(b.value));

        // Distinct categories — id = numeric string from CATEGORY_MAP
        const categories: FilterOption[] = Array.from(
          new Map(
            list
              .filter(v => v.categoryName)
              .map(v => [
                v.categoryName,
                {
                  id:    CATEGORY_MAP[v.categoryName] ?? v.categoryName,
                  value: v.categoryName
                }
              ])
          ).values()
        ).sort((a, b) => a.value.localeCompare(b.value));

        return { vehicleNames, categories };
      })
    );
  }
}