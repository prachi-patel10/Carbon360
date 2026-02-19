import { Component, OnInit, signal, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { debounceTime } from 'rxjs/operators';
import { RoleService } from './role-service';
import type { MasterRole } from './role-service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-master-role',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './role.html',
  styleUrls: ['./role.css']
})
export class MasterRoleComponent implements OnInit {

  username: string | null = '';
  userId = 0;

  roleForm!: FormGroup;
  searchForm!: FormGroup;

  // ✅ SIGNALS
  roles = signal<MasterRole[]>([]);
  requestedRecords = signal(5);
  currentPage = signal(1);
  totalPages = signal(0);
  searchText = signal('');
  onlyActive = signal(false);
  totalRecords = signal(0);



  sortColumn = 'RoleName';
  sortDirection: 'ASC' | 'DESC' = 'ASC';

  constructor(
    private fb: FormBuilder,
    private service: RoleService,
    private toastr: ToastrService
  ) {
    effect(() => {
      this.service.getPaged(
        this.currentPage(),
        this.requestedRecords(),
        this.searchText(),
        this.onlyActive(),
        this.sortColumn,
        this.sortDirection
      ).subscribe(res => {
        this.roles.set(res?.data ?? []);
        this.totalPages.set(res?.totalPages ?? 0);
        this.totalRecords.set(res?.totalRecords ?? 0);

      });
    });
  }

  ngOnInit(): void {
    this.username = localStorage.getItem('username');
    this.userId = Number(localStorage.getItem('userId')) || 0;

    this.initForm();
    this.initSearchForm();


  }

  /* ================= FORM ================= */
  initForm() {
    this.roleForm = this.fb.group({
      RoleId: [0],
      RoleName: ['', Validators.required],
      ShortCode: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(3)
      ]],
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
  sort(column: string): void {
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

  /* ================= PAGINATION ================= */
  /* ================= COLUMN CLICK PAGINATION ================= */

  // Click ShortCode → Next Page
  nextPageByShortCode() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  // Click RoleName → Previous Page
  previousPageByRoleName() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }


  onSortChange(event: any) {
    const value = event.target.value;
    const parts = value.split('-');
    this.sortColumn = parts[0];
    this.sortDirection = parts[1] as 'ASC' | 'DESC';
    this.currentPage.set(1);
  }

  /* ================= SUBMIT ================= */
 submit() {
  if (this.roleForm.invalid) {
    this.roleForm.markAllAsTouched();
    return;
  }

  const payload = this.roleForm.value;

  const obs = payload.RoleId === 0
    ? this.service.create(payload)
    : this.service.update(payload);

  obs.subscribe({
    next: () => {

      this.toastr.success(
        payload.RoleId === 0
          ? 'Role created successfully'
          : 'Role updated successfully'
      );

      // ✅ DO NOT manually update roles signal
      // Instead re-fetch properly

      this.currentPage.set(1); // or keep same page if you want

      this.resetForm();
    },
    error: () => this.toastr.error('Operation failed')
  });
}

  /* ================= EDIT ================= */
  edit(role: MasterRole) {
    this.roleForm.patchValue({
      RoleId: role.RoleId,
      RoleName: role.RoleName,
      ShortCode: role.ShortCode,
      IsActive: role.IsActive
    });
  }

  /* ================= DELETE ================= */
  deleteUI(role: MasterRole) {
    if (!confirm('Delete this role?')) return;

    this.service.delete(role.RoleId).subscribe({
      next: () => {
        this.toastr.success('Role deleted successfully');

        // Remove from signal instantly
        this.roles.update(list =>
          list.filter(r => r.RoleId !== role.RoleId)
        );
      },
      error: () => this.toastr.error('Delete failed')
    });
  }


  /* ================= TOGGLE ACTIVE ================= */
  toggleActive(role: MasterRole) {
    const action = role.IsActive ? 'Deactivated' : 'Activated';

    if (!confirm(`Do you want to ${action} this role?`)) return;

    this.service.toggleActive(role.RoleId).subscribe({
      next: () => {
        this.toastr.success(`Role ${action} successfully`);

        // ✅ Update signal manually (IMPORTANT)
        this.roles.update(list =>
          list.map(r =>
            r.RoleId === role.RoleId
              ? { ...r, IsActive: !r.IsActive }
              : r
          )
        );
      },
      error: () => this.toastr.error('Action failed')
    });
  }
  /* ================= RESET ================= */
  resetForm() {
    this.roleForm.reset({ RoleId: 0, IsActive: true });
  }

  logout() {
    localStorage.clear();
    window.location.href = '/login';
  }

  checkShortCode() {
    const control = this.roleForm.get('ShortCode');

    if (!control) return;

    const shortCode = control.value?.trim();

    if (!shortCode || shortCode.length < 2) return;

    const roleId = this.roleForm.get('RoleId')?.value || 0;

    this.service.checkShortCode(shortCode, roleId)
      .subscribe({
        next: (exists: boolean) => {
          if (exists) {
            control.setErrors({ duplicate: true });
          } else {
            // remove duplicate error if exists
            if (control.hasError('duplicate')) {
              control.updateValueAndValidity();
            }
          }
        },
        error: () => {
          console.error('ShortCode validation failed');
        }
      });
  }

}
