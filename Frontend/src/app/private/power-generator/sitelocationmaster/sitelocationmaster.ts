import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { SiteLocationMasterService, FilterOption } from './site-location-master-service';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { CityService } from '../../fleet-transport/citymaster/city-service';

@Component({
  selector: 'app-sitelocationmaster',
  templateUrl: './sitelocationmaster.html',
  styleUrls: ['./sitelocationmaster.css'],
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
})
export class Sitelocationmaster implements OnInit {

  form!: FormGroup;
  siteList = signal<any[]>([]);
  cityList: any[] = [];

  editingSiteId: string | null = null;
  searchText: string = '';
  isActiveFilter: boolean | null = true;

  totalRecords = 0;
  pageNumber = 1;
  pageSize = 5;
  totalPages = 0;
  pageSizeOptions = [5, 10, 20, 50];

  sortColumnName = 'siteName';
  sortDir: 'asc' | 'desc' = 'asc';

  // ── Filter modal ───────────────────────────────────────
  filterModalOpen = signal(false);
  loadingSiteNames = signal(false);
  loadingCities = signal(false);
  siteNamesList: FilterOption[] = [];
  citiesList: FilterOption[] = [];
  selectedSiteNames: string[] = [];
  selectedCityNames: string[] = [];
  siteNameDropOpen = false;
  cityDropOpen = false;

