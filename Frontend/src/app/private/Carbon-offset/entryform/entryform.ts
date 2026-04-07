import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { ReportService } from './entryformservice';

@Component({
  selector: 'app-entryform',
  standalone: true,
  templateUrl: './entryform.html',
  styleUrls: ['./entryform.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
})
export class EntryFormComponent implements OnInit {
  form!: FormGroup;

years: number[] = [];
  projects: any[] = [];

  treeInputs: any[] = [];

  // ✅ LIST
  entries = signal<any[]>([]);
  treeInputsSignal = signal<any[]>([]);
  totalOffset = signal(0);
  remainingEmission = signal(0);
  status = signal('');
  totalRecords = signal(0);

  // ✅ SUMMARY
  summary = {
    totalEmission: 0,
    totalOffset: 0,
    remainingEmission: 0,
    status: '',
  };

  constructor(
    private fb: FormBuilder,
    private service: ReportService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      year: [''],
      projectId: [''],
    });
  this.generateYears();
    this.loadTreeMaster();
    this.loadEntries();
  }

  // ================= PROJECT =================
 onYearChange() {
  const year = Number(this.form.value.year);

  if (!year) return;

  this.service.getProjectsByYear(year).subscribe({
    next: (res: any) => {
      console.log('Projects API:', res);

      const data = Array.isArray(res) ? res : (res?.data || []);

      // ✅ NORMALIZE KEYS
      this.projects = data.map((p: any) => ({
        ProjectId: p.ProjectId ?? p.projectId,
        ProjectName: p.ProjectName ?? p.projectName
      }));

      console.log('Normalized Projects:', this.projects);
    },
    error: () => {
      Swal.fire('Error', 'Projects not loading', 'error');
    }
  });
}
  // ================= TREE MASTER =================
  loadTreeMaster() {
    this.service.getTreeMaster().subscribe({
      next: (res: any) => {
        const trees = res?.data || [];

        this.treeInputsSignal.set(
          trees.map((t: any) => ({
            treeId: t.TreeId,
            treeName: t.treeName,
            co2: t.co2AbsorptionPerYear,
            count: 0,
            total: 0,
          })),
        );
      },
      error: () => Swal.fire('Error', 'Tree not loading', 'error'),
    });
  }
 // ================= YEARS =================
  generateYears() {
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < 10; i++) {
    this.years.push(currentYear - i);
  }
}
  // ================= SAVE =================
 saveAll() {

  const projectId = this.form.value.projectId;

  if (!projectId) {
    Swal.fire('Error', 'Select project first', 'error');
    return;
  }

  const selectedTrees = this.treeInputsSignal()
    .filter(t => t.count > 0)
    .map(t => ({
      treeId: t.treeId,
      treeCount: Number(t.count)
    }));

  if (selectedTrees.length === 0) {
    Swal.fire('Error', 'Enter at least one tree count', 'error');
    return;
  }

  const payload = {
    projectId: projectId,
    trees: selectedTrees
  };

  this.service.saveOffsetEntry(payload).subscribe({
    next: () => {
      Swal.fire('Success', 'Saved successfully', 'success');

      // reset
      this.treeInputsSignal.update(trees =>
        trees.map(t => ({ ...t, count: 0, total: 0 }))
      );

      this.totalOffset.set(0);
      this.remainingEmission.set(this.summary.totalEmission);
      this.status.set('Pending');

      this.loadEntries();
    },
    error: () => Swal.fire('Error', 'Save failed', 'error')
  });
}
  // ================= LOAD LIST + SUMMARY =================
  loadEntries() {
    this.service.getEntries(1, 10, '').subscribe((res: any) => {
      this.entries.set(res.data || []);
      this.totalRecords.set(res.totalRecords || 0);

      // ✅ SUMMARY FIX
      if (res.summary) {
        this.summary.totalEmission = res.summary.totalEmission || 0;
        this.summary.totalOffset = res.summary.totalOffset || 0;
        this.summary.remainingEmission = res.summary.remainingEmission || 0;
        this.summary.status = res.summary.status || '';
      }
    });
  }

  onCountChange(index: number) {

  const trees = [...this.treeInputsSignal()];

  const item = trees[index];

  // ✅ calculate row total
  item.total = item.count * item.co2;

  this.treeInputsSignal.set(trees);

  // ✅ calculate grand total offset
  const totalOffset = trees.reduce((sum, t) => sum + (t.total || 0), 0);
  this.totalOffset.set(totalOffset);

  // ✅ remaining emission
  const remaining = this.summary.totalEmission - totalOffset;
  this.remainingEmission.set(remaining);

  // ✅ status
  this.status.set(remaining <= 0 ? 'Achieved' : 'Pending');
}

  // ================= RESET =================
  reset() {
    this.form.reset();
    this.projects = [];
    this.treeInputs.forEach((t) => (t.count = 0));
    this.entries.set([]);

    this.summary = {
      totalEmission: 0,
      totalOffset: 0,
      remainingEmission: 0,
      status: '',
    };
  }
}
