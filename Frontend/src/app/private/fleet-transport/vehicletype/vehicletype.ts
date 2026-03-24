import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { VehicletypeService, VehicleType, FilterOption } from './vehicletype-service';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-vehicletype',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './vehicletype.html',
  styleUrls: ['./vehicletype.css'],
})
export class Vehicletype implements OnInit {

  vehicleForm!: FormGroup;
  searchForm!:  FormGroup;

  // ── Table ──────────────────────────────────────────────
  vehicleTypes    = signal<VehicleType[]>([]);
  totalRecords    = signal(0);
  totalPages      = signal(1);
  currentPage     = signal(1);
  pageSizeOptions = [5, 10, 20];
  pageSize        = signal(5);

  // ── Sort / active filter ───────────────────────────────
  onlyActive = signal<boolean | undefined>(true);
  sortCol    = signal<string>('vehicle_type_name');
  sortDir    = signal<'ASC' | 'DESC'>('ASC');

  // ── Filter modal ───────────────────────────────────────
  filterModalOpen     = signal(false);
  loadingVehicleNames = signal(false);
  loadingCategories   = signal(false);

  vehicleNamesList: FilterOption[] = [];
  categoryList:     FilterOption[] = [];

  // selectedVehicleNames → plain name strings ["Bike","Bus"]
  selectedVehicleNames: string[] = [];

  // selectedCategoryIds → numeric ID strings ["1","2"]
  // (opt.id from categoryList which maps LDV→1, MDV→2, HDV→3)
  selectedCategoryIds: string[] = [];

  vehicleNameDropOpen = false;
  categoryDropOpen    = false;

  get totalFilterCount(): number {
    return this.selectedVehicleNames.length + this.selectedCategoryIds.length;
  }

  constructor(
    private fb:      FormBuilder,
    private service: VehicletypeService
  ) {}

  ngOnInit(): void {
    this.buildForms();
    this.loadData();
  }

