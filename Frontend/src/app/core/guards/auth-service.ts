import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private baseUrl = 'http://localhost:5236/api/';

  constructor(private http: HttpClient) {}

  /* ================= LOGIN ================= */

  login(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}Login`, data);
  }

  /* ================= SWITCH ROLE ================= */

  switchRole(selectedRole: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}SwitchRole`, {
      selectedRole: selectedRole
    });
  }

  /* ================= STORE USER ================= */

  setUserData(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', user.token);
  }

  getLoggedInUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  getToken() {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  logout() {
    localStorage.clear();
  }
}