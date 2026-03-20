import { Component, OnInit } from '@angular/core';
import { TripService } from '../vehicle-ec/vehicle-service-ec';
import { FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastService } from '../../../core/toast/toastservice';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ActivatedRoute } from '@angular/router';

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
  workflowActions: any[] = [];
  tripHistory: any[] = [];
  totalCO2: number = 0;
  totalNO2: number = 0;
  totalCH4: number = 0;

  emissionFactors: any[] = [];
  // result: any;
  currentStatusId: number = 0;
  tripDuration: string = '';
  invalidDuration: boolean = false;
  todayDateTime: string = '';
  // showResult: boolean = false;
  showSummary: boolean = false;
  summaryData: any;
  userRole: string = '';
  source: string = '';
  showEmissionFactorSection: boolean = true;
  mode: 'add' | 'edit' | 'view' = 'add';

  constructor(
    private fb: FormBuilder,
    private tripService: TripService,
    private toastr: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.formOpenTime = new Date();
    this.tripForm = this.fb.group({
      vehicle_id: ['', Validators.required],
      vehicleType: [''],


      // fuelType: [''],
      fuelId: [''],

      fromCityId: ['', Validators.required],
      toCityId: ['', Validators.required],

      distanceKm: [
        '',
        [Validators.required, Validators.min(1), Validators.pattern('^[0-9]+(\\.[0-9]+)?$')]
      ],

      fuelConsumedLtr: [
        '',
        [Validators.required, Validators.min(0.1), Validators.pattern('^[0-9]+(\\.[0-9]+)?$')]
      ],

      tripStartDateTime: [
        '',
        [Validators.required, this.noFutureDateValidator.bind(this)]
      ],

      tripEndDateTime: [
        '',
        [Validators.required, this.noFutureDateValidator.bind(this)]
      ],

      co2Factor: [{ value: '', disabled: true }],
      no2Factor: [{ value: '', disabled: true }],
      ch4Factor: [{ value: '', disabled: true }],

      totalCO2: [{ value: '', disabled: true }],
      totalNO2: [{ value: '', disabled: true }],
      totalCH4: [{ value: '', disabled: true }],
      finalTotalEmission: [{ value: '', disabled: true }]

    }, {
      validators: [
        this.cityValidator,
        this.dateValidator.bind(this)
      ]
    });

    this.userRole = this.getUserRole();
    // this.setupVehicleChangeListener();
    this.formOpenTime = new Date();
    //this.initializeForm();
    this.loadAllMasterData();
    this.setupDurationListener();
    this.tripForm.get('fuelConsumedLtr')?.valueChanges.subscribe(() => {
      this.calculateEmissions();
    });
    this.updateCurrentDateTime();
    this.route.queryParams.subscribe(params => {

      this.source = params['source'] || '';

      if (this.source === 'search' || this.source === 'action') {
        this.showEmissionFactorSection = false;
      }

      else {
        this.showEmissionFactorSection = true;
      }
      if (this.source === 'search') {
        this.mode = 'view';
        this.tripForm.disable();
      }
    });
    const tripId = this.route.snapshot.paramMap.get('id');
    if (tripId) {
      this.mode = 'view';
      this.loadAllMasterData(() => {
        this.loadTrip(tripId);
      });

    } else {
      this.mode = 'add';
      this.loadAllMasterData();
    }
    if ((this.userRole === 'corporate' || this.userRole === 'admin') && !tripId) {
      Swal.fire({
        icon: 'warning',
        title: 'Access Restricted',
        text: 'you are not allowed to create generator emission reports.',
        confirmButtonText: 'Go Back'
      }).then(() => {
        this.router.navigate(['/dashboard/MyActionVehicle']);
      });
      return;
    }
    // this.setupAutoCalculation();
  }

  loadTrip(id: string) {

    this.tripService.getTripById(id).subscribe(res => {

      this.currentStatusId = res.statusId;

      console.log("USER ROLE:", this.userRole);
      console.log("MODE:", this.mode);
      console.log("STATUS:", this.currentStatusId);

      this.tripForm.patchValue({
        vehicle_id: res.vehicleId,
        fromCityId: res.fromCityId,
        toCityId: res.toCityId,
        distanceKm: res.distanceKm,
        fuelConsumedLtr: res.fuelConsumedLtr,
        tripStartDateTime: res.tripStartDateTime,
        tripEndDateTime: res.tripEndDateTime,
        vehicleType: res.vehicleType || '',
        // fuelType: res.fuelType,
        co2Factor: res.cO2,
        no2Factor: res.nO2,
        ch4Factor: res.cH4,
        totalCO2: res.totalCO2,
        totalNO2: res.totalNO2,
        totalCH4: res.totalCH4,
        finalTotalEmission: res.totalEmission
      });
      setTimeout(() => {
        const vehicle = this.vehicles.find(v => v.vehicle_id == res.vehicleId);

        if (vehicle) {
          this.tripForm.patchValue({
            vehicleType: vehicle.vehicle_type_name
          });
        }
      }, 0);

      this.totalCO2 = res.totalCO2;
      this.totalNO2 = res.totalNO2;
      this.totalCH4 = res.totalCH4;

      this.calculateDuration();

      // ROLE BASED LOCK
      this.lockFormIfNeeded();

      // Load buttons
      this.loadWorkflowActions(id);
       this.loadTripHistory(id);

    });

  }
 loadAllMasterData(callback?: () => void) {

  this.tripService.getVehicles().subscribe(vehicleRes => {

    this.vehicles = vehicleRes;

    this.tripService.getFuels().subscribe(fuelRes => {

      this.fuels = fuelRes.data || fuelRes;

      this.tripService.getCities().subscribe(cityRes => {

        this.cities = cityRes.data || cityRes;

        this.tripService.getEmissionFactors().subscribe(emissionRes => {

          this.emissionFactors = emissionRes.data || [];

          this.setupVehicleChangeListener();

          // ✅ THIS LINE IS IMPORTANT
          if (callback) callback();

        });

      });

    });

  });

}

  loadWorkflowActions(tripId: string) {

    this.tripService.getWorkflowActions(tripId).subscribe((res: any) => {

      if (res.status) {
        this.workflowActions = res.data || [];
      }

      console.log("Workflow Actions:", this.workflowActions);

    });

  }

 loadTripHistory(tripId: string) {
  this.tripService.getTripFullDetails(tripId).subscribe((res: any) => {
    console.log('Full Details Response:', res);  
    if (res && res.History) {
      this.tripHistory = res.History;
      console.log('Trip History:', this.tripHistory);  
    }
  });
}

  setupVehicleChangeListener() {
    this.tripForm.get('vehicle_id')?.valueChanges.subscribe(selectedVehicleId => {
      if (!selectedVehicleId) return;

      const vehicle = this.vehicles.find(v => v.vehicle_id == selectedVehicleId);
      if (!vehicle) return;

      this.tripForm.patchValue({
        vehicleType: vehicle.vehicle_type_name
      });
      if (this.mode !== 'view') {
        const fuel = this.fuels.find(f =>
          f.fuel_name?.toLowerCase() === vehicle.fuel_name?.toLowerCase()
        );

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
      }

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

    if (this.currentStatusId === 1) {
      Swal.fire({
        icon: 'warning',
        title: 'Trip already submitted'
      });
      return;
    }

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
      VehicleType: formValue.vehicleType,
      FromCityId: formValue.fromCityId,
      ToCityId: formValue.toCityId,
      DistanceKm: Number(formValue.distanceKm),
      FuelConsumedLtr: Number(formValue.fuelConsumedLtr),
      TripStartDateTime: formValue.tripStartDateTime,
      TripEndDateTime: formValue.tripEndDateTime,
      // FuelType: formValue.fuelId,
      StatusId: 1
    };

    this.tripService.addTrip(payload).subscribe({

      next: (res: any) => {

        Swal.fire({
          icon: 'success',
          title: 'Trip Submitted Successfully'
        }).then(() => {

          this.router.navigate(['/dashboard/searchVehicle']);

        });

      },

      error: () => {

        Swal.fire('Error', 'Failed to submit record', 'error');

      }

    });

  }

  lockFormIfNeeded() {

    // Corporate always readonly
    if (this.userRole === 'corporate') {
      this.tripForm.disable();
      return;
    }

    if (this.userRole === 'reporter') {

      // Submitted
      if (this.currentStatusId === 1) {
        this.tripForm.disable();
      }

      // Approved
      else if (this.currentStatusId === 2) {
        this.tripForm.disable();
      }

      // Rejected → allow edit
      else if (this.currentStatusId === 3) {
        this.tripForm.enable();
      }

    }

  }

  updateStatus(workflowId: number) {

    const tripId = this.route.snapshot.paramMap.get('id');

    if (!tripId) return;

    // prevent duplicate action
    if (this.currentStatusId !== 1) {

      Swal.fire({
        icon: 'warning',
        title: 'Action already taken'
      });

      return;
    }

    this.tripService.updateTripStatus(tripId, workflowId)
      .subscribe((res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Status Updated Successfully',
          confirmButtonText: 'OK'
        }).then(() => {

          // Navigate AFTER popup closes
          this.router.navigate(['/dashboard/MyActionVehicle']);

        });
        // this.loadTrip(tripId);

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

  noFutureDateValidator(control: any) {
    if (!control.value) return null;
    const inputDate = new Date(control.value);
    const now = new Date();
    if (inputDate.getTime() > now.getTime()) {
      return { futureDate: true };
    }
    return null;
  }

  dateValidator(group: FormGroup): ValidationErrors | null {

    const start = group.get('tripStartDateTime')?.value;
    const end = group.get('tripEndDateTime')?.value;

    if (!start || !end) return null;

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (endDate <= startDate) {
      return { endBeforeStart: true };
    }

    return null;
  }
  updateCurrentDateTime() {
    const now = new Date();
    this.todayDateTime = now.toISOString().slice(0, 16);
  }

  // Store totals

  totalCO2e: number = 0;

  // GWP values (100-year)
  readonly GWP_CH4 = 28;
  readonly GWP_N2O = 265;

  calculateEmissions() {
    const fuel = Number(this.tripForm.get('fuelConsumedLtr')?.value) || 0;

    const co2Factor = Number(this.tripForm.get('co2Factor')?.value) || 0;
    const ch4Factor = Number(this.tripForm.get('ch4Factor')?.value) || 0;
    const n2oFactor = Number(this.tripForm.get('no2Factor')?.value) || 0; // assuming NO2 = N2O

    // calculate emissions
    this.totalCO2 = fuel * co2Factor;
    this.totalCH4 = fuel * ch4Factor;
    this.totalNO2 = fuel * n2oFactor;

    // calculate CO2e
    this.totalCO2e = (this.totalCO2 * 1) +
      (this.totalCH4 * this.GWP_CH4) +
      (this.totalNO2 * this.GWP_N2O);

    // optionally, patch form values for display
    this.tripForm.patchValue({
      totalCO2: this.totalCO2,
      totalCH4: this.totalCH4,
      totalNO2: this.totalNO2,
      finalTotalEmission: this.totalCO2e
    });
  }
  calculateDuration() {

    const start = this.tripForm.get('tripStartDateTime')?.value;
    const end = this.tripForm.get('tripEndDateTime')?.value;

    // reset duration first
    this.tripDuration = '';

    if (!start || !end) {
      return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    //STOP calculation if end <= start
    if (endDate <= startDate) {
      this.tripDuration = '';
      return;
    }

    //calculate only when valid
    const diffMs = endDate.getTime() - startDate.getTime();

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    this.tripDuration = `${hours} hrs ${minutes} mins`;
  }


  calculateTotals(data: any) {

    // const fuel = data.fuelConsumedLtr || 0;

    // const co2Factor = Number(this.tripForm.get('co2Factor')?.value) || 0;
    // const no2Factor = Number(this.tripForm.get('no2Factor')?.value) || 0;
    // const ch4Factor = Number(this.tripForm.get('ch4Factor')?.value) || 0;

    // this.totalCO2 = fuel * co2Factor;
    // this.totalNO2 = fuel * no2Factor;
    // this.totalCH4 = fuel * ch4Factor;

    this.totalCO2 = data.totalCO2 || 0;
    this.totalNO2 = data.totalNO2 || 0;
    this.totalCH4 = data.totalCH4 || 0;

  }
  getUserRole(): string {

    const userData = localStorage.getItem('user');

    if (!userData) return '';

    const parsed = JSON.parse(userData);

    return parsed.currentRole?.toLowerCase() || '';
  }
  resubmitTrip() {

    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();

      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please fill all required fields'
      });

      return;
    }

    const tripId = this.route.snapshot.paramMap.get('id');

    if (!tripId) {
      Swal.fire({
        icon: 'error',
        title: 'Trip ID not found'
      });
      return;
    }

    const formValue = this.tripForm.getRawValue();

    const payload = {
      TripId: tripId,
      VehicleId: formValue.vehicle_id,
      VehicleType: formValue.vehicleType,
      FromCityId: formValue.fromCityId,
      ToCityId: formValue.toCityId,
      DistanceKm: Number(formValue.distanceKm),
      FuelConsumedLtr: Number(formValue.fuelConsumedLtr),
      // FuelType: formValue.fuelId,
      TripStartDateTime: formValue.tripStartDateTime,
      TripEndDateTime: formValue.tripEndDateTime,
      StatusId: 1
    };

    console.log("UPDATE PAYLOAD:", payload);

    this.tripService.updateTrip(tripId, payload).subscribe({

      next: (res: any) => {

        Swal.fire({
          icon: 'success',
          title: 'Trip Updated Successfully'
        });
        this.router.navigate(['/dashboard/searchVehicle']);

        // this.loadTrip(tripId);

      },

      error: (err: any) => {

        console.error("UPDATE ERROR:", err);

        Swal.fire({
          icon: 'error',
          title: 'Trip update failed',
          text: err?.error?.message || 'Server error'
        });

      }

    });

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
    Swal.fire({
      title: 'Are you sure?',
      text: 'All entered data will be cleared',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.tripForm.reset();
        this.totalCO2 = 0;
        this.totalNO2 = 0;
        this.totalCH4 = 0;
        this.totalCO2e = 0;
        this.tripDuration = '';
        this.tripForm.enable();
      }
    });
  }
  isSearchMode(): boolean {
    return this.source === 'search';
  }

  goBack() {
    this.router.navigate(['/dashboard/searchVehicle']);
  }

  canSubmit() {
    return this.userRole === 'reporter' && this.mode === 'add';
  }
//   shouldShowDuration(): boolean {
//   return this.source === 'search' || this.source === 'action';
// }
shouldShowDuration(): boolean {
  return this.mode === 'view';
}

  canResubmit() {
    return this.userRole === 'reporter' && this.currentStatusId === 3;
  }

  canCorporateAction() {
    return this.userRole === 'corporate' && this.currentStatusId === 1;
  }
}