import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common'; // ✅ ADD THIS

@Component({
  selector: 'app-entryform',
  imports: [ReactiveFormsModule,CommonModule],
  templateUrl: './entryform.html',
  styleUrl: './entryform.css',
})
export class Entryform implements OnInit {

  plantationForm!: FormGroup;
  yearList: number[] = [];
  offset: number = 0;
totalEmission: number = 0;
treesRequired: number = 0;
  projects = [
    { project_id: 1, project_name: 'Green City Drive' },
    { project_id: 2, project_name: 'Urban Forest Initiative' }
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
  this.plantationForm = this.fb.group({
    projectId: ['', Validators.required],
    year: ['', Validators.required]
  });

  const currentYear = new Date().getFullYear();
  for (let i = 0; i < 10; i++) {
    this.yearList.push(currentYear - i);
  }

  this.plantationForm.valueChanges.subscribe(() => {
    this.fetchEmission();
  });
}

fetchEmission() {
  const { projectId, year } = this.plantationForm.value;

  if (!projectId || !year) return;

  // 🔥 Replace with API later
  this.totalEmission = this.getEmissionFromBackend(projectId, year);

  this.treesRequired = Math.round(this.totalEmission / 20);

  this.offset = this.totalEmission; // covered emission
}

  // 🔥 Dummy backend logic (replace with API)
  getEmissionFromBackend(projectId: number, year: number): number {
    return 5000 + (year % 5) * 1000; // sample dynamic data
  }

  submit() {
    if (this.plantationForm.valid) {
      console.log(this.plantationForm.value);
      alert("Saved successfully!");
    }
  }

  reset() {
    this.plantationForm.reset();
    this.offset = 0;
  }
}