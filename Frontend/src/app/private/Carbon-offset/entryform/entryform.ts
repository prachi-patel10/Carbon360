import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReportService } from './entryformservice';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-report',
  standalone: true,
  templateUrl: './entryform.html',
  styleUrls: ['./entryform.css'], // ✅ reuse same CSS
  imports: [CommonModule, ReactiveFormsModule]
})
export class Entryform implements OnInit {

  form!: FormGroup;

  years: number[] = [2025, 2024, 2023];
  projects: any[] = [];

  treeData: any[] = [];

  emission = 0;

  summary = {
    totalOffset: 0,
    remaining: 0
  };

  constructor(private fb: FormBuilder, private service: ReportService) {}

  ngOnInit() {
    this.form = this.fb.group({
      year: [''],
      projectId: ['']
    });
  }

  // ================= YEAR CHANGE =================
  onYearChange() {
    const year = this.form.value.year;

    if (!year) return;

    this.service.getProjectsByYear(year).subscribe((res: any) => {
      this.projects = res.data;
    });
  }

  // ================= PROJECT CHANGE =================
  onProjectChange() {
    const { year, projectId } = this.form.value;

    if (!projectId) return;

    this.service.getReportData(year, projectId).subscribe((res: any) => {

      this.treeData = res.data.trees;
      this.emission = res.data.emission;

      this.summary.totalOffset = res.data.totalOffset;
      this.summary.remaining = res.data.remaining;
    });
  }

  // ================= SAVE =================
  save() {
    const payload = {
      ...this.form.value
    };

    this.service.saveEntry(payload).subscribe(() => {
      Swal.fire('Success', 'Entry Saved Successfully', 'success');
    });
  }

  // ================= RESET =================
  reset() {
    this.form.reset();
    this.treeData = [];
    this.projects = [];
    this.summary = { totalOffset: 0, remaining: 0 };
    this.emission = 0;
  }
}