import { Component, OnInit, signal } from '@angular/core';
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
  fuels      = signal<{ fuelId: string; fuelName: string }[]>([]);
  sites      = signal<{ siteId: string; siteName: string }[]>([]);
  departments = signal<{ departmentId: string; departmentName: string }[]>([]);

  searchText      = '';
  isActiveFilter: boolean | null = true;

  pageNumber      = 1;
  pageSize        = 5;
  pageSizeOptions = [5, 10, 20, 50];
  totalRecords    = 0;
  totalPages      = 1;

  sortColumnName = 'generatorName';
  sortDir: 'asc' | 'desc' = 'asc';

  editingGeneratorId: string | null = null;

  // ── Filter modal ───────────────────────────────────────
  filterModalOpen = signal(false);

  selectedFuelIds: string[] = [];
  selectedSiteIds: string[] = [];

  fuelDropOpen  = false;
  siteDropOpen  = false;

  fuelSearch = '';
  siteSearch = '';

  get filteredFuelList() {
    if (!this.fuelSearch.trim()) return this.fuels();
    return this.fuels().filter(f =>
      f.fuelName.toLowerCase().includes(this.fuelSearch.toLowerCase())
    );
  }

  get filteredSiteList() {
    if (!this.siteSearch.trim()) return this.sites();
    return this.sites().filter(s =>
      s.siteName.toLowerCase().includes(this.siteSearch.toLowerCase())
    );
  }

  get totalFilterCount(): number {
    return this.selectedFuelIds.length + this.selectedSiteIds.length;
  }

  constructor(private fb: FormBuilder, private service: GeneratorService) {}

  ngOnInit() {
    this.generatorForm = this.fb.group({
      generatorName:   ['', Validators.required],
      ratedCapacityKW: ['', Validators.required],
      fuelId:          ['', Validators.required],
      siteId:          ['', Validators.required],
      departmentId:    ['', Validators.required],
      isActive:        [true]
    });

    this.loadDropdowns();
    this.loadGenerators();
  }

  loadDropdowns() {
    this.service.getFuels().subscribe((res: any[]) => {
      this.fuels.set((res || []).filter(f => f.isActive).map(f => ({
        fuelId:   f.fuel_id,
        fuelName: f.fuel_name
      })));
    });

    this.service.getSites().subscribe(res => {
      this.sites.set((res || []).map(s => ({
        siteId:   s.siteId,
        siteName: s.siteName
      })));
    });

    this.service.getDepartments().subscribe(res => {
      this.departments.set((res || []).map(d => ({
        departmentId:   d.id,
        departmentName: d.departmentName
      })));
    });
  }

  loadGenerators() {
    const params: any = {
      search:        this.searchText || '',
      sortColumn:    this.sortColumnName,
      sortDirection: this.sortDir.toUpperCase(),
      pageNumber:    this.pageNumber,
      pageSize:      this.pageSize
    };

    if (this.isActiveFilter !== null)
      params.isActive = this.isActiveFilter;

    // ✅ Send filter arrays as comma-separated strings
    if (this.selectedFuelIds.length > 0)
      params.fuelIds = this.selectedFuelIds.join(',');

    if (this.selectedSiteIds.length > 0)
      params.siteIds = this.selectedSiteIds.join(',');

    this.service.search(params).subscribe(res => {
      this.generators.set(res.data || []);
      this.totalRecords = res.totalRecords || 0;
      this.totalPages   = Math.max(Math.ceil(this.totalRecords / this.pageSize), 1);
    });
  }

  // ── SUBMIT ─────────────────────────────────────────────
  submit() {
    if (this.generatorForm.invalid) {
      this.generatorForm.markAllAsTouched();
      this.showToast('error', 'Please fill all required fields');
      return;
    }

    const formValue = this.generatorForm.value;
    const payload = {
      generatorId:     this.editingGeneratorId ?? null,
      generatorName:   formValue.generatorName,
      ratedCapacityKW: Number(formValue.ratedCapacityKW),
      fuelId:          formValue.fuelId,
      siteId:          formValue.siteId,
      departmentId:    formValue.departmentId
    };

    if (this.editingGeneratorId) {
      this.service.update(payload).subscribe({
        next:  () => { this.showToast('success', 'Generator updated successfully'); this.resetForm(); this.loadGenerators(); },
        error: () => this.showToast('error', 'Update failed')
      });
    } else {
      this.service.create(payload).subscribe({
        next:  () => { this.showToast('success', 'Generator created successfully'); this.resetForm(); this.loadGenerators(); },
        error: () => this.showToast('error', 'Create failed')
      });
    }
  }

  edit(gen: any) {
    this.editingGeneratorId = gen.generatorId;
    this.generatorForm.patchValue({
      generatorName:   gen.generatorName,
      ratedCapacityKW: gen.ratedCapacityKW,
      siteId:          gen.siteId?.toString() || '',
      departmentId:    gen.departmentId?.toString() || '',
      fuelId:          gen.fuelId?.toString() || '',
      isActive:        gen.isActive
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  delete(gen: any) {
    Swal.fire({ title: 'Delete?', text: 'Soft delete this generator?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete' })
      .then(result => {
        if (result.isConfirmed) {
          this.service.delete(gen.generatorId).subscribe(() => {
            this.showToast('success', 'Deleted successfully');
            this.loadGenerators();
          });
        }
      });
  }

  confirmToggleStatus(event: Event, gen: any) {
    event.preventDefault();
    Swal.fire({ title: 'Change status?', icon: 'question', showCancelButton: true, confirmButtonText: 'Yes' })
      .then(result => {
        if (result.isConfirmed) {
          this.service.toggleStatus(gen.generatorId, !gen.isActive).subscribe(() => {
            this.showToast('success', 'Status changed');
            this.loadGenerators();
          });
        }
      });
  }

  resetForm() {
    this.generatorForm.reset({ isActive: true });
    this.editingGeneratorId = null;
  }

  // ── SORT ───────────────────────────────────────────────
  sort(column: string) {
    if (this.sortColumnName === column)
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortColumnName = column; this.sortDir = 'asc'; }
    this.pageNumber = 1;
    this.loadGenerators();
  }

  getSortIcon(column: string): string {
    if (this.sortColumnName !== column) return '↕';
    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  // ── PAGINATION ─────────────────────────────────────────
  prevPage()  { if (this.pageNumber > 1) { this.pageNumber--; this.loadGenerators(); } }
  nextPage()  { if (this.pageNumber < this.totalPages) { this.pageNumber++; this.loadGenerators(); } }

  changePageSize(event: Event) {
    this.pageSize   = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1;
    this.loadGenerators();
  }

  onToggleActive() {
    this.isActiveFilter = this.isActiveFilter === true ? null : true;
    this.pageNumber = 1;
    this.loadGenerators();
  }

  applySearch() {
    this.pageNumber = 1;
    this.loadGenerators();
  }

  clearFilters() {
    this.searchText      = '';
    this.isActiveFilter  = true;
    this.selectedFuelIds = [];
    this.selectedSiteIds = [];
    this.pageNumber      = 1;
    this.loadGenerators();
  }

  // ── FILTER MODAL ───────────────────────────────────────
  openFilterModal() {
    this.fuelSearch  = '';
    this.siteSearch  = '';
    this.fuelDropOpen = false;
    this.siteDropOpen = false;
    this.filterModalOpen.set(true);
  }

  closeFilter() { this.filterModalOpen.set(false); }

  applyFilter() {
    this.pageNumber = 1;
    this.filterModalOpen.set(false);
    this.loadGenerators();
  }

  resetFilterModal() {
    this.selectedFuelIds = [];
    this.selectedSiteIds = [];
    this.fuelSearch      = '';
    this.siteSearch      = '';
    this.pageNumber      = 1;
    // this.filterModalOpen.set(false);
    this.loadGenerators();
  }

  // ── Fuel helpers ───────────────────────────────────────
  toggleFuel(id: string) {
    const i = this.selectedFuelIds.indexOf(id);
    if (i > -1) this.selectedFuelIds.splice(i, 1);
    else        this.selectedFuelIds.push(id);
    this.selectedFuelIds = [...this.selectedFuelIds];
  }

  isFuelSelected(id: string) { return this.selectedFuelIds.includes(id); }

  toggleAllFuels() {
    this.selectedFuelIds =
      this.selectedFuelIds.length === this.filteredFuelList.length
        ? [] : this.filteredFuelList.map(f => f.fuelId);
  }

  removeFuel(id: string) { this.selectedFuelIds = this.selectedFuelIds.filter(v => v !== id); }

  getFuelName(id: string) { return this.fuels().find(f => f.fuelId === id)?.fuelName || id; }

  // ── Site helpers ───────────────────────────────────────
  toggleSite(id: string) {
    const i = this.selectedSiteIds.indexOf(id);
    if (i > -1) this.selectedSiteIds.splice(i, 1);
    else        this.selectedSiteIds.push(id);
    this.selectedSiteIds = [...this.selectedSiteIds];
  }

  isSiteSelected(id: string) { return this.selectedSiteIds.includes(id); }

  toggleAllSites() {
    this.selectedSiteIds =
      this.selectedSiteIds.length === this.filteredSiteList.length
        ? [] : this.filteredSiteList.map(s => s.siteId);
  }

  removeSite(id: string) { this.selectedSiteIds = this.selectedSiteIds.filter(v => v !== id); }

  getSiteName(id: string) { return this.sites().find(s => s.siteId === id)?.siteName || id; }

  showToast(type: 'success' | 'error', message: string) {
    Swal.fire({ toast: true, position: 'top-end', icon: type, title: message, showConfirmButton: false, timer: 2000 });
  }

  get noRecords() { return this.generators().length === 0; }
}