import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';   // ✅ ADD THIS

interface City {
  cityId: number;
  cityName: string;
  stateName: string;
}

interface Ngo {
  ngoId: number;
  ngoName: string;
}

@Component({
  selector: 'app-project',
    standalone: true,  
  templateUrl: './plantation-project.html',
  styleUrls: ['./plantation-project.css'],
  imports: [CommonModule,ReactiveFormsModule]
})
export class ProjectComponent implements OnInit {

  // ✅ Proper Form Type
  projectForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  // ✅ NGO LIST
  ngoList: Ngo[] = [
    { ngoId: 1, ngoName: 'Green Earth NGO' },
    { ngoId: 2, ngoName: 'Save Trees Foundation' }
  ];

  // ✅ CITY LIST WITH STATE
  cityList: City[] = [
    { cityId: 1, cityName: 'Surat', stateName: 'Gujarat' },
    { cityId: 2, cityName: 'Ahmedabad', stateName: 'Gujarat' },
    { cityId: 3, cityName: 'Mumbai', stateName: 'Maharashtra' }
  ];

  ngOnInit(): void {

    // ✅ Initialize form AFTER constructor
    this.projectForm = this.fb.group({
      projectId: [0],
      projectName: ['', Validators.required],
      ngoId: ['', Validators.required],
      address: [''],
      cityId: [''],
      stateName: [{ value: '', disabled: true }], // 👈 readonly field
      isActive: [true],
      entryBy: [1],
      entryDate: [new Date()],
      updateBy: [null],
      updateDate: [null]
    });

    // ✅ Auto update state when city changes
    const cityControl = this.projectForm.get('cityId');

    if (cityControl) {
      cityControl.valueChanges.subscribe((cityId: string | null) => {

        const selectedCity = this.cityList.find(
          c => c.cityId === Number(cityId)
        );

        this.projectForm.patchValue({
          stateName: selectedCity ? selectedCity.stateName : ''
        });
      });
    }
  }

  // ✅ SUBMIT
  onSubmit(): void {
    if (this.projectForm.invalid) {
      alert('Please fill required fields');
      return;
    }

    // getRawValue() because stateName is disabled
    const formData = this.projectForm.getRawValue();

    console.log('Project Data:', formData);
  }

  // ✅ RESET
  reset(): void {
    this.projectForm.reset({
      projectId: 0,
      isActive: true,
      entryBy: 1,
      entryDate: new Date()
    });
  }
}