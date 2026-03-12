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
  generatorId: number;
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

  pageSource: 'myaction' | 'search' = 'search';
  isReviewMode = false;
  isEditMode = false;
  isViewMode = false;

  showApproveReject = false;
  showResubmit = false;

  totalCalculations: any = {
    runHours: 0,
    totalFuel: 0,
    avgLoadFactor: 0,
    totalEmission: 0,
  };
  generatorName: string = '';

  showCalculation = false;

  userRole: 'corporate' | 'reporter' = 'reporter';

  constructor(
    private fb: FormBuilder,
    private service: GeneratorecService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit() {
     if (this.userRole === 'corporate') {
    // Optionally navigate back to MyAction list
    this.router.navigate(['/dashboard/MyActionGenerator']);
    return; // exit ngOnInit early so form is not initialized
  }
    this.initForm();
    this.loadSites();
    this.loadGenerators(); // optional if you want all generators

    this.operationForm.get('SiteId')?.valueChanges.subscribe((selectedSiteId: string) => {
      if (!selectedSiteId) {
        this.generators = [];
        if (!this.isViewMode && !this.isReviewMode) {
          this.operationForm.get('GeneratorId')?.setValue(null);
        }
        return;
      }

      this.service.getGeneratorsBySite(selectedSiteId).subscribe({
        next: (res: any) => {
          this.generators = res || [];

          // Only reset generator selection if not in view/review mode
          if (!this.isViewMode && !this.isReviewMode) {
            this.operationForm.get('GeneratorId')?.setValue(null);
          }

          if (!this.generators.length) {
            Swal.fire('Info', 'No generators available for this site', 'info');
          }
        },
        error: () => Swal.fire('Error', 'Failed to load generators', 'error')
      });
    });

    const operationId = this.route.snapshot.paramMap.get('id');
    const queryParams = this.route.snapshot.queryParamMap;
    const mode = queryParams.get('mode') || 'create';

    this.isReviewMode = mode === 'review';
    this.isEditMode = mode === 'edit';
    this.isViewMode = mode === 'view';

    this.showCalculation = !!operationId;

    const page = queryParams.get('page');
    this.pageSource = page === 'myaction' || page === 'search' ? page : 'search';

    if (operationId) this.loadOperationById(operationId);

  
    if (this.isViewMode || this.isReviewMode) {
      this.operationForm.disable();
    } else {
      this.operationForm.enable(); // reporter create/edit mode
    }
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
      FuelConsumedLiters: [0, [Validators.required, Validators.min(0)]],
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

  loadGenerators() {
    this.service.getGenerators().subscribe({
      next: (res) => (this.generators = res || []),
      error: () => console.error('Failed to load generators'),
    });
  }

  // loadOperations() {
  //   this.service.getAll().subscribe({
  //     next: (res: any) => (this.operations = res.data || []),
  //     error: (err) => console.error('Failed to load operations:', err),
  //   });
  // }

  loadOperations() {
  this.service.getAll().subscribe({
    next: (res: any) => {
      // Only show pending operations in MyAction
      if (this.userRole === 'corporate') {
        this.operations = (res.data || []).filter((op: any) => op.statusId === 1);
      } else {
        this.operations = res.data || [];
      }
    },
    error: (err) => console.error('Failed to load operations:', err),
  });
}

  loadOperationById(id: string) {
    this.service.getById(id).subscribe({
      next: (res: any) => {
        const op = res.data || res;

        // 1️⃣ Load generators for this site first
        this.service.getGeneratorsBySite(op.siteId).subscribe({
          next: (genRes: any) => {
            this.generators = genRes || [];

            // 2️⃣ Now patch the form
            this.edit(op);

            // 3️⃣ Compute totals & buttons
            this.totalCalculations = this.computeTotals(op);
            this.setButtonVisibility(op);
          },
          error: () => Swal.fire('Error', 'Failed to load generators', 'error')
        });
      },
      error: () => Swal.fire('Error', 'Failed to load operation', 'error')
    });
  }

  computeTotals(op: any) {
  const fuelConsumed = op.fuelConsumedLiters || 0;
  const loadFactor = op.loadFactor || 0;

  const co2Factor = op.co2Factor ?? 2.67;
  const no2Factor = op.no2Factor ?? 0.0001;
  const ch4Factor = op.ch4Factor ?? 0.00005;

  // Calculate run hours
  let runHours = 0;
  if (op.startTime && op.endTime) {
    runHours = +(
      (new Date(op.endTime).getTime() - new Date(op.startTime).getTime()) /
      (1000 * 60 * 60)
    ).toFixed(2);
  }

  // Calculate emissions
  const totalCO2 = fuelConsumed * co2Factor;
  const totalNO2 = fuelConsumed * no2Factor;
  const totalCH4 = fuelConsumed * ch4Factor;

  // Total CO2 equivalent
  const totalEmission = totalCO2 + totalCH4 * 28 + totalNO2 * 265;

  return {
    runHours,
    totalFuel: fuelConsumed,
    avgLoadFactor: loadFactor,
    co2Factor,
    no2Factor,
    ch4Factor,
    totalCO2,
    totalNO2,
    totalCH4,
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

    this.service.updateStatus(id, 4).subscribe({
      next: () => {
        Swal.fire('Resubmitted', 'Sent again for approval', 'success');
        this.goBack();
      },
      error: () => Swal.fire('Error', 'Resubmit failed', 'error'),
    });
  }

  goBack() {
    if (this.pageSource === 'search') {
      this.router.navigate(['/dashboard/MyActionGenerator']);
    } else {
      this.router.navigate(['/dashboard/searchGenerator']);
    }
  }

  submitOperation() {
      if (this.userRole === 'corporate') {
    Swal.fire('Access Denied', 'You are not allowed to submit a report', 'error');
    return;
  }
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
      fuelConsumedLiters: raw.FuelConsumedLiters,
    };

    if (raw.OperationId) {
      this.service.update(raw.OperationId, payload).subscribe({
        next: () => Swal.fire('Success', 'Operation updated successfully', 'success'),
        error: () => Swal.fire('Error', 'Failed to update operation', 'error'),
      });
    } else {
      this.service.create(payload).subscribe({
        next: () => Swal.fire('Success', 'Operation saved successfully', 'success'),
        error: () => Swal.fire('Error', 'Failed to save operation', 'error'),
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

 getSiteName(siteId: any): string {
  const site = this.sites.find(s => s.siteId == siteId);
  return site ? site.siteName : '';
}

  getGeneratorName(generatorId: any): string {
    const gen = this.generators.find(g => g.generatorId == generatorId);
    return gen ? gen.generatorName : '';
  }
}
