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
  fuels: any[] = [];
  emissionFactors: any[] = [];
  result: any;
  todayDateTime: string = '';
  tripDuration: string = '';

  constructor(
    private fb: FormBuilder,
    private tripService: TripService,
    private toastr: ToastService
  ) { }

  ngOnInit(): void {

    this.tripForm = this.fb.group({

      vehicle_id: ['', Validators.required],

      // fuelType: [{ value: '', disabled: true }],
      fuelType: ['', Validators.required],
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

      this.tripService.getFuels().subscribe(fuelRes => {

        this.fuels = fuelRes.data || fuelRes;

        this.tripService.getCities().subscribe(cityRes => {

          console.log("CITY API RESPONSE:", cityRes);
          this.cities = cityRes.data || cityRes;
          console.log("CITIES ARRAY:", this.cities);

          this.tripService.getEmissionFactors().subscribe(emissionRes => {

            this.emissionFactors = emissionRes.data || [];

            console.log("All master data loaded successfully");

            // ✅ NOW start listening
            this.setupVehicleChangeListener();

          });

        });

      });

    });

  }

  setupVehicleChangeListener() {

    this.tripForm.get('vehicle_id')?.valueChanges.subscribe(vehicleId => {

      if (!vehicleId) return;

      // 1️⃣ Get selected vehicle
      const vehicle = this.vehicles.find(v =>
        v.vehicle_id === vehicleId
      );

      if (!vehicle) return;

      // 2️⃣ Get fuel from fuel master using STRING id
      const fuel = this.fuels.find(f =>
        f.fuel_id === vehicle.fuel_id
      );

      if (!fuel) return;

      // ✅ Set Fuel Name
      this.tripForm.patchValue({
        fuelType: fuel.fuel_name
      });

      // 3️⃣ Get emission factor using FUEL NAME (not id!)
      const factor = this.emissionFactors.find(e =>
        e.fuelName === fuel.fuel_name
      );

      if (!factor) return;

      // ✅ Set emission factors
      this.tripForm.patchValue({
        co2Factor: factor.cO2_Factor_KgPerL,
        no2Factor: factor.nO2_Factor_KgPerKm,
        ch4Factor: factor.cH4_Factor_KgPerKm
      });

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
  setEmissionFactors(fuelId: number) {

    if (!this.emissionFactors || this.emissionFactors.length === 0) {
      console.log("Emission factors not loaded yet");
      return;
    }

    const factor = this.emissionFactors.find(
      f => Number(f.fuelId) === Number(fuelId)
    );

    if (!factor) {
      console.warn("No emission factor found for fuel:", fuelId);
      return;
    }

    console.log("Matched Factor:", factor);

    this.tripForm.patchValue({
      co2Factor: factor.cO2_Factor_KgPerL,
      no2Factor: factor.nO2_Factor_KgPerKm,
      ch4Factor: factor.cH4_Factor_KgPerKm
    });
  }

  setupDurationListener() {
    this.tripForm.get('tripStartDateTime')?.valueChanges.subscribe(() => this.calculateDuration());
    this.tripForm.get('tripEndDateTime')?.valueChanges.subscribe(() => this.calculateDuration());
  }



  submitTrip() {

    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      this.toastr.warning('Please fill all required fields');
      return;
    }

    const formValue = this.tripForm.getRawValue();

    // 🚨 EXTRA SAFETY CHECK
    if (!formValue.fromCityId || !formValue.toCityId) {
      this.toastr.error("Please select both cities properly");
      return;
    }

    const payload = {
      VehicleId: formValue.vehicle_id,
      FromCityId: formValue.fromCityId,
      ToCityId: formValue.toCityId,
      DistanceKm: formValue.distanceKm,
      FuelConsumedLtr: formValue.fuelConsumedLtr,
      TripStartDateTime: formValue.tripStartDateTime,
      TripEndDateTime: formValue.tripEndDateTime,
      FuelType: formValue.fuelType?.toLowerCase()
    };

    console.log("FINAL PAYLOAD:", payload);

    this.tripService.addTrip(payload).subscribe({
      next: (res: any) => {
        this.result = res.data || res;
        this.toastr.success('Record submitted successfully');
        this.resetForm();
      },
      error: (err) => {
        console.error("SERVER ERROR:", err);
        this.toastr.error('Failed to submit record');
      }
    });
  }
  //   setupAutoCalculation() {

  //   this.tripForm.get('fuelConsumedLtr')?.valueChanges.subscribe(() => this.calculateEmission());
  //   this.tripForm.get('distanceKm')?.valueChanges.subscribe(() => this.calculateEmission());
  // }
  // calculateEmission() {

  //   const fuel = Number(this.tripForm.get('fuelConsumedLtr')?.value);
  //   const distance = Number(this.tripForm.get('distanceKm')?.value);

  //   const co2Factor = Number(this.tripForm.get('co2Factor')?.value);
  //   const no2Factor = Number(this.tripForm.get('no2Factor')?.value);
  //   const ch4Factor = Number(this.tripForm.get('ch4Factor')?.value);

  //   if (!fuel || !distance) return;

  //   const totalCO2 = fuel * co2Factor;
  //   const totalNO2 = distance * no2Factor;
  //   const totalCH4 = distance * ch4Factor;

  //   const finalTotal = totalCO2 + totalNO2 + totalCH4;

  //   this.tripForm.patchValue({
  //     totalCO2: totalCO2.toFixed(3),
  //     totalNO2: totalNO2.toFixed(3),
  //     totalCH4: totalCH4.toFixed(3),
  //     finalTotalEmission: finalTotal.toFixed(3)
  //   }, { emitEvent: false });
  // }

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

  resetForm() {
    this.tripForm.reset();
    this.result = null;
    this.tripDuration = '';
  }
}