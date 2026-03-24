import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { SiteLocationMasterService, FilterOption } from './site-location-master-service';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { CityService } from '../../fleet-transport/citymaster/city-service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-sitelocationmaster',
  templateUrl: './sitelocationmaster.html',
  styleUrls: ['./sitelocationmaster.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
})
export class Sitelocationmaster implements OnInit {

  form!: FormGroup;
  siteList = signal<any[]>([]);
  cityList: any[] = [];

  editingSiteId: string | null = null;
  searchText: string = '';
  isActiveFilter: boolean | null = true;

  totalRecords = 0;
  pageNumber   = 1;
  pageSize     = 5;
  totalPages   = 0;
  pageSizeOptions = [5, 10, 20, 50];

  sortColumnName = 'siteName';
  sortDir: 'asc' | 'desc' = 'asc';

  // ── Filter modal ───────────────────────────────────────
  filterModalOpen = signal(false);

  loadingSiteNames = signal(false);
  loadingCities    = signal(false);

  siteNamesList: FilterOption[] = [];
  citiesList:    FilterOption[] = [];

  selectedSiteNames: string[] = [];
  selectedCityNames: string[] = [];

  siteNameDropOpen = false;
  cityDropOpen     = false;

  // ── Search inside filter panels ────────────────────────
  siteNameSearch = '';
  citySearch     = '';

  get filteredSiteNamesList(): FilterOption[] {
    if (!this.siteNameSearch.trim()) return this.siteNamesList;
    return this.siteNamesList.filter(x =>
      x.value.toLowerCase().includes(this.siteNameSearch.toLowerCase())
    );
  }

  get filteredCitiesList(): FilterOption[] {
    if (!this.citySearch.trim()) return this.citiesList;
    return this.citiesList.filter(x =>
      x.value.toLowerCase().includes(this.citySearch.toLowerCase())
    );
  }

  get totalFilterCount(): number {
    return this.selectedSiteNames.length + this.selectedCityNames.length;
  }

