import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { enviornment } from '../../../enviorments/enviornment';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  
  private baseUrl = enviornment.apiBaseUrl;
  constructor(private http : HttpClient,){

  }

  loginUser(loginData: any) {
    return this.http.post(`${this.baseUrl}/Login`, loginData);
  }
}
