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
  statusId?: number;
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
  sites: any[] = [];
  operations: any[] = [];

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
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadSites();
    this.loadGenerators(); // optional if you want all generators

    this.operationForm.get('SiteId')?.valueChanges.subscribe((siteId: string) => {
      if (!siteId) {
        this.generators = [];
        return;
      }
      this.service.getGeneratorsBySite(siteId).subscribe({
        next: (res: any) => this.generators = res.data || res
      });
    });

    const operationId = this.route.snapshot.paramMap.get('id');
    const queryParams = this.route.snapshot.queryParamMap;
    const mode = queryParams.get('mode') || 'view';

    this.isReviewMode = mode === 'review';
    this.isEditMode = mode === 'edit';
    this.isViewMode = mode === 'view';

    const page = queryParams.get('page');
    this.pageSource = (page === 'myaction' || page === 'search') ? page : 'search';

    if (operationId) this.loadOperationById(operationId);

    if (this.isViewMode) this.operationForm.disable();
    this.loadOperations();
  }

  initForm() {
    this.operationForm = this.fb.group({
      OperationId: [''],
      SiteId: [null, Validators.required],
      GeneratorId: [null, Validators.required],
      GeneratorName: [''],
      StartTime: ['', [Validators.required, this.noFutureDateValidator]],
      EndTime: ['', [Validators.required, this.noFutureDateValidator]],
      LoadFactor: [0, [Validators.required, Validators.min(0)]],
      FuelConsumedLiters: [0, [Validators.required, Validators.min(0)]]
    });
  }

  public isInvalid(controlName: string): boolean {
  const control = this.operationForm.get(controlName);
  return !!(control && control.invalid && (control.dirty || control.touched));
}

  noFutureDateValidator(control: any) {
    if (!control.value) return null;
    const inputDate = new Date(control.value);
    const now = new Date();
    return inputDate > now ? { futureDate: true } : null;
  }

  loadSites() {
    this.service.getSites().subscribe((res: any) => this.sites = res.data || res);
  }

  loadGenerators() {
    this.service.getGenerators().subscribe({
      next: res => this.generators = res || [],
      error: () => console.error('Failed to load generators')
    });
  }

  loadOperations() {
    this.service.getAll().subscribe({
      next: (res: any) => this.operations = res.data || [],
      error: err => console.error('Failed to load operations:', err)
    });
  }

  loadOperationById(id: string) {
    this.service.getById(id).subscribe({
      next: (res: any) => {
        const op = res.data || res;
        this.edit(op);
        this.totalCalculations = this.computeTotals(op);
        this.setButtonVisibility(op);
      },
      error: () => Swal.fire('Error', 'Failed to load operation', 'error')
    });
  }

  computeTotals(res: any) {
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

  setButtonVisibility(res: any) {
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

  submitOperation() {
    if (this.operationForm.invalid) {
      Swal.fire('Error', 'Please fill required fields', 'error');
      return;
    }

    const raw = this.operationForm.getRawValue();
    const payload = {
      siteId: raw.SiteId,
      generatorId: raw.GeneratorId,
      startTime: raw.StartTime,
      endTime: raw.EndTime,
      loadFactor: raw.LoadFactor,
      fuelConsumedLiters: raw.FuelConsumedLiters
    };

    if (raw.OperationId) {
      this.service.update(raw.OperationId, payload).subscribe({
        next: () => Swal.fire('Success', 'Operation updated successfully', 'success'),
        error: () => Swal.fire('Error', 'Failed to update operation', 'error')
      });
    } else {
      this.service.create(payload).subscribe({
        next: () => Swal.fire('Success', 'Operation saved successfully', 'success'),
        error: () => Swal.fire('Error', 'Failed to save operation', 'error')
      });
    }
  }

  edit(op: any) {
    this.operationForm.patchValue({
      OperationId: op.operationId,
      SiteId: op.siteId || null,
      GeneratorId: op.generatorId,
      StartTime: op.startTime ? op.startTime.substring(0, 16) : '',
      EndTime: op.endTime ? op.endTime.substring(0, 16) : '',
      LoadFactor: op.loadFactor,
      FuelConsumedLiters: op.fuelConsumedLiters,
      GeneratorName: op.generatorName || ''
    });
  }

  resetForm() {
    this.operationForm.reset({
      SiteId: null,
      GeneratorId: null,
      StartTime: '',
      EndTime: '',
      LoadFactor: 0,
      FuelConsumedLiters: 0
    });
    this.generators = [];
  }

  goToDetail(item: any, source: 'myaction' | 'search') {
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