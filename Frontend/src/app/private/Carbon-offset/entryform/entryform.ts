import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { ReportService } from './entryformservice';

interface TreeEntry {
  EntryId: number;
  ProjectId: number;
  TreeId: number;
  TreeName: string;
  Co2AbsorptionPerYear: number;
  TreeCount: number;
  Co2Total: number;
  IsActive: boolean;
}

@Component({
  selector: 'app-entryform',
  standalone: true,
  templateUrl: './entryform.html',
  styleUrls: ['./entryform.css'],
  imports: [CommonModule, ReactiveFormsModule]
})
export class EntryFormComponent implements OnInit {

  form!: FormGroup;

  years: number[] = [2025, 2024, 2023];
  projects: any[] = [];

  treeData = signal<TreeEntry[]>([]);
  emission = signal(0);

  // ✅ SUMMARY FIX
  summary = {
    totalOffset: 0,
    remaining: 0
  };

  // PAGINATION
  requestedRecords = signal(5);
  currentPage = signal(1);
  totalRecords = signal(0);
  totalPages = signal(1);
  searchText = signal('');
  sortColumn = signal('TreeName');
  sortDirection = signal<'asc' | 'desc'>('asc');

  constructor(private fb: FormBuilder, private service: ReportService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      year: [''],
      projectId: [''],
      searchText: ['']
    });

    this.form.get('searchText')?.valueChanges.subscribe(val => {
      this.searchText.set(val || '');
      this.currentPage.set(1);
      this.loadTreeEntries();
    });
  }

  // ================= YEAR =================
  onYearChange() {
    const year = this.form.value.year;
    if (!year) return;

    this.service.getProjectsByYear(year).subscribe((res: any) => {
      this.projects = res.data;
    });
  }

  // ================= PROJECT =================
  onProjectChange() {
    this.currentPage.set(1);
    this.loadTreeEntries();
  }

  // ================= LOAD =================
  loadTreeEntries() {
  const { year, projectId } = this.form.value;

  if (!year || !projectId) return;

  this.service.getEntries(
    year,
    projectId,
    this.currentPage(),
    this.requestedRecords(),
    this.searchText(),
    this.sortColumn(),
    this.sortDirection()
  ).subscribe({
    next: (res: any) => {

      // ✅ DIRECT RESPONSE (no res.data.data nonsense now)
      this.treeData.set(res.data || []);

      this.totalRecords.set(res.totalRecords || 0);
      this.totalPages.set(Math.ceil(this.totalRecords() / this.requestedRecords()));

      // ✅ SUMMARY
      this.emission.set(res.summary?.previousYearEmission || 0);
      this.summary.totalOffset = res.summary?.totalOffset || 0;
      this.summary.remaining = res.summary?.remainingEmission || 0;
    },
    error: () => Swal.fire('Error', 'Failed to load data', 'error')
  });
}

  // ================= SAVE =================
 saveEntry(tree: any, count: number) {

  const payload = {
    ProjectId: tree.projectId,
    TreeId: tree.treeId,
    TreeCount: Number(count),
    IsActive: true,
    EntryBy: 1
  };

  this.service.saveEntry(payload).subscribe({
    next: () => {
      Swal.fire('Success', 'Entry saved successfully', 'success');
      this.loadTreeEntries();
    },
    error: (err: any) =>
      Swal.fire('Error', err?.message || 'Save failed', 'error')
  });
}

  // ================= PAGINATION =================
  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.loadTreeEntries();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.loadTreeEntries();
    }
  }

  onRecordsChange(event: any) {
    this.requestedRecords.set(+event.target.value);
    this.currentPage.set(1);
    this.loadTreeEntries();
  }

  // ================= RESET =================
  reset() {
    this.form.reset();
    this.treeData.set([]);
    this.projects = [];
    this.emission.set(0);
    this.summary = { totalOffset: 0, remaining: 0 };
  }
}