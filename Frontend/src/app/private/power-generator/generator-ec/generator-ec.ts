import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { GeneratorecService } from './generatorec-service';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-generator-operation',
  standalone: true,
  templateUrl: './generator-ec.html',
  styleUrls: ['./generator-ec.css'],
  imports: [CommonModule, ReactiveFormsModule]
})
export class GeneratorOperationComponent implements OnInit {

  operationForm!: FormGroup;

  operations: any[] = [];
  fuels: any[] = [];
  generators: any[] = [];

  constructor(private fb: FormBuilder, private service: GeneratorecService) {}

  ngOnInit(): void {
    this.initForm();
    this.loadAllData();
  }

  initForm() {
    this.operationForm = this.fb.group({
      OperationId: [''],
      GeneratorId: ['', Validators.required],
      FuelId: ['', Validators.required],
      OperationDate: ['', Validators.required],
      StartTime: [''],
      EndTime: [''],
      RunHours: [{ value: 0, disabled: true }],
      LoadFactor: [0],
      PowerOutputKWH: [{ value: 0, disabled: true }],
      FuelConsumedLiters: [0]
    });
  }

  // Load generators, fuels, then operations
  loadAllData() {
    forkJoin({
      generators: this.service.getGenerators(),
      fuels: this.service.getFuels()
    }).subscribe({
      next: (res: any) => {
        // normalize IDs as strings for dropdown binding
        this.generators = (res.generators.data || []).map((g: any) => ({
          ...g,
          generatorId: g.generatorId.toString()
        }));
        this.fuels = (res.fuels.data || []).map((f: any) => ({
          ...f,
          fuel_id: f.fuel_id.toString()
        }));

        this.loadOperations();
      },
      error: () => console.error('Failed to load generators or fuels')
    });
  }

  loadOperations() {
    this.service.getAll().subscribe({
      next: (res: any) => {
        const genMap = new Map(this.generators.map(g => [g.generatorId, g.generatorName]));
        const fuelMap = new Map(this.fuels.map(f => [f.fuel_id, f.fuel_name]));

        this.operations = (res.data || []).map((op: any) => ({
          ...op,
          generatorId: op.generatorId.toString(),
          fuelId: op.fuelId.toString(),
          GeneratorName: genMap.get(op.generatorId.toString()) || '',
          FuelName: fuelMap.get(op.fuelId.toString()) || ''
        }));
      },
      error: () => console.error('Failed to load operations')
    });
  }

  submitOperation() {
    if (this.operationForm.invalid) return;

    const data = this.operationForm.getRawValue();
    this.service.create(data).subscribe({
      next: () => {
        Swal.fire('Success', 'Operation saved successfully', 'success');
        this.loadOperations();
        this.resetForm();
      },
      error: () => Swal.fire('Error', 'Failed to save', 'error')
    });
  }

  edit(op: any) {
    this.operationForm.patchValue({
      OperationId: op.operationId,
      GeneratorId: op.generatorId.toString(),
      FuelId: op.fuelId.toString(),
      OperationDate: op.operationDate,
      StartTime: op.startTime || '',
      EndTime: op.endTime || '',
      LoadFactor: op.loadFactor || 0,
      FuelConsumedLiters: op.fuelConsumedLiters || 0
    });

    this.operationForm.get('RunHours')?.setValue(op.runHours || 0);
    this.operationForm.get('PowerOutputKWH')?.setValue(op.powerOutputKWH || 0);
  }

  deleteUI(op: any) {
    Swal.fire({
      title: 'Are you sure?',
      icon: 'warning',
      showCancelButton: true
    }).then(result => {
      if (result.isConfirmed) {
        this.service.delete(op.operationId).subscribe({
          next: () => {
            Swal.fire('Deleted!', '', 'success');
            this.loadOperations();
          },
          error: () => Swal.fire('Error', 'Delete failed', 'error')
        });
      }
    });
  }

  resetForm() {
    this.operationForm.reset();
    this.operationForm.get('RunHours')?.setValue(0);
    this.operationForm.get('PowerOutputKWH')?.setValue(0);
  }
}