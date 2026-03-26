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
  ) { }

  userForm!: FormGroup;

  // ── Signals ───────────────────────────────────────────────────
  users = signal<any[]>([]);
  rolesList = signal<any[]>([]);
  departments = signal<any[]>([]);
  searchText = signal<string>('');
  onlyActive = signal<boolean | undefined>(true);
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  totalRecords = signal<number>(0);
  requestedRecords = signal<number>(5);
  userFilterModalOpen = signal(false);
  loadingDepartments = signal(false);
  loadingRoles = signal(false);

  pageSizeOptions = [5, 10, 15, 20];

  editingUserId: string | null = null;
  showRoleDropdown = false;
  sortColumn = 'FName';
  sortDirection: 'ASC' | 'DESC' = 'ASC';

  // ── Filter state ──────────────────────────────────────────────
  // These are the PENDING selections inside the modal (not yet applied)
  selectedDepartmentIds: string[] = [];
  selectedRoleIds: string[] = [];

  deptDropOpen = false;
  roleDropOpen = false;

  // These are the APPLIED filter values (used for API calls + badge count)
  userFilter = signal({
    department_id: [] as string[],
    role_id: [] as string[]
  });

  // ── Close dropdowns when clicking outside ─────────────────────
  @HostListener('document:click', ['$event'])
onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  // Close panels ONLY when clicking outside the modal entirely
  // vf-panel has no stopPropagation so we must check for panel/trigger too
  if (
    !target.closest('.vf-modal') ||
    (!target.closest('.vf-panel') && !target.closest('.vf-trigger') && !target.closest('.vf-col'))
  ) {
    // Only close if clicking outside the modal
    if (!target.closest('.vf-modal')) {
      this.deptDropOpen = false;
      this.roleDropOpen = false;
    }
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
  // ── Load data ─────────────────────────────────────────────────
  loadRoles() {
  this.loadingRoles.set(true);
  this.service.getRoles().subscribe({
    next: (res: any) => {
      console.log('RAW ROLES API RESPONSE:', JSON.stringify(res));  // ← ADD THIS
      this.rolesList.set((res?.data ?? []).map((r: any) => ({
        roleId:   String(r.id),
        roleName: r.roleName
      })));
      console.log('MAPPED rolesList:', this.rolesList());  // ← ADD THIS
      this.loadingRoles.set(false);
    },
    error: () => { this.toastr.error('Failed to load roles'); this.loadingRoles.set(false); }
  });
}

 loadDepartments() {
    this.loadingDepartments.set(true);
    this.service.getDepartments().subscribe({
      next: (res: any) => {
        const list = res.data?.data || res.data || [];
        this.departments.set(list.map((d: any) => ({
          DepartmentId:   String(d.departmentId || d.id),
          DepartmentName: d.departmentName,
          IsActive:       d.isActive
        })));
        this.loadingDepartments.set(false);
      },
      error: () => { this.loadingDepartments.set(false); }
    });
  }


  loadUsers() {
  const filter = this.userFilter();

  const deptIds = filter.department_id.length > 0
    ? filter.department_id.join(',')
    : undefined;

  const roleIds = filter.role_id.length > 0
    ? filter.role_id.join(',')
    : undefined;

  this.service.getPaged(
    this.currentPage(),
    this.requestedRecords(),
    this.searchText() || undefined,
    this.onlyActive() ?? undefined,
    deptIds,
    roleIds,
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

  // ── Filter modal ──────────────────────────────────────────────
  openUserFilter() {
    this.selectedDepartmentIds = [...this.userFilter().department_id];
    this.selectedRoleIds = [...this.userFilter().role_id];
    this.deptDropOpen = false;
    this.roleDropOpen = false;
    this.userFilterModalOpen.set(true);
  }

 
  toggleAllDepartments(event?: Event) {
    event?.stopPropagation();
    this.selectedDepartmentIds =
      this.selectedDepartmentIds.length === this.departments().length
        ? []
        : this.departments().map(d => String(d.DepartmentId));
  }

  // ── Role filter ───────────────────────────────────────────────
  toggleRoleFilter(id: string, event?: Event) {
    event?.stopPropagation();
    const sid = String(id);
    this.selectedRoleIds = this.selectedRoleIds.includes(sid)
      ? this.selectedRoleIds.filter(x => x !== sid)
      : [...this.selectedRoleIds, sid];
  }

  toggleAllRoles(event?: Event) {
    event?.stopPropagation();
    this.selectedRoleIds =
      this.selectedRoleIds.length === this.rolesList().length
        ? []
        : this.rolesList().map(r => String(r.roleId));
  }

  isRoleSelected(id: string): boolean {
    return this.selectedRoleIds.includes(String(id));
  }

  getRoleName(id: string): string {
    return this.rolesList().find(r => String(r.roleId) === String(id))?.roleName ?? id;
  }

  // ── Apply / Reset filter ──────────────────────────────────────
  applyUserFilter() {
    this.userFilter.set({
      department_id: [...this.selectedDepartmentIds],
      role_id: [...this.selectedRoleIds]
    });
    this.currentPage.set(1);
    this.closeUserFilter();
    this.loadUsers();
  }

  resetUserFilter() {
    this.selectedDepartmentIds = [];
    this.selectedRoleIds = [];
    this.userFilter.set({ department_id: [], role_id: [] });
    this.currentPage.set(1);
    this.loadUsers();
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
          next: () => { Swal.fire('Deleted!', 'User deleted successfully.', 'success'); this.loadUsers(); },
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

  // ── Search / Filters ──────────────────────────────────────────
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
    const selectedIds: string[] = (this.userForm.value.RoleIds || []).map((id: any) => String(id));
    return this.rolesList()
      .filter(r => selectedIds.includes(String(r.roleId)))
      .map(r => r.roleName)
      .join(', ');
  }

  onRoleChange(event: any) {
    const roleId = String(event.target.value);
    let selectedRoles: string[] = (this.userForm.get('RoleIds')?.value || []).map((id: any) => String(id));
    if (event.target.checked) {
      if (!selectedRoles.includes(roleId)) selectedRoles = [...selectedRoles, roleId];
    } else {
      selectedRoles = selectedRoles.filter(r => r !== roleId);
    }
    this.userForm.get('RoleIds')?.setValue(selectedRoles);
  }

  isFormRoleChecked(roleId: string): boolean {
    const selected: any[] = this.userForm.get('RoleIds')?.value || [];
    return selected.map((id: any) => String(id)).includes(String(roleId));
  }

  // ── Filter modal ──────────────────────────────────────────────
  
  closeUserFilter() {
    this.deptDropOpen = false;
    this.roleDropOpen = false;
    this.userFilterModalOpen.set(false);
  }

  // ── Badge count (applied filters only) ───────────────────────
  get appliedFilterCount(): number {
    return this.userFilter().department_id.length + this.userFilter().role_id.length;
  }

  // ── Role trigger & rows ───────────────────────────────────────
onRoleTriggerClick(event: MouseEvent) {
  event.stopPropagation();
  this.roleDropOpen = !this.roleDropOpen;
  this.deptDropOpen = false;
}

onRoleRowClick(id: string, event: MouseEvent) {
  event.stopPropagation();
  console.log('ROW CLICKED id:', id, 'current selectedRoleIds:', this.selectedRoleIds);
  const sid = String(id);
  this.selectedRoleIds = this.selectedRoleIds.includes(sid)
    ? this.selectedRoleIds.filter(x => x !== sid)
    : [...this.selectedRoleIds, sid];
  console.log('AFTER CLICK selectedRoleIds:', this.selectedRoleIds);
}

onToggleAllRoles(event: MouseEvent) {
  event.stopPropagation();
  this.selectedRoleIds =
    this.selectedRoleIds.length === this.rolesList().length
      ? []
      : this.rolesList().map(r => String(r.roleId));
}

// ── Department trigger & rows ─────────────────────────────────
onDeptTriggerClick(event: MouseEvent) {
  event.stopPropagation();
  this.deptDropOpen = !this.deptDropOpen;
  this.roleDropOpen = false;
}

onDeptRowClick(id: string, event: MouseEvent) {
  event.stopPropagation();
  const sid = String(id);
  this.selectedDepartmentIds = this.selectedDepartmentIds.includes(sid)
    ? this.selectedDepartmentIds.filter(x => x !== sid)
    : [...this.selectedDepartmentIds, sid];
}

onToggleAllDepartments(event: MouseEvent) {
  event.stopPropagation();
  this.selectedDepartmentIds =
    this.selectedDepartmentIds.length === this.departments().length
      ? []
      : this.departments().map(d => String(d.DepartmentId));
}

// Keep these for chip removal in the header
toggleDepartmentFilter(id: string, event?: Event) {
  event?.stopPropagation();
  const sid = String(id);
  this.selectedDepartmentIds = this.selectedDepartmentIds.includes(sid)
    ? this.selectedDepartmentIds.filter(x => x !== sid)
    : [...this.selectedDepartmentIds, sid];
}

isDepartmentSelected(id: string): boolean {
  return this.selectedDepartmentIds.includes(String(id));
}

getDepartmentName(id: string): string {
  return this.departments().find(d => String(d.DepartmentId) === String(id))?.DepartmentName ?? id;
}
}