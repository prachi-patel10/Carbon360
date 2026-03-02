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

  // Arrays for dropdowns and table
  generators: any[] = [];
  //fuels: any[] = [];
  fuels: WritableSignal<{ fuelId: string; fuelName: string }[]> = signal([]);
  sites: WritableSignal<{ siteId: string; siteName: string }[]> = signal([]);
  departments: WritableSignal<{ departmentId: string; departmentName: string }[]> = signal([]);

  // Filter & pagination
  searchText = '';
  isActiveFilter: boolean | null = null;
  pageNumber = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 20, 50];
  totalRecords = 0;
  totalPages = 1;

  sortColumnName: string = 'generatorName';
  sortDir: 'asc' | 'desc' = 'asc';

  // Filter modal
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

    
    this.loadDropdowns(); // now calls correct APIs
    this.loadGenerators();
  }

  // ================== Load dropdown data ==================
  loadLookups() {
   this.loadDropdowns();
  }
 

  loadDropdowns() {
    // ----------------- Fuels -----------------
    // this.service.getFuels().subscribe((res: { fuelId: string; fuelName: string }[]) => {
    //   const mapped = (res || []).map((f: { fuelId: string; fuelName: string }) => ({
    //     fuelId: f.fuelId,
    //     fuelName: f.fuelName
    //   }));
    //   this.fuels.set(mapped);
    // });

      this.service.getFuels().subscribe((res: any) => {
    // If API returns { data: [...] } adjust like this:
    const data = res.data || res || [];
    const mapped = data.map((f: any) => ({
      fuelId: f.fuelId,
      fuelName: f.fuel_name
    }));
    this.fuels.set(mapped);
     console.log('Fuels:', this.fuels());
  });

    // ----------------- Sites -----------------
    this.service.getSites().subscribe((res: { siteId: string; siteName: string }[]) => {
      const mapped = (res || []).map((s: { siteId: string; siteName: string }) => ({
        siteId: s.siteId,
        siteName: s.siteName
      }));
      this.sites.set(mapped);
    });

    // ----------------- Departments -----------------
    this.service.getDepartments().subscribe((res: { departmentId: string; departmentName: string }[]) => {
      const mapped = (res || []).map((d: { departmentId: string; departmentName: string }) => ({
        departmentId: d.departmentId,
        departmentName: d.departmentName
      }));
      this.departments.set(mapped);
    });
  }


  // ================== Load generators ==================
  loadGenerators() {
    this.service.search({
      search: this.searchText || '',
      isActive: this.isActiveFilter,
      sortColumn: this.sortColumnName,
      sortDirection: this.sortDir.toUpperCase(),
      pageNumber: this.pageNumber,
      pageSize: this.pageSize
    }).subscribe(res => {
      console.log('Generators API response:', res);
      this.generators = res.data || []; // correct, only data array
      this.totalRecords = res.totalRecords || 0;
      this.totalPages = res.totalPages || 1;
    });
  }

  // ================== Submit ==================
  submit() {
    if (this.generatorForm.invalid) return;

    const payload = this.generatorForm.value;

    if (this.editingGeneratorId) {
      this.service.update(this.editingGeneratorId, payload).subscribe(() => {
        Swal.fire('Updated', 'Generator updated successfully', 'success');
        this.generatorForm.reset();
        this.editingGeneratorId = null;
        this.loadGenerators();
      });
    } else {
      this.service.create(payload).subscribe(() => {
        Swal.fire('Created', 'Generator created successfully', 'success');
        this.generatorForm.reset();
        this.loadGenerators();
      });
    }
  }

  // ================== Edit ==================
  edit(gen: any) {
    this.editingGeneratorId = gen.generatorId;
    this.generatorForm.patchValue({
      generatorName: gen.generatorName || '',
      ratedCapacityKW: gen.ratedCapacityKW || '',
      fuelId: gen.fuelId || '',
      siteId: gen.siteId || '',
      departmentId: gen.departmentId || '',
      isActive: gen.isActive ?? true
    });
  }

  // ================== Delete / Toggle Status ==================
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

  toggleStatus(gen: any) {
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
          this.loadGenerators();
        });
      }
    });
  }

  get noRecords() {
    return (this.generators?.length ?? 0) === 0;
  }

  // ================== Pagination ==================
  prevPage() { if (this.pageNumber > 1) { this.pageNumber--; this.loadGenerators(); } }
  nextPage() { if (this.pageNumber < this.totalPages) { this.pageNumber++; this.loadGenerators(); } }
  changePageSize() { this.pageNumber = 1; this.loadGenerators(); }
  clearFilter() { this.searchText = ''; this.isActiveFilter = null; this.pageNumber = 1; this.loadGenerators(); }

  // ================== Sorting ==================
  sort(column: string) {
    if (this.sortColumnName === column) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortColumnName = column; this.sortDir = 'asc'; }

    this.generators.sort((a, b) => {
      let valA = a[column] ?? '';
      let valB = b[column] ?? '';

      if (!isNaN(valA) && !isNaN(valB)) { valA = Number(valA); valB = Number(valB); }
      else { valA = valA.toString().toLowerCase(); valB = valB.toString().toLowerCase(); }

      return valA < valB ? (this.sortDir === 'asc' ? -1 : 1) :
        valA > valB ? (this.sortDir === 'asc' ? 1 : -1) : 0;
    });
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
}