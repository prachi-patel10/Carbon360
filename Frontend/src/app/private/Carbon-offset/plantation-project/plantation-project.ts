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
      this.loadProjects();
    });
  }

  loadProjects() {
    this.service.getAll(this.searchText()).subscribe((res: any) => {

      const mapped = res.data.map((p: any) => ({
        ProjectId: p.id,
        ProjectName: p.projectName,
        FinancialYear: p.financialYear,
        IsActive: p.isActive
      }));

      this.projects.set(mapped);
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
        this.service.delete(p.ProjectId).subscribe(() => {
          this.loadProjects();
        });
      }
    });
  }

  toggleActive(p: Project) {
    this.service.toggleActive(p.ProjectId).subscribe(() => {
      this.loadProjects();
    });
  }

  sort(column: string) {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';

    const sorted = [...this.projects()].sort((a: any, b: any) => {
      return this.sortDirection === 'asc'
        ? a[column].localeCompare(b[column])
        : b[column].localeCompare(a[column]);
    });

    this.projects.set(sorted);
  }

  getSortIcon(column: string) {
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }
}