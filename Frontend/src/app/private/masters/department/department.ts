import { Component, effect, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DepartmentService, MasterDepartment } from './department-service';
import { ToastrService } from 'ngx-toastr';
import { debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-department',
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './department.html',
  styleUrl: './department.css',
})
export class Department  implements OnInit{
   departmentForm!: FormGroup;
  searchForm!: FormGroup;

  departments = signal<MasterDepartment[]>([]);
  requestedRecords = signal(5);
  currentPage = signal(1);
  searchText = signal('');
  onlyActive = signal(false);
  totalRecords=signal(0);

  constructor(
    private fb: FormBuilder,
    private service: DepartmentService,
    private toastr: ToastrService
  ) {
    // effect(() => {
    //   this.service.getAll().subscribe({
    //     next: (res: any) => {
    //       this.departments.set(res?.data ?? []);
    //     },
    //     error: () => this.toastr.error('Failed to load departments')
    //   });
    // });
  }

  ngOnInit(): void {
    this.initForm();
    this.initSearchForm();
    this.loadDepartments();
  }

  /* ================= LOAD ================= */
 loadDepartments() {
  this.service.getAll().subscribe({
    next: (res: any) => {

      const mapped = res.data.map((d: any) => ({
        DepartmentId: d.departmentId ?? d.id,
        DepartmentName: d.departmentName,
        IsActive: d.isActive,
         IsDeleted: d.isDeleted ?? false
      }));

      this.departments.set(mapped);
      this.totalRecords.set(mapped.length);
    },
    error: () => this.toastr.error('Failed to load departments')
  });
}
  /* ================= FORM ================= */
  initForm() {
    this.departmentForm = this.fb.group({
      DepartmentId: [0],
      DepartmentName: ['', Validators.required],
      //  DepartmentDescription: ['', Validators.required],
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

  /* ================= FILTER ================= */
  onActiveFilterChange(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.onlyActive.set(checked);
  }

  onRecordsChange(e: any) {
    this.requestedRecords.set(Number(e.target.value));
  }

  previousPageByDepartmentName() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  nextPageByShortCodeDept() {
    this.currentPage.set(this.currentPage() + 1);
  }


  /* ================= SUBMIT ================= */
 submitdept() {
  if (this.departmentForm.invalid) {
    this.departmentForm.markAllAsTouched();
    return;
  }

  const payload: MasterDepartment = {
    DepartmentId: this.departmentForm.value.DepartmentId,
    DepartmentName: this.departmentForm.value.DepartmentName,
    IsActive: this.departmentForm.value.IsActive,
    IsDeleted: false
  };

  const obs = payload.DepartmentId === 0
    ? this.service.create(payload)
    : this.service.update(payload);

  obs.subscribe({
    next: () => {
      this.toastr.success(
        payload.DepartmentId === 0
          ? 'Department created successfully'
          : 'Department updated successfully'
      );
      this.loadDepartments();
      this.resetForm();
    },
    error: (err) => {
      console.log(err.error); // see backend validation
      this.toastr.error('Operation failed');
    }
  });
}
  /* ================= EDIT ================= */
  edit(dep: MasterDepartment) {
  this.departmentForm.patchValue({
    DepartmentId: dep.DepartmentId,
    DepartmentName: dep.DepartmentName,
    IsActive: dep.IsActive
  });
}

  /* ================= DELETE ================= */
  deleteUI(dep: MasterDepartment) {
    if (!confirm('Delete this department?')) return;

    this.service.delete(dep.DepartmentId).subscribe({
      next: () => {
        this.toastr.success('Department deleted successfully');
         this.loadDepartments();
        // this.departments.update(list =>
        //   list.filter(d => d.DepartmentId !== dep.DepartmentId)
        // );
      },
      error: () => this.toastr.error('Delete failed')
    });
  }

  /* ================= TOGGLE ACTIVE ================= */
  toggleActive(dep: MasterDepartment) {

    const action = dep.IsActive ? 'Deactivated' : 'Activated';

    if (!confirm(`Do you want to ${action} this department?`)) return;

    this.service.toggleActive(dep.DepartmentId).subscribe({
      next: () => {
        this.toastr.success(`Department ${action} successfully`);
        this.loadDepartments();

        // this.departments.update(list =>
        //   list.map(d =>
        //     d.DepartmentId === dep.DepartmentId
        //       ? { ...d, IsActive: !d.IsActive }
        //       : d
        //   )
        // );
      },
      error: () => this.toastr.error('Action failed')
    });
  }

  /* ================= RESET ================= */
  resetForm() {
    this.departmentForm.reset({ DepartmentId: 0,DepartmentName: '', IsActive: true });
  }

  logoutdept() {
    localStorage.clear();
    window.location.href = '/login';
  }

}


