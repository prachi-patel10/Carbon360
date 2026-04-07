import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProjectService } from './project-service';
import Swal from 'sweetalert2';

interface Project {
  ProjectId: string;
  ProjectName: string;
  FinancialYear: string;
  IsActive: boolean;
}

@Component({
  selector: 'app-project',
  standalone: true,
  templateUrl: './plantation-project.html',
  styleUrls: ['./plantation-project.css'],
  imports: [CommonModule, ReactiveFormsModule]
})
export class ProjectComponent implements OnInit {

  projectForm!: FormGroup;
  searchForm!: FormGroup;

  projects = signal<Project[]>([]);
  searchText = signal('');
  currentPage = signal(1);
  requestedRecords = signal(5);
  pageSizeOptions = [5, 10, 20];
totalRecords = signal(0);
totalPages = signal(1);

  onlyActive = signal<boolean>(true);

  sortColumn = 'ProjectName';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private fb: FormBuilder, private service: ProjectService) {}

  ngOnInit() {
    this.initForms();
    this.loadProjects();
  }

  initForms() {
    this.projectForm = this.fb.group({
      ProjectId: [''],
      ProjectName: ['', Validators.required],
      FinancialYear: ['', Validators.required],
      IsActive: [true]
    });

    this.searchForm = this.fb.group({
      searchText: ['']
    });

    this.searchForm.get('searchText')?.valueChanges.subscribe(val => {
  this.searchText.set(val || '');
  this.currentPage.set(1);
  this.loadProjects();   // ✅ MUST CALL
});
  }

  loadProjects() {
  this.service.getPaged(
    this.currentPage(),
    this.requestedRecords(),
    this.searchText(),
    this.sortColumn,
    this.sortDirection
  ).subscribe((res: any) => {

    console.log('API RESPONSE:', res);

    // ✅ HANDLE BOTH STRUCTURES
    const dataBlock = res.data?.data ? res.data : res;

    const list = dataBlock.data || [];

    const mapped = list.map((p: any) => ({
      ProjectId: p.projectId,
      ProjectName: p.projectName,
      FinancialYear: p.financialYear,
      IsActive: p.isActive
    }));

    this.projects.set(mapped);

    // ✅ SAFE SET
      this.totalRecords.set(res.totalCount);
     this.totalPages.set(
      Math.ceil(res.totalCount / this.requestedRecords())
    );
  
  });
}

  submitProject() {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    const proj = this.projectForm.value;
    const isCreate = !proj.ProjectId;

    const obs = isCreate
      ? this.service.create(proj)
      : this.service.update(proj);

    obs.subscribe(() => {
      Swal.fire('Success', 'Saved successfully', 'success');
      this.loadProjects();
      this.resetForm();
    });
  }

  edit(p: Project) {
    this.projectForm.patchValue(p);
  }

  resetForm() {
    this.projectForm.reset({
      ProjectId: '',
      ProjectName: '',
      FinancialYear: '',
      IsActive: true
    });
  }

 deleteUI(p: Project) {
  Swal.fire({
    title: 'Are you sure?',
    showCancelButton: true
  }).then(res => {
    if (res.isConfirmed) {

      // ✅ INSTANT UI UPDATE
      this.projects.update(list =>
        list.filter(x => x.ProjectId !== p.ProjectId)
      );

      this.service.delete(p.ProjectId).subscribe({
        next: () => {
          Swal.fire('Deleted!', '', 'success');
        },
        error: () => {
          Swal.fire('Error!', 'Delete failed', 'error');
          this.loadProjects(); // rollback
        }
      });
    }
  });
}
 toggleActive(p: Project) {

  const newStatus = !p.IsActive;

  // ✅ instant update
  this.projects.update(list =>
    list.map(x =>
      x.ProjectId === p.ProjectId
        ? { ...x, IsActive: newStatus }
        : x
    )
  );

  this.service.toggleActive(p.ProjectId).subscribe({
    error: () => this.loadProjects()
  });
}
sort(column: string) {
  if (this.sortColumn === column)
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  else {
    this.sortColumn = column;
    this.sortDirection = 'asc';
  }

  this.loadProjects(); // ✅ backend sorting
}
 getSortIcon(column: string) {
  if (this.sortColumn !== column) return '↕';
  return this.sortDirection === 'asc' ? '↑' : '↓';
}


  // ================= PAGINATION =================
  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.loadProjects();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.loadProjects();
    }
  }

  onRecordsChange(event: any) {
    this.requestedRecords.set(+event.target.value);
    this.currentPage.set(1);
    this.loadProjects();
  }

  // ================= ACTIVE FILTER =================
  onActiveFilterChange(e: any) {
    this.onlyActive.set(e.target.checked);
    this.currentPage.set(1);
    this.loadProjects();
  }

}