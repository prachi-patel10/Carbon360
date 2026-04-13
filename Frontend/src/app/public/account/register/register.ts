import { Component } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RegisterService } from './register-service';
import { ToastService } from '../../../core/toast/toastservice';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
})
export class Register {

  roles: any[] = [];
  departments: any[] = [];
  userData!: FormGroup;

  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private _userService: RegisterService,
    private _router: Router,
    private toastr: ToastService
  ) {
    this.userData = new FormGroup({
      Name: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z\s]+$/)
      ]),
      Email: new FormControl('', [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/)
      ]),
      Password: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(20),
      ]),
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

  registerUser() {
    if (this.userData.invalid) {
      this.userData.markAllAsTouched();
      return;
    }

    const payload = this.userData.value;
    console.log('Register payload:', payload);

    this._userService.registerUser(payload).subscribe({
      next: (res: any) => {
        this.toastr.success('Registration Successful');
        this._router.navigate(['/login']);
      },
      error: (err) => {
        this.toastr.error('Registration Failed!');
        console.log(err);
      }
    });
  }

  getRoles() {
    this._userService.getAllRoles().subscribe({
      next: (res: any) => {
        this.roles = res.data.filter((r: any) => r.roleName !== 'Admin');
        console.log('Roles loaded:', this.roles);
      },
      error: (err) => {
        console.log('Error loading roles:', err);
      }
    });
  }

  getDepartments() {
    this._userService.getAllDepartments().subscribe({
      next: (res: any) => {
        this.departments = res.data;
        console.log('Departments loaded:', this.departments);
      },
      error: (err) => {
        console.log('Error loading departments:', err);
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

  get selectedRoleNames(): string {
    const selectedIds = this.userData.get('RoleIds')?.value || [];
    if (!selectedIds.length) return '';
    return selectedIds
      .map((id: any) => this.roles.find(r => r.roleId === id)?.roleName)
      .filter((name: string | undefined) => !!name)
      .join(', ');
  }

  getInvalidControls(): string[] {
    return Object.keys(this.userData.controls).filter(key => {
      return this.userData.get(key)?.invalid;
    });
  }
}