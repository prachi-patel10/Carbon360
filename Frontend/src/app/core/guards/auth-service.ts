import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  getLoggedInUser() {
    const fullName = localStorage.getItem('loggedUserName');
    const role = localStorage.getItem('roleName');
    if (fullName && role) {
      return { name: fullName, roleName: role };
    }
    return null;
  }

  isLoggedIn() {
    return !!localStorage.getItem('token');
  }
}
