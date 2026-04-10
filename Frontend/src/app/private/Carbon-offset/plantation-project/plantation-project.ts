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

  years: number[] = [];
currentYear = new Date().getFullYear();
financialYearRange: string = '';

  projects = signal<Project[]>([]);
  searchText = signal('');
  currentPage = signal(1);
  requestedRecords = signal(5);
  pageSizeOptions = [5, 10, 20];
totalRecords = signal(0);
totalPages = signal(1);

  onlyActive = signal<boolean>(true);
isUserSorting = false;
  sortColumn = 'ProjectName';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private fb: FormBuilder, private service: ProjectService) {}

  ngOnInit() {
    this.initForms();
    this.loadProjects();
     const currentFYEnd = this.getCurrentFinancialYearEnd();

  for (let i = 0; i < 10; i++) {
    this.years.push(currentFYEnd + i); // ✅ start from FY, not calendar
  }

  // ✅ auto-select current FY
  this.projectForm.patchValue({
    FinancialYear: currentFYEnd
  });

  this.onYearChange();
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
    this.isUserSorting ? this.sortColumn : '',   // ✅ only if user sorts
    this.isUserSorting ? this.sortDirection : '' // ✅ else no sorting
  ).subscribe((res: any) => {

    const dataBlock = res.data?.data ? res.data : res;
    const list = dataBlock.data || [];

    const mapped = list.map((p: any) => ({
      ProjectId: p.projectId,
      ProjectName: p.projectName,
      FinancialYear: p.financialYear,
      IsActive: p.isActive
    }));

    this.projects.set(mapped);

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
  this.onYearChange(); // 🔥 must call
}
  resetForm() {
    this.projectForm.reset({
      ProjectId: '',
      ProjectName: '',
      FinancialYear: '',
      IsActive: true
      
    });
     this.financialYearRange = ''; 
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
  this.isUserSorting = true;  // ✅ IMPORTANT

  if (this.sortColumn === column)
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  else {
    this.sortColumn = column;
    this.sortDirection = 'asc';
  }

  this.loadProjects();
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


  getCurrentFinancialYearEnd(): number {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // Jan = 1

  // If month >= April → next year is FY end
  return month >= 4 ? year + 1 : year;
}

 onYearChange() {
  const selectedYear = +this.projectForm.get('FinancialYear')?.value;

  if (!selectedYear) {
    this.financialYearRange = '';
    return;
  }

  const startYear = selectedYear - 1;
  const shortYear = selectedYear.toString().slice(-2);

  this.financialYearRange =
    `FY ${startYear}-${shortYear} (1-Apr-${startYear} to 31-Mar-${selectedYear})`;
}

}