  // ── Forms ──────────────────────────────────────────────
  buildForms() {
    this.vehicleForm = this.fb.group({
      vehicle_type_id:   [''],
      vehicle_type_name: ['', Validators.required],
      categoryId:        ['', Validators.required],
      description:       ['']
    });

    this.searchForm = this.fb.group({ searchText: [''] });

    this.searchForm.get('searchText')!
      .valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadData();
      });
  }

  // ── Load table ─────────────────────────────────────────
  loadData() {
    const search = this.searchForm?.get('searchText')?.value ?? '';

    this.service.getPaged(
      this.currentPage(),
      this.pageSize(),
      search,
      this.onlyActive(),
      this.sortCol(),
      this.sortDir(),
      this.selectedCategoryIds.length  > 0 ? this.selectedCategoryIds  : undefined,
      this.selectedVehicleNames.length > 0 ? this.selectedVehicleNames : undefined
    ).subscribe({
      next: (res: any) => {
        const rows: VehicleType[] = (res.data ?? []).map((v: any) => ({
          vehicle_type_id:   v.vehicle_type_id,
          vehicle_type_name: v.vehicle_type_name,
          categoryName:      v.categoryName ?? '',
          description:       v.description  ?? '',
          isActive:          v.isActive,
          entryBy:           v.entryBy
        }));

        this.vehicleTypes.set(rows);
        this.totalRecords.set(res.totalRecords ?? rows.length);
        this.totalPages.set(res.totalPages     ?? 1);
      },
      error: (err: any) => {
        console.error('getPaged error:', err);
        this.showToast('Failed to load vehicle types', 'error');
      }
    });
  }

  // ── Sort ───────────────────────────────────────────────
  sort(column: string) {
    if (this.sortCol() === column) {
      this.sortDir.set(this.sortDir() === 'ASC' ? 'DESC' : 'ASC');
    } else {
      this.sortCol.set(column);
      this.sortDir.set('ASC');
    }
    this.currentPage.set(1);
    this.loadData();
  }

  getSortIcon(column: string): string {
    if (this.sortCol() !== column) return '↕';
    return this.sortDir() === 'ASC' ? '↑' : '↓';
  }

  // ── Pagination ─────────────────────────────────────────
  onPageSizeChange(event: Event) {
    this.pageSize.set(+(event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
    this.loadData();
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadData();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadData();
    }
  }

  // ── Active toggle ──────────────────────────────────────
  onActiveFilterChange(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.onlyActive.set(checked ? true : false);
    this.currentPage.set(1);
    this.loadData();
  }

  // ── Filter modal ───────────────────────────────────────
  openFilterModal() {
    this.filterModalOpen.set(true);
    this.vehicleNameDropOpen = false;
    this.categoryDropOpen    = false;
    this.loadFilterOptions();
  }

  closeFilterModal() {
    this.filterModalOpen.set(false);
  }

  applyFilter() {
    this.currentPage.set(1);
    this.closeFilterModal();
    this.loadData();
  }

  resetFilter() {
    this.selectedVehicleNames = [];
    this.selectedCategoryIds  = [];
    this.currentPage.set(1);
    this.closeFilterModal();
    this.loadData();
  }

  // ── Load filter options (from getAll) ──────────────────
  loadFilterOptions() {
    this.loadingVehicleNames.set(true);
    this.loadingCategories.set(true);

    this.service.getFilterOptions().subscribe({
      next: (res: any) => {
        this.vehicleNamesList = res.vehicleNames ?? [];
        this.categoryList     = res.categories   ?? [];
        this.loadingVehicleNames.set(false);
        this.loadingCategories.set(false);
      },
      error: () => {
        this.loadingVehicleNames.set(false);
        this.loadingCategories.set(false);
        this.showToast('Failed to load filter options', 'error');
      }
    });
  }

  // ── Vehicle Name helpers ───────────────────────────────
  toggleVehicleName(value: string) {
    const i = this.selectedVehicleNames.indexOf(value);
    if (i > -1) this.selectedVehicleNames.splice(i, 1);
    else        this.selectedVehicleNames.push(value);
    this.selectedVehicleNames = [...this.selectedVehicleNames];
  }

  isVehicleNameSelected(value: string): boolean {
    return this.selectedVehicleNames.includes(value);
  }

  toggleAllVehicleNames() {
    this.selectedVehicleNames =
      this.selectedVehicleNames.length === this.vehicleNamesList.length
        ? []
        : this.vehicleNamesList.map(x => x.value);
  }

  removeVehicleName(value: string) {
    this.selectedVehicleNames = this.selectedVehicleNames.filter(v => v !== value);
  }

  // ── Category helpers (uses opt.id = numeric string) ────
  toggleCategory(id: string) {
    const i = this.selectedCategoryIds.indexOf(id);
    if (i > -1) this.selectedCategoryIds.splice(i, 1);
    else        this.selectedCategoryIds.push(id);
    this.selectedCategoryIds = [...this.selectedCategoryIds];
  }

  isCategorySelected(id: string): boolean {
    return this.selectedCategoryIds.includes(id);
  }

  toggleAllCategories() {
    this.selectedCategoryIds =
      this.selectedCategoryIds.length === this.categoryList.length
        ? []
        : this.categoryList.map(x => x.id);
  }

  removeCategory(id: string) {
    this.selectedCategoryIds = this.selectedCategoryIds.filter(v => v !== id);
  }

  // Returns display label for a category id (used in chips)
  getCategoryLabel(id: string): string {
    return this.categoryList.find(x => x.id === id)?.value ?? id;
  }

  // ── CRUD ───────────────────────────────────────────────
  submit() {
    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      return;
    }

    const data     = this.vehicleForm.value;
    const isCreate = !data.vehicle_type_id || data.vehicle_type_id === '';
    const req$     = isCreate
      ? this.service.create(data)
      : this.service.update(data);

    req$.subscribe({
      next: () => {
        this.showToast(
          isCreate ? 'Vehicle Type created successfully' : 'Vehicle Type updated successfully',
          'success'
        );
        this.resetForm();
        this.loadData();
      },
      error: (err: any) => {
        if (err.status === 200 || err.status === 204) {
          this.showToast(
            isCreate ? 'Vehicle Type created successfully' : 'Vehicle Type updated successfully',
            'success'
          );
          this.resetForm();
          this.loadData();
          return;
        }
        this.showToast(isCreate ? 'Create failed' : 'Update failed', 'error');
      }
    });
  }

  edit(v: VehicleType) {
    this.vehicleForm.patchValue({
      vehicle_type_id:   v.vehicle_type_id,
      vehicle_type_name: v.vehicle_type_name,
      categoryId:        '',
      description:       v.description
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteUI(v: VehicleType) {
    Swal.fire({
      title: 'Are you sure?',
      text:  `Delete "${v.vehicle_type_name}"?`,
      icon:  'warning',
      showCancelButton:   true,
      confirmButtonText:  'Yes, Delete',
      confirmButtonColor: '#c92a2a'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.service.delete(v.vehicle_type_id).subscribe({
        next: () => { this.showToast('Deleted successfully', 'success'); this.loadData(); },
        error: (err: any) => {
          if (err.status === 200 || err.status === 204) {
            this.showToast('Deleted successfully', 'success'); this.loadData(); return;
          }
          this.showToast('Delete failed', 'error');
        }
      });
    });
  }

  toggleActive(v: VehicleType) {
    Swal.fire({
      title: `${v.isActive ? 'Deactivate' : 'Activate'} "${v.vehicle_type_name}"?`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.service.toggleActive(v.vehicle_type_id).subscribe({
        next: () => {
          this.vehicleTypes.update(list =>
            list.map(x => x.vehicle_type_id === v.vehicle_type_id
              ? { ...x, isActive: !x.isActive } : x)
          );
          this.showToast('Status updated', 'success');
        },
        error: (err: any) => {
          if (err.status === 200 || err.status === 204) {
            this.vehicleTypes.update(list =>
              list.map(x => x.vehicle_type_id === v.vehicle_type_id
                ? { ...x, isActive: !x.isActive } : x)
            );
            this.showToast('Status updated', 'success');
          }
        }
      });
    });
  }

  resetForm() {
    this.vehicleForm.reset({
      vehicle_type_id: '', vehicle_type_name: '',
      categoryId: '', description: ''
    });
  }

  showToast(title: string, icon: 'success' | 'error' = 'success') {
    Swal.fire({
      toast: true, position: 'top-end', icon, title,
      showConfirmButton: false, timer: 2500, timerProgressBar: true
    });
  }
}