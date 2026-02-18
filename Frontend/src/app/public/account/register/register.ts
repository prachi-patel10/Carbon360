import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Route, Router, RouterEvent, RouterLink } from '@angular/router';
import { RegisterService } from './register-service';
import { ToastService } from '../../../core/toast/toastservice';
import { AbstractControl, ValidationErrors } from '@angular/forms';


@Component({
  selector: 'app-register',
  imports: [RouterLink,CommonModule,FormsModule,ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {

  roles : any [] = [];
  departments: any[] = [];
  userData!: FormGroup;

showPassword = false;
showConfirmPassword = false;
  http = Inject(HttpClient);
  roleId : number = 0;

 constructor(
  private _userService: RegisterService,
  private _router: Router,
  private dct: ChangeDetectorRef,
  private toastr: ToastService
) {

 this.userData = new FormGroup({
  Name: new FormControl('', Validators.required),
  Email: new FormControl('', [Validators.required, Validators.email]),
  Password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  ConfirmPassword: new FormControl('', Validators.required),
  DepartmentId: new FormControl('', Validators.required),
  RoleId: new FormControl('', Validators.required),
  IsActive: new FormControl(true)
}, {
  validators: this.passwordMatchValidator
});
  this.getRoles();
  // this.getDepartments();
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
        this.toastr.error('Registration Failed!');
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

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {

  const password = control.get('Password')?.value;
  const confirm = control.get('ConfirmPassword')?.value;

  if (password !== confirm) {
    return { passwordMismatch: true };
  }

  return null;
}


  // getDepartments(){
  // this._userService.getAllDepartments().subscribe({
  //   next:(res:any)=>{
  //     this.departments = res.data;
  //     this.dct.detectChanges();
  //   },
  //   error:(err)=>{
  //     console.log(err);
  //   }
  // });
// }
  
}
