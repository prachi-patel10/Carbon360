import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  generators: any[] = [];
  fuels: any[] = [];
  sites: any[] = [];
  departments: any[] = [];

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

  filterModalOpen = false;

  // Filter selections
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
    });

    this.loadLookups();
    this.loadGenerators();
  }

  // ================= Load Lookup Data =================
  loadLookups() {
    this.service.getFuels().subscribe(res => this.fuels = res || []);
    this.service.getSites().subscribe(res => this.sites = res || []);
    this.service.getDepartments().subscribe(res => this.departments = res || []);
  }

  // ================= Load Generators =================
  loadGenerators() {
    const params = {
      search: this.searchText || null,
      isActive: this.isActiveFilter,
      pageNumber: this.pageNumber,
      pageSize: this.pageSize
    };

    this.service.search(params).subscribe(res => {
      const dataList = (res.Data as any[]) || [];

      // Map IDs to names
      this.generators = dataList.map(g => ({
        ...g,
        fuelName: this.fuels.find(f => f.fuelId === g.fuelId)?.fuelName || g.fuelId,
        siteName: this.sites.find(s => s.siteId === g.siteId)?.siteName || g.siteId,
        departmentName: this.departments.find(d => d.departmentId === g.departmentId)?.departmentName || g.departmentId
      }));

      this.totalRecords = res.TotalRecords || 0;
      this.totalPages = res.TotalPages || 1;
    });
  }

  // ================= Create / Update =================
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

  edit(gen: any) {
    this.editingGeneratorId = gen.generatorId;
    this.generatorForm.patchValue({
      generatorName: gen.generatorName,
      ratedCapacityKW: gen.ratedCapacityKW,
      fuelId: gen.fuelId,
      siteId: gen.siteId,
      departmentId: gen.departmentId
    });
  }

  // ================= Delete / Toggle Status =================
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

  // ================= Pagination / Filter =================
  prevPage() { if (this.pageNumber > 1) { this.pageNumber--; this.loadGenerators(); } }
  nextPage() { if (this.pageNumber < this.totalPages) { this.pageNumber++; this.loadGenerators(); } }
  changePageSize() { this.pageNumber = 1; this.loadGenerators(); }
  clearFilter() { this.searchText = ''; this.isActiveFilter = null; this.pageNumber = 1; this.loadGenerators(); }

  // Call this when a column header is clicked
  sort(column: string) {
    if (this.sortColumnName === column) {
      // toggle direction
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumnName = column;
      this.sortDir = 'asc';
    }

    // Sort the generator array
    this.generators.sort((a, b) => {
      let valA = a[column] || '';
      let valB = b[column] || '';

      // If numbers, convert
      if (!isNaN(valA) && !isNaN(valB)) {
        valA = Number(valA);
        valB = Number(valB);
      } else {
        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();
      }

      if (valA < valB) return this.sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // These are used in HTML
  sortColumn() {
    return this.sortColumnName;
  }

  sortDirection() {
    return this.sortDir;
  }

  // ================= Filter Modal (optional) =================
  openFilterModal() {
    Swal.fire({
      title: 'Filters',
      html: `
        <input id="swal-search" class="swal2-input" placeholder="Search" value="${this.searchText}">
        <select id="swal-status" class="swal2-select">
          <option value="">All</option>
          <option value="true" ${this.isActiveFilter === true ? 'selected' : ''}>Active</option>
          <option value="false" ${this.isActiveFilter === false ? 'selected' : ''}>Inactive</option>
        </select>
      `,
      focusConfirm: false,
      preConfirm: () => {
        const search = (document.getElementById('swal-search') as HTMLInputElement).value;
        const statusValue = (document.getElementById('swal-status') as HTMLSelectElement).value;
        this.searchText = search;
        this.isActiveFilter = statusValue === '' ? null : statusValue === 'true';
        this.loadGenerators();
      }
    });
  }


  //filter
  // ===== OPEN / CLOSE =====
  openFilter() {
    this.filterModalOpen = true;
  }

  closeFilter() {
    this.filterModalOpen = false;
  }

  // ===== TOGGLE CHECKBOX =====
  toggleFuel(id: string) {
    if (this.selectedFuelIds.includes(id)) {
      this.selectedFuelIds = this.selectedFuelIds.filter(x => x !== id);
    } else {
      this.selectedFuelIds.push(id);
    }
  }

  toggleSite(id: string) {
    if (this.selectedSiteIds.includes(id)) {
      this.selectedSiteIds = this.selectedSiteIds.filter(x => x !== id);
    } else {
      this.selectedSiteIds.push(id);
    }
  }

  // ===== APPLY FILTER =====
  applyFilter() {
    this.searchText = this.filterSearchText;
    this.pageNumber = 1;
    this.loadGenerators();
    this.closeFilter();
  }

  // ===== RESET FILTER =====
  resetFilterModal() {
    this.filterSearchText = '';
    this.selectedFuelIds = [];
    this.selectedSiteIds = [];
  }
}
