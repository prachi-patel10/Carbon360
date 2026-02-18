import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoginService } from './login-service';
import { ToastService } from '../../../core/toast/toastservice';

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
        console.log(res); // Debug the actual response

        const data = res.data; // adjust this if needed based on console.log

        localStorage.setItem('token', data.token);
        localStorage.setItem('loggedUserName', data.fullName);
        localStorage.setItem('roleName', data.roleName);

        this.toastr.success("Login Successful");
        this._router.navigate(['layout/section']);
      },
      error: (err) => {
        console.log('HTTP error:', err);
        this.toastr.error("Invalid username or password");
      }
    });
  }
}