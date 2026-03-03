import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SiteLocationMasterService } from './site-location-master-service';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sitelocationmaster',
  templateUrl: './sitelocationmaster.html',
  styleUrls: ['./sitelocationmaster.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
})
export class Sitelocationmaster implements OnInit {
  form!: FormGroup;
  siteList: any[] = [];
  departments: any[] = [];

  editingSiteId: string | null = null;
  searchText: string = '';
  isActiveFilter: boolean | null = null;

  totalRecords = 0;
  pageNumber = 1;
  pageSize = 10;
  totalPages = 0;
  pageSizeOptions = [5, 10, 20, 50];

  sortColumnName = 'siteName';
  sortDir: 'asc' | 'desc' = 'asc';

  filterModalOpen = signal(false);

selectedSiteNames: string[] = [];
selectedCityNames: string[] = [];


  // Filter modal
  filterSiteName = '';
  filterCityName = '';

  filterDropdownOpen = false;


  constructor(private fb: FormBuilder, private service: SiteLocationMasterService) { }

  ngOnInit(): void {
    // Form for create/edit
    this.form = this.fb.group({
      siteName: [''],
      buildingName: [''],
      city: [''],
      state: [''],
      departmentId: [''],
      isActive: [true],
    });

    this.loadDepartments();
    this.search();
  }

  // ================= CREATE / UPDATE =================
  submit() {
    if (!this.form.valid) return;
    const payload = { ...this.form.value };

    if (this.editingSiteId) {
      this.service.update(this.editingSiteId, payload).subscribe(() => {
        Swal.fire('Success', 'Site Updated Successfully', 'success');
        this.form.reset({ isActive: true });
        this.editingSiteId = null;
        this.search();
      });
    } else {
      this.service.create(payload).subscribe(() => {
        Swal.fire('Success', 'Site Created Successfully', 'success');
        this.form.reset({ isActive: true });
        this.search();
      });
    }
  }

  // ================= EDIT =================
  edit(site: any) {
    this.editingSiteId = site.siteId;
    this.form.patchValue({
      siteName: site.siteName,
      buildingName: site.buildingName,
      city: site.city,
      state: site.state,
      departmentId: site.departmentId,
      isActive: site.isActive,
    });
  }

  // ================= DELETE =================
  delete(site: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will soft delete the record',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.delete(site.siteId).subscribe(() => {
          Swal.fire('Deleted', 'Record Deleted Successfully', 'success');
          this.search();
        });
      }
    });
  }

  // ================= TOGGLE STATUS =================
  toggleStatus(site: any) {
    const newStatus = !site.isActive;
    this.service.toggleStatus(site.siteId, newStatus).subscribe(() => {
      site.isActive = newStatus;
    });
  }

  // ================= SEARCH =================

  clearFilters() {
    this.searchText = '';
    this.isActiveFilter = null;
    this.pageNumber = 1;
    this.search();
  }

  // ================= PAGINATION =================
  nextPage() {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.search();
    }
  }

  prevPage() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.search();
    }
  }


  // ================= LOAD DEPARTMENTS =================
  loadDepartments() {
    this.service.getDepartments().subscribe((res: any) => {
      this.departments = res || [];
    });
  }

  // Sorting function
  sort(column: string) {
    if (this.sortColumnName === column) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumnName = column;
      this.sortDir = 'asc';
    }
    this.search();
  }

  // Arrow display
  getSortArrow(column: string): string {
    if (this.sortColumnName === column) {
      return this.sortDir === 'asc' ? '▲' : '▼';
    }
    return '';
  }

  // Modified search to include sorting
  search() {
    const params = {
      search: this.searchText,
      isActive: this.isActiveFilter,
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      sortColumn: this.sortColumnName,
      sortDirection: this.sortDir.toUpperCase(),

      siteNames: this.selectedSiteNames,
      cityNames: this.selectedCityNames
    };

    this.service.search(params).subscribe((res: any) => {
      this.siteList = res.data || [];
      this.totalRecords = res.totalRecords || 0;
      this.totalPages = res.totalPages || 1;
    });
  }

  // Called when search box or toggle changes
  applySearch() {
    this.pageNumber = 1;
    this.search();
  }

  // Page size change
  changePageSize(event: any) {
    this.pageSize = +event.target.value;
    this.pageNumber = 1;
    this.search();
  }

  openFilterModal() {
  this.filterModalOpen.set(true);
}

closeFilter() {
  this.filterModalOpen.set(false);
}

applyFilter() {
  this.pageNumber = 1;
  this.search();
  this.filterModalOpen.set(false);
}

  resetFilterModal() {
  this.selectedSiteNames = [];
  this.selectedCityNames = [];
}

  toggleFilterDropdown() {
    this.filterDropdownOpen = !this.filterDropdownOpen;
  }

  toggleSiteName(name: string) {
    if (this.selectedSiteNames.includes(name)) {
      this.selectedSiteNames =
        this.selectedSiteNames.filter(x => x !== name);
    } else {
      this.selectedSiteNames.push(name);
    }
  }

  toggleCityName(city: string) {
  this.selectedCityNames.includes(city)
    ? this.selectedCityNames = this.selectedCityNames.filter(x => x !== city)
    : this.selectedCityNames.push(city);
}

  applyDropdownFilter() {
    this.pageNumber = 1;
    this.search();
    this.filterDropdownOpen = false;
  }

  resetFilterDropdown() {
    this.selectedSiteNames = [];
    this.selectedCityNames = [];
  }

  openFilter() {
  this.filterModalOpen.set(true);
}

}