  constructor(
    private fb:          FormBuilder,
    private service:     SiteLocationMasterService,
    private cityService: CityService,
    private toastr:      ToastrService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      siteName:     ['', Validators.required],
      buildingName: ['', Validators.required],
      city:         ['', Validators.required],
      state:        ['', Validators.required],
      shortCode:    ['', [Validators.required, Validators.minLength(2), Validators.maxLength(3)]],
      isActive:     [true],
    });

    this.isActiveFilter = true;
    this.loadCities();
    this.search();
  }

  // ── SUBMIT ─────────────────────────────────────────────
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showToast('Error', 'Please fill all required fields correctly', 'error');
      return;
    }

    const payload      = { ...this.form.value };
    const siteName     = payload.siteName.trim();
    const buildingName = payload.buildingName.trim();
    const city         = payload.city.trim();
    const state        = payload.state.trim();
    const shortCode    = payload.shortCode.trim().toUpperCase();

    const duplicateRecord = this.siteList().find(s =>
      s.siteName.toLowerCase()     === siteName.toLowerCase()     &&
      s.buildingName.toLowerCase() === buildingName.toLowerCase() &&
      s.city.toLowerCase()         === city.toLowerCase()         &&
      s.state.toLowerCase()        === state.toLowerCase()        &&
      (!this.editingSiteId || s.siteId !== this.editingSiteId)
    );

    if (duplicateRecord) {
      this.showToast('Error', 'This Site + Building + City + State combination already exists', 'error');
      return;
    }

    const duplicateShortCode = this.siteList().find(s =>
      s.shortCode.toLowerCase() === shortCode.toLowerCase() &&
      (!this.editingSiteId || s.siteId !== this.editingSiteId)
    );

    if (duplicateShortCode) {
      this.showToast('Error', 'ShortCode already exists. Please enter a unique ShortCode', 'error');
      return;
    }

    payload.siteName     = siteName;
    payload.buildingName = buildingName;
    payload.city         = city;
    payload.state        = state;
    payload.shortCode    = shortCode;

    if (this.editingSiteId) {
      this.service.update(this.editingSiteId, payload).subscribe({
        next: () => {
          this.showToast('Success', 'Site Updated Successfully', 'success');
          this.resetForm();
          this.search();
        },
        error: () => this.showToast('Error', 'Update failed', 'error')
      });
    } else {
      this.service.create(payload).subscribe({
        next: () => {
          this.showToast('Success', 'Site Created Successfully', 'success');
          this.resetForm();
          this.search();
        },
        error: () => this.showToast('Error', 'Create failed', 'error')
      });
    }
  }

  resetForm() {
    this.form.reset({ isActive: true });
    this.editingSiteId = null;
  }

  // ── EDIT ───────────────────────────────────────────────
  edit(site: any) {
    this.editingSiteId = site.siteId;
    this.form.patchValue({
      siteName:     site.siteName,
      buildingName: site.buildingName,
      city:         site.city,
      state:        site.state,
      shortCode:    site.shortCode,
      isActive:     site.isActive
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── DELETE ─────────────────────────────────────────────
  delete(site: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will soft delete the record',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(result => {
      if (!result.isConfirmed) return;
      this.service.delete(site.siteId).subscribe({
        next: () => {
          this.showToast('Deleted', 'Record Deleted Successfully', 'success');
          this.search();
        },
        error: (err) => {
          this.showToast('Error', 'Failed to delete record', 'error');
          console.error(err);
        }
      });
    });
  }

  // ── TOGGLE STATUS ──────────────────────────────────────
  toggleStatus(site: any) {
    const newStatus = !site.isActive;
    Swal.fire({
      title: 'Change Status?',
      text: `Are you sure to ${newStatus ? 'activate' : 'deactivate'} this site?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
    }).then(result => {
      if (!result.isConfirmed) return;
      this.service.toggleStatus(site.siteId, newStatus).subscribe({
        next: () => {
          this.showToast('Updated', 'Status updated successfully', 'success');
          this.search();
        },
        error: (err) => {
          this.showToast('Error', 'Failed to update status', 'error');
          console.error(err);
        }
      });
    });
  }

  // ── CITIES ─────────────────────────────────────────────
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

  validateShortCode() {
    const shortCode = this.form.value.shortCode?.trim();
    if (!shortCode) return;
    if (shortCode.length < 2 || shortCode.length > 3) {
      this.showToast('Error', 'ShortCode must be 2 or 3 characters', 'error');
      this.form.patchValue({ shortCode: '' });
      return;
    }
    const duplicate = this.siteList().find(s =>
      s.shortCode.toLowerCase() === shortCode.toLowerCase() &&
      s.siteId !== this.editingSiteId
    );
    if (duplicate) {
      this.showToast('Error', 'ShortCode already exists!', 'error');
      this.form.patchValue({ shortCode: '' });
    }
  }

  // ── SEARCH ─────────────────────────────────────────────
  search() {
    const params: any = {
      search:        this.searchText?.trim() || '',
      pageNumber:    this.pageNumber,
      pageSize:      this.pageSize,
      sortColumn:    this.sortColumnName,
      sortDirection: this.sortDir.toUpperCase(),
      // ✅ FIX: Only send isActive if it's explicitly true or false
      ...(this.isActiveFilter !== null && { isActive: this.isActiveFilter }),
      // ✅ FIX: Only send arrays if they have values
      ...(this.selectedSiteNames.length > 0 && { siteNames: this.selectedSiteNames }),
      ...(this.selectedCityNames.length > 0 && { cityNames: this.selectedCityNames }),
    };

    console.log('Search params:', params); // ← remove after testing

    this.service.search(params).subscribe({
      next: (res: any) => {
        this.siteList.set(res.data || []);
        this.totalRecords = res.totalRecords || 0;
        this.totalPages   = Math.max(res.totalPages || 1, 1);
      },
      error: (err) => {
        console.error('Search error:', err);
        this.showToast('Error', 'Failed to load records', 'error');
      }
    });
  }

  clearFilters() {
    this.searchText     = '';
    this.isActiveFilter = true;
    this.selectedSiteNames = [];
    this.selectedCityNames = [];
    this.pageNumber     = 1;
    this.search();
  }

  applySearch() {
    this.pageNumber = 1;
    this.search();
  }

  // ✅ FIX: Actually toggle the isActiveFilter value
  onToggleActive() {
    this.isActiveFilter = this.isActiveFilter === true ? null : true;
    this.pageNumber = 1;
    this.search();
  }

  onStatusFilterChange(value: any) {
    if (value === 'active')        this.isActiveFilter = true;
    else if (value === 'inactive') this.isActiveFilter = false;
    else                           this.isActiveFilter = null;
    this.pageNumber = 1;
    this.search();
  }

  // ── PAGINATION ─────────────────────────────────────────
  prevPage() {
    if (this.pageNumber > 1) { this.pageNumber--; this.search(); }
  }

  nextPage() {
    if (this.pageNumber < this.totalPages) { this.pageNumber++; this.search(); }
  }

  changePageSize(event: Event) {
    this.pageSize   = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1;
    this.search();
  }

  // ── SORT ───────────────────────────────────────────────
  sort(column: string) {
    if (this.sortColumnName === column)
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else {
      this.sortColumnName = column;
      this.sortDir = 'asc';
    }
    this.search();
  }

  getSortIcon(column: string): string {
    if (this.sortColumnName !== column) return '↕';
    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  // ── FILTER MODAL ───────────────────────────────────────
  openFilterModal() {
    this.siteNameSearch   = '';
    this.citySearch       = '';
    this.siteNameDropOpen = false;
    this.cityDropOpen     = false;
    this.filterModalOpen.set(true);
    this.loadFilterOptions();
  }

  closeFilter() {
    this.filterModalOpen.set(false);
  }

  applyFilter() {
    this.pageNumber = 1;
    this.filterModalOpen.set(false);
    this.search(); // ✅ search AFTER closing modal so params are final
  }

  resetFilterModal() {
    this.selectedSiteNames = [];
    this.selectedCityNames = [];
    this.siteNameSearch    = '';
    this.citySearch        = '';
    this.pageNumber        = 1;
    this.filterModalOpen.set(false);
    this.search();
  }

  loadFilterOptions() {
    this.loadingSiteNames.set(true);
    this.loadingCities.set(true);

    this.service.getFilterOptions().subscribe({
      next: (res) => {
        console.log('Filter options response:', res); // ← remove after testing
        this.siteNamesList = res.siteNames ?? [];
        this.citiesList    = res.cities    ?? [];
        this.loadingSiteNames.set(false);
        this.loadingCities.set(false);
      },
      error: () => {
        this.loadingSiteNames.set(false);
        this.loadingCities.set(false);
        this.showToast('Error', 'Failed to load filter options', 'error');
      }
    });
  }

  // ── Site Name checkbox helpers ─────────────────────────
  toggleSiteName(name: string) {
    const i = this.selectedSiteNames.indexOf(name);
    if (i > -1) this.selectedSiteNames.splice(i, 1);
    else        this.selectedSiteNames.push(name);
    this.selectedSiteNames = [...this.selectedSiteNames]; // ✅ trigger CD
  }

  isSiteNameSelected(name: string): boolean {
    return this.selectedSiteNames.includes(name);
  }

  toggleAllSiteNames() {
    this.selectedSiteNames =
      this.selectedSiteNames.length === this.filteredSiteNamesList.length
        ? []
        : this.filteredSiteNamesList.map(x => x.value);
  }

  removeSiteName(name: string) {
    this.selectedSiteNames = this.selectedSiteNames.filter(v => v !== name);
  }

  // ── City checkbox helpers ──────────────────────────────
  toggleCityName(city: string) {
    const i = this.selectedCityNames.indexOf(city);
    if (i > -1) this.selectedCityNames.splice(i, 1);
    else        this.selectedCityNames.push(city);
    this.selectedCityNames = [...this.selectedCityNames]; // ✅ trigger CD
  }

  isCityNameSelected(city: string): boolean {
    return this.selectedCityNames.includes(city);
  }

  toggleAllCityNames() {
    this.selectedCityNames =
      this.selectedCityNames.length === this.filteredCitiesList.length
        ? []
        : this.filteredCitiesList.map(x => x.value);
  }

  removeCityName(city: string) {
    this.selectedCityNames = this.selectedCityNames.filter(v => v !== city);
  }

  compareDepartment(d1: any, d2: any): boolean { return d1 == d2; }

  showToast(title: string, text: string, icon: 'success' | 'error' = 'success') {
    Swal.fire({
      icon, title, text,
      toast: true, position: 'top-end',
      timer: 2000, timerProgressBar: true,
      showConfirmButton: false,
    });
  }
}