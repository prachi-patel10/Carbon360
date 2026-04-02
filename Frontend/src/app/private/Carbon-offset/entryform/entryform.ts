import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-entryform',
  imports: [ReactiveFormsModule],
  templateUrl: './entryform.html',
  styleUrl: './entryform.css',
})
export class Entryform implements OnInit{
  plantationForm!: FormGroup;

  projects: any[] = [
    { project_id: 1, project_name: 'Green City Drive' },
    { project_id: 2, project_name: 'Urban Forest Initiative' }
  ];

  offset: number = 0;
  treesRequired: number = 0;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.plantationForm = this.fb.group({
      projectId: ['', Validators.required],
      noOfTrees: [0, [Validators.required, Validators.min(1)]],
      years: [10],
      entryBy: [101] // default logged-in user
    });

    this.plantationForm.valueChanges.subscribe(val => {
      this.calculate(val);
    });
  }

  calculate(val: any) {
    const trees = val.noOfTrees || 0;
    const years = val.years || 1;

    // CO2 offset (20 kg per tree/year)
    this.offset = trees * 20 * years;

    // Dummy emission (replace with API/SP later)
    const totalEmission = 5000;

    this.treesRequired = Math.round(totalEmission / 20);
  }

  submit() {
    if (this.plantationForm.valid) {
      console.log("Form Data:", this.plantationForm.value);

      // Call API here
      alert("Saved successfully!");
    }
  }

  reset() {
    this.plantationForm.reset();
  }
}

