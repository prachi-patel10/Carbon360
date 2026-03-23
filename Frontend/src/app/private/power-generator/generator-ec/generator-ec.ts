import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { GeneratorecService } from './generatorec-service';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';

interface GeneratorOperation {
  operationId: string;
  generatorId: string;
  startTime: string;
  endTime: string;
  loadFactor: number;
  fuelConsumedLiters: number;
  statusId?: number;
}

interface Site {
  id: number;
  siteId: string;
  siteName: string;
  buildingName: string;
  city: string;
  state: string;
  isActive: boolean;
  entryBy: number;
  entryDate: string;
  updatedBy?: number | null;
  updateDate?: string | null;
  isDeleted: boolean;
  shortCode?: string;
}

interface Generator {
  generatorId: string;
  generatorName: string;
  siteId: number;
  fuelId?: number;
  ratedCapacityKW?: number;
  isActive?: boolean;
  entryBy?: number;
  entryDate?: string;
  updatedBy?: number;
  updateDate?: string;
  isDeleted?: boolean;
}

@Component({
  selector: 'app-generator-operation',
  standalone: true,
  templateUrl: './generator-ec.html',
  styleUrls: ['./generator-ec.css'],
  imports: [CommonModule, ReactiveFormsModule],
})
export class GeneratorOperationComponent implements OnInit {
  operationForm!: FormGroup;
  generators: any[] = [];
  sites: any[] = [];
  operations: any[] = [];
  tripHistory: any[] = [];
  operation: any = {};

  pageSource: 'myaction' | 'search' = 'search';
  isReviewMode = false;
  isEditMode = false;
  isViewMode = false;

  isResubmitMode: boolean = false;
  workflowActions: any[] = [];

  showApproveReject = false;
  showResubmit = false;
  operationId!: string;

  totalCO2: number = 0;
  totalNO2: number = 0;
  totalCH4: number = 0;
  fuelConsumed: number = 0;
  co2Factor: number = 2.68; // default, can come from backend
  no2Factor: number = 0.00007;
  ch4Factor: number = 0.00001;
  totalEmission: number = 0;
  ratedCapacityKW: number = 0;
  totalCalculations: any = {
    runHours: 0,
    totalFuel: 0,
    avgLoadFactor: 0,
    totalEmission: 0,
  };
  generatorName: string = '';

  showCalculation = false;

  userRole: 'admin' | 'corporate' | 'reporter' = 'reporter';

  constructor(
    private fb: FormBuilder,
    private service: GeneratorecService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit() {
    this.initForm();
    this.loadSites();
    this.loadGenerators(); // optional if you want all generators

    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      this.userRole = parsed.currentRole?.toLowerCase();
    }
    // ================= SITE SELECTION CHANGE =================
    this.operationForm.get('SiteId')?.valueChanges.subscribe((selectedSiteId: string) => {
      if (!selectedSiteId) {
        this.generators = [];
        return;
      }

      this.service.getGeneratorsBySite(selectedSiteId).subscribe({
        next: (res: any) => {
          this.generators = res || []; // Do NOT clear generator during edit

          setTimeout(() => {
            this.calculateLiveValues(); // ✅ trigger after load
          });
          if (!this.isViewMode && !this.isReviewMode && !this.isEditMode) {
            this.operationForm.get('GeneratorId')?.setValue(null);
          }

          if (!this.generators.length) {
            Swal.fire('Info', 'No generators available for this site', 'info');
          }
        },
        error: () => Swal.fire('Error', 'Failed to load generators', 'error'),
      });
    });

    // ================= READ ROUTE PARAMETERS =================
    const operationId = this.route.snapshot.paramMap.get('id');
    const queryParams = this.route.snapshot.queryParamMap;
    const mode = queryParams.get('mode') || 'create';
    const page = queryParams.get('page');

    this.pageSource = page === 'myaction' || page === 'search' ? page : 'search';

    // Restrict Corporate from creating new report
    if ((this.userRole === 'corporate' || this.userRole === 'admin') && !operationId) {

      Swal.fire({
        icon: 'warning',
        title: 'Access Restricted',
        text: 'you are not allowed to create generator emission reports.',
        confirmButtonText: 'Go Back'
      }).then(() => {
        this.router.navigate(['/dashboard/MyActionGenerator']);
      });

      return;
    }
    this.pageSource = page === 'myaction' || page === 'search' ? page : 'search';

    this.isReviewMode = mode === 'review' && this.pageSource === 'myaction';
    this.isEditMode = mode === 'edit';
    this.isViewMode = mode === 'view';
    this.showCalculation = !!operationId;


    // ================= LOAD OPERATION & WORKFLOW =================
    if (operationId) {
      this.loadOperationById(operationId);
    }

    // ================= SET FORM ENABLE/DISABLE =================
    // Corporate cannot edit
    if (this.userRole === 'corporate') {
      this.operationForm.disable();
    }

    // Reporter editing rejected record
    if (this.userRole === 'reporter' && this.isEditMode) {
      this.operationForm.enable();
    }

    // Reporter creating
    if (!this.isViewMode && !this.isReviewMode && !this.isEditMode) {
      this.operationForm.enable();
    }
    this.operationForm.valueChanges.subscribe(() => {
      this.calculateLiveValues();
    });
  }

