import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { GeneratorecService } from './generatorec-service';
import { ActivatedRoute ,Router} from '@angular/router';
import Swal from 'sweetalert2';

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
  generators: any[] = [];

  constructor(
    private fb: FormBuilder,
    private service: GeneratorecService,
      private route: ActivatedRoute,
      private router : Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadAllData();

     this.route.paramMap.subscribe(params => {

    const id = params.get('id');

    if (id) {
      this.loadOperationById(id);
    }

  });
  }

 initForm() {
  this.operationForm = this.fb.group({
    OperationId: [''],

    GeneratorId: [null, Validators.required],

    StartTime: [
      '',
      [Validators.required, this.noFutureDateValidator]
    ],

    EndTime: [
      '',
      [Validators.required, this.noFutureDateValidator]
    ],

    LoadFactor: [
      '',
      [
        Validators.required,
        Validators.min(0)
      ]
    ],

    FuelConsumedLiters: [
      '',
      [
        Validators.required,
        Validators.min(0)
      ]
    ]
  });
}

noFutureDateValidator(control: any) {

  if (!control.value) return null;

  const inputDate = new Date(control.value);
  const now = new Date();

  if (inputDate > now) {
    return { futureDate: true };
  }

  return null;
}

isInvalid(controlName: string) {

  const control = this.operationForm.get(controlName);

  return control &&
         control.invalid &&
         (control.dirty || control.touched);
}

  // Load Generators
  loadAllData() {

    this.service.getGenerators().subscribe({
      next: (res: any) => {

        console.log("Generator API Response:", res);

        this.generators = res || [];

        this.loadOperations();
      },
      error: () => console.error('Failed to load generators')
    });

  }

  // Load Operations
  loadOperations() {

    this.service.getAll().subscribe({
      next: (res: any) => {

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

      },
      error: () => console.error('Failed to load operations')
    });

  }

  // Submit Form
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

      this.service.update(operationId, payload).subscribe({
        next: () => {

          Swal.fire('Success', 'Operation updated successfully', 'success');

         this.router.navigate(['/dashboard/myaction-generator']);
        },
        error: () =>
          Swal.fire('Error', 'Failed to update operation', 'error')
      });

    } else {

      this.service.create(payload).subscribe({
        next: () => {

          Swal.fire('Success', 'Operation saved successfully', 'success');

          this.loadOperations();
          this.resetForm();

        },
        error: () =>
          Swal.fire('Error', 'Failed to save operation', 'error')
      });

    }

  }

  // Edit
  edit(op: any) {

    this.operationForm.patchValue({
      OperationId: op.operationId,
      GeneratorId: op.generatorId,
      StartTime: op.startTime ? op.startTime.substring(0,16) : '',
      EndTime: op.endTime ? op.endTime.substring(0,16) : '',
      LoadFactor: op.loadFactor,
      FuelConsumedLiters: op.fuelConsumedLiters
    });

  }


loadOperationById(id: string) {

  this.service.getById(id).subscribe({

    next: (res: any) => {

      const op = res.data || res;

      this.operationForm.patchValue({
        OperationId: op.operationId,
        GeneratorId: op.generatorId,
        StartTime: op.startTime ? op.startTime.substring(0,16) : '',
        EndTime: op.endTime ? op.endTime.substring(0,16) : '',
        LoadFactor: op.loadFactor,
        FuelConsumedLiters: op.fuelConsumedLiters
      });

    },

    error: () => {
      Swal.fire('Error', 'Failed to load operation', 'error');
    }

  });

}
 

  // Delete
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
          error: () =>
            Swal.fire('Error', 'Delete failed', 'error')
        });

      }

    });

  }

  // Reset Form
  resetForm() {

    this.operationForm.reset({
      GeneratorId: null,
      StartTime: '',
      EndTime: '',
      LoadFactor: 0,
      FuelConsumedLiters: 0
    });

  }

}