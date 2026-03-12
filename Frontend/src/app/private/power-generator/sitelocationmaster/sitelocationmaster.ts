import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
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
    siteName: ['', Validators.required],
    buildingName: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    shortCode: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(3)]],
    isActive: [true],
  });

  // Force default to active records
  this.isActiveFilter = true;

  this.loadCities();
  this.search(); 
  }

  // ================= CREATE / UPDATE =================
  submit() {

    if (this.form.invalid) {
      this.showToast('Error', 'Please fill all required fields correctly', 'error');
      return;
    }

    const payload = this.form.value;

    const siteName = payload.siteName.trim();
    const buildingName = payload.buildingName.trim();
    const city = payload.city.trim();
    const state = payload.state.trim();
    const shortCode = payload.shortCode.trim().toUpperCase();

    // ===== DUPLICATE RECORD CHECK =====
    const duplicateRecord = this.siteList.find(
      s =>
        s.siteName.toLowerCase() === siteName.toLowerCase() &&
        s.buildingName.toLowerCase() === buildingName.toLowerCase() &&
        s.city.toLowerCase() === city.toLowerCase() &&
        s.state.toLowerCase() === state.toLowerCase() &&
        (!this.editingSiteId || s.siteId !== this.editingSiteId)
    );

    if (duplicateRecord) {
      this.showToast(
        'Error',
        'This Site + Building + City + State combination already exists',
        'error'
      );
      return;
    }

    // ===== SHORTCODE UNIQUE CHECK =====
    const duplicateShortCode = this.siteList.find(
      s =>
        s.shortCode.toLowerCase() === shortCode.toLowerCase() &&
        (!this.editingSiteId || s.siteId !== this.editingSiteId)
    );

    if (duplicateShortCode) {
      this.showToast(
        'Error',
        'ShortCode already exists. Please enter a unique ShortCode',
        'error'
      );
      return;
    }

    payload.shortCode = shortCode;

    // ===== CREATE / UPDATE =====
    if (this.editingSiteId) {
      this.service.update(this.editingSiteId, payload).subscribe({
        next: () => {
          this.showToast('Success', 'Site Updated Successfully', 'success');
          this.form.reset({ isActive: true });
          this.editingSiteId = null;
          this.search();
        },
        error: () => {
          this.showToast('Error', 'Update failed', 'error');
        }
      });
    } else {
      this.service.create(payload).subscribe({
        next: () => {
          this.showToast('Success', 'Site Created Successfully', 'success');
          this.form.reset({ isActive: true });
          this.search();
        },
        error: () => {
          this.showToast('Error', 'Create failed', 'error');
        }
      });
    }
  }

  // ================= EDIT =================
  edit(site: any) {
    this.editingSiteId = site.siteId;
    this.form.patchValue({
      city: site.city,
      state: site.state,
      siteName: site.siteName,
      buildingName: site.buildingName,
      shortCode: site.shortCode,  // <-- Added here
      isActive: site.isActive
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

            this.showToast('Deleted', 'Record Deleted Successfully', 'success');

            this.search();

          },
          error: (err) => {
            this.showToast('Error', 'Failed to delete record', 'error');
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

            this.showToast('Updated', 'Status updated successfully', 'success');

            //this.search();
            site.isActive = newStatus;

          },
          error: (err) => {
            this.showToast('Error', 'Failed to update status', 'error');
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

  // Validate user-entered ShortCode for uniqueness
  // 

  validateShortCode() {
    const shortCode = this.form.value.shortCode?.trim(); 

    if (!shortCode) return;

    if (shortCode.length < 2 || shortCode.length > 3) {
      this.showToast('Error', 'ShortCode must be 2 or 3 characters', 'error');
      this.form.patchValue({ shortCode: '' });
      return;
    }

    const duplicate = this.siteList.find(
      s => s.shortCode.toLowerCase() === shortCode.toLowerCase()
    );

    if (duplicate) {
      this.showToast('Error', 'ShortCode already exists!', 'error');
      this.form.patchValue({ shortCode: '' });
    }
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
    search: this.searchText || '',
    isActive: this.isActiveFilter === null ? true : this.isActiveFilter, // fallback to true
    pageNumber: this.pageNumber,
    pageSize: this.pageSize,
    sortColumn: this.sortColumnName,
    sortDirection: this.sortDir.toUpperCase(),
    siteNames: this.selectedSiteNames,
    cityNames: this.selectedCityNames,
  };

  this.service.search(params).subscribe((res: any) => {
    // Replace array so Angular signals refresh correctly
    this.siteList = [...(res.data || [])];
    this.totalRecords = res.totalRecords || 0;
    this.totalPages = res.totalPages || 1;
  });
  }

  //active filter

 onToggleActive() {
  // isActiveFilter already updated by [(ngModel)]
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
  changePageSize(event: Event) {
    const value = (event.target as HTMLSelectElement).value;

    this.pageSize = Number(value);
    this.pageNumber = 1;

    this.search();
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
    this.search();

    // Prepare search parameters
    // const params = {
    //   search: this.searchText || '',           // Text from search input
    //   isActive: this.isActiveFilter,          // Active toggle filter
    //   pageNumber: this.pageNumber,
    //   pageSize: this.pageSize,
    //   sortColumn: this.sortColumnName,
    //   sortDirection: this.sortDir.toUpperCase(),
    //   siteNames: this.selectedSiteNames,      // Multi-select site filter
    //   cityNames: this.selectedCityNames       // Multi-select city filter
    // };

    // // Call service search API
    // this.service.search(params).subscribe((res: any) => {
    //   this.siteList = res.data || [];
    //   this.totalRecords = res.totalRecords || 0;
    //   this.totalPages = res.totalPages || 1;
    // });
  }

  showToast(title: string, text: string, icon: 'success' | 'error' = 'success') {
    Swal.fire({
      icon,
      title,
      text,
      toast: true,
      position: 'top-end',
      timer: 2000,
      timerProgressBar: true,
      showConfirmButton: false,
    });
  }

  //filter toggle
  onStatusFilterChange(value: any) {

    if (value === 'active') this.isActiveFilter = true;
    else if (value === 'inactive') this.isActiveFilter = false;
    else this.isActiveFilter = null;

    this.pageNumber = 1;
    this.search();
  }
}