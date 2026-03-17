import { Component, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators, ValidatorFn, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { UserService } from './user-service';
import { ToastService } from '../../../core/toast/toastservice';

interface User {
  userId: string;
  fName: string;
  lName: string;
  userName: string;
  email: string;
  departmentId: string | null;
  departmentName: string;
  isActive: boolean;
  entryDate: string;
  roles: string[];       // roles array from API
  RoleNames?: string;    // optional, string version of roles for display
}
@Component({
  selector: 'app-master-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user.html',
  styleUrls: ['./user.css']
})
export class MasterUserComponent implements OnInit {

  constructor(
    private fb: FormBuilder,
    private service: UserService,
    private toastr: ToastService
  ) { }

  userForm!: FormGroup;

  // ================= SIGNALS =================
  users = signal<any[]>([]);
  //roles = signal<any[]>([]);
  rolesList = signal<any[]>([]);
  departments = signal<any[]>([]);

  searchText = signal<string>('');
  onlyActive = signal<boolean>(false);

  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  totalRecords = signal<number>(0);
  requestedRecords = signal<number>(5);

  editingUserId: string | null = null;

  showRoleDropdown = false;
  sortColumn = 'fName'; // lowercase f
  sortDirection: 'ASC' | 'DESC' = 'ASC';

  userFilterModalOpen = signal(false);

  selectedDepartmentIds: string[] = [];
  selectedRoleIds: string[] = [];

  userFilter = signal({
    department_id: [] as string[],
    role_id: [] as string[]
  });

  rolesDropdownOpen = false;

  ngOnInit(): void {
    this.initForm();

    // Load roles first
    this.loadRoles();

    // Load departments
    this.loadDepartments(
      this.currentPage(),
      this.requestedRecords(),
      this.searchText(),
      this.onlyActive()
    );

    // Load users after roles and departments
    this.loadUsers();
  }

  openUserFilter() {
  this.userFilterModalOpen.set(true);
}

closeUserFilter() {
  this.userFilterModalOpen.set(false);
}

toggleDepartmentFilter(id: string) {

  if (this.selectedDepartmentIds.includes(id)) {
    this.selectedDepartmentIds =
      this.selectedDepartmentIds.filter(x => x !== id);
  } 
  else {
    this.selectedDepartmentIds.push(id);
  }

  this.userFilter.update(f => ({
    ...f,
    department_id: this.selectedDepartmentIds
  }));
}

toggleRoleFilter(id: string) {

  if (this.selectedRoleIds.includes(id)) {
    this.selectedRoleIds =
      this.selectedRoleIds.filter(x => x !== id);
  } 
  else {
    this.selectedRoleIds.push(id);
  }

  this.userFilter.update(f => ({
    ...f,
    role_id: this.selectedRoleIds
  }));
}

applyUserFilter() {

  this.userFilterModalOpen.set(false);

  this.currentPage.set(1);

  this.loadUsers();
}

resetUserFilter() {

  this.selectedDepartmentIds = [];
  this.selectedRoleIds = [];

  this.userFilter.set({
    department_id: [],
    role_id: []
  });

  this.loadUsers();
}

  initForm() {
    this.userForm = this.fb.group({
      UserId: [''],
      Fname: ['', Validators.required],
      Lname: ['', Validators.required],
      UserName: ['', Validators.required],
      Email: ['', [Validators.required, Validators.email]],
      Password: ['', Validators.required],
      ConfirmPassword: ['', Validators.required],
      DepartmentId: ['', Validators.required],
      RoleIds: [[], Validators.required],
      IsActive: [true]
    }, { validators: this.passwordMatchValidator() });
  }

  passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const password = control.get('Password')?.value;
      const confirm = control.get('ConfirmPassword')?.value;
      return password && confirm && password !== confirm ? { mismatch: true } : null;
    };
  }

  // ================= LOAD ROLES =================
  loadRoles() {
    this.service.getRoles().subscribe({
      next: (res: any) => {
        console.log("ROLES RAW RESPONSE:", res);   // :point_left: ADD THIS
        console.log("ROLES DATA:", res?.data);
        this.rolesList.set(res?.data ?? [])
      },
      error: () => this.toastr.error('Failed to load roles')
    });
  }

  // ================= LOAD USERS =================
  // loadUsers() {
  //   this.service.getUsers().subscribe({
  //     next: (res: any) => {
  //       const usersArray = res?.data ?? [];
  //       const mapped = usersArray.map((u: any) => ({
  //         UserId: u.userId,
  //         Fname: u.fName,
  //         Lname: u.lName,
  //         UserName: u.userName,
  //         Email: u.email,
  //         DepartmentId: u.departmentId,
  //         DepartmentName:
  //           this.departments().find(d => d.id === u.departmentId)?.departmentName ?? 'N/A',
  //         RoleIds: u.roles?.map((x: any) => Number(x)) ?? [],
  //         RoleNames: u.roles?.join(', ') ?? '',
  //         IsActive: u.isActive
  //       }));
  //       this.users.set(mapped);
  //       this.totalRecords.set(mapped.length);
  //       this.totalPages.set(1);
  //     },
  //     error: (err: any) => {
  //       console.error(err);
  //       this.toastr.error('Failed to load users');
  //     }
  //   });
  // }

  // loadUsers() {
  //   this.service.getPaged(
  //     this.currentPage(),
  //     this.requestedRecords(),
  //     this.searchText(),
  //     this.onlyActive()
  //   ).subscribe({
  //     next: (res: any) => {
  //       const usersArray = res?.data?.data ?? [];

  //       const mapped = usersArray.map((u: any) => ({
  //         UserId: u.userId,
  //         Fname: u.fName,
  //         Lname: u.lName,
  //         UserName: u.userName,
  //         Email: u.email,
  //         DepartmentId: u.departmentId,
  //         DepartmentName: u.departmentName ?? 'N/A',
  //         RoleIds: u.roles?.map((x: any) => Number(x)) ?? [],
  //         RoleNames: this.rolesList()
  //           .filter((r: any) => u.roles?.includes(r.roleId))
  //           .map((r: any) => r.roleName)
  //           .join(', '),
  //         IsActive: u.isActive
  //       }));

  //       this.users.set(mapped);
  //       this.totalRecords.set(res.data.totalRecords ?? mapped.length);
  //       this.totalPages.set(res.data.totalPages ?? 1);
  //       this.currentPage.set(res.data.currentPage ?? 1);
  //     },
  //     error: (err: any) => {
  //       console.error(err);
  //       this.toastr.error('Failed to load users');
  //     }
  //   });
  // }

    loadUsers() {

  const filter = this.userFilter();

  this.service.getPaged(
    this.currentPage(),
    this.requestedRecords(),
    this.searchText(),
    this.onlyActive(),
    filter.department_id.length ? filter.department_id.join(',') : '',
    filter.role_id.length ? filter.role_id.join(',') : ''
  ).subscribe((res: any) => {

    const data: User[] = res.data.data;

    this.totalRecords.set(res.data.totalRecords);
    this.totalPages.set(res.data.totalPages);

    this.users.set(
      data.map((u: User) => ({
        ...u,
        RoleNames: u.roles.join(', ')
      }))
    );

  });
}
  // loadUsers() {
  //   this.service.getPaged(
  //     this.currentPage(),
  //     this.requestedRecords(),
  //     this.searchText(),
  //     this.onlyActive()
  //   ).subscribe(res => {
  //     const data: User[] = res.data.data; // API response

  //     this.totalRecords.set(res.data.totalRecords);
  //     this.totalPages.set(res.data.totalPages);

  //     // Map roles array to string and update the signal
  //     this.users.set(
  //       data.map((u: User) => ({
  //         ...u,
  //         RoleNames: u.roles.join(', ')
  //       }))
  //     );
  //   });
  // }
  // ================= LOAD DEPARTMENTS =================
  loadDepartments(page: number, size: number, search: string, active: boolean) {
    this.service.getDepartments().subscribe(res => {
      const list = res.data?.data || res.data || [];
      const mapped = list.map((d: any) => ({
        DepartmentId: d.departmentId || d.id,
        DepartmentName: d.departmentName,
        IsActive: d.isActive
      }));
      this.departments.set(mapped);
    });
  }

  // ================= SAVE / UPDATE =================
  submitUser() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const payload = { ...this.userForm.value };

    if (!payload.UserId) {
      this.service.create(payload).subscribe({
        next: () => {
          this.toastr.success('User created successfully');
          this.loadUsers();
          this.resetForm();
        },
        error: err => this.toastr.error(err?.error?.errors?.ConfirmPassword?.join(', ') || 'Create failed')
      });
    } else {
      this.service.update(payload).subscribe({
        next: () => {
          this.toastr.success('User updated successfully');
          this.loadUsers();
          this.resetForm();
        },
        error: () => this.toastr.error('Update failed')
      });
    }
  }

  // ================= EDIT =================
  edit(user: any) {

  this.editingUserId = user.userId;

  this.userForm.patchValue({
    UserId: user.userId,
    Fname: user.fName,
    Lname: user.lName,
    UserName: user.userName,
    Email: user.email,
    DepartmentId: user.departmentId,
    RoleIds: user.roles || [],
    IsActive: user.isActive,
    Password: '',
    ConfirmPassword: ''
  });

}
  // edit(user: any) {
  //   this.editingUserId = user.UserId;
  //   this.userForm.patchValue({
  //     UserId: user.UserId,
  //     Fname: user.Fname,
  //     Lname: user.Lname,
  //     UserName: user.UserName,
  //     Email: user.Email,
  //     DepartmentId: user.DepartmentId,
  //     //Roles: user.Roles,
  //     //RoleIds: user.roles,
  //      RoleIds: user.roles,
  //     IsActive: user.IsActive
  //   });
  // }

  // ================= DELETE =================
  deleteUI(user: any) {

  Swal.fire({
    title: 'Are you sure?',
    text: 'This will delete the user!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel'
  }).then(result => {

    if (result.isConfirmed) {

      this.service.delete(user.userId).subscribe({

        next: () => {
          Swal.fire('Deleted!', 'User deleted successfully.', 'success');
          this.loadUsers();
        },

        error: () => {
          Swal.fire('Error', 'Delete failed', 'error');
        }

      });

    }

  });

}
  // deleteUI(user: any) {
  //   Swal.fire({
  //     title: 'Are you sure?',
  //     text: 'This will delete the user!',
  //     icon: 'warning',
  //     showCancelButton: true,
  //     confirmButtonText: 'Yes, delete',
  //     cancelButtonText: 'Cancel'
  //   }).then(result => {
  //     if (result.isConfirmed) {
  //       this.service.delete(user.UserId).subscribe(() => {
  //         Swal.fire('Deleted!', 'User deleted successfully.', 'success');
  //         this.loadUsers();
  //       });
  //     }
  //   });
  // }

  // ================= TOGGLE ACTIVE =================
  toggleActive(user: any) {

  const newStatus = !user.isActive;

  Swal.fire({
    title: 'Are you sure?',
    text: `Change status to ${newStatus ? 'Active' : 'Inactive'}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'Cancel'
  }).then(result => {

    if (result.isConfirmed) {

      this.service.updateStatus(user.userId, newStatus).subscribe(() => {

        Swal.fire('Success', 'Status updated successfully', 'success');

        this.users.update(list =>
          list.map(u =>
            u.userId === user.userId
              ? { ...u, isActive: newStatus }
              : u
          )
        );

      });

    } else {

      this.loadUsers();

    }

  });

}
  // toggleActive(user: any) {
  //   const newStatus = !user.IsActive;
  //   Swal.fire({
  //     title: 'Are you sure?',
  //     text: `Change status to ${newStatus ? 'Active' : 'Inactive'}?`,
  //     icon: 'warning',
  //     showCancelButton: true,
  //     confirmButtonText: 'Yes',
  //     cancelButtonText: 'Cancel'
  //   }).then(result => {
  //     if (result.isConfirmed) {
  //       this.service.updateStatus(user.UserId, newStatus).subscribe(() => {
  //         Swal.fire('Success', 'Status updated successfully', 'success');
  //         this.users.update(list =>
  //           list.map(u => u.UserId === user.UserId ? { ...u, IsActive: newStatus } : u)
  //         );
  //       });
  //     } else {
  //       this.loadUsers();
  //     }
  //   });
  // }
  

  // ================= SEARCH =================
  onSearch(event: any) {
    this.searchText.set(event.target.value);
    this.currentPage.set(1);
    this.loadUsers();
  }

  clearSearch() {
    this.searchText.set('');
    this.currentPage.set(1);
    this.loadUsers();
  }

  onRecordsChange(event: any) {
    this.requestedRecords.set(+event.target.value);
    this.currentPage.set(1);
    this.loadUsers();
  }

  onActiveFilterChange(event: any) {
    this.onlyActive.set(event.target.checked);
    this.currentPage.set(1);
    this.loadUsers();
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadUsers();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadUsers();
    }
  }

  resetForm() {
    this.editingUserId = null;
    this.userForm.reset({
      IsActive: true,
      RoleIds: []
    });
  }

getSelectedRoleNames(): string {
  const selectedIds = this.userForm.value.RoleIds || [];

  return this.rolesList()
    .filter(r => selectedIds.includes(r.roleId))
    .map(r => r.roleName)
    .join(', ');
}
  // ================= ROLE MULTISELECT =================
  toggleRoleDropdown() {
    this.showRoleDropdown = !this.showRoleDropdown;
  }

  isRoleSelected(roleId: string): boolean {
    return (this.userForm.value.RoleIds || []).includes(roleId);
  }

  // onRoleChange(roleId: string, event: any) {
  //   let selected: string[] = this.userForm.value.Roles || [];
  //   if (event.target.checked) {
  //     selected = [...selected, roleId];
  //   } else {
  //     selected = selected.filter((r: string) => r !== roleId);
  //   }
  //   this.userForm.patchValue({ Roles: selected });
  // }


  onRoleChange(event: any) {
    //const roleId = Number(event.target.value);
    const roleId = event.target.value;
    //let selectedRoles: number[] = this.userForm.get('RoleIds')?.value || [];
    let selectedRoles: string[] = this.userForm.get('RoleIds')?.value || [];

    if (event.target.checked) {
      selectedRoles = [...selectedRoles, roleId];
    } else {
      selectedRoles = selectedRoles.filter(r => r !== roleId);
    }

    this.userForm.get('RoleIds')?.setValue(selectedRoles);
  }
  selectedRoleNames(): string {
    const selectedIds: string[] = this.userForm.value.RoleIds || [];
    return this.rolesList()
      .filter((r: any) => selectedIds.includes(r.roleId))
      .map((r: any) => r.roleName)
      .join(', ');
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

  get sortedUsers() {
    const column = this.sortColumn;
    const direction = this.sortDirection;

    return [...this.users()].sort((a: any, b: any) => {
      let valueA = a[column];
      let valueB = b[column];

      if (valueA == null) valueA = '';
      if (valueB == null) valueB = '';

      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      if (valueA > valueB) return direction === 'ASC' ? 1 : -1;
      if (valueA < valueB) return direction === 'ASC' ? -1 : 1;
      return 0;
    });
  }

  applyFilter() {
  this.currentPage.set(1);
  this.loadUsers();
}
}