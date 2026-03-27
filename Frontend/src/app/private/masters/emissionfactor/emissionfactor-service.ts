import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../enviorments/environment';

export interface CB_EmissionFactor {
  EmissionFactorId: string;
  FuelType: string;
  CO2_Factor_KgPerL: number;
  NO2_Factor_KgPerL: number;
  CH4_Factor_KgPerL: number;
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

  const payload = {
     fuelId: data.FuelId,    // ✅ convert to number
    co2_Factor_KgPerL: data.CO2_Factor_KgPerL,
    no2_Factor_KgPerL: data.NO2_Factor_KgPerL,
    ch4_Factor_KgPerL: data.CH4_Factor_KgPerL
  };

  return this.http.post(`${this.apiUrl}/Create`, payload);
}

 update(id: string, data: any) {

  const payload = {
     fuelId: data.FuelId,    // ✅ convert
    co2_Factor_KgPerL: data.CO2_Factor_KgPerL,
    no2_Factor_KgPerL: data.NO2_Factor_KgPerL,
    ch4_Factor_KgPerL: data.CH4_Factor_KgPerL
  };

  return this.http.put(`${this.apiUrl}/${id}`, payload);
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