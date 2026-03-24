import { Component, HostListener, OnInit, signal } from '@angular/core';
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
  roles: string[];
  RoleNames?: string;
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
  ) {}

  userForm!: FormGroup;

  // ── Signals ───────────────────────────────────────────────────
  users            = signal<any[]>([]);
  rolesList        = signal<any[]>([]);
  departments      = signal<any[]>([]);
  searchText       = signal<string>('');
  onlyActive       = signal<boolean | undefined>(true);
  currentPage      = signal<number>(1);
  totalPages       = signal<number>(1);
  totalRecords     = signal<number>(0);
  requestedRecords = signal<number>(5);
  userFilterModalOpen = signal(false);

  pageSizeOptions = [5, 10, 15, 20];

  editingUserId: string | null = null;
  showRoleDropdown = false;
  sortColumn    = 'FName';
  sortDirection: 'ASC' | 'DESC' = 'ASC';

  // ── Filter state ──────────────────────────────────────────────
  selectedDepartmentIds: string[] = [];
  selectedRoleIds:       string[] = [];
  deptDropOpen  = false;
  roleDropOpen  = false;

  userFilter = signal({
    department_id: [] as string[],
    role_id:       [] as string[]
  });

  // ── Close inner dropdowns when clicking outside modal ─────────
 @HostListener('document:click', ['$event'])
onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const insideModal   = !!target.closest('.vf-modal');
  const insidePanel   = !!target.closest('.vf-panel');
  const insideTrigger = !!target.closest('.vf-trigger');
  if (!insideModal && !insidePanel && !insideTrigger) {
    this.deptDropOpen = false;
    this.roleDropOpen = false;
  }
}

  ngOnInit(): void {
    this.initForm();
    this.loadRoles();
    this.loadDepartments();
    this.loadUsers();
  }

  // ── Form ──────────────────────────────────────────────────────
  initForm() {
    this.userForm = this.fb.group({
      UserId:          [''],
      Fname:           ['', Validators.required],
      Lname:           ['', Validators.required],
      UserName:        ['', Validators.required],
      Email:           ['', [Validators.required, Validators.email]],
      Password:        ['', Validators.required],
      ConfirmPassword: ['', Validators.required],
      DepartmentId:    ['', Validators.required],
      RoleIds:         [[], Validators.required],
      IsActive:        [true]
    }, { validators: this.passwordMatchValidator() });
  }

  passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const password = control.get('Password')?.value;
      const confirm  = control.get('ConfirmPassword')?.value;
      return password && confirm && password !== confirm ? { mismatch: true } : null;
    };
  }

  // ── Load data ─────────────────────────────────────────────────
  loadRoles() {
    this.service.getRoles().subscribe({
      next: (res: any) => {
        const roles = (res?.data ?? []).map((r: any) => ({
          roleId:   String(r.roleId),
          roleName: r.roleName
        }));
        this.rolesList.set(roles);
      },
      error: () => this.toastr.error('Failed to load roles')
    });
  }


  loadDepartments() {
    this.service.getDepartments().subscribe(res => {
      const list   = res.data?.data || res.data || [];
      const mapped = list.map((d: any) => ({
        DepartmentId:   String(d.departmentId || d.id),
        DepartmentName: d.departmentName,
        IsActive:       d.isActive
      }));
      this.departments.set(mapped);
    });
  }

  loadUsers() {
    const filter = this.userFilter();

    this.service.getPaged(
      this.currentPage(),
      this.requestedRecords(),
      this.searchText(),
      this.onlyActive() ?? undefined,
      filter.department_id.length ? filter.department_id.join(',') : '',
      filter.role_id.length       ? filter.role_id.join(',')       : '',
      this.sortColumn,
      this.sortDirection
    ).subscribe({
      next: (res: any) => {
        const data: User[] = res.data.data ?? [];
        this.totalRecords.set(res.data.totalRecords ?? 0);
        this.totalPages.set(res.data.totalPages ?? 1);
        this.users.set(data.map((u: User) => ({
          ...u,
          RoleNames: u.roles?.join(', ') ?? ''
        })));
      },
      error: (err: any) => {
        console.error(err);
        this.toastr.error('Failed to load users');
      }
    });
  }

  // ── Save / Update ─────────────────────────────────────────────
  submitUser() {
    if (this.userForm.invalid) { this.userForm.markAllAsTouched(); return; }

    const payload = { ...this.userForm.value };

    if (!payload.UserId) {
      this.service.create(payload).subscribe({
        next: () => { this.toastr.success('User created successfully'); this.loadUsers(); this.resetForm(); },
        error: err => this.toastr.error(err?.error?.errors?.ConfirmPassword?.join(', ') || 'Create failed')
      });
    } else {
      this.service.update(payload).subscribe({
        next: () => { this.toastr.success('User updated successfully'); this.loadUsers(); this.resetForm(); },
        error: () => this.toastr.error('Update failed')
      });
    }
  }

  edit(user: any) {
    this.editingUserId = user.userId;
    this.userForm.patchValue({
      UserId:          user.userId,
      Fname:           user.fName,
      Lname:           user.lName,
      UserName:        user.userName,
      Email:           user.email,
      DepartmentId:    user.departmentId,
      RoleIds:         user.roles || [],
      IsActive:        user.isActive,
      Password:        '',
      ConfirmPassword: ''
    });
  }

  resetForm() {
    this.editingUserId = null;
    this.userForm.reset({ IsActive: true, RoleIds: [] });
  }

  // ── Delete ────────────────────────────────────────────────────
  deleteUI(user: any) {
    Swal.fire({
      title: 'Are you sure?', text: 'This will delete the user!',
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Yes, delete', cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        this.service.delete(user.userId).subscribe({
          next:  () => { Swal.fire('Deleted!', 'User deleted successfully.', 'success'); this.loadUsers(); },
          error: () => Swal.fire('Error', 'Delete failed', 'error')
        });
      }
    });
  }

  // ── Status toggle ─────────────────────────────────────────────
  toggleActive(user: any) {
    const newStatus = !user.isActive;
    Swal.fire({
      title: 'Are you sure?', text: `Change status to ${newStatus ? 'Active' : 'Inactive'}?`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        this.service.updateStatus(user.userId, newStatus).subscribe(() => {
          Swal.fire('Success', 'Status updated successfully', 'success');
          this.users.update(list =>
            list.map(u => u.userId === user.userId ? { ...u, isActive: newStatus } : u));
        });
      } else {
        this.loadUsers();
      }
    });
  }

  // ── Search ────────────────────────────────────────────────────
  onSearch(event: any) {
    this.searchText.set(event.target.value);
    this.currentPage.set(1);
    this.loadUsers();
  }

  onActiveFilterChange(event: any) {
    this.onlyActive.set((event.target as HTMLInputElement).checked ? true : false);
    this.currentPage.set(1);
    this.loadUsers();
  }

  onRecordsChange(event: any) {
    this.requestedRecords.set(+event.target.value);
    this.currentPage.set(1);
    this.loadUsers();
  }

  // ── Pagination ────────────────────────────────────────────────
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

  // ── Sort ──────────────────────────────────────────────────────
  sort(column: string) {
    if (this.sortColumn === column)
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    else { this.sortColumn = column; this.sortDirection = 'ASC'; }
    this.currentPage.set(1);
    this.loadUsers();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '↕';
    return this.sortDirection === 'ASC' ? '↑' : '↓';
  }

  // ── Role dropdown (form) ──────────────────────────────────────
  toggleRoleDropdown() { this.showRoleDropdown = !this.showRoleDropdown; }

  getSelectedRoleNames(): string {
    const selectedIds = this.userForm.value.RoleIds || [];
    return this.rolesList()
      .filter(r => selectedIds.includes(r.roleId))
      .map(r => r.roleName)
      .join(', ');
  }

  onRoleChange(event: any) {
    const roleId = event.target.value;
    let selectedRoles: string[] = this.userForm.get('RoleIds')?.value || [];
    if (event.target.checked) selectedRoles = [...selectedRoles, roleId];
    else selectedRoles = selectedRoles.filter(r => r !== roleId);
    this.userForm.get('RoleIds')?.setValue(selectedRoles);
  }

  // ── Filter modal ──────────────────────────────────────────────
  openUserFilter() {
    this.selectedDepartmentIds = [...this.userFilter().department_id];
    this.selectedRoleIds       = [...this.userFilter().role_id];
    this.loadDepartments();   // refresh from API
    this.loadRoles();         // refresh from API
    this.userFilterModalOpen.set(true);
  }

  closeUserFilter() {
    this.deptDropOpen = false;
    this.roleDropOpen = false;
    this.userFilterModalOpen.set(false);
  }

  // ── Department filter ─────────────────────────────────────────
  toggleDepartmentFilter(id: string) {
    const sid = String(id);
    this.selectedDepartmentIds = this.selectedDepartmentIds.includes(sid)
      ? this.selectedDepartmentIds.filter(x => x !== sid)
      : [...this.selectedDepartmentIds, sid];
  }

  toggleAllDepartments() {
    this.selectedDepartmentIds =
      this.selectedDepartmentIds.length === this.departments().length
        ? []
        : this.departments().map(d => String(d.DepartmentId));
  }

  getDepartmentName(id: string): string {
    return this.departments().find(d => String(d.DepartmentId) === String(id))?.DepartmentName ?? id;
  }

  // ── Role filter ───────────────────────────────────────────────
 toggleRoleFilter(id: string) {
    const sid = String(id);
    this.selectedRoleIds = this.selectedRoleIds.includes(sid)
      ? this.selectedRoleIds.filter(x => x !== sid)
      : [...this.selectedRoleIds, sid];
  }

  toggleAllRoles() {
    this.selectedRoleIds =
      this.selectedRoleIds.length === this.rolesList().length
        ? []
        : this.rolesList().map(r => String(r.roleId));
  }


  getRoleName(id: string): string {
    return this.rolesList().find(r => String(r.roleId) === String(id))?.roleName ?? id;
  }

  // ── Apply / Reset filter ──────────────────────────────────────
  applyUserFilter() {
    this.userFilter.set({
      department_id: [...this.selectedDepartmentIds],
      role_id:       [...this.selectedRoleIds]
    });
    this.currentPage.set(1);
    this.closeUserFilter();
    this.loadUsers();
  }

  resetUserFilter() {
    this.selectedDepartmentIds = [];
    this.selectedRoleIds       = [];
    this.userFilter.set({ department_id: [], role_id: [] });
    this.currentPage.set(1);
    this.closeUserFilter();
    this.loadUsers();
  }
}