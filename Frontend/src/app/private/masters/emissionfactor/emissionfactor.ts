import { Component, OnInit, signal, effect } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EmissionFactorService } from './emissionfactor-service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
interface CB_EmissionFactor {
  EmissionFactorId: string;
  FuelId: number;
  FuelName: string;
  CO2_Factor_KgPerL: number;
  NO2_Factor_KgPerL: number;
  CH4_Factor_KgPerL: number;
  IsActive: boolean;
}

interface FuelMaster {
  fuelId: number;
  fuelName: string;
}

@Component({
  selector: 'app-emission-factor',
  templateUrl: './emissionfactor.html',
  styleUrls: ['./emissionfactor.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class EmissionFactorComponent implements OnInit {
fuels: any[] = [];
  emissionForm!: FormGroup;
  emissionFactors = signal<CB_EmissionFactor[]>([]);

  constructor(
    private fb: FormBuilder,
    private service: EmissionFactorService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadList();
      this.loadFuels();
  }

  initForm() {
    this.emissionForm = this.fb.group({
  EmissionFactorId: [''],
    FuelId: [null, Validators.required], 
  CO2_Factor_KgPerL: [null, Validators.required],
  NO2_Factor_KgPerL: [null, Validators.required],
  CH4_Factor_KgPerL: [null, Validators.required],
  IsActive: [true]
});
  }

  showToast(type: 'success' | 'error', message: string) {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: type,
    title: message,
    showConfirmButton: false,
    timer: 2000
  });
}

loadList() {
  this.service.getList().subscribe({
    next: (res: any) => {
      const mapped = res.data.map((e: any) => ({
        EmissionFactorId: e.id,
        FuelId: e.fuelId,
        FuelName: e.fuelName,
        CO2_Factor_KgPerL: e.cO2_Factor_KgPerL,
        NO2_Factor_KgPerL: e.nO2_Factor_KgPerL,
        CH4_Factor_KgPerL: e.cH4_Factor_KgPerL,
        IsActive: e.isActive
      }));
      this.emissionFactors.set(mapped);
    },
    error: () => this.toastr.error('Failed to load emission factors')
  });
}

submitEmission() {

  if (this.emissionForm.invalid) {
    this.emissionForm.markAllAsTouched();
    this.showToast('error', 'Please fill all required fields');
    return;
  }
  console.log('Selected FuelId:', this.emissionForm.value.FuelId);
console.log('Type:', typeof this.emissionForm.value.FuelId);

  const ef = this.emissionForm.value;
  const isCreate = !ef.EmissionFactorId;

  const obs = isCreate
    ? this.service.create(ef)
    : this.service.update(ef.EmissionFactorId, ef); // ✅ FIXED

  obs.subscribe({
    next: () => {
      this.showToast('success', isCreate ? 'Created successfully' : 'Updated successfully');
      this.loadList();
      this.resetForm();
    },
    error: () => {
      this.showToast('error', isCreate ? 'Create failed' : 'Update failed');
    }
  });
}

  edit(ef: CB_EmissionFactor) { this.emissionForm.patchValue(ef); }
resetForm() {
  this.emissionForm.reset({
    EmissionFactorId: '',
    FuelId: null,
    CO2_Factor_KgPerL: 0,
    NO2_Factor_KgPerL: 0,
    CH4_Factor_KgPerL: 0,
    IsActive: true
  });
}
  deleteUI(ef: CB_EmissionFactor) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the emission factor!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes'
    }).then(result => {
      if (result.isConfirmed) {
        this.service.delete(ef.EmissionFactorId).subscribe({
          next: () => { this.toastr.success('Deleted'); this.loadList(); },
          error: () => this.toastr.error('Delete failed')
        });
      }
    });
  }

 toggleActive(ef: CB_EmissionFactor) {
  this.service.toggleActive(ef.EmissionFactorId, !ef.IsActive).subscribe({
    next: () => {
      this.toastr.success('Status updated');
      this.loadList();
    },
    error: () => this.toastr.error('Status update failed')
  });
}

loadFuels() {
  this.service.getFuels().subscribe({
    next: (res: any) => {

      console.log('Fuel API:', res);

      // ✅ handle all possible structures
      const fuelData =
        res?.data?.data ||   // case: paged API
        res?.data ||         // case: normal API
        res ||               // fallback
        [];

     this.fuels = fuelData.map((f: any) => ({
  fuelId: f.fuel_id,      // ✅ keep encrypted string
  fuelName: f.fuel_name
}));

      console.log('Mapped fuels:', this.fuels);
    },
    error: () => {
      this.showToast('error', 'Failed to load fuels');
    }
  });
}

}