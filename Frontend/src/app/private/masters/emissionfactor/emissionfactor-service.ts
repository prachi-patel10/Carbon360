import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../enviorments/environment';

export interface CB_EmissionFactor {
  EmissionFactorId: string;
  FuelType: string;
  CO2_Factor_KgPerL: number;
  NO2_Factor_KgPerKm: number;
  CH4_Factor_KgPerKm: number;
  IsActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class EmissionFactorService {

  private apiUrl = `${environment.apiBaseUrl}/EmissionFactor`;

  constructor(private http: HttpClient) {}

  getList() {
    return this.http.get<any>(`${this.apiUrl}/List`);
  }

  create(data: any) {
    return this.http.post(`${this.apiUrl}/Create`, data);
  }

  update(data: any) {
    return this.http.put(`${this.apiUrl}/${data.EmissionFactorId}`, data);
  }

  delete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  toggleActive(id: string, isActive: boolean) {
    return this.http.patch(`${this.apiUrl}/${id}/status?isActive=${isActive}`, {});
  }

  getFuels() {
  return this.http.get<any>(`${environment.apiBaseUrl}/Fuel/All`);
}
}