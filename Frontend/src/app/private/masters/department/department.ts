import { Component, OnInit, signal, effect } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DepartmentService } from './department-service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

interface Department {
  DepartmentId: string;
  DepartmentName: string;
  IsActive: boolean;
}

@Component({
  selector: 'app-department',
  templateUrl: './department.html',
  styleUrls: ['./department.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class DepartmentComponent implements OnInit {

  departmentForm!: FormGroup;
  searchForm!: FormGroup;
sortColumn = 'DepartmentName';
sortDirection: 'asc' | 'desc' = 'asc';
  // Signals
  departments = signal<Department[]>([]);
  totalRecords = signal(0);
  totalPages = signal(1);
  currentPage = signal(1);
  requestedRecords = signal(5);
  onlyActive = signal(false);
  searchText = signal('');
  refreshTrigger = signal(0);
  departmentFilterModalOpen = signal(false);
pageSizeOptions = [5, 10, 15,20];
  selectedDepartmentIds: string[] = [];
  appliedDepartmentIds: string[] = [];

  constructor(
    private fb: FormBuilder,
    private service: DepartmentService,
    private toastr: ToastrService
  ) {


    effect(() => {

      // register dependencies
      const page = this.currentPage();
      const size = this.requestedRecords();
      const search = this.searchText();
      const active = this.onlyActive();
      this.refreshTrigger(); // important dependency

      this.loadDepartments(page, size, search, active);
    });
  }

  openDepartmentFilter() {
  this.departmentFilterModalOpen.set(true);
}

closeDepartmentFilter() {
  this.departmentFilterModalOpen.set(false);
}

toggleDepartmentFilter(id: string) {

  if (this.selectedDepartmentIds.includes(id)) {
    this.selectedDepartmentIds =
      this.selectedDepartmentIds.filter(x => x !== id);
  }
  else {
    this.selectedDepartmentIds.push(id);
  }

}
sort(column: string) {
  if (this.sortColumn === column)
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  else {
    this.sortColumn = column;
    this.sortDirection = 'asc';
  }

  const sorted = [...this.departments()].sort((a: any, b: any) => {
    let valA = a[column] ?? '';
    let valB = b[column] ?? '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  this.departments.set(sorted);
}

getSortIcon(column: string): string {
  if (this.sortColumn !== column) return '↕';
  return this.sortDirection === 'asc' ? '↑' : '↓';
}

applyDepartmentFilter() {

  this.departmentFilterModalOpen.set(false);

  this.appliedDepartmentIds = [...this.selectedDepartmentIds];
  this.currentPage.set(1);

  // trigger reload
  this.refreshTrigger.update(v => v + 1);


}

ResetDepartmentFilter() {

  // clear selected checkboxes
  this.selectedDepartmentIds = [];

  // remove applied filter
  this.appliedDepartmentIds = [];

  // reset page
  this.currentPage.set(1);

  // reload data
  this.refreshTrigger.update(v => v + 1);

  // close modal
  this.departmentFilterModalOpen.set(false);
}

  ngOnInit(): void {
    this.initForms();
  }

  // ================== FORMS ==================
  initForms() {

    this.departmentForm = this.fb.group({
      DepartmentId: [''],
      DepartmentName: ['', Validators.required],
      IsActive: [true],
    });

    this.searchForm = this.fb.group({
      searchText: [''],
    });

    this.searchForm.get('searchText')?.valueChanges.subscribe(val => {
      this.searchText.set(val || '');
      this.currentPage.set(1);
    });
  }

  // ================== LOAD DATA ==================
  loadDepartments(
    page: number,
    size: number,
    search: string,
    active: boolean
  ) {
    this.service
      .getPaged(page, size, search, active)
      .subscribe({
        next: (res: any) => {

          const result = res.data;

          const mappedData = result.data.map((d: any) => ({
            DepartmentId: d.id,
            DepartmentName: d.departmentName,
            IsActive: d.isActive
          }));

          this.departments.set(mappedData);
          this.totalRecords.set(result.totalRecords);
          this.totalPages.set(result.totalPages);
        },
        error: () => this.toastr.error('Failed to load departments'),
      });
  }

  // ================== PAGINATION ==================

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }
  

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  onRecordsChange(event: any) {
    const val = +event.target.value;
    if (val > 0) {
      this.requestedRecords.set(val);
      this.currentPage.set(1);
    }
  }

  onActiveFilterChange(event: any) {
    this.onlyActive.set(event.target.checked);
    this.currentPage.set(1);
  }

  clearSearch() {
    this.searchForm.patchValue({ searchText: '' });
    this.searchText.set('');
    this.currentPage.set(1);
  }



  submitdept() {

    if (this.departmentForm.invalid) return;

    const dept = this.departmentForm.value;

    const isCreate = !dept.DepartmentId;

    const obs = isCreate
      ? this.service.create(dept)
      : this.service.update(dept);

    obs.subscribe({
      next: (res: any) => {

        this.toastr.success('Department saved successfully');

        if (isCreate) {
          // Reload only for create (optional)
          this.refreshTrigger.update(v => v + 1);
        } else {
          
          this.departments.update(list =>
            list.map(d =>
              d.DepartmentId === dept.DepartmentId
                ? {
                  ...d,
                  DepartmentName: dept.DepartmentName,
                  IsActive: dept.IsActive   
                }
                : d
            )
          );
        }

        this.resetForm();
      },
      error: () => this.toastr.error('Save failed'),
    });
  }

  //EDIT
  edit(dept: Department) {
    this.departmentForm.patchValue(dept);
  }

  resetForm() {
    this.departmentForm.reset({
      DepartmentId: '',
      DepartmentName: '',
      IsActive: true,
    });
  }

  deleteUI(dep: Department) {

    Swal.fire({
      title: 'Are you sure?',
      text: "This will soft delete the department!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {

      if (result.isConfirmed) {

        this.service.delete(dep.DepartmentId).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Department deleted successfully.', 'success');
            this.refreshTrigger.update(v => v + 1);
          },
          error: () => {
            Swal.fire('Error!', 'Delete failed.', 'error');
          }
        });

      }

    });
  }

  toggleActive(dep: Department) {

    const newStatus = !dep.IsActive;

    Swal.fire({
      title: 'Are you sure?',
      text: `Change status to ${newStatus ? 'Active' : 'Inactive'}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1b5e20',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, change it!'
    }).then((result) => {

      if (result.isConfirmed) {

        this.service.toggleActive(dep.DepartmentId).subscribe({
          next: () => {

            // ✅ UPDATE SIGNAL LOCALLY (IMPORTANT)
            this.departments.update(list =>
              list.map(d =>
                d.DepartmentId === dep.DepartmentId
                  ? { ...d, IsActive: newStatus }
                  : d
              )
            );

            Swal.fire('Updated!', 'Status updated successfully.', 'success');

          },
          error: () => {
            Swal.fire('Error!', 'Status update failed.', 'error');
          }
        });
      }
    });
  }

  get isEditMode(): boolean {
    return !!this.departmentForm.get('DepartmentId')?.value;
  }

  get startRecord(): number {
  if (this.totalRecords() === 0) return 0;
  return (this.currentPage() - 1) * this.requestedRecords() + 1;
}

get endRecord(): number {
  const end = this.currentPage() * this.requestedRecords();
  return end > this.totalRecords() ? this.totalRecords() : end;
}

}