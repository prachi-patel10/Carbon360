import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-vehicle-ec',
  imports: [ReactiveFormsModule],
  templateUrl: './vehicle-ec.html',
  styleUrl: './vehicle-ec.css',
})
export class VehicleEC {
emissionForm!: FormGroup;

  totalCO2: number = 0;
  totalNO2: number = 0;
  totalCH4: number = 0;
  totalEmission: number = 0;

  constructor(private fb: FormBuilder) {
    this.initForm();
  }
vehicles = [
  { id: 1, number: 'GJ05AB1234' },
  { id: 2, number: 'GJ05XY5678' }
];

trips = [
  { id: 1, name: 'Surat to Ahmedabad' },
  { id: 2, name: 'Surat to Mumbai' }
];
  initForm() {
    this.emissionForm = this.fb.group({
      VehicleId: [''],
      TripId: [''],
      FuelType: [''],
      DistanceKm: [0, Validators.required],
      FuelConsumedLtr: [0, Validators.required],
      CO2Factor_g_per_ltr: [0],
      NO2Factor_g_per_km: [0],
      CH4Factor_g_per_km: [0]
    });
  }

  calculateEmission() {
    const form = this.emissionForm.value;

    this.totalCO2 = form.FuelConsumedLtr * form.CO2Factor_g_per_ltr;
    this.totalNO2 = form.DistanceKm * form.NO2Factor_g_per_km;
    this.totalCH4 = form.DistanceKm * form.CH4Factor_g_per_km;

    this.totalEmission =
      this.totalCO2 + this.totalNO2 + this.totalCH4;
  }

  resetForm() {
    this.emissionForm.reset();
    this.totalCO2 = 0;
    this.totalNO2 = 0;
    this.totalCH4 = 0;
    this.totalEmission = 0;
  }
}
