import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { GeneratorecService } from './generatorec-service';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

interface GeneratorOperation {
  operationId: string;
  generatorId: string;
  startTime: string;
  endTime: string;
  loadFactor: number;
  fuelConsumedLiters: number;
  statusId?: number;  // optional for button logic
}

@Component({
  selector: 'app-generator-operation',
  standalone: true,
  templateUrl: './generator-ec.html',
  styleUrls: ['./generator-ec.css'],
  imports: [CommonModule, ReactiveFormsModule]
})
export class GeneratorOperationComponent implements OnInit {
  operationForm!: FormGroup;
  generators: any[] = [];

  pageSource: 'myaction' | 'search' = 'search';
  isReviewMode = false;
  isEditMode = false;
  isViewMode = true;

  showApproveReject = false;
  showResubmit = false;

  totalCalculations: any = {
    runHours: 0,
    totalFuel: 0,
    avgLoadFactor: 0,
    totalEmission: 0
  };
  generatorName: string = '';

  userRole: 'corporate' | 'reporter' = 'reporter';

  constructor(
    private fb: FormBuilder,
    private service: GeneratorecService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.initForm();
    this.loadGenerators();

    const operationId = this.route.snapshot.paramMap.get('id');
    const queryParams = this.route.snapshot.queryParamMap;
    const mode = queryParams.get('mode') || 'view';

    this.isReviewMode = mode === 'review';
    this.isEditMode = mode === 'edit';
    this.isViewMode = mode === 'view';

    const page = queryParams.get('page');
    this.pageSource = (page === 'myaction' || page === 'search') ? page : 'search';

    if (operationId) this.loadOperation(operationId);

    if (this.isViewMode || (!this.isReviewMode && !this.isEditMode)) {
      this.operationForm.disable();
    }
  }

  initForm() {
    this.operationForm = this.fb.group({
      OperationId: [''],
      GeneratorId: [null, Validators.required],
      GeneratorName: [''],          // <-- add this

      StartTime: ['', Validators.required],
      EndTime: ['', Validators.required],
      LoadFactor: [0, [Validators.required, Validators.min(0)]],
      FuelConsumedLiters: [0, [Validators.required, Validators.min(0)]]
    });
  }

  loadGenerators() {
    this.service.getGenerators().subscribe({
      next: res => this.generators = res || [],
      error: () => console.error('Failed to load generators')
    });
  }

  loadOperation(operationId: string) {
    // Fetch the operation by ID
    this.service.getById(operationId).subscribe({
      next: (resFromService: any) => {
        if (!resFromService || !resFromService.data) return;

        const apiData = resFromService.data;

        // Store generatorName separately
        this.generatorName = apiData.generatorName;

        // Map API object to local interface for totals & status
        const res: GeneratorOperation = {
          operationId: apiData.operationId,
          generatorId: apiData.generatorId,
          startTime: apiData.startTime ? new Date(apiData.startTime).toISOString() : '',
          endTime: apiData.endTime ? new Date(apiData.endTime).toISOString() : '',
          loadFactor: apiData.loadFactor || 0,
          fuelConsumedLiters: apiData.fuelConsumedLiters || 0,
          statusId: apiData.statusId
        };

        // Patch form with all other values
        this.operationForm.patchValue({
          OperationId: res.operationId,
          GeneratorId: res.generatorId,
          GeneratorName: apiData.generatorName,
          StartTime: res.startTime.slice(0, 16),
          EndTime: res.endTime.slice(0, 16),
          LoadFactor: res.loadFactor,
          FuelConsumedLiters: res.fuelConsumedLiters
        });

        // Compute totals
        this.totalCalculations = this.computeTotals(res);

        // Show/hide buttons based on status
        this.setButtonVisibility(res);

        // Disable form in view mode
        if (this.isViewMode && !this.isEditMode && !this.isReviewMode) {
          this.operationForm.disable();
        }
      },
      error: err => console.error('Failed to load operation:', err)
    });
  }
  computeTotals(res: GeneratorOperation) {
    if (!res.startTime || !res.endTime) return {
      runHours: 0,
      totalFuel: res.fuelConsumedLiters || 0,
      avgLoadFactor: res.loadFactor || 0,
      totalEmission: 0
    };

    const runHours = +((new Date(res.endTime).getTime() - new Date(res.startTime).getTime()) / (1000 * 60 * 60)).toFixed(2);
    const totalEmission = +(res.fuelConsumedLiters || 0) * 2.67;

    return {
      runHours,
      totalFuel: res.fuelConsumedLiters || 0,
      avgLoadFactor: res.loadFactor || 0,
      totalEmission
    };
  }

  setButtonVisibility(res: GeneratorOperation) {
    const statusId = res?.statusId;
    this.showApproveReject = this.isReviewMode && statusId === 1;
    this.showResubmit = this.isEditMode && statusId === 3;
  }

  approve() {
    const operationId = this.operationForm.get('OperationId')?.value;
    if (!operationId) return;

    this.service.updateStatus(operationId, 2).subscribe({
      next: () => Swal.fire('Success', 'Operation Approved', 'success'),
      error: () => Swal.fire('Error', 'Failed to approve operation', 'error')
    });
  }

  reject() {
    const operationId = this.operationForm.get('OperationId')?.value;
    if (!operationId) return;

    this.service.updateStatus(operationId, 3).subscribe({
      next: () => Swal.fire('Success', 'Operation Rejected', 'success'),
      error: () => Swal.fire('Error', 'Failed to reject operation', 'error')
    });
  }

  resubmit() {
    const operationId = this.operationForm.get('OperationId')?.value;
    if (!operationId) return;

    this.service.updateStatus(operationId, 1).subscribe({
      next: () => Swal.fire('Resubmitted', 'Record sent for corporate approval', 'success'),
      error: err => Swal.fire('Error', 'Cannot resubmit: ' + err.message, 'error')
    });
  }

  goToDetail(item: GeneratorOperation, source: 'myaction' | 'search') {
    if (!item || !item.operationId) return;

    let queryParams: any = {};
    if (source === 'search') queryParams.mode = 'view';
    else if (source === 'myaction') {
      if (this.userRole === 'corporate' && item.statusId === 1) queryParams.mode = 'review';
      else if (this.userRole === 'reporter' && item.statusId === 3) queryParams.mode = 'edit';
      else queryParams.mode = 'view';
    }

    this.router.navigate(['/dashboard/generator-ec', item.operationId], { queryParams });
  }
}