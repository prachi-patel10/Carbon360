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
  formOpenTime!: Date;
  vehicles: any[] = [];
  cities: any[] = [];
  fuels: any[] = [];
  emissionFactors: any[] = [];
  // result: any;
  currentStatusId: number = 0;


  todayDateTime: string = '';
  tripDuration: string = '';
  // showResult: boolean = false;
  showSummary: boolean = false;
  summaryData: any;

  constructor(
    private fb: FormBuilder,
    private tripService: TripService,
    private toastr: ToastService,
    private router: Router
  ) { }

  ngOnInit(): void {
        this.formOpenTime = new Date();  
    this.tripForm = this.fb.group({
      vehicle_id: ['', Validators.required],
      fuelType: [''],   // for display (name)
      fuelId: [''],
      fromCityId: ['', Validators.required],
      toCityId: ['', Validators.required],
      distanceKm: ['', [Validators.required, Validators.min(1)]],
      fuelConsumedLtr: ['', [Validators.required, Validators.min(0.1)]],
      tripStartDateTime: ['', Validators.required],
      tripEndDateTime: ['', Validators.required],
      co2Factor: [{ value: '', disabled: true }],
      no2Factor: [{ value: '', disabled: true }],
      ch4Factor: [{ value: '', disabled: true }],
      totalCO2: [{ value: '', disabled: true }],
      totalNO2: [{ value: '', disabled: true }],
      totalCH4: [{ value: '', disabled: true }],
      finalTotalEmission: [{ value: '', disabled: true }]

    }, { validators: this.dateValidator });
    this.loadAllMasterData();
    // this.setupVehicleChangeListener();
    this.setupDurationListener();
    this.updateCurrentDateTime();
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
        fuelType: fuel?.fuel_name || '',
        fuelId: fuel?.fuel_id || '',
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

    const payload = {
      VehicleId: formValue.vehicle_id,
      FromCityId: formValue.fromCityId,
      ToCityId: formValue.toCityId,
      DistanceKm: Number(formValue.distanceKm),
      FuelConsumedLtr: Number(formValue.fuelConsumedLtr),
      TripStartDateTime: formValue.tripStartDateTime,
      TripEndDateTime: formValue.tripEndDateTime,
      FuelType: formValue.fuelId,
      StatusId: 1
    };

    console.log("Submitting payload:", payload);

    this.tripService.addTrip(payload).subscribe({
      next: (res: any) => {

        if (!res) {
          Swal.fire('Error', 'Something went wrong', 'error');
          return;
        }

        this.currentStatusId = res.statusId;
        this.lockFormIfNeeded();

        Swal.fire({
          icon: 'success',
          title: 'Trip Submitted Successfully!',
          confirmButtonColor: '#16a34a'
        });

      },

      error: (err: any) => {
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
      tripId: null,
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

  //validation
  cityValidator(group: FormGroup) {

  const fromCity = group.get('fromCityId')?.value;
  const toCity = group.get('toCityId')?.value;

  if (fromCity && toCity && fromCity === toCity) {
    return { sameCity: true };
  }

  return null;
}

 dateValidator(group: FormGroup) {

  const start = group.get('tripStartDateTime')?.value;
  const end = group.get('tripEndDateTime')?.value;

  if (!start || !end) return null;

  const startDate = new Date(start);
  const endDate = new Date(end);

  const now = new Date();
  const formOpen = this.formOpenTime;

  // ❌ future start date
  if (startDate > now) {
    return { futureStart: true };
  }

  // ❌ future end date
  if (endDate > now) {
    return { futureEnd: true };
  }

  // ❌ today's date but before form open time
  const startDateOnly = startDate.toDateString();
  const todayDateOnly = formOpen.toDateString();

  if (startDateOnly === todayDateOnly && startDate < formOpen) {
    return { beforeFormOpenTime: true };
  }

  // ❌ end date before start
  if (endDate <= startDate) {
    return { endBeforeStart: true };
  }

  return null;
}

  updateCurrentDateTime() {
  const now = new Date();
  this.todayDateTime = now.toISOString().slice(0,16);
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
    this.tripForm.enable();
    this.tripDuration = '';
  }

}