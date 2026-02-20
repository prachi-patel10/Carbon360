import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router} from '@angular/router';
import { RegisterService } from './register-service';
import { ToastService } from '../../../core/toast/toastservice';
import { AbstractControl, ValidationErrors } from '@angular/forms';


@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
})
export class Register {

  roles: any[] = [];
  departments: any[] = [];
  userData!: FormGroup;

  showPassword = false;
  showConfirmPassword = false;
  http = Inject(HttpClient);
  roleId: number = 0;

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
      RoleIds: new FormControl([], Validators.required),
      IsActive: new FormControl(true)
    }, {
      validators: this.passwordMatchValidator
    });
    this.getRoles();
    this.getDepartments();
  }




  getInvalidControls(): string[] {
    return Object.keys(this.userData.controls).filter(key => {
      return this.userData.get(key)?.invalid;
    });
  }


  registerUser() {

    if (this.userData.invalid) {
      this.userData.markAllAsTouched();
      return;
    }
    const payload = this.userData.value;
    console.log('Register payload:', payload);

    this._userService.registerUser(payload).subscribe({
      next: (res: any) => {
        this.toastr.success("Registration Successful");
        this._router.navigate(['/login']);
      },
      error: (err) => {
        this.toastr.error('Registration Failed!');
        console.log(err);
      }
    });
  }

  // getRoles() {
  //   this._userService.getAllRoles().subscribe({
  //     next: (res: any) => {
  //       this.roles = res.data.filter((r: any) => r.roleName !== 'Admin');
  //       this.dct.detectChanges();
  //       console.log(Array.isArray(this.roles));
  //      // this.dct.detectChanges();
  //     }, error: (err) => {
  //       console.log(err);
  //     }
  //   })
  // }


  getRoles() {
    this._userService.getAllRoles().subscribe({
      next: (res: any) => {
        this.roles = res.data.filter((r: any) => r.roleName !== 'Admin');
        this.dct.detectChanges();
        console.log('Roles loaded:', this.roles);
      },
      error: (err) => {
        console.log('Error loading roles:', err);
      }
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {

    const password = control.get('Password')?.value;
    const confirm = control.get('ConfirmPassword')?.value;

    if (password !== confirm) {
      return { passwordMismatch: true };
    }

    return null;
  }


  getDepartments() {
    this._userService.getAllDepartments().subscribe({
      next: (res: any) => {
        this.departments = res.data; // your backend returns data as "data" array
        this.dct.detectChanges();
        console.log('Departments loaded:', this.departments);
      },
      error: (err) => {
        console.log('Error loading departments:', err);
      }
    });
  }

  get selectedRoleNames(): string {
  const selectedIds = this.userData.get('RoleIds')?.value || [];
  if (!selectedIds.length) return '';
  return selectedIds
    .map((id: any) => this.roles.find(r => r.roleId === id)?.roleName)
    .filter((name: string | undefined) => !!name)
    .join(', ');
}

}
