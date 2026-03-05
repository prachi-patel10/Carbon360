import { Component, OnInit } from '@angular/core';
import { TripService } from '../vehicle-ec/vehicle-service-ec';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastService } from '../../../core/toast/toastservice';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

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
  fuels: any[] = [];
  emissionFactors: any[] = [];
  result: any;
currentStatusId: number = 0;   // ✅ NEW



  todayDateTime: string = '';
  tripDuration: string = '';
showResult: boolean = false;
  showSummary: boolean = false;
summaryData: any;

  constructor(
    private fb: FormBuilder,
    private tripService: TripService,
    private toastr: ToastService,
    private router: Router   
  ) { }

  ngOnInit(): void {

    this.tripForm = this.fb.group({

      vehicle_id: ['', Validators.required],

     
       fuelType: [''],   // for display (name)
  fuelId: [''],  
      fromCityId: ['', Validators.required],
      toCityId: ['', Validators.required],

      distanceKm: ['', Validators.required],
      fuelConsumedLtr: ['', Validators.required],

      // ✅ ADD THESE BACK
      tripStartDateTime: ['', Validators.required],
      tripEndDateTime: ['', Validators.required],

      co2Factor: [{ value: '', disabled: true }],
      no2Factor: [{ value: '', disabled: true }],
      ch4Factor: [{ value: '', disabled: true }],

      totalCO2: [{ value: '', disabled: true }],
      totalNO2: [{ value: '', disabled: true }],
      totalCH4: [{ value: '', disabled: true }],
      finalTotalEmission: [{ value: '', disabled: true }]

    }, { validators: this.dateValidator }); // ✅ attach validator properly

    this.loadAllMasterData();
    // this.setupVehicleChangeListener();
    this.setupDurationListener();
    // this.setupAutoCalculation();
  }


  loadAllMasterData() {

    this.tripService.getVehicles().subscribe(vehicleRes => {

      this.vehicles = vehicleRes;
      console.log("Vehicles:", this.vehicles);

      this.tripService.getFuels().subscribe(fuelRes => {

       
        this.fuels = fuelRes.data || fuelRes;
         console.log("Fuels:", this.fuels);

        this.tripService.getCities().subscribe(cityRes => {

          // console.log("CITY API RESPONSE:", cityRes);
          this.cities = cityRes.data || cityRes;
          // console.log("CITIES ARRAY:", this.cities);

          this.tripService.getEmissionFactors().subscribe(emissionRes => {

            this.emissionFactors = emissionRes.data || [];
            console.log("Emission Factors:", this.emissionFactors);

            console.log("All master data loaded successfully");

            // ✅ NOW start listening
            this.setupVehicleChangeListener();

          });

        });

      });

    });

  }
setupVehicleChangeListener() {
  this.tripForm.get('vehicle_id')?.valueChanges.subscribe(selectedVehicleId => {
    if (!selectedVehicleId) return;

    const vehicle = this.vehicles.find(v => v.vehicle_id == selectedVehicleId);
    if (!vehicle) return;

    // Find fuel from master
    const fuel = this.fuels.find(f =>
      f.fuel_name?.toLowerCase() === vehicle.fuel_name?.toLowerCase()
    );

    // Find emission factor
    const factor = this.emissionFactors.find(e =>
      e.fuelName?.toLowerCase() === vehicle.fuel_name?.toLowerCase()
    );

    this.tripForm.patchValue({
      fuelType: fuel ? Number(fuel.fuel_id) : null, // 🔹 numeric fuel ID for backend
      fuelId: fuel?.fuel_id || '',                  // optional, display only
      co2Factor: factor?.cO2_Factor_KgPerL,
      no2Factor: factor?.nO2_Factor_KgPerL,
      ch4Factor: factor?.cH4_Factor_KgPerL
    });

    console.log("Patched FuelType (numeric):", this.tripForm.get('fuelType')?.value);
  });
}
  loadVehicles() {
    this.tripService.getVehicles().subscribe(res => this.vehicles = res);
  }

  loadCities() {
    this.tripService.getCities().subscribe(res => this.cities = res.data);
  }

  loadFuels() {
    this.tripService.getFuels().subscribe(res => this.fuels = res.data || res);
  }

  loadEmissionFactors() {
    this.tripService.getEmissionFactors().subscribe({
      next: (res: any) => {
        console.log("Emission API Response:", res);
        this.emissionFactors = res.data || [];
        console.log("Emission Factors Array:", this.emissionFactors);
      },
      error: (err) => {
        console.error("Emission factor load failed:", err);
      }
    });
  }
  setEmissionFactors(fuelId: string) {
  const factor = this.emissionFactors.find(f => f.fuelId === fuelId);
  if (!factor) return;

  this.tripForm.patchValue({
    co2Factor: factor.cO2_Factor_KgPerL,
    no2Factor: factor.nO2_Factor_KgPerL,
    ch4Factor: factor.cH4_Factor_KgPerL
  });
  }

  setupDurationListener() {
    this.tripForm.get('tripStartDateTime')?.valueChanges.subscribe(() => this.calculateDuration());
    this.tripForm.get('tripEndDateTime')?.valueChanges.subscribe(() => this.calculateDuration());
  }

