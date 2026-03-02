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
  calculatedResult: any = null;


  constructor(private fb: FormBuilder, private service: GeneratorecService) {}

  ngOnInit(): void {
    this.initForm();
    this.loadAllData();
  }

 initForm() {
  this.operationForm = this.fb.group({
    OperationId: [''],
    GeneratorId: [null, Validators.required],
    OperationDate: ['', Validators.required],
     StartTime: ['', Validators.required],
  EndTime: ['', Validators.required],
    RunHours: [{ value: 0, disabled: true }],
    LoadFactor: [0],
    PowerOutputKWH: [{ value: 0, disabled: true }],
    FuelConsumedLiters: [0]
  });
}

  // Load generators, fuels, then operations
loadAllData() {
  this.service.getGenerators().subscribe({
    next: (res: any) => {

      console.log("Generator API Response:", res);

      // If API returns array directly
      this.generators = res || [];

      console.log("Generators Loaded:", this.generators);

      this.loadOperations();
    },
    error: () => console.error('Failed to load generators')
  });
}

loadOperations() {
  this.service.getAll().subscribe({
    next: (res: any) => {

      // Convert generatorId to string in map
      const genMap = new Map(
        this.generators.map(g => [String(g.generatorId), g])
      );

      this.operations = (res.data || []).map((op: any) => {

        const generator = genMap.get(String(op.generatorId));

        return {
          operationId: op.operationId,
          operationDate: op.operationDate,
          runHours: op.runHours,
          fuelConsumedLiters: op.fuelConsumedLiters,
          loadFactor: op.loadFactor,
          powerOutputKWH: op.powerOutputKWH,
          generatorId: String(op.generatorId),

          GeneratorName: generator?.generatorName || 'N/A',
          FuelName: generator?.fuelName || 'N/A'
        };
      });

console.log("Generator IDs:", this.generators.map(g => g.generatorId));
    },
    error: () => console.error('Failed to load operations')
  });
}

submitOperation() {
  if (this.operationForm.invalid) {
    Swal.fire('Error', 'Please fill required fields', 'error');
    return;
  }

  const raw = this.operationForm.getRawValue();
  const payload = {
    generatorId: raw.GeneratorId,
    startTime: raw.StartTime,
    endTime: raw.EndTime,
    loadFactor: raw.LoadFactor,
    fuelConsumedLiters: raw.FuelConsumedLiters
  };

  const operationId = raw.OperationId;

  if (operationId) {
    // ===== UPDATE =====
    this.service.update(operationId, payload).subscribe({
      next: (res: any) => {
        if (res.status) {
          this.calculatedResult = res.data;
          this.operationForm.patchValue({
            RunHours: res.data.runHours,
            PowerOutputKWH: res.data.powerOutputKWH
          });
          Swal.fire('Success', 'Operation updated successfully', 'success');
          this.loadOperations();
          this.resetForm();
        }
      },
      error: () => Swal.fire('Error', 'Failed to update operation', 'error')
    });
  } else {
    // ===== CREATE =====
    this.service.create(payload).subscribe({
      next: (res: any) => {
        if (res.status) {
          this.calculatedResult = res.data;
          this.operationForm.patchValue({
            RunHours: res.data.runHours,
            PowerOutputKWH: res.data.powerOutputKWH
          });
          Swal.fire('Success', 'Operation saved successfully', 'success');
          this.loadOperations();
          this.resetForm();
        }
      },
      error: () => Swal.fire('Error', 'Failed to save operation', 'error')
    });
  }
}

edit(op: any) {
  this.operationForm.patchValue({
    OperationId: op.operationId,
    GeneratorId: op.generatorId,
    StartTime: op.startTime?.substring(0,16),
    EndTime: op.endTime?.substring(0,16),
    LoadFactor: op.loadFactor,
    FuelConsumedLiters: op.fuelConsumedLiters
  });

  this.operationForm.get('RunHours')?.setValue(op.runHours);
  this.operationForm.get('PowerOutputKWH')?.setValue(op.powerOutputKWH);
}


formatTime(time: string): string {
  if (!time) return '';

  const parts = time.split(':');
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');

  return `${h}:${m}:00`;
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