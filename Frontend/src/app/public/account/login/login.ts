import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoginService } from './login-service';
import { ToastService } from '../../../core/toast/toastservice';

@Component({
  selector: 'app-login',
  imports: [ RouterLink,ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  
  loginData: FormGroup = new FormGroup({
    UserName: new FormControl('',Validators.required),
    Password: new FormControl('',Validators.required)
  })
  constructor(private _router: Router, private _userService: LoginService,
    private dct: ChangeDetectorRef, private toastr : ToastService
  ) { }

  login() {
    if (this.loginData.invalid) {
      this.loginData.markAllAsTouched();
      return;
    }

    const loginObj = this.loginData.value;
    this._userService.loginUser(loginObj).subscribe({
      next: (res: any) => {
       this.toastr.success("Login Successful");
        this._router.navigate(['layout/section']);
        localStorage.setItem("token", res.token);
        localStorage.setItem("loggedUserName", res.userName);
      }, error: (err) => {
        this.toastr.error("Invalid username or password");
        console.log(err);
      }
    })
  }


}
