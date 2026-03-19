import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { GeneratorService } from './generator-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-generatormaster',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './generatormaster.html',
  styleUrls: ['./generatormaster.css']
})
export class Generatormaster implements OnInit {
  generatorForm!: FormGroup;

  generators = signal<any[]>([]);
  fuels = signal<{ fuelId: string; fuelName: string }[]>([]);
  sites = signal<{ siteId: string; siteName: string }[]>([]);
  departments = signal<{ departmentId: string; departmentName: string }[]>([]);

  searchText = '';
  isActiveFilter: boolean | null = null;

  pageNumber = 1;
pageSize = 5;
  pageSizeOptions = [5, 10, 20, 50];
  totalRecords = 0;
  totalPages = 1;

  sortColumnName: string = 'generatorName';
  sortDir: 'asc' | 'desc' = 'asc';

  filterModalOpen = false;
  selectedFuelIds: string[] = [];
  selectedSiteIds: string[] = [];
  filterSearchText: string = '';

  editingGeneratorId: string | null = null;

  constructor(private fb: FormBuilder, private service: GeneratorService) { }

  ngOnInit() {
    this.generatorForm = this.fb.group({
      generatorName: ['', Validators.required],
      ratedCapacityKW: ['', Validators.required],
      fuelId: ['', Validators.required],
      siteId: ['', Validators.required],
      departmentId: ['', Validators.required],
      isActive: [true]
    });

    this.loadDropdowns();
    this.loadGenerators();
  }

  loadDropdowns() {
    this.service.getFuels().subscribe((res: any[]) => {
      this.fuels.set((res || []).filter(f => f.isActive).map(f => ({
        fuelId: f.fuel_id,
        fuelName: f.fuel_name
      })));
    });

    this.service.getSites().subscribe(res => {
      this.sites.set((res || []).map(s => ({
        siteId: s.siteId,
        siteName: s.siteName
      })));
    });

    this.service.getDepartments().subscribe(res => {
      this.departments.set((res || []).map(d => ({
        departmentId: d.id,
        departmentName: d.departmentName
      })));
    });
  }

  loadGenerators() {
    this.service.search({
      search: this.searchText || '',
      isActive: this.isActiveFilter,
      sortColumn: this.sortColumnName,
      sortDirection: this.sortDir.toUpperCase(),
      pageNumber: this.pageNumber,
      pageSize: this.pageSize
    }).subscribe(res => {
      this.generators.set(res.data || []);
      this.totalRecords = res.totalRecords || 0;
      this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
    });
  }
getSortIcon(column: string): string {
  if (this.sortColumn() !== column) return '↕';
  return this.sortDirection() === 'asc' ? '↑' : '↓';
}

  submit() {
    if (this.generatorForm.invalid) {
      this.showToast('error', 'Please fill all required fields');
      return;
    }

    const formValue = this.generatorForm.value;

    const payload = {
      generatorId: this.editingGeneratorId ?? null,
      generatorName: formValue.generatorName,
      ratedCapacityKW: Number(formValue.ratedCapacityKW),
      fuelId: formValue.fuelId,
      siteId: formValue.siteId,
      departmentId: formValue.departmentId
    };

    if (this.editingGeneratorId) {
      this.service.update(payload).subscribe({
        next: () => {
          this.showToast('success', 'Generator updated successfully');
          this.resetForm();
          this.loadGenerators();
        },
        error: () => this.showToast('error', 'Update failed')
      });
    } else {
      this.service.create(payload).subscribe({
        next: () => {
          this.showToast('success', 'Generator created successfully');
          this.resetForm();
          this.loadGenerators();
        },
        error: () => this.showToast('error', 'Create failed')
      });
    }
  }

  edit(gen: any) {
    this.editingGeneratorId = gen.generatorId;

    this.generatorForm.patchValue({
      generatorName: gen.generatorName,
      ratedCapacityKW: gen.ratedCapacityKW,
      siteId: gen.siteId?.toString() || '',
      departmentId: gen.departmentId?.toString() || '',
      fuelId: gen.fuelId?.toString() || '',
      isActive: gen.isActive
    });
  }

  delete(gen: any) {
    Swal.fire({
      title: 'Delete?',
      text: 'Soft delete this generator?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (result.isConfirmed) {
        this.service.delete(gen.generatorId).subscribe(() => {
          Swal.fire('Deleted!', '', 'success');
          this.loadGenerators();
        });
      }
    });
  }

  confirmToggleStatus(event: Event, gen: any) {
    event.preventDefault();

    Swal.fire({
      title: 'Change status?',
      text: 'Are you sure to toggle status?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes'
    }).then(result => {
      if (result.isConfirmed) {
        this.service.toggleStatus(gen.generatorId, !gen.isActive).subscribe(() => {
          Swal.fire('Updated!', 'Status changed', 'success');
          gen.isActive = !gen.isActive;
        });
      }
    });
  }

  resetForm() {
    this.generatorForm.reset({ isActive: true });
    this.editingGeneratorId = null;
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

  // ================== Pagination ==================
  prevPage() { if (this.pageNumber > 1) { this.pageNumber--; this.loadGenerators(); } }
  nextPage() { if (this.pageNumber < this.totalPages) { this.pageNumber++; this.loadGenerators(); } }

  changePageSize(event: Event) {
    const value = (event.target as HTMLSelectElement).value;

    this.pageSize = Number(value);
    this.pageNumber = 1;

    this.loadGenerators();
  }


  clearFilter() { this.searchText = ''; this.isActiveFilter = null; this.pageNumber = 1; this.loadGenerators(); }

  sort(column: string) {
    // Toggle sort direction
    if (this.sortColumnName === column) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumnName = column;
      this.sortDir = 'asc';
    }

    // Get current generators array
    const currentGenerators = [...this.generators()]; // copy to avoid mutating original

    // Sort the array
    currentGenerators.sort((a, b) => {
      let valA = a[column] ?? '';
      let valB = b[column] ?? '';

      // Convert numbers if possible
      if (!isNaN(valA) && !isNaN(valB)) {
        valA = Number(valA);
        valB = Number(valB);
      } else {
        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();
      }

      return valA < valB ? (this.sortDir === 'asc' ? -1 : 1) :
        valA > valB ? (this.sortDir === 'asc' ? 1 : -1) : 0;
    });

    // Update the signal
    this.generators.set(currentGenerators);
  }

  sortColumn() { return this.sortColumnName; }
  sortDirection() { return this.sortDir; }

  
  // ================== Filter Modal ==================
  openFilterModal() { this.filterModalOpen = true; }
  closeFilter() { this.filterModalOpen = false; }
  toggleFuel(id: string) { this.selectedFuelIds.includes(id) ? this.selectedFuelIds = this.selectedFuelIds.filter(x => x !== id) : this.selectedFuelIds.push(id); }
  toggleSite(id: string) { this.selectedSiteIds.includes(id) ? this.selectedSiteIds = this.selectedSiteIds.filter(x => x !== id) : this.selectedSiteIds.push(id); }
  applyFilter() { this.searchText = this.filterSearchText; this.pageNumber = 1; this.loadGenerators(); this.closeFilter(); }
  resetFilterModal() { this.filterSearchText = ''; this.selectedFuelIds = []; this.selectedSiteIds = []; }

  get noRecords() { return (this.generators?.length ?? 0) === 0; }

}