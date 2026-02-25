import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../enviorments/environment';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  
  private baseUrl = environment.apiBaseUrl;
  constructor(private http : HttpClient,){

  }

  loginUser(loginData: any) {
    return this.http.post(`${this.baseUrl}/Login`, loginData);
  }
}
