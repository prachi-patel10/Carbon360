import { Component, OnInit, signal, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { debounceTime } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { UserService } from './user-service';
import type { MasterUser } from './user-service';

@Component({
  selector: 'app-master-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user.html',
  styleUrls: ['./user.css']
})
export class MasterUserComponent implements OnInit {

  username: string | null = '';
  userId = 0;

  userForm!: FormGroup;
  searchForm!: FormGroup;

  /* ================= SIGNALS ================= */
  users = signal<MasterUser[]>([]);
  departments = signal<any[]>([]);
  rolesList = signal<any[]>([]);

  requestedRecords = signal(5);
  currentPage = signal(1);
  totalPages = signal(0);
  searchText = signal('');
  onlyActive = signal(false);
  totalRecords = signal(0);

  sortColumn = 'Fname';
  sortDirection: 'ASC' | 'DESC' = 'ASC';

  constructor(
    private fb: FormBuilder,
    private service: UserService,
    private toastr: ToastrService
  ) {
    /* ================= AUTO LOAD ================= */
    effect(() => {
      this.loadUsers();
    });
  }

ngOnInit(): void {
  this.initForm();

  // Load departments first
  this.service.getDepartments().subscribe({
    next: (res: any) => {
      this.departments.set(res?.data ?? res ?? []);

      // Now load users AFTER departments are loaded
      this.loadUsers();
    },
    error: () => this.toastr.error('Failed to load departments')
  });

  // Load roles (can be parallel)
  this.loadRoles();
}


  /* ================= LOAD USERS ================= */
 loadUsers() {
  this.service.getAll().subscribe({
    next: (res: any) => {
      const mapped = (res?.data ?? []).map((u: any) => ({
        UserId: u.userId,
        Fname: u.fName,
        Lname: u.lName,
        UserName: u.userName,
        Email: u.email,
        DepartmentId: u.departmentId,
        DepartmentName: this.departments().find(d => Number(d.id) === u.departmentId)?.departmentName ?? 'N/A',
        RoleIds: u.roles?.map((r: any) => Number(r.id)) ?? [],
        RoleNames: u.roles?.map((r: any) => r.roleName).join(', ') ?? '',
        IsActive: u.isActive
      }));

      this.users.set(mapped);
    },
    error: () => this.toastr.error('Failed to load users')
  });
}


  /* ================= LOAD DROPDOWNS ================= */
loadDepartments() {
  this.service.getDepartments().subscribe({
    next: (res: any) => {
      // Set the departments signal
      this.departments.set(res?.data ?? res ?? []);
    },
    error: () => this.toastr.error('Failed to load departments')
  });
}

  loadRoles() {
    this.service.getRoles().subscribe({
      next: (res: any) => {
        this.rolesList.set(res?.data ?? []);
      },
      error: () => this.toastr.error('Failed to load roles')
    });
  }

  /* ================= FORM ================= */
  initForm() {
this.userForm = this.fb.group({
  UserId: [0],
  Fname: ['', Validators.required],
  Lname: ['', Validators.required],
  UserName: ['', Validators.required],
  Email: ['', [Validators.required, Validators.email]],
  Password: ['', Validators.required],
  ConfirmPassword: ['', Validators.required],
  DepartmentId: ['', Validators.required],
  RoleIds: [[], Validators.required],
  IsActive: [true]
});
  }
  /* ================= SEARCH ================= */
  initSearchForm() {
    this.searchForm = this.fb.group({
      searchText: ['']
    });

    this.searchForm.get('searchText')!
      .valueChanges
      .pipe(debounceTime(400))
      .subscribe(val => {
        this.searchText.set(val ?? '');
        this.currentPage.set(1);
      });
  }

  /* ================= SORT ================= */
  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'ASC';
    }
    this.currentPage.set(1);
  }

  /* ================= FILTER ================= */
  onActiveFilterChange(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.onlyActive.set(checked);
    this.currentPage.set(1);
  }

  /* ================= RECORDS ================= */
  onRecordsChange(e: any) {
    this.requestedRecords.set(Number(e.target.value));
    this.currentPage.set(1);
  }

  /* ================= SUBMIT ================= */
submit() {
  if (this.userForm.invalid) {
    this.userForm.markAllAsTouched();
    return;
  }

  const form = this.userForm.value;

  const payload = {
    FName: form.fname,
    LName: form.lname,
    UserName: form.userName,
    Email: form.email,
    Password: form.password,
    ConfirmPassword: form.confirmPassword,
    DepartmentId: form.departmentId ? Number(form.departmentId) : null,
    RoleId: form.roleIds.filter((r: any) => r != null).map((r: any) => Number(r)),
    IsActive: form.isActive
  };

  const obs = form.UserId === 0
    ? this.service.create(payload)
    : this.service.update({ ...payload, UserId: form.UserId });

  obs.subscribe({
    next: () => {
      this.toastr.success(form.UserId === 0 ? 'User created successfully' : 'User updated successfully');
      this.resetForm();
      this.loadUsers();
    },
    error: (err) => {
      console.error(err);
      this.toastr.error('Operation failed. Check required fields.');
    }
  });
}

  /* ================= EDIT ================= */
  edit(user: MasterUser) {
    this.userForm.patchValue({
      UserId: user.UserId,
      Fname: user.fname,
      Lname: user.Lname,
      UserName: user.UserName,
      Email: user.Email,
      DepartmentId: user.DepartmentId,
      RoleIds: user.RoleIds,
      IsActive: user.IsActive
    });

    // Password optional in edit
    this.userForm.get('Password')?.clearValidators();
    this.userForm.get('Password')?.updateValueAndValidity();
  }

  /* ================= DELETE ================= */
  deleteUI(user: MasterUser) {
    if (!confirm('Delete this user?')) return;

    this.service.delete(user.UserId).subscribe({
      next: () => {
        this.toastr.success('User deleted successfully');
        this.users.update(list =>
          list.filter(u => u.UserId !== user.UserId)
        );
      },
      error: () => this.toastr.error('Delete failed')
    });
  }

  /* ================= TOGGLE ACTIVE ================= */
  toggleActive(user: MasterUser) {
    const action = user.IsActive ? 'Deactivate' : 'Activate';

    if (!confirm(`Do you want to ${action} this user?`)) return;

    this.service.toggleActive(user.UserId).subscribe({
      next: () => {
        this.toastr.success(`User ${action}d successfully`);

        this.users.update(list =>
          list.map(u =>
            u.UserId === user.UserId
              ? { ...u, IsActive: !u.IsActive }
              : u
          )
        );
      },
      error: () => this.toastr.error('Action failed')
    });
  }

  /* ================= RESET ================= */
  resetForm() {
    this.userForm.reset({
      UserId: 0,
      IsActive: true
    });

    this.userForm.get('Password')?.setValidators(Validators.required);
    this.userForm.get('Password')?.updateValueAndValidity();
  }

  logout() {
    localStorage.clear();
    window.location.href = '/login';
  }
}
