import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SiteLocationMasterService } from './site-location-master-service';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { CityService } from '../../fleet-transport/citymaster/city-service';
import { ToastrService } from 'ngx-toastr'; // <-- For toast messages

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
  cityList: any[] = [];

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
  filterDropdownOpen = false;

  constructor(
    private fb: FormBuilder,
    private service: SiteLocationMasterService,
    private cityService: CityService,
    private toastr: ToastrService // <-- Inject ToastrService
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      siteName: [''],
      buildingName: [''],
      city: [''],
      state: [''],
      departmentId: [''],
      isActive: [true],
    });

    this.loadDepartments();
    this.loadCities();
    this.search();
  }

  // ================= CREATE / UPDATE =================
  submit() {
    if (!this.form.valid) return;
    const payload = { ...this.form.value };

    if (this.editingSiteId) {
      this.service.update(this.editingSiteId, payload).subscribe({
        next: () => {
          this.toastr.success('Site Updated Successfully');
          this.form.reset({ isActive: true });
          this.editingSiteId = null;
          this.search();
        },
        error: (err) => {
          this.toastr.error('Failed to update site');
          console.error(err);
        },
      });
    } else {
      this.service.create(payload).subscribe({
        next: () => {
          this.toastr.success('Site Created Successfully');
          this.form.reset({ isActive: true });
          this.search();
        },
        error: (err) => {
          this.toastr.error('Failed to create site');
          console.error(err);
        },
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
      departmentId: site.departmentId ?? null,
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
        this.service.delete(site.siteId).subscribe({
          next: () => {
            Swal.fire('Deleted', 'Record Deleted Successfully', 'success');
            this.search();
          },
          error: (err) => {
            Swal.fire('Error', 'Failed to delete record', 'error');
            console.error(err);
          },
        });
      }
    });
  }

  // ================= TOGGLE STATUS =================
  toggleStatus(site: any) {
    const newStatus = !site.isActive;
    Swal.fire({
      title: 'Change Status?',
      text: `Are you sure to ${newStatus ? 'activate' : 'deactivate'} this site?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.toggleStatus(site.siteId, newStatus).subscribe({
          next: () => {
            site.isActive = newStatus;
            Swal.fire('Updated!', 'Status updated successfully', 'success');
          },
          error: (err) => {
            Swal.fire('Error', 'Failed to update status', 'error');
            console.error(err);
          },
        });
      }
    });
  }

  // ================= LOAD CITIES =================
  loadCities() {
    this.cityService.getAll().subscribe((res: any) => {
      this.cityList = res.data || res || [];
    });
  }

  onCityChange(event: any) {
    const selectedCity = event.target.value;
    const city = this.cityList.find(c => c.cityName === selectedCity);
    if (city) this.form.patchValue({ state: city.stateName });
  }

  // ================= SEARCH =================
  clearFilters() {
    this.searchText = '';
    this.isActiveFilter = null;
    this.pageNumber = 1;
    this.search();
  }

  search() {
    const params = {
      search: this.searchText,
      isActive: this.isActiveFilter,
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      sortColumn: this.sortColumnName,
      sortDirection: this.sortDir.toUpperCase(),
      siteNames: this.selectedSiteNames,
      cityNames: this.selectedCityNames,
    };

    this.service.search(params).subscribe((res: any) => {
      this.siteList = res.data || [];
      this.totalRecords = res.totalRecords || 0;
      this.totalPages = res.totalPages || 1;
    });
  }

  // ================= PAGINATION =================
  nextPage() { if (this.pageNumber < this.totalPages) { this.pageNumber++; this.search(); } }
  prevPage() { if (this.pageNumber > 1) { this.pageNumber--; this.search(); } }
  changePageSize(event: any) { this.pageSize = +event.target.value; this.pageNumber = 1; this.search(); }

  // ================= LOAD DEPARTMENTS =================
  loadDepartments() {
    this.service.getDepartments().subscribe((res: any) => {
      this.departments = res || [];
      if (this.editingSiteId && this.form.value.departmentId) {
        this.form.patchValue({ departmentId: this.form.value.departmentId });
      }
    });
  }

  // ================= SORTING =================
  sort(column: string) {
    if (this.sortColumnName === column) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortColumnName = column; this.sortDir = 'asc'; }
    this.search();
  }

  getSortArrow(column: string): string {
    if (this.sortColumnName === column) return this.sortDir === 'asc' ? '▲' : '▼';
    return '';
  }

  // ================= FILTER MODAL =================
  openFilterModal() { this.filterModalOpen.set(true); }
  closeFilter() { this.filterModalOpen.set(false); }
  applyFilter() { this.pageNumber = 1; this.search(); this.filterModalOpen.set(false); }
  resetFilterModal() { this.selectedSiteNames = []; this.selectedCityNames = []; }
  toggleFilterDropdown() { this.filterDropdownOpen = !this.filterDropdownOpen; }
  toggleSiteName(name: string) { this.selectedSiteNames.includes(name) ? this.selectedSiteNames = this.selectedSiteNames.filter(x => x !== name) : this.selectedSiteNames.push(name); }
  toggleCityName(city: string) { this.selectedCityNames.includes(city) ? this.selectedCityNames = this.selectedCityNames.filter(x => x !== city) : this.selectedCityNames.push(city); }
  applyDropdownFilter() { this.pageNumber = 1; this.search(); this.filterDropdownOpen = false; }
  resetFilterDropdown() { this.selectedSiteNames = []; this.selectedCityNames = []; }

  compareDepartment(d1: any, d2: any): boolean { return d1 == d2; }

  applySearch() {
  // Reset to first page whenever user searches or changes filters
  this.pageNumber = 1;

  // Prepare search parameters
  const params = {
    search: this.searchText || '',           // Text from search input
    isActive: this.isActiveFilter,          // Active toggle filter
    pageNumber: this.pageNumber,
    pageSize: this.pageSize,
    sortColumn: this.sortColumnName,
    sortDirection: this.sortDir.toUpperCase(),
    siteNames: this.selectedSiteNames,      // Multi-select site filter
    cityNames: this.selectedCityNames       // Multi-select city filter
  };

  // Call service search API
  this.service.search(params).subscribe((res: any) => {
    this.siteList = res.data || [];
    this.totalRecords = res.totalRecords || 0;
    this.totalPages = res.totalPages || 1;
  });
}
}