  initForm() {
    this.operationForm = this.fb.group({
      OperationId: [''],
      SiteId: [null, Validators.required],
      GeneratorId: [null, Validators.required],
      GeneratorName: [''],
      StartTime: ['', [Validators.required, this.noFutureDateValidator]],
      EndTime: ['', [Validators.required, this.noFutureDateValidator]],
      LoadFactor: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      FuelConsumedLiters: [0, [Validators.required, Validators.min(0)]],
    });


  }

  calculateLiveValues() {
    const raw = this.operationForm.getRawValue();

    const start = new Date(raw.StartTime);
    const end = new Date(raw.EndTime);

    if (!raw.StartTime || !raw.EndTime || end <= start) {
      this.operation.runHours = 0;
      return;
    }

    const runHours = +((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2);

    // ✅ FIXED (type safe)
    const generator = this.generators.find(
      g => String(g.generatorId) === String(raw.GeneratorId)
    );

    this.ratedCapacityKW =
      generator?.ratedCapacityKW ||
      this.ratedCapacityKW ||
      this.operation.ratedCapacityKW ||
      0;

    const powerOutputKWH = this.ratedCapacityKW * (raw.LoadFactor / 100) * runHours;

    const fuel = Number(raw.FuelConsumedLiters) || 0;

    // ✅ IMPORTANT FIX
    this.fuelConsumed = fuel;

    const totalCO2 = fuel * this.co2Factor;
    const totalNO2 = fuel * this.no2Factor;
    const totalCH4 = fuel * this.ch4Factor;

    const totalEmission =
      totalCO2 +
      totalCH4 * (this.operation.gwP_CH4 || 28) +
      totalNO2 * (this.operation.gwP_NO2 || 265);

    this.operation = {
      ...this.operation,
      startTime: start,
      endTime: end,
      runHours,
      ratedCapacityKW: this.ratedCapacityKW,
      powerOutputKWH,
      loadFactor: raw.LoadFactor,
      fuelConsumedLiters: fuel,
      totalEmission
    };

    this.totalCO2 = +totalCO2.toFixed(3);
    this.totalNO2 = +totalNO2.toFixed(6);
    this.totalCH4 = +totalCH4.toFixed(6);
  }

  getSiteName(siteId: any): string {
    const site = this.sites.find((s) => s.siteId == siteId);
    return site ? site.siteName : '';
  }

  getGeneratorName(generatorId: any): string {
    const gen = this.generators.find((g) => g.generatorId == generatorId);
    return gen ? gen.generatorName : '';
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
    this.service.getSites().subscribe((res: any) => {
      const allSites: Site[] = res.data || res;

      // Create unique site list by siteName
      const uniqueSitesMap = new Map<string, Site>();
      allSites.forEach((site: Site) => {
        if (!uniqueSitesMap.has(site.siteName)) {
          uniqueSitesMap.set(site.siteName, site);
        }
      });

      this.sites = Array.from(uniqueSitesMap.values());
    });

  }

  // loadTripHistory(operationId: string) {
  //   this.service.getTripFullDetails(operationId).subscribe({
  //     next: (res: any) => {
  //       console.log('Full Details Response:', res);
  //       if (res && res.History) {
  //         this.tripHistory = res.History;
  //         console.log('Trip History:', this.tripHistory);
  //       } else {
  //         console.warn('No History in response:', res);
  //       }
  //     },
  //     error: (err) => {
  //       console.error('loadTripHistory ERROR:', err);
  //     }
  //   });
  // }

  loadGenerators() {
    this.service.getGenerators().subscribe({
      next: (res) => (this.generators = res || []),
      error: () => console.error('Failed to load generators'),
    });
  }

  calculateEmissions() {
    // Ensure fuelConsumedLiters is a number
    const fuel = Number(this.operation?.fuelConsumedLiters) || 0;
    this.fuelConsumed = fuel;

    // Force numeric GWP factors
    const gwpCH4 = Number(this.operation?.gwP_CH4) || 28;
    const gwpNO2 = Number(this.operation?.gwP_NO2) || 265;

    // Force numeric emission factors
    const co2Factor = Number(this.operation?.co2Factor) || 2.68;
    const no2Factor = Number(this.operation?.no2Factor) || 0.00007;
    const ch4Factor = Number(this.operation?.ch4Factor) || 0.00001;

    // Calculate individual emissions
    this.totalCO2 = fuel * co2Factor;
    this.totalNO2 = fuel * no2Factor;
    this.totalCH4 = fuel * ch4Factor;

    // ✅ Total emission: convert everything to numbers before summing
    this.totalEmission = Number(
      (this.totalCO2 + this.totalCH4 * gwpCH4 + this.totalNO2 * gwpNO2).toFixed(3),
    );

    console.log('Fuel:', fuel);
    console.log('CO2:', this.totalCO2, 'CH4:', this.totalCH4, 'NO2:', this.totalNO2);
    console.log('Total Emission:', this.totalEmission);
  }

  //

  loadOperation(id: string) {
    this.service.getById(id).subscribe({
      next: (res: any) => {
        const selected = res.data || res;
        if (!selected) return;

        // --- GWP values ---
        const gwP_CH4 = 28;
        const gwP_NO2 = 265;

        // --- Compute Run Hours ---
        let runHours = 0;
        if (selected.startTime && selected.endTime) {
          const start = new Date(selected.startTime).getTime();
          const end = new Date(selected.endTime).getTime();
          runHours = +((end - start) / (1000 * 60 * 60)).toFixed(2);
        }

        // --- Emission factors ---
        const co2Factor = selected.co2_kg ?? 0;
        const no2Factor = selected.no2_kg ?? 0;
        const ch4Factor = selected.ch4_kg ?? 0;

        // --- Total emissions ---
        const totalCO2 = (selected.totalCO2 ?? selected.fuelConsumedLiters * co2Factor) || 0;
        const totalNO2 = (selected.totalNO2 ?? selected.fuelConsumedLiters * no2Factor) || 0;
        const totalCH4 = (selected.totalCH4 ?? selected.fuelConsumedLiters * ch4Factor) || 0;

        const totalEmission = totalCO2 + totalCH4 * gwP_CH4 + totalNO2 * gwP_NO2;

        // --- Patch operation object ---
        this.operation = {
          ...selected,
          runHours,
          co2Factor,
          no2Factor,
          ch4Factor,
          cO2: totalCO2,
          nO2: totalNO2,
          cH4: totalCH4,
          gwP_CH4,
          gwP_NO2,
          totalEmission,
        };

        // Optional: update totalCalculations for summary display
        this.totalCalculations = {
          runHours,
          totalFuel: selected.fuelConsumedLiters ?? 0,
          avgLoadFactor: selected.loadFactor ?? 0,
          totalEmission,
        };
      },
      error: () => Swal.fire('Error', 'Failed to load operation', 'error'),
    });
  }

  // loadOperationById(id: string) {
  //   this.service.getById(id).subscribe({
  //     next: (res: any) => {
  //       const op = res.data || res;

  //       // 1️⃣ Load generators for this site first
  //       this.service.getGeneratorsBySite(op.siteId).subscribe({
  //         next: (genRes: any) => {
  //           this.generators = genRes || [];

  //           // 2️⃣ Now patch the form
  //           this.edit(op);

  //           // 3️⃣ Compute totals & buttons
  //           this.totalCalculations = this.computeTotals(op);
  //           this.setButtonVisibility(op);
  //         },
  //         error: () => Swal.fire('Error', 'Failed to load generators', 'error'),
  //       });
  //     },
  //     error: () => Swal.fire('Error', 'Failed to load operation', 'error'),
  //   });
  // }
 loadOperationById(id: string) {
  this.operationId = id;
  const requests: any = {
    op: this.service.getById(id),
    history: this.service.getTripFullDetails(id)
  };
  if (this.pageSource !== 'search') {
    requests.actions = this.service.getWorkflowActions(id);
  }

  forkJoin(requests).subscribe({
    next: (results: any) => {
      const res = results.op;
      const op = res.data || res;
      const gwP_CH4 = 28;
      const gwP_NO2 = 265;
      const co2Factor = op.cO2 ?? 2.68;
      const no2Factor = op.nO2 ?? 0.00007;
      const ch4Factor = op.cH4 ?? 0.00001;
      this.co2Factor = co2Factor;
      this.no2Factor = no2Factor;
      this.ch4Factor = ch4Factor;

      const runHours =
        op.startTime && op.endTime
          ? +((new Date(op.endTime).getTime() - new Date(op.startTime).getTime()) / (1000 * 60 * 60)).toFixed(2)
          : 0;
      const generator = this.generators.find(g => g.generatorId === op.generatorId);
      const ratedCapacityKW = generator?.ratedCapacityKW || op.ratedCapacityKW || 0;
      this.ratedCapacityKW = ratedCapacityKW;
      const powerOutputKWH = ratedCapacityKW * (op.loadFactor / 100) * runHours;
      const totalCO2 = (op.fuelConsumedLiters || 0) * co2Factor;
      const totalNO2 = (op.fuelConsumedLiters || 0) * no2Factor;
      const totalCH4 = (op.fuelConsumedLiters || 0) * ch4Factor;
      const totalEmission = totalCO2 + totalCH4 * gwP_CH4 + totalNO2 * gwP_NO2;
      this.operation = {
        ...op,
        runHours,
        ratedCapacityKW,
        powerOutputKWH,
        co2Factor,
        no2Factor,
        ch4Factor,
        cO2: totalCO2,
        nO2: totalNO2,
        cH4: totalCH4,
        gwP_CH4,
        gwP_NO2,
        totalEmission,
      };
      this.fuelConsumed = op.fuelConsumedLiters || 0;
      this.totalCO2 = +totalCO2.toFixed(3);
      this.totalNO2 = +totalNO2.toFixed(6);
      this.totalCH4 = +totalCH4.toFixed(6);
      this.showCalculation = true;
      if (results.actions) {
        const actionsRes = results.actions;
        this.workflowActions = actionsRes?.data ?? actionsRes ?? [];
        this.isResubmitMode = this.workflowActions.some(a => a.actionName === 'Resubmit');
      } else {
        this.workflowActions = [];
      }
      this.tripHistory = results.history?.History || [];
      console.log('Trip History:', this.tripHistory);
      console.log('Workflow Actions:', this.workflowActions);
      this.edit(op);
      this.calculateLiveValues();
    },
    error: () => Swal.fire('Error', 'Failed to load operation details', 'error'),
  });
}

  computeTotals(res: any) {
    if (!res.startTime || !res.endTime)
      return {
        runHours: 0,
        totalFuel: res.fuelConsumedLiters || 0,
        avgLoadFactor: res.loadFactor || 0,
        totalEmission: 0,
      };

    const runHours = +(
      (new Date(res.endTime).getTime() - new Date(res.startTime).getTime()) /
      (1000 * 60 * 60)
    ).toFixed(2);
    const totalEmission = +(res.fuelConsumedLiters || 0) * 2.67;

    return {
      runHours,
      totalFuel: res.fuelConsumedLiters || 0,
      avgLoadFactor: res.loadFactor || 0,
      totalEmission,
    };
  }

  setButtonVisibility(res: any) {
    const statusId = res?.statusId;

    this.showApproveReject = this.isReviewMode && statusId === 1;

    this.showResubmit = this.isEditMode && statusId === 3 && this.userRole === 'reporter';
  }

  approve() {
    const id = this.operationForm.get('OperationId')?.value;
    if (!id) return;

    this.service.updateStatus(id, 2).subscribe({
      next: () => {
        Swal.fire('Approved', 'Operation approved successfully', 'success');
        this.goBack();
      },
      error: () => Swal.fire('Error', 'Failed to approve operation', 'error'),
    });
  }

  reject() {
    const id = this.operationForm.get('OperationId')?.value;
    if (!id) return;

    this.service.updateStatus(id, 3).subscribe({
      next: () => {
        Swal.fire('Rejected', 'Operation rejected successfully', 'success');
        this.goBack();
      },
      error: () => Swal.fire('Error', 'Failed to reject operation', 'error'),
    });
  }

  resubmit() {
    const id = this.operationForm.get('OperationId')?.value;
    if (!id) return;

    this.service.updateStatus(id, 1).subscribe({
      next: () => {
        Swal.fire('Resubmitted', 'Sent again for approval', 'success');
        this.goBack();
      },
      error: () => Swal.fire('Error', 'Resubmit failed', 'error'),
    });
  }

  goBack() {
    if (this.pageSource === 'search') {
      this.router.navigate(['/dashboard/searchGenerator']);
    } else {
      this.router.navigate(['/dashboard/MyActionGenerator']);
    }
  }

  submitOperation() {

    if (this.userRole === 'corporate') {
      Swal.fire('Access Denied', 'Corporate users cannot submit this form', 'error');
      return;
    }

    if (this.operationForm.invalid) {
      Swal.fire('Error', 'Please fill required fields', 'error');
      return;
    }

    const raw = this.operationForm.getRawValue();
    const operationId = this.operationId; // ✅ declare once

    const payload = {
      operationId: operationId,
      siteId: raw.SiteId,
      generatorId: raw.GeneratorId,
      startTime: raw.StartTime,
      endTime: raw.EndTime,
      loadFactor: raw.LoadFactor,
      fuelConsumedLiters: raw.FuelConsumedLiters,
    };

    if (operationId) {
      this.service.update(operationId, payload).subscribe({
        next: () => {
          Swal.fire('Success', 'Operation updated successfully', 'success').then(() =>
            this.goBack(),
          );
        },
        error: () => Swal.fire('Error', 'Update failed', 'error'),
      });
    } else {
      this.service.create(payload).subscribe({
        next: () => {
          Swal.fire('Success', 'Operation created successfully', 'success').then(() =>
            this.goBack(),
          );
        },
        error: () => Swal.fire('Error', 'Save failed', 'error'),
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
      GeneratorName: op.generatorName || '',
    });
  }

  resetForm() {
    this.operationForm.reset({
      SiteId: null,
      GeneratorId: null,
      StartTime: '',
      EndTime: '',
      LoadFactor: 0,
      FuelConsumedLiters: 0,
    });
    this.generators = [];
  }

  goToDetail(item: any, source: 'myaction' | 'search') {
    if (!item?.operationId) return;

    let mode = 'view';

    if (source === 'search') {
      mode = 'view';
    }

    if (source === 'myaction') {
      if (this.userRole === 'corporate' && item.statusId === 1) {
        mode = 'review';
      } else if (this.userRole === 'reporter' && item.statusId === 3) {
        mode = 'edit';
      } else {
        mode = 'view';
      }
    }

    this.router.navigate(['/dashboard/generator-ec', item.operationId], {
      queryParams: { mode, page: source },
    });
  }

 performAction(workflowId: number) {
  const operationId = this.operationForm.get('OperationId')?.value;

  if (!operationId) {
    Swal.fire('Error', 'Operation not found', 'error');
    return;
  }

  const action = this.workflowActions.find(a => a.workflowId === workflowId);
  if (!action) return;

  if (action.actionName === 'Resubmit') {

    if (this.operationForm.invalid) {
      this.operationForm.markAllAsTouched();
      Swal.fire('Error', 'Please fill all required fields before resubmitting', 'error');
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

    this.service.update(operationId, payload).subscribe({
      next: () => {
        // Step 2: update status only after update succeeds
        this.service.updateStatus(operationId, workflowId).subscribe({
          next: () => {
            Swal.fire('Resubmitted', 'Operation updated and resubmitted successfully', 'success')
              .then(() => this.goBack());
          },
          error: (err) => {
            console.error('updateStatus error:', err);
            Swal.fire('Error', 'Data saved but status update failed. Please try again.', 'warning');
          }
        });
      },
      error: (err) => {
        console.error('update error:', err);
        Swal.fire('Error', 'Failed to update operation data', 'error');
      }
    });

  } else {

    this.service.updateStatus(operationId, workflowId).subscribe({
      next: () => {
        Swal.fire('Success', 'Status updated successfully', 'success')
          .then(() => this.goBack());
      },
      error: (err) => {
        console.error('updateStatus error:', err);
        Swal.fire('Error', 'Failed to update status', 'error');
      }
    });

  }
}

  getActionMessage(h: any): string {
  const role = h.ActionByRole || '';
  const name = h.FullName || '';
  const action = h.ActionName || '';

  switch (action) {
    case 'Submit':
      return `${name} (${role}) submitted this trip for review`;
    case 'Approve':
      return `${name} (${role}) approved this trip`;
    case 'Reject':
      return `${name} (${role}) rejected this trip`;
    case 'Resubmit':
      return `${name} (${role}) resubmitted this trip after corrections`;
    default:
      return `${name} (${role}) performed ${action}`;
  }
}

getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours   = Math.floor(diffMs / (1000 * 60 * 60));
  const days    = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1)  return 'just now';
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24)   return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 30)    return `${days} day${days > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

  // ================= LOAD WORKFLOW ACTIONS =================
//   loadWorkflowActions(operationId: string) {
//     if (this.pageSource === 'search') {
//       this.workflowActions = [];
//       return;
//     }

//     this.service.getWorkflowActions(operationId).subscribe({
//       next: (res: any) => {
//         this.workflowActions = res?.data ?? res ?? [];

//         // Check if only resubmit action is available
//         this.isResubmitMode = this.workflowActions.some(a => a.actionName === 'Resubmit');
//       },
//       error: () => Swal.fire('Error', 'Failed to load workflow actions', 'error'),
//     });
//   }
 }
