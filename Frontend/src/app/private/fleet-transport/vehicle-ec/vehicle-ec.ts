import { Component, OnInit } from '@angular/core';
import { TripService } from '../vehicle-ec/vehicle-service-ec';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastService } from '../../../core/toast/toastservice';

@Component({
  selector: 'app-trip',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './vehicle-ec.html',
  styleUrls: ['./vehicle-ec.css']
})
export class TripComponent implements OnInit {

  tripForm!: FormGroup;
  vehicles: any[] = [];
  cities: any[] = [];
  // fuelTypes: string[] = ['Petrol', 'Diesel', 'CNG'];

  result: any;
  todayDateTime: string = '';
  tripDuration: string = '';

  constructor(
    private fb: FormBuilder,
    private tripService: TripService,
     private toastr: ToastService
  ) { }

  ngOnInit(): void {

  this.updateCurrentDateTime();

  this.tripForm = this.fb.group({
    vehicle_id: ['', Validators.required],
    fromCityId: ['', Validators.required],
    toCityId: ['', Validators.required],
    fuelType: ['', Validators.required],
    distanceKm: ['', [Validators.required, Validators.min(1)]],
    fuelConsumedLtr: ['', [Validators.required, Validators.min(0.1)]],
    tripStartDateTime: ['', Validators.required],
    tripEndDateTime: ['', Validators.required],
    co2Factor: [''],
    no2Factor: [''],
    ch4Factor: ['']
  }, { validators: this.dateValidator });

  this.loadVehicles();
  this.loadCities();

  // When vehicle changes → auto set fuel type
this.tripForm.get('vehicle_id')?.valueChanges.subscribe(vehicleId => {

  if (!vehicleId) return;

  const selectedVehicle = this.vehicles.find(v => v.vehicle_id == vehicleId);

  if (selectedVehicle && selectedVehicle.fuelType) {

    // Auto set fuel type
    this.tripForm.patchValue({
      fuelType: selectedVehicle.fuelType
    });

    // Load emission factor automatically
    this.loadEmissionFactor(selectedVehicle.fuelType);
  }
});

  // ✅ Fuel type change
  this.tripForm.get('fuelType')?.valueChanges.subscribe(fuel => {
    if (fuel) {
      this.loadEmissionFactor(fuel);
    }
  });

  // ✅ Duration calculation
  this.tripForm.get('tripStartDateTime')?.valueChanges.subscribe(() => {
    this.calculateDuration();
  });

  this.tripForm.get('tripEndDateTime')?.valueChanges.subscribe(() => {
    this.calculateDuration();
  });

  setInterval(() => {
    this.updateCurrentDateTime();
  }, 60000);
}

  loadVehicles() {
    this.tripService.getVehicles().subscribe(res => {
      this.vehicles = res;
    });
  }

  loadCities() {
    this.tripService.getCities().subscribe(res => {
      this.cities = res.data;
    });
  }

  loadEmissionFactor(selectedFuel: string) {

  this.tripService.getEmissionFactors().subscribe({
    next: (res: any) => {

      if (!res.status || !res.data) return;

      const factor = res.data.find(
        (x: any) => x.fuelType.toLowerCase() === selectedFuel.toLowerCase()
      );

      if (!factor) return;

      // ✅ NOW PATCH VALUES
      this.tripForm.patchValue({
        co2Factor: factor.cO2_Factor_KgPerL,
        no2Factor: factor.nO2_Factor_KgPerKm,
        ch4Factor: factor.cH4_Factor_KgPerKm
      });

    },
    error: (err) => {
      console.error("Emission factor fetch failed", err);
    }
  });
}

  submitTrip() {

  if (this.tripForm.invalid) {
    this.tripForm.markAllAsTouched();
    this.toastr.warning('Please fill all required fields');
    return;
  }

  this.tripService.addTrip(this.tripForm.value).subscribe({
    next: (res: any) => {

      this.result = res.data ? res.data : res;

      this.toastr.success('Record submitted successfully');

      this.resetForm();
    },
    error: (err) => {
      console.error("Trip Submit Failed:", err);
      this.toastr.error('Failed to submit record');
    }
  });
}

  dateValidator(group: FormGroup) {

    const start = group.get('tripStartDateTime')?.value;
    const end = group.get('tripEndDateTime')?.value;
    const now = new Date();

    if (start && new Date(start) > now) {
      return { futureStart: true };
    }

    if (end && new Date(end) > now) {
      return { futureEnd: true };
    }

    if (start && end && new Date(end) < new Date(start)) {
      return { endBeforeStart: true };
    }

    return null;
  }

  updateCurrentDateTime() {
    const now = new Date();
    this.todayDateTime = now.toISOString().slice(0, 16);
  }

  calculateDuration() {

    const start = this.tripForm.get('tripStartDateTime')?.value;
    const end = this.tripForm.get('tripEndDateTime')?.value;

    if (start && end) {

      const startDate = new Date(start);
      const endDate = new Date(end);

      const diffMs = endDate.getTime() - startDate.getTime();

      if (diffMs > 0) {

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        this.tripDuration = `${diffHours} hrs ${diffMinutes} mins`;

      } else {
        this.tripDuration = '';
      }
    }
  }

  resetForm() {
    this.tripForm.reset();
    this.result = null;
    this.tripDuration = '';
  }
}