submitTrip() {
  if (this.tripForm.invalid) {
    this.tripForm.markAllAsTouched();
    Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Please fill all required fields'
    });
    return;
  }

  const formValue = this.tripForm.getRawValue();

  // ✅ FuelType must be numeric ID
  const payload = {
    VehicleId: formValue.vehicle_id,   // hashed string
    FromCityId: formValue.fromCityId,  // hashed string
    ToCityId: formValue.toCityId,      // hashed string
    DistanceKm: Number(formValue.distanceKm),
    FuelConsumedLtr: Number(formValue.fuelConsumedLtr),
    TripStartDateTime: formValue.tripStartDateTime,
    TripEndDateTime: formValue.tripEndDateTime,
    FuelType: Number(formValue.fuelType), // 🔹 IMPORTANT: numeric ID
    StatusId: 1
  };

  console.log("Submitting payload:", payload); // ✅ DEBUG: FuelType must be numeric

  this.tripService.addTrip(payload).subscribe({
    next: (res: any) => {
      if (!res) {
        Swal.fire('Error', 'Something went wrong', 'error');
        return;
      }

      this.currentStatusId = res.statusId;
      this.lockFormIfNeeded();

      this.result = {
        distance: payload.DistanceKm,
        fuel: payload.FuelConsumedLtr,
        co2Factor: this.tripForm.get('co2Factor')?.value,
        no2Factor: this.tripForm.get('no2Factor')?.value,
        ch4Factor: this.tripForm.get('ch4Factor')?.value,
        totalCo2: Number(res.co2),
        totalNo2: Number(res.no2),
        totalCh4: Number(res.ch4),
        totalEmission: Number(res.totalEmission),
        statusId: res.statusId
      };

      this.showResult = true;

      Swal.fire({
        icon: 'success',
        title: 'Trip Submitted Successfully!',
        confirmButtonColor: '#16a34a'
      }).then(() => {
        const element = document.querySelector('.result-card');
        element?.scrollIntoView({ behavior: 'smooth' });
      });
    },
    error: (err) => {
      console.error(err);
      Swal.fire('Error', 'Failed to submit record', 'error');
    }
  });
}
lockFormIfNeeded() {

  // Example:
  // 1 = Draft
  // 2 = Submitted
  // 3 = Approved
  // 4 = Rejected

  if (this.currentStatusId == 2 || this.currentStatusId == 3) {
    this.tripForm.disable();
  } else {
    this.tripForm.enable();
  }
}

updateStatus(statusId: number) {

  const payload = {
    tripId: this.result.tripId,
    statusId: statusId
  };

  this.tripService.updateTripStatus(payload).subscribe({
    next: () => {
      this.currentStatusId = statusId;

      this.lockFormIfNeeded();   // ✅ CALL HERE

      Swal.fire('Success', 'Status Updated', 'success');
    },
    error: () => {
      Swal.fire('Error', 'Status update failed', 'error');
    }
  });
}


  dateValidator(group: FormGroup) {
    const start = group.get('tripStartDateTime')?.value;
    const end = group.get('tripEndDateTime')?.value;
    const now = new Date();

    if (start && new Date(start) > now) return { futureStart: true };
    if (end && new Date(end) > now) return { futureEnd: true };
    if (start && end && new Date(end) < new Date(start)) return { endBeforeStart: true };
    return null;
  }

  updateCurrentDateTime() {
    this.todayDateTime = new Date().toISOString().slice(0, 16);
  }

  calculateDuration() {
    const start = this.tripForm.get('tripStartDateTime')?.value;
    const end = this.tripForm.get('tripEndDateTime')?.value;
    if (!start || !end) { this.tripDuration = ''; return; }

    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    if (diffMs <= 0) { this.tripDuration = ''; return; }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    this.tripDuration = `${hours} hrs ${minutes} mins`;
  }

  //   updateTrip() {
  //   this.tripService.updateTrip(this.tripId, this.tripForm.value)
  //     .subscribe({
  //       next: (res) => {
  //         console.log('Updated Successfully', res);
  //         this.router.navigate(['/trip-list']);
  //       },
  //       error: (err) => {
  //         console.error(err);
  //       }
  //     });
  // }
resetForm() {
  this.tripForm.reset();
  this.result = null;
    this.tripForm.enable();     // ✅ re-enable

  this.tripDuration = '';
  this.showResult = false;
}
}