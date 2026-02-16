import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Route, Router, RouterEvent, RouterLink } from '@angular/router';
import { RegisterService } from './register-service';
import { ToastService } from '../../../core/toast/toastservice';

@Component({
  selector: 'app-register',
  imports: [RouterLink,CommonModule,FormsModule,ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {

  roles : any [] = [];
  http = Inject(HttpClient);
  roleId : number = 0;

 userData: FormGroup = new FormGroup({
  UserName: new FormControl('', Validators.required),
  Email: new FormControl('', [Validators.required, Validators.email]),
  Password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  DateOfBirth: new FormControl('', Validators.required),
  Gender: new FormControl('', Validators.required),
  PhoneNumber: new FormControl('', [
    Validators.required,
    Validators.pattern('^[0-9]{10}$') // only numbers, exactly 10 digits
  ]),
  BloodGroup: new FormControl('', Validators.required),
  RoleId: new FormControl('', Validators.required)
});


  constructor(private _userService: RegisterService, private _router : Router, private dct : ChangeDetectorRef, private toastr : ToastService) {
      this.getRoles();
  }


  getInvalidControls(): string[] {
  return Object.keys(this.userData.controls).filter(key => {
    return this.userData.get(key)?.invalid;
  });
}
  registerUser(){

    if (this.userData.invalid) {
    this.userData.markAllAsTouched();
    return; 
  }
    const useObj = this.userData.value;
    this._userService.registerUser(useObj).subscribe({
      next:(res:any)=>{
        this.toastr.success("Registration Successful");
        this._router.navigate(['/login']);
      },error:(err)=>{
        this.toastr.error(err.error.errors.join(","));
        console.log(err);
      }
    });
  }
  getRoles(){
    this._userService.getAllRoles().subscribe({
      next :(res:any)=>{
        this.roles = res.data.filter((
          (r:any)=> r.roleName !== 'Admin'
        ));
        console.log(Array.isArray(this.roles));
        this.dct.detectChanges();
      },error:(err)=>{
        console.log(err);
      }
    })
  }
  
}
