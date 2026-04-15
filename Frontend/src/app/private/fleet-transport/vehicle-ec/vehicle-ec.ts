import { Component, OnInit } from '@angular/core';
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
  emissionFactors: any[] = [];

  totalCO2: number = 0;
  totalNO2: number = 0;
  totalCH4: number = 0;
  totalCO2e: number = 0;

  currentStatusId: number = 0;
  tripDuration: string = '';
  todayDateTime: string = '';

  mode: 'add' | 'edit' | 'view' = 'add';
  pageSource: 'myaction' | 'search' = 'search';
  isViewMode: boolean = false;
  isReviewMode: boolean = false;
  isEditMode: boolean = false;
  isResubmitMode: boolean = false;

  userRole: string = '';

  readonly GWP_CH4 = 28;
  readonly GWP_N2O = 265;
  constructor(
    private fb: FormBuilder,
    private tripService: TripService,
    private toastr: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.formOpenTime = new Date();
    this.initForm();
    this.updateCurrentDateTime();

    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      this.userRole = parsed.currentRole?.toLowerCase() || '';
    }

    const tripId = this.route.snapshot.paramMap.get('id');
    const queryParams = this.route.snapshot.queryParamMap;
    const modeParam = queryParams.get('mode') || 'create';
    const pageParam = queryParams.get('page');

    this.pageSource = pageParam === 'myaction' ? 'myaction' : 'search';
    this.isViewMode = modeParam === 'view';
    this.isReviewMode = modeParam === 'review' && this.pageSource === 'myaction';
    this.isEditMode = modeParam === 'edit' && this.pageSource === 'myaction';

    this.setupDurationListener();
    this.tripForm.get('fuelConsumedLtr')?.valueChanges.subscribe(() => this.calculateEmissions());

    if (tripId) {
      this.mode = 'view';

      if (this.pageSource === 'search') {
        this.tripForm.disable();
      }

      this.loadAllMasterData(() => this.loadTrip(tripId));

    } else {
      if (this.userRole === 'corporate' || this.userRole === 'admin') {
        this.showAccessRestricted();
        return;
      }
      this.mode = 'add';
      this.loadAllMasterData();
    }
  }

  initForm() {
    this.tripForm = this.fb.group({
      vehicle_id: ['', Validators.required],
      vehicleType: [''],
      fuelId: [''],
      fromCityId: ['', Validators.required],
      toCityId: ['', Validators.required],
      distanceKm: ['', [Validators.required, Validators.min(1), Validators.pattern('^[0-9]+(\\.[0-9]+)?$')]],
      fuelConsumedLtr: ['', [Validators.required, Validators.min(0.1), Validators.pattern('^[0-9]+(\\.[0-9]+)?$')]],
      tripStartDateTime: ['', [Validators.required, this.noFutureDateValidator.bind(this)]],
      tripEndDateTime: ['', [Validators.required, this.noFutureDateValidator.bind(this)]],
      co2Factor: [{ value: '', disabled: true }],
      no2Factor: [{ value: '', disabled: true }],
      ch4Factor: [{ value: '', disabled: true }],
      totalCO2: [{ value: '', disabled: true }],
      totalNO2: [{ value: '', disabled: true }],
      totalCH4: [{ value: '', disabled: true }],
      finalTotalEmission: [{ value: '', disabled: true }]
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
    }).then(() => this.router.navigate(['/dashboard/MyActionVehicle']));
  }


  loadTrip(id: string) {
    const requests: any = {
      trip: this.tripService.getTripById(id),
      history: this.tripService.getTripFullDetails(id),
      actions: this.tripService.getWorkflowActions(id)
    };

    // if (this.pageSource !== 'search') {
    //   requests.actions = this.tripService.getTripById(id);
    // }

    forkJoin(requests).subscribe({
      next: (results: any) => {
        const trip = results.trip;
        this.currentStatusId = trip.statusId || 0;

        this.tripForm.patchValue({
          vehicle_id: trip.vehicleId,
          fromCityId: trip.fromCityId,
          toCityId: trip.toCityId,
          distanceKm: trip.distanceKm,
          fuelConsumedLtr: trip.fuelConsumedLtr,
          tripStartDateTime: trip.tripStartDateTime,
          tripEndDateTime: trip.tripEndDateTime,
          vehicleType: trip.vehicleType || '',
          co2Factor: trip.cO2,
          no2Factor: trip.nO2,
          ch4Factor: trip.cH4,
          totalCO2: trip.totalCO2,
          totalNO2: trip.totalNO2,
          totalCH4: trip.totalCH4,
          finalTotalEmission: trip.totalEmission
        });

        const vehicle = this.vehicles.find(v => v.vehicle_id == trip.vehicleId);
        if (vehicle) this.tripForm.patchValue({ vehicleType: vehicle.vehicle_type_name });

        this.totalCO2 = trip.totalCO2 || 0;
        this.totalNO2 = trip.totalNO2 || 0;
        this.totalCH4 = trip.totalCH4 || 0;
        this.totalCO2e = this.totalCO2
          + (this.totalCH4 * this.GWP_CH4)
          + (this.totalNO2 * this.GWP_N2O);

        this.workflowActions = results.actions ?? [];
      this.isResubmitMode = this.workflowActions.some(
        (a: any) => a.actionName === 'Resubmit'
      );

        this.tripHistory = results.history?.History || [];

        this.calculateDuration();
        this.lockFormIfNeeded();

        if (this.pageSource === 'search') {
          this.tripForm.disable();
        }

        if (this.isResubmitMode) {
          this.disableResubmitFields();
        }
      },
      error: (err) => {
        console.error('Failed to load trip:', err);
        Swal.fire({ icon: 'error', title: 'Failed to load trip', text: 'Please try again.' });
      }
    });
  }

  lockFormIfNeeded() {
    if (this.pageSource === 'search') {
      this.tripForm.disable();
      return;
    }
    if (this.isReviewMode) {
      this.tripForm.disable();
      return;
    }
    if (this.isViewMode) {
      this.tripForm.disable();
      return;
    }
    if (this.userRole === 'corporate') {
      this.tripForm.disable();
      return;
    }
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

  // ── BUTTON GUARDS ─────────────────────────────────────────────

  canSubmit(): boolean {
    return this.userRole === 'reporter' && this.mode === 'add';
  }

  // canResubmit(): boolean {
  //   // return (
  //   //   this.userRole === 'reporter' &&
  //   //   this.currentStatusId === 3 &&
  //   //   this.pageSource === 'myaction' &&
  //   //   this.isEditMode
  //   // );
  //   return this.workflowActions.some(a => a.actionName === 'Resubmit');
  // }

  canApproveReject(): boolean {
    return this.workflowActions.some(
      a => a.actionName === 'Approve' || a.actionName === 'Reject'
    );
  }
  // canCorporateAction(): boolean {
  //   return (
  //     this.userRole === 'corporate' &&
  //     this.currentStatusId === 1 &&
  //     this.pageSource === 'myaction' &&
  //     this.isReviewMode
  //   );
  // }

  showResultCard(): boolean {
    return this.isViewMode || this.isReviewMode || this.isEditMode || this.isResubmitMode;
  }

  isSearchMode(): boolean { return this.pageSource === 'search'; }

  // ── DATA LOADING ──────────────────────────────────────────────

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
    this.tripForm.get('vehicle_id')?.valueChanges.subscribe(id => {
      if (!id) return;
      const vehicle = this.vehicles.find(v => v.vehicle_id == id);
      if (!vehicle) return;
      this.tripForm.patchValue({ vehicleType: vehicle.vehicle_type_name });
      if (this.mode !== 'view') {
        const fuel = this.fuels.find(f => f.fuel_name?.toLowerCase() === vehicle.fuel_name?.toLowerCase());
        const factor = this.emissionFactors.find(e => e.fuelName?.toLowerCase() === vehicle.fuel_name?.toLowerCase());
        this.tripForm.patchValue({
          fuelId: fuel?.fuel_id || '',
          co2Factor: factor?.cO2_Factor_KgPerL,
          no2Factor: factor?.nO2_Factor_KgPerL,
          ch4Factor: factor?.cH4_Factor_KgPerL
        });
      }
    });
  }

  downloadTrip(tripId: string) {
    if (!tripId) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:5236/api/VehicleTripEmission/trip-pdf/${tripId}`, {
      method: 'GET', headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => { if (!r.ok) return r.text().then(t => { throw new Error(`Error ${r.status}: ${t}`); }); return r.blob(); })
      .then((blob: any) => {
        const ds = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `Fleet&Transport_${ds}.pdf`;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link); window.URL.revokeObjectURL(url);
      })
      .catch(e => alert('PDF failed: ' + e.message));
  }

  // ── ACTIONS ───────────────────────────────────────────────────

  submitTrip() {
    if (this.currentStatusId === 1) { Swal.fire({ icon: 'warning', title: 'Trip already submitted' }); return; }
    if (this.tripForm.invalid) { this.tripForm.markAllAsTouched(); Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'Please fill all required fields' }); return; }
    const v = this.tripForm.getRawValue();
    this.tripService.addTrip({
      VehicleId: v.vehicle_id, VehicleType: v.vehicleType,
      FromCityId: v.fromCityId, ToCityId: v.toCityId,
      DistanceKm: Number(v.distanceKm), FuelConsumedLtr: Number(v.fuelConsumedLtr),
      TripStartDateTime: v.tripStartDateTime, TripEndDateTime: v.tripEndDateTime, StatusId: 1
    }).subscribe({
      next: () => Swal.fire({ icon: 'success', title: 'Trip Submitted Successfully' }).then(() => this.router.navigate(['/dashboard/searchVehicle'])),
      error: () => Swal.fire('Error', 'Failed to submit record', 'error')
    });
  }

  resubmitTrip() {
    if (this.tripForm.invalid) { this.tripForm.markAllAsTouched(); Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'Please fill all required fields' }); return; }
    const tripId = this.route.snapshot.paramMap.get('id');
    if (!tripId) { Swal.fire({ icon: 'error', title: 'Trip ID not found' }); return; }
    const v = this.tripForm.getRawValue();
    this.tripService.updateTrip(tripId, {
      TripId: tripId, VehicleId: v.vehicle_id, VehicleType: v.vehicleType,
      FromCityId: v.fromCityId, ToCityId: v.toCityId,
      DistanceKm: Number(v.distanceKm), FuelConsumedLtr: Number(v.fuelConsumedLtr),
      TripStartDateTime: v.tripStartDateTime, TripEndDateTime: v.tripEndDateTime, StatusId: 1
    }).subscribe({
      next: () => Swal.fire({ icon: 'success', title: 'Trip Updated Successfully' }).then(() => this.router.navigate(['/dashboard/MyActionVehicle'])),
      error: (err: any) => Swal.fire({ icon: 'error', title: 'Trip update failed', text: err?.error?.message || 'Server error' })
    });
  }

  updateStatus(workflowId: number) {
    const tripId = this.route.snapshot.paramMap.get('id');
    if (!tripId) return;
    const action = this.workflowActions.find(a => a.workflowId === workflowId);
    if (!action) return;
    if ((action.actionName === 'Approve' || action.actionName === 'Reject') && this.currentStatusId !== 1) {
      Swal.fire({ icon: 'warning', title: 'Invalid Action', text: 'Only submitted records can be approved/rejected' });
      return;
    }
    this.tripService.updateTripStatus(tripId, workflowId).subscribe({
      next: () => Swal.fire({ icon: 'success', title: 'Status Updated Successfully' }).then(() => this.router.navigate(['/dashboard/MyActionVehicle'])),
      error: () => Swal.fire('Error', 'Status update failed', 'error')
    });
  }

  goBack() {
    this.pageSource === 'search'
      ? this.router.navigate(['/dashboard/searchVehicle'])
      : this.router.navigate(['/dashboard/MyActionVehicle']);
  }

  // ── VALIDATION ────────────────────────────────────────────────

  cityValidator(group: FormGroup) {
    const f = group.get('fromCityId')?.value, t = group.get('toCityId')?.value;
    return f && t && f === t ? { sameCity: true } : null;
  }

  noFutureDateValidator(control: any) {
    if (!control.value) return null;
    return new Date(control.value) > new Date() ? { futureDate: true } : null;
  }

  dateValidator(group: FormGroup): ValidationErrors | null {
    const s = group.get('tripStartDateTime')?.value, e = group.get('tripEndDateTime')?.value;
    if (!s || !e) return null;
    return new Date(e) <= new Date(s) ? { endBeforeStart: true } : null;
  }

  updateCurrentDateTime() { this.todayDateTime = new Date().toISOString().slice(0, 16); }

  // ── CALCULATIONS ──────────────────────────────────────────────

  calculateEmissions() {
    const fuel = Number(this.tripForm.get('fuelConsumedLtr')?.value) || 0;
    const co2 = Number(this.tripForm.get('co2Factor')?.value) || 0;
    const ch4 = Number(this.tripForm.get('ch4Factor')?.value) || 0;
    const n2o = Number(this.tripForm.get('no2Factor')?.value) || 0;
    this.totalCO2 = fuel * co2;
    this.totalCH4 = fuel * ch4;
    this.totalNO2 = fuel * n2o;
    this.totalCO2e = this.totalCO2 + (this.totalCH4 * this.GWP_CH4) + (this.totalNO2 * this.GWP_N2O);
    this.tripForm.patchValue({ totalCO2: this.totalCO2, totalCH4: this.totalCH4, totalNO2: this.totalNO2, finalTotalEmission: this.totalCO2e });
  }

  setupDurationListener() {
    this.tripForm.get('tripStartDateTime')?.valueChanges.subscribe(() => this.calculateDuration());
    this.tripForm.get('tripEndDateTime')?.valueChanges.subscribe(() => this.calculateDuration());
  }

  calculateDuration() {
    const s = this.tripForm.get('tripStartDateTime')?.value;
    const e = this.tripForm.get('tripEndDateTime')?.value;
    this.tripDuration = '';
    if (!s || !e) return;
    const sd = new Date(s), ed = new Date(e);
    if (ed <= sd) return;
    const diff = ed.getTime() - sd.getTime();
    this.tripDuration = `${Math.floor(diff / 3600000)} hrs ${Math.floor((diff % 3600000) / 60000)} mins`;
  }

  shouldShowDuration(): boolean {
    return this.mode === 'view' || this.isEditMode;
  }

  getUserRole(): string {
    const u = localStorage.getItem('user');
    return u ? (JSON.parse(u).currentRole?.toLowerCase() || '') : '';
  }

  resetForm() {
    Swal.fire({ title: 'Are you sure?', text: 'All entered data will be cleared', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, reset it!' })
      .then(r => {
        if (r.isConfirmed) {
          this.tripForm.reset();
          this.totalCO2 = this.totalNO2 = this.totalCH4 = this.totalCO2e = 0;
          this.tripDuration = '';
          this.tripForm.enable();
        }
      });
  }

  getActionMessage(h: any): string {
    const r = h.ActionByRole || '', n = h.FullName || '', a = h.ActionName || '';
    switch (a) {
      case 'Submit': return `${n} (${r}) submitted this trip for review`;
      case 'Approve': return `${n} (${r}) approved this trip`;
      case 'Reject': return `${n} (${r}) rejected this trip`;
      case 'Resubmit': return `${n} (${r}) resubmitted this trip after corrections`;
      default: return `${n} (${r}) performed ${a}`;
    }
  }

  getTimeAgo(dateStr: string): string {
    const now = new Date(), d = new Date(dateStr), diff = now.getTime() - d.getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dy = Math.floor(diff / 86400000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min${m > 1 ? 's' : ''} ago`;
    if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
    if (dy < 30) return `${dy} day${dy > 1 ? 's' : ''} ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }


}