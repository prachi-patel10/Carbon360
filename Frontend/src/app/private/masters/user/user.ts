import { Component, OnInit, signal } from '@angular/core';
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

  Math = Math;
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

  isDropdownOpen = false;

  constructor(
    private fb: FormBuilder,
    private service: UserService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.initSearchForm();

    // Load Departments first
    this.service.getDepartments().subscribe({
      next: (res: any) => {
        this.departments.set(res?.data ?? res ?? []);
        this.loadUsers(); // load users after departments
      },
      error: () => this.toastr.error('Failed to load departments')
    });

    this.loadRoles();
  }

  /* ================= LOAD DATA ================= */
  loadUsers() {
    this.service.getAll().subscribe({
      next: (res: any) => {
        const usersArray = res?.data ?? [];
        const mapped = usersArray.map((u: any) => ({
          UserId: u.userId,
          Fname: u.fName,
          Lname: u.lName,
          UserName: u.userName,
          Email: u.email,
          DepartmentId: u.departmentId,
          DepartmentName:
            this.departments().find(d => d.id === u.departmentId)?.departmentName ?? 'N/A',
          RoleIds: u.roles?.map((x: any) => Number(x)) ?? [],
          RoleNames: u.roles?.join(', ') ?? '',
          IsActive: u.isActive
        }));
        this.users.set(mapped);
        this.totalRecords.set(mapped.length);
        this.totalPages.set(1);
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Failed to load users');
      }
    });
  }

  loadDepartments() {
    this.service.getDepartments().subscribe({
      next: (res: any) => this.departments.set(res?.data ?? res ?? []),
      error: () => this.toastr.error('Failed to load departments')
    });
  }

  loadRoles() {
    this.service.getRoles().subscribe({
      next: (res: any) => this.rolesList.set(res?.data ?? []),
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
  DepartmentId: [null, Validators.required],
    RoleIds: [[], Validators.required],  // 🔥 MUST BE EMPTY ARRAY
  IsActive: [true]
    });
  }

  initSearchForm() {
    this.searchForm = this.fb.group({ searchText: [''] });
    this.searchForm.get('searchText')!
      .valueChanges.pipe(debounceTime(400))
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

  submit() {
  if (this.userForm.invalid) {
    this.userForm.markAllAsTouched();
    return;
  }

  const form = this.userForm.value;

  const cleanRoles = (form.RoleIds || [])
    .filter((r: any) => r !== null && r !== undefined)
    .map((r: any) => Number(r));

  const payload = {
    FName: form.Fname,
    LName: form.Lname,
    UserName: form.UserName,
    Email: form.Email,
    Password: form.Password,
    ConfirmPassword: form.ConfirmPassword,
    DepartmentId: form.DepartmentId
      ? Number(form.DepartmentId)
      : null,
    RoleId: cleanRoles,
    IsActive: form.IsActive
  };

  console.log("FINAL PAYLOAD:", payload);

  this.service.create(payload).subscribe({
    next: () => {
      this.toastr.success('User created successfully');
      this.resetForm();
      this.loadUsers();
    },
    error: (err) => {
      console.error(err);
      this.toastr.error('Create failed');
    }
  });
}

  /* ================= EDIT ================= */
  edit(user: MasterUser) {
    this.userForm.patchValue({
      UserId: user.UserId,
      Fname: user.Fname,
      Lname: user.Lname,
      UserName: user.UserName,
      Email: user.Email,
      DepartmentId: user.DepartmentId,
      RoleIds: user.RoleIds ?? [],
      IsActive: user.IsActive
    });

    this.userForm.get('Password')?.clearValidators();
    this.userForm.get('Password')?.updateValueAndValidity();
    this.userForm.get('ConfirmPassword')?.clearValidators();
    this.userForm.get('ConfirmPassword')?.updateValueAndValidity();
  }

  /* ================= DELETE ================= */
  deleteUI(user: MasterUser) {
    if (!confirm('Delete this user?')) return;
    this.service.delete(user.UserId).subscribe({
      next: () => {
        this.toastr.success('User deleted successfully');
        this.users.update(list => list.filter(u => u.UserId !== user.UserId));
      },
      error: () => this.toastr.error('Delete failed')
    });
  }

  /* ================= TOGGLE ACTIVE ================= */
  toggleActive(user: MasterUser): void {
    const action = user.IsActive ? 'Deactivate' : 'Activate';
    if (!confirm(`Do you want to ${action} this user?`)) return;
    this.service.updateStatus(user.UserId, !user.IsActive).subscribe({
      next: () => {
        this.users.update(list =>
          list.map(u => u.UserId === user.UserId ? { ...u, IsActive: !u.IsActive } : u)
        );
        this.toastr.success(`User ${action}d successfully`);
      },
      error: () => this.toastr.error('Status update failed')
    });
  }
  
  /* ================= RESET ================= */
  resetForm() {
    this.userForm.reset({ UserId: 0, IsActive: true });
    this.userForm.get('Password')?.setValidators(Validators.required);
    this.userForm.get('Password')?.updateValueAndValidity();
  }

  logout() {
    localStorage.clear();
    window.location.href = '/login';
  }

  /* ================= MULTI ROLE HANDLING ================= */
  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

 onRoleChange(event: any) {
  const value = Number(event.target.value);
  let selectedRoles: number[] = this.userForm.value.RoleIds || [];

  if (event.target.checked) {
    if (!selectedRoles.includes(value)) {
      selectedRoles.push(value);
    }
  } else {
    selectedRoles = selectedRoles.filter(x => x !== value);
  }

  this.userForm.patchValue({ RoleIds: selectedRoles });
  this.userForm.get('RoleIds')?.markAsTouched();
}
  getSelectedRoleNames(): string {
    const selectedIds: number[] = this.userForm.value.RoleIds || [];
    return this.rolesList()
      .filter(r => selectedIds.includes(r.roleId))
      .map(r => r.roleName)
      .join(', ');
  }
}