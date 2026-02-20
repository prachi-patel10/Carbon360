import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoginService } from './login-service';
import { ToastService } from '../../../core/toast/toastservice';
import { jwtDecode } from "jwt-decode";


@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {

  loginData: FormGroup = new FormGroup({
     Email: new FormControl('', Validators.required),
    Password: new FormControl('', Validators.required)
  });

  constructor(
    private _router: Router,
    private _userService: LoginService,
    private toastr: ToastService
  ) { }

 login() {
  if (this.loginData.invalid) {
    this.loginData.markAllAsTouched();
    return;
  }

  const loginObj = this.loginData.value;

  this._userService.loginUser(loginObj).subscribe({
   next: (res: any) => {

  const token = res.data.token;

  // Decode JWT
  const decoded: any = jwtDecode(token);

  // Extract roles from claim
  const roles =
    decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

  const name =
    decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];

  const userData = {
    name: name,
    roles: Array.isArray(roles) ? roles : [roles], // handle single role case
    currentRole: Array.isArray(roles) ? roles[0] : roles,
    token: token
  };

  localStorage.setItem('user', JSON.stringify(userData));
  localStorage.setItem('token', token);

  this.toastr.success("Login Successful");
  this._router.navigate(['/dashboard']);
},
    error: (err) => {
      console.log('HTTP error:', err);
      this.toastr.error("Invalid username or password");
    }
  });
}
}