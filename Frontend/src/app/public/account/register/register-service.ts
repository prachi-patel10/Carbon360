import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../enviorments/environment';
@Injectable({
  providedIn: 'root',
})
export class RegisterService {

  private baseUrl = environment.apiBaseUrl;
  constructor(private http:HttpClient){

  }

  registerUser(userData: any) {
    return this.http.post(`${this.baseUrl}/User/Create`, userData);
  }


  getAllRoles() {
    return this.http.get(`${this.baseUrl}/Role/All`, this.getHeaders());
  }

  getAllDepartments() {
  return this.http.get(`${this.baseUrl}/Department/All`, this.getHeaders());
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
