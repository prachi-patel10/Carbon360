import { Component, HostListener, OnInit, ViewChild, signal } from '@angular/core';
import { TripService } from '../vehicle-ec/vehicle-service-ec';
import { FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastService } from '../../../core/toast/toastservice';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-trip',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule],
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
  currentStatusId: number = 0;
  tripDuration: string = '';
  todayDateTime: string = '';
  showSummary: boolean = false;
  summaryData: any;
  showEmissionFactorSection: boolean = true;

  // ── MODE FLAGS ────────────────────────────────────────────────
  mode: 'add' | 'edit' | 'view' = 'add';
  pageSource: 'myaction' | 'search' = 'search';
  isViewMode: boolean = false;
  isReviewMode: boolean = false;
  isEditMode: boolean = false;
  isResubmitMode: boolean = false;

  userRole: string = '';

  readonly GWP_CH4 = 28;
  readonly GWP_N2O = 265;
  totalCO2e: number = 0;

  constructor(
    private fb: FormBuilder,
    private tripService: TripService,
    private toastr: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  // ═══════════════════════════════════════════════════════════════
  //  LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.formOpenTime = new Date();
    this.initForm();
    this.updateCurrentDateTime();

    // ✅ Read role FIRST
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      this.userRole = parsed.currentRole?.toLowerCase() || '';
    }

    // ✅ Read route params
    const tripId = this.route.snapshot.paramMap.get('id');
    const queryParams = this.route.snapshot.queryParamMap;
    const mode = queryParams.get('mode') || 'create';
    const page = queryParams.get('page');

    // ✅ pageSource from ?page=
    this.pageSource = page === 'myaction' || page === 'search' ? page : 'search';
    this.isReviewMode = mode === 'review' && this.pageSource === 'myaction';
    this.isEditMode   = mode === 'edit';
    this.isViewMode   = mode === 'view';

    // Hide emission factor section when opened from search or myaction
    this.showEmissionFactorSection = this.pageSource !== 'search' && this.pageSource !== 'myaction';

    this.setupDurationListener();
    this.tripForm.get('fuelConsumedLtr')?.valueChanges.subscribe(() => this.calculateEmissions());

    if (tripId) {
      this.mode = 'view';

      // Disable immediately if search — don't wait for API
      if (this.pageSource === 'search') {
        this.tripForm.disable();
      }

      this.loadAllMasterData(() => {
        this.loadTrip(tripId);
      });

    } else {
      // Block corporate/admin from creating
      if (this.userRole === 'corporate' || this.userRole === 'admin') {
        this.showAccessRestricted();
        return;
      }
      this.mode = 'add';
      this.loadAllMasterData();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  INIT FORM
  // ═══════════════════════════════════════════════════════════════

  initForm() {
    this.tripForm = this.fb.group({
      vehicle_id:        ['', Validators.required],
      vehicleType:       [''],
      fuelId:            [''],
      fromCityId:        ['', Validators.required],
      toCityId:          ['', Validators.required],
      distanceKm:        ['', [Validators.required, Validators.min(1), Validators.pattern('^[0-9]+(\\.[0-9]+)?$')]],
      fuelConsumedLtr:   ['', [Validators.required, Validators.min(0.1), Validators.pattern('^[0-9]+(\\.[0-9]+)?$')]],
      tripStartDateTime: ['', [Validators.required, this.noFutureDateValidator.bind(this)]],
      tripEndDateTime:   ['', [Validators.required, this.noFutureDateValidator.bind(this)]],
      co2Factor:         [{ value: '', disabled: true }],
      no2Factor:         [{ value: '', disabled: true }],
      ch4Factor:         [{ value: '', disabled: true }],
      totalCO2:          [{ value: '', disabled: true }],
      totalNO2:          [{ value: '', disabled: true }],
      totalCH4:          [{ value: '', disabled: true }],
      finalTotalEmission:[{ value: '', disabled: true }]
    }, {
      validators: [this.cityValidator, this.dateValidator.bind(this)]
    });
  }

  private showAccessRestricted() {
    Swal.fire({
      icon: 'warning',
      title: 'Access Restricted',
      text: 'You are not allowed to create vehicle emission reports.',
      confirmButtonText: 'Go Back'
    }).then(() => {
      this.router.navigate(['/dashboard/MyActionVehicle']);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOAD TRIP
  // ═══════════════════════════════════════════════════════════════

  loadTrip(id: string) {
    const requests: any = {
      trip:    this.tripService.getTripById(id),
      history: this.tripService.getTripFullDetails(id)
    };

    // Only fetch workflow actions when NOT in search
    if (this.pageSource !== 'search') {
      requests.actions = this.tripService.getWorkflowActions(id);
    }

    forkJoin(requests).subscribe({
      next: (results: any) => {
        const trip = results.trip;

        this.currentStatusId = trip.statusId || 0;

        // Patch form
        this.tripForm.patchValue({
          vehicle_id:        trip.vehicleId,
          fromCityId:        trip.fromCityId,
          toCityId:          trip.toCityId,
          distanceKm:        trip.distanceKm,
          fuelConsumedLtr:   trip.fuelConsumedLtr,
          tripStartDateTime: trip.tripStartDateTime,
          tripEndDateTime:   trip.tripEndDateTime,
          vehicleType:       trip.vehicleType || '',
          co2Factor:         trip.cO2,
          no2Factor:         trip.nO2,
          ch4Factor:         trip.cH4,
          totalCO2:          trip.totalCO2,
          totalNO2:          trip.totalNO2,
          totalCH4:          trip.totalCH4,
          finalTotalEmission:trip.totalEmission
        });

        const vehicle = this.vehicles.find(v => v.vehicle_id == trip.vehicleId);
        if (vehicle) {
          this.tripForm.patchValue({ vehicleType: vehicle.vehicle_type_name });
        }

        this.totalCO2  = trip.totalCO2 || 0;
        this.totalNO2  = trip.totalNO2 || 0;
        this.totalCH4  = trip.totalCH4 || 0;
        this.totalCO2e = (this.totalCO2 * 1) + (this.totalCH4 * this.GWP_CH4) + (this.totalNO2 * this.GWP_N2O);

        // Workflow actions
        if (results.actions) {
          this.workflowActions = results.actions?.data ?? results.actions ?? [];
          this.isResubmitMode  = this.workflowActions.some(a => a.actionName === 'Resubmit');
        } else {
          this.workflowActions = [];
        }

        // History — always load, HTML controls visibility
        this.tripHistory = results.history?.History || [];

        this.calculateDuration();

        // Lock form AFTER data loaded
        this.lockFormIfNeeded();

        // FORCE READ-ONLY FOR SEARCH PAGE
        if (this.pageSource === 'search') {
          this.tripForm.disable();
        }

        if (this.isResubmitMode) {
          this.disableResubmitFields();
        }
      },
      error: (err) => {
        console.error('Failed to load trip details:', err);
        Swal.fire({ icon: 'error', title: 'Failed to load trip', text: 'Please try again or contact support.' });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOCK FORM
  // ═══════════════════════════════════════════════════════════════

  lockFormIfNeeded() {
    // 🔴 1. SEARCH PAGE → always readonly
    if (this.pageSource === 'search') {
      this.tripForm.disable();
      return;
    }

    // 🔴 2. REVIEW MODE (Corporate Approve/Reject)
    if (this.isReviewMode) {
      this.tripForm.disable();
      return;
    }

    // 🔴 3. VIEW MODE
    if (this.isViewMode) {
      this.tripForm.disable();
      return;
    }

    // 🟡 Corporate fallback
    if (this.userRole === 'corporate') {
      this.tripForm.disable();
      return;
    }

    // 🟢 Reporter logic
    if (this.userRole === 'reporter') {
      if (this.currentStatusId === 1 || this.currentStatusId === 2) {
        this.tripForm.disable();
      } else if (this.currentStatusId === 3) {
        this.tripForm.enable();
        this.tripForm.get('vehicle_id')?.disable();
        this.tripForm.get('fromCityId')?.disable();
        this.tripForm.get('toCityId')?.disable();
      }
    }
  }

  disableResubmitFields() {
    this.tripForm.get('vehicle_id')?.disable();
    this.tripForm.get('fromCityId')?.disable();
    this.tripForm.get('toCityId')?.disable();
  }

  // ═══════════════════════════════════════════════════════════════
  //  BUTTON GUARDS
  // ═══════════════════════════════════════════════════════════════

  canSubmit(): boolean {
    return this.userRole === 'reporter' && this.mode === 'add';
  }

  canResubmit(): boolean {
    return (
      this.userRole === 'reporter' &&
      this.currentStatusId === 3 &&
      this.pageSource === 'myaction'
    );
  }

  canCorporateAction(): boolean {
    return this.userRole === 'corporate' && this.currentStatusId === 1;
  }

  isSearchMode(): boolean {
    return this.pageSource === 'search';
  }

  // ═══════════════════════════════════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════════════════════════════════

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
            if (callback) callback();
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
      this.tripForm.patchValue({ vehicleType: vehicle.vehicle_type_name });
      if (this.mode !== 'view') {
        const fuel   = this.fuels.find(f => f.fuel_name?.toLowerCase() === vehicle.fuel_name?.toLowerCase());
        const factor = this.emissionFactors.find(e => e.fuelName?.toLowerCase() === vehicle.fuel_name?.toLowerCase());
        this.tripForm.patchValue({
          fuelType:  fuel?.fuel_name  || '',
          fuelId:    fuel?.fuel_id    || '',
          co2Factor: factor?.cO2_Factor_KgPerL,
          no2Factor: factor?.nO2_Factor_KgPerL,
          ch4Factor: factor?.cH4_Factor_KgPerL
        });
      }
    });
  }

  isLoading(tripId: string): boolean { return false; }

  downloadTrip(tripId: string) {
    if (!tripId) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:5236/api/VehicleTripEmission/trip-pdf/${tripId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) return res.text().then(text => { throw new Error(`Server error ${res.status}: ${text}`); });
        return res.blob();
      })
      .then((blob: any) => {
        const now = new Date();
        const ds = now.getFullYear().toString() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0');
        const url  = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `Search_Fleet&Transport_${ds}.pdf`;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link); window.URL.revokeObjectURL(url);
      })
      .catch(err => alert('PDF generation failed: ' + err.message));
  }

  // ═══════════════════════════════════════════════════════════════
  //  SUBMIT / RESUBMIT / STATUS
  // ═══════════════════════════════════════════════════════════════

  submitTrip() {
    if (this.currentStatusId === 1) {
      Swal.fire({ icon: 'warning', title: 'Trip already submitted' });
      return;
    }
    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'Please fill all required fields' });
      return;
    }
    const formValue = this.tripForm.getRawValue();
    const payload = {
      VehicleId:          formValue.vehicle_id,
      VehicleType:        formValue.vehicleType,
      FromCityId:         formValue.fromCityId,
      ToCityId:           formValue.toCityId,
      DistanceKm:         Number(formValue.distanceKm),
      FuelConsumedLtr:    Number(formValue.fuelConsumedLtr),
      TripStartDateTime:  formValue.tripStartDateTime,
      TripEndDateTime:    formValue.tripEndDateTime,
      StatusId:           1
    };
    this.tripService.addTrip(payload).subscribe({
      next: () => Swal.fire({ icon: 'success', title: 'Trip Submitted Successfully' })
        .then(() => this.router.navigate(['/dashboard/searchVehicle'])),
      error: () => Swal.fire('Error', 'Failed to submit record', 'error')
    });
  }

  resubmitTrip() {
    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'Please fill all required fields' });
      return;
    }
    const tripId = this.route.snapshot.paramMap.get('id');
    if (!tripId) {
      Swal.fire({ icon: 'error', title: 'Trip ID not found' });
      return;
    }
    const formValue = this.tripForm.getRawValue();
    const payload = {
      TripId:            tripId,
      VehicleId:         formValue.vehicle_id,
      VehicleType:       formValue.vehicleType,
      FromCityId:        formValue.fromCityId,
      ToCityId:          formValue.toCityId,
      DistanceKm:        Number(formValue.distanceKm),
      FuelConsumedLtr:   Number(formValue.fuelConsumedLtr),
      TripStartDateTime: formValue.tripStartDateTime,
      TripEndDateTime:   formValue.tripEndDateTime,
      StatusId:          1
    };
    this.tripService.updateTrip(tripId, payload).subscribe({
      next: () => Swal.fire({ icon: 'success', title: 'Trip Updated Successfully' })
        .then(() => this.router.navigate(['/dashboard/searchVehicle'])),
      error: (err: any) => Swal.fire({ icon: 'error', title: 'Trip update failed', text: err?.error?.message || 'Server error' })
    });
  }

  updateStatus(workflowId: number) {
    const tripId = this.route.snapshot.paramMap.get('id');
    if (!tripId) return;
    if (this.currentStatusId !== 1) {
      Swal.fire({ icon: 'warning', title: 'Action already taken' });
      return;
    }
    this.tripService.updateTripStatus(tripId, workflowId).subscribe((res: any) => {
      Swal.fire({ icon: 'success', title: 'Status Updated Successfully', confirmButtonText: 'OK' })
        .then(() => this.router.navigate(['/dashboard/MyActionVehicle']));
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════════════════════════

  goBack() {
    if (this.pageSource === 'search') {
      this.router.navigate(['/dashboard/searchVehicle']);
    } else {
      this.router.navigate(['/dashboard/MyActionVehicle']);
    }
  }

  openTrip(tripId: string) {
    if (!tripId) return;
    this.router.navigate(['/dashboard/vehicle-ec', tripId], { queryParams: { mode: 'view', page: 'search' } });
  }

  // ═══════════════════════════════════════════════════════════════
  //  VALIDATION
  // ═══════════════════════════════════════════════════════════════

  cityValidator(group: FormGroup) {
    const fromCity = group.get('fromCityId')?.value;
    const toCity   = group.get('toCityId')?.value;
    if (fromCity && toCity && fromCity === toCity) return { sameCity: true };
    return null;
  }

  noFutureDateValidator(control: any) {
    if (!control.value) return null;
    return new Date(control.value) > new Date() ? { futureDate: true } : null;
  }

  dateValidator(group: FormGroup): ValidationErrors | null {
    const start = group.get('tripStartDateTime')?.value;
    const end   = group.get('tripEndDateTime')?.value;
    if (!start || !end) return null;
    return new Date(end) <= new Date(start) ? { endBeforeStart: true } : null;
  }

  updateCurrentDateTime() {
    this.todayDateTime = new Date().toISOString().slice(0, 16);
  }

  // ═══════════════════════════════════════════════════════════════
  //  CALCULATIONS
  // ═══════════════════════════════════════════════════════════════

  calculateEmissions() {
    const fuel      = Number(this.tripForm.get('fuelConsumedLtr')?.value) || 0;
    const co2Factor = Number(this.tripForm.get('co2Factor')?.value)       || 0;
    const ch4Factor = Number(this.tripForm.get('ch4Factor')?.value)       || 0;
    const n2oFactor = Number(this.tripForm.get('no2Factor')?.value)       || 0;
    this.totalCO2   = fuel * co2Factor;
    this.totalCH4   = fuel * ch4Factor;
    this.totalNO2   = fuel * n2oFactor;
    this.totalCO2e  = (this.totalCO2 * 1) + (this.totalCH4 * this.GWP_CH4) + (this.totalNO2 * this.GWP_N2O);
    this.tripForm.patchValue({
      totalCO2:          this.totalCO2,
      totalCH4:          this.totalCH4,
      totalNO2:          this.totalNO2,
      finalTotalEmission:this.totalCO2e
    });
  }

  setupDurationListener() {
    this.tripForm.get('tripStartDateTime')?.valueChanges.subscribe(() => this.calculateDuration());
    this.tripForm.get('tripEndDateTime')?.valueChanges.subscribe(() => this.calculateDuration());
  }

  calculateDuration() {
    const start = this.tripForm.get('tripStartDateTime')?.value;
    const end   = this.tripForm.get('tripEndDateTime')?.value;
    this.tripDuration = '';
    if (!start || !end) return;
    const startDate = new Date(start), endDate = new Date(end);
    if (endDate <= startDate) return;
    const diffMs  = endDate.getTime() - startDate.getTime();
    const hours   = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    this.tripDuration = `${hours} hrs ${minutes} mins`;
  }

  shouldShowDuration(): boolean { return this.mode === 'view'; }

  getUserRole(): string {
    const userData = localStorage.getItem('user');
    if (!userData) return '';
    return JSON.parse(userData).currentRole?.toLowerCase() || '';
  }

  resetForm() {
    Swal.fire({
      title: 'Are you sure?',
      text: 'All entered data will be cleared',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset it!'
    }).then(result => {
      if (result.isConfirmed) {
        this.tripForm.reset();
        this.totalCO2  = 0;
        this.totalNO2  = 0;
        this.totalCH4  = 0;
        this.totalCO2e = 0;
        this.tripDuration = '';
        this.tripForm.enable();
      }
    });
  }

  getActionMessage(h: any): string {
    const role   = h.ActionByRole || '';
    const name   = h.FullName     || '';
    const action = h.ActionName   || '';
    switch (action) {
      case 'Submit':   return `${name} (${role}) submitted this trip for review`;
      case 'Approve':  return `${name} (${role}) approved this trip`;
      case 'Reject':   return `${name} (${role}) rejected this trip`;
      case 'Resubmit': return `${name} (${role}) resubmitted this trip after corrections`;
      default:         return `${name} (${role}) performed ${action}`;
    }
  }

  getTimeAgo(dateStr: string): string {
    const now  = new Date(), date = new Date(dateStr);
    const diffMs  = now.getTime() - date.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours   = Math.floor(diffMs / (1000 * 60 * 60));
    const days    = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (minutes < 1)  return 'just now';
    if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24)   return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 30)    return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  exportExcel() { /* keep existing implementation */ }
}