import { Component, OnInit, signal, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { VehicleTripService } from './vehicle-trip-service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

interface VehicleTrip {
  TripId?: number;
  VehicleNo: string;
  FromCity: string;
  ToCity: string;
  TripStartDateTime: string;
  TripEndDateTime: string;
  DistanceKm: number;
  FuelConsumedLtr: number;
}

@Component({
  selector: 'app-vehicle-trip',
  templateUrl: './vehicle-trip.html',
  styleUrls: ['./vehicle-trip.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class VehicleTripComponent implements OnInit {

  tripForm!: FormGroup;

  // Signal to refresh form if needed
  refreshTrigger = signal(0);

  constructor(
    private fb: FormBuilder,
    private service: VehicleTripService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.initForm();
  }

  // ================== FORM INIT ==================
  initForm() {
    this.tripForm = this.fb.group({
      TripId: [''],
      VehicleNo: ['', Validators.required],
      FromCity: ['', Validators.required],
      ToCity: ['', Validators.required],
      TripStartDateTime: ['', Validators.required],
      TripEndDateTime: ['', Validators.required],
      DistanceKm: ['', [Validators.required, Validators.min(0)]],
      FuelConsumedLtr: ['', [Validators.required, Validators.min(0)]]
    });
  }

  // ================== SUBMIT FORM ==================
  submitTrip() {
    if (this.tripForm.invalid) {
      this.toastr.error('Please fill all required fields');
      return;
    }

    const trip: VehicleTrip = this.tripForm.value;
    const isCreate = !trip.TripId;

    const obs = isCreate
      ? this.service.create(trip)  // API call for create
      : this.service.update(trip.TripId!, trip); // API call for update

    obs.subscribe({
      next: () => {
        this.toastr.success(`Trip ${isCreate ? 'created' : 'updated'} successfully`);
        this.resetForm();
        this.refreshTrigger.update(v => v + 1);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Operation failed');
      }
    });
  }

  // ================== RESET FORM ==================
  resetForm() {
    this.tripForm.reset({
      TripId: '',
      VehicleNo: '',
      FromCity: '',
      ToCity: '',
      TripStartDateTime: '',
      TripEndDateTime: '',
      DistanceKm: '',
      FuelConsumedLtr: ''
    });
  }

  // ================== EDIT EXISTING TRIP ==================
  editTrip(trip: VehicleTrip) {
    this.tripForm.patchValue(trip);
  }

  // ================== OPTIONAL DELETE ==================
  deleteTrip(trip: VehicleTrip) {
    if (!trip.TripId) return;

    Swal.fire({
      title: 'Are you sure?',
      text: "This will soft delete the trip!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.delete(trip.TripId!).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Trip deleted successfully.', 'success');
            this.refreshTrigger.update(v => v + 1);
          },
          error: () => {
            Swal.fire('Error!', 'Delete failed.', 'error');
          }
        });
      }
    });
  }
}