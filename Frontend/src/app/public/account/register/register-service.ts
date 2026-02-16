import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { enviornment } from '../../../enviorments/enviornment';
@Injectable({
  providedIn: 'root',
})
export class RegisterService {

  private baseUrl = enviornment.apiBaseUrl;
  constructor(private http:HttpClient){

  }

  registerUser(userData: any) {
    return this.http.post(`${this.baseUrl}/User/Create`, userData);
  }


  getAllRoles() {
    return this.http.get(`${this.baseUrl}/Role/All`, this.getHeaders());
  }


  private getHeaders() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      })
    }
  }
}