  siteNameSearch = '';
  citySearch = '';

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
    private fb: FormBuilder,
    private service: SiteLocationMasterService,
    private cityService: CityService
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      siteName: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      shortCode: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(3)]],
      isActive: [true],
    });

    this.isActiveFilter = true;
    this.loadCities();
    this.search();
  }

  // ── SUBMIT ─────────────────────────────────────────────
  submit() {
    // 1️⃣ Existing validations
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showToast('Error', 'Please fill all required fields correctly', 'error');
      return;
    }

    const payload = { ...this.form.value };
    const siteName = payload.siteName.trim();
    const city = payload.city.trim();
    const shortCode = payload.shortCode.trim().toUpperCase();

    // 2️⃣ Duplicate check: Site Name + City
    const duplicateSite = this.siteList().find(s =>
      s.siteName.toLowerCase() === siteName.toLowerCase() &&
      s.city.toLowerCase() === city.toLowerCase() &&
      (!this.editingSiteId || s.siteId !== this.editingSiteId)
    );

    if (duplicateSite) {
      this.showToast('Error', 'This Site Name + City already exists', 'error');
      return;
    }

    // 3️⃣ Duplicate check: ShortCode
    const duplicateShortCode = this.siteList().find(s =>
      s.shortCode.toLowerCase() === shortCode.toLowerCase() &&
      (!this.editingSiteId || s.siteId !== this.editingSiteId)
    );

    if (duplicateShortCode) {
      this.showToast('Error', 'This ShortCode already exists', 'error');
      return;
    }

    // 4️⃣ Prepare payload
    payload.siteName = siteName;
    payload.city = city;
    payload.shortCode = shortCode;

    // 5️⃣ Call API
    if (this.editingSiteId) {
      this.service.update(this.editingSiteId, payload).subscribe({
        next: () => {
          this.showToast('Success', 'Site updated successfully', 'success');
          this.resetForm();
          this.search();
        },
        error: () => this.showToast('Error', 'Update failed', 'error')
      });
    } else {
      this.service.create(payload).subscribe({
        next: () => {
          this.showToast('Success', 'Site created successfully', 'success');
          this.resetForm();
          this.search();
        },
        error: () => this.showToast('Error', 'Creation failed', 'error')
      });
    }
  }

  resetForm() {
    this.form.reset({ isActive: true });
    this.editingSiteId = null;
  }

  edit(site: any) {
    this.editingSiteId = site.siteId;
    this.form.patchValue({
      siteName: site.siteName,
      city: site.city,
      state: site.state,
      shortCode: site.shortCode,
      isActive: site.isActive
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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
        next: () => { Swal.fire({ icon: 'success', title: 'Deleted', text: 'Record Deleted Successfully', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false }); this.search(); },
        error: (err) => { Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete record', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false }); console.error(err); }
      });
    });
  }

  toggleStatus(site: any) {
    const currentStatus = site.isActive;           // save current status
    const newStatus = !currentStatus;             // intended new status

    Swal.fire({
      title: 'Change Status?',
      text: `Are you sure to ${newStatus ? 'activate' : 'deactivate'} this site?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
    }).then(result => {
      if (!result.isConfirmed) return;            // do nothing if cancelled

      this.service.toggleStatus(site.siteId, newStatus).subscribe({
        next: () => {
          site.isActive = newStatus;             // update model ONLY on success
          this.showToast('Updated', 'Status updated successfully', 'success');
        },
        error: (err) => {
          this.showToast('Error', 'Failed to update status', 'error');
          console.error(err);
        }
      });
    });
  }

  // ── TOAST / ALERT ─────────────────────────────────────────
  showToast(
    title: string,
    text: string,
    icon: 'success' | 'error' = 'success'
  ) {
    Swal.fire({
      icon: icon,
      title: title,
      text: text,
      toast: true,
      position: 'top-end',
      timer: 2000,
      timerProgressBar: true,
      showConfirmButton: false,
    });
  }

  loadCities() {
    this.cityService.getAll().subscribe((res: any) => { this.cityList = res.data || res || []; });
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
      Swal.fire({ icon: 'error', title: 'Error', text: 'ShortCode must be 2 or 3 characters', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
      this.form.patchValue({ shortCode: '' });
      return;
    }
    const duplicate = this.siteList().find(s =>
      s.shortCode.toLowerCase() === shortCode.toLowerCase() &&
      s.siteId !== this.editingSiteId
    );
    if (duplicate) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'ShortCode already exists!', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
      this.form.patchValue({ shortCode: '' });
    }
  }

  // ── SEARCH / FILTER / PAGINATION / SORT ──
  search() {
    const params: any = {
      search: this.searchText?.trim() || '',
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      sortColumn: this.sortColumnName,
      sortDirection: this.sortDir.toUpperCase(),
      ...(this.isActiveFilter !== null && { isActive: this.isActiveFilter }),
      ...(this.selectedSiteNames.length > 0 && { siteNames: this.selectedSiteNames }),
      ...(this.selectedCityNames.length > 0 && { cityNames: this.selectedCityNames }),
    };
    this.service.search(params).subscribe({
      next: (res: any) => { this.siteList.set(res.data || []); this.totalRecords = res.totalRecords || 0; this.totalPages = Math.max(res.totalPages || 1, 1); },
      error: (err) => { console.error('Search error:', err); }
    });
  }

  clearFilters() { this.searchText = ''; this.isActiveFilter = true; this.selectedSiteNames = []; this.selectedCityNames = []; this.pageNumber = 1; this.search(); }
  applySearch() { this.pageNumber = 1; this.search(); }
  
 onToggleActive() {
  if (this.isActiveFilter === true) {
    this.isActiveFilter = false;  
  } else if (this.isActiveFilter === false) {
    this.isActiveFilter = null;    
  } else {
    this.isActiveFilter = true;    
  }

  this.pageNumber = 1;
  this.search();   
}
  prevPage() { if (this.pageNumber > 1) { this.pageNumber--; this.search(); } }
  nextPage() { if (this.pageNumber < this.totalPages) { this.pageNumber++; this.search(); } }
  changePageSize(event: Event) { this.pageSize = Number((event.target as HTMLSelectElement).value); this.pageNumber = 1; this.search(); }
  sort(column: string) { if (this.sortColumnName === column) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc'; else { this.sortColumnName = column; this.sortDir = 'asc'; } this.search(); }
  getSortIcon(column: string): string { if (this.sortColumnName !== column) return '↕'; return this.sortDir === 'asc' ? '↑' : '↓'; }

  openFilterModal() { this.siteNameSearch = ''; this.citySearch = ''; this.siteNameDropOpen = false; this.cityDropOpen = false; this.filterModalOpen.set(true); this.loadFilterOptions(); }
  closeFilter() { this.filterModalOpen.set(false); }
  applyFilter() { this.pageNumber = 1; this.filterModalOpen.set(false); this.search(); }
  resetFilterModal() { this.selectedSiteNames = []; this.selectedCityNames = []; this.siteNameSearch = ''; this.citySearch = ''; this.pageNumber = 1; this.search(); }
  loadFilterOptions() {
    this.loadingSiteNames.set(true); this.loadingCities.set(true);
    this.service.getFilterOptions().subscribe({
      next: (res) => { this.siteNamesList = res.siteNames ?? []; this.citiesList = res.cities ?? []; this.loadingSiteNames.set(false); this.loadingCities.set(false); },
      error: () => { this.loadingSiteNames.set(false); this.loadingCities.set(false); }
    });
  }

  toggleSiteName(name: string) { const i = this.selectedSiteNames.indexOf(name); if (i > -1) this.selectedSiteNames.splice(i, 1); else this.selectedSiteNames.push(name); this.selectedSiteNames = [...this.selectedSiteNames]; }
  isSiteNameSelected(name: string): boolean { return this.selectedSiteNames.includes(name); }
  toggleAllSiteNames() { this.selectedSiteNames = this.selectedSiteNames.length === this.filteredSiteNamesList.length ? [] : this.filteredSiteNamesList.map(x => x.value); }
  removeSiteName(name: string) { this.selectedSiteNames = this.selectedSiteNames.filter(v => v !== name); }

  toggleCityName(city: string) { const i = this.selectedCityNames.indexOf(city); if (i > -1) this.selectedCityNames.splice(i, 1); else this.selectedCityNames.push(city); this.selectedCityNames = [...this.selectedCityNames]; }
  isCityNameSelected(city: string): boolean { return this.selectedCityNames.includes(city); }
  toggleAllCityNames() { this.selectedCityNames = this.selectedCityNames.length === this.filteredCitiesList.length ? [] : this.filteredCitiesList.map(x => x.value); }
  removeCityName(city: string) { this.selectedCityNames = this.selectedCityNames.filter(v => v !== city); }

  compareDepartment(d1: any, d2: any): boolean { return d1 == d2; }

  confirmToggleStatus(site: any, event: Event) {
    // Prevent checkbox from toggling automatically
    event.preventDefault();
    event.stopPropagation();

    const newStatus = !site.isActive;

    Swal.fire({
      title: 'Change Status?',
      text: `Are you sure to ${newStatus ? 'activate' : 'deactivate'} this site?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
    }).then(result => {
      if (!result.isConfirmed) return; // Cancelled → do nothing

      // Call API
      this.service.toggleStatus(site.siteId, newStatus).subscribe({
        next: () => {
          // Only update UI after API success
          site.isActive = newStatus;
          this.showToast('Updated', 'Status updated successfully', 'success');
        },
        error: (err) => {
          this.showToast('Error', 'Failed to update status', 'error');
          console.error(err);
        }
      });
    });
  }
}