import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../enviorments/environment';
import { timeout } from 'rxjs/operators';   
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
   // ✅ Add these two:
    forgotPassword(email: string) {
    return this.http.post(`${this.baseUrl}/forgot-password`, { email })
      .pipe(timeout(5000));                        // ✅ fail fast after 5 seconds
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post(`${this.baseUrl}/reset-password`, { token, newPassword });
  }
}
