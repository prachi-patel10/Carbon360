import { Component, effect, HostListener, OnInit, signal, WritableSignal } from '@angular/core';
import { VehicleService } from './vehicle-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

export interface VehicleDto {
  vehicle_id?: string | null;
  vehicle_number: string;
  vehicle_type_id: string | null;
  vehicle_type_name?: string | null;
  fuel_id: string | null;
  fuel_name?: string | null;
  department_id: string | null;
  department_name?: string | null;
  engine_capacity?: number | null;
  emission_standard?: string | null;
  isActive: boolean;
}

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicles.html',
  styleUrls: ['./vehicles.css'],
})
export class Vehicles implements OnInit {

  // ── Signals ──────────────────────────────────────────────────
  vehicles: WritableSignal<VehicleDto[]> = signal<VehicleDto[]>([]);
  vehicleTypes  = signal<{ vehicle_type_id: string; vehicle_type_name: string }[]>([]);
  fuelTypes     = signal<{ fuel_id: string; fuel_name: string }[]>([]);
  departments   = signal<{ department_id: string; department_name: string }[]>([]);

  totalRecords  = signal<number>(0);
  totalPages    = signal<number>(1);
  pageNumber    = signal<number>(1);
  pageSize      = signal<number>(5);
  searchText    = signal<string>('');
  activeFilter  = signal<boolean | undefined>(true);
  sortColumn    = signal<string>('vehicle_number');
  sortDirection = signal<'asc' | 'desc'>('asc');

  vehicleNumberError      = signal<string>('');
  vehicleFilterModalOpen: WritableSignal<boolean> = signal(false);
  isEditMode              = signal<boolean>(false);

  // ── Dropdown loading states ───────────────────────────────────
  loadingFuelTypes     = signal<boolean>(false);   // ← NEW
  loadingVehicleTypes  = signal<boolean>(false);   // ← NEW
  loadingDepartments   = signal<boolean>(false);   // ← NEW

  pageSizeOptions = [5, 10, 20, 50];

  // ── Filter state ──────────────────────────────────────────────
  selectedFuelIds:        string[] = [];
  selectedVehicleTypeIds: string[] = [];

  fuelDropOpen  = false;
  vtypeDropOpen = false;

  vehicleFilter: WritableSignal<{
    vehicle_type_id: string[];
    fuel_id: string[];
    department_id: string[];
  }> = signal({ vehicle_type_id: [], fuel_id: [], department_id: [] });

  sites           = signal<{ siteId: string; siteName: string }[]>([]);
  selectedSiteIds: string[] = [];

  newVehicle: WritableSignal<VehicleDto> = signal<VehicleDto>({
    vehicle_id: null,
    vehicle_number: '',
    vehicle_type_id: null,
    fuel_id: null,
    department_id: null,
    engine_capacity: null,
    emission_standard: null,
    isActive: true
  });

  constructor(private vehicleService: VehicleService) { }

  ngOnInit() {
    this.loadDropdowns();
    this.loadVehicles();
  }

  // ── Close modal dropdowns when clicking outside ───────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.vf-modal')) {
      this.fuelDropOpen  = false;
      this.vtypeDropOpen = false;
    }
  }

  onFormActiveChange(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.newVehicle.update(v => ({ ...v, isActive: checked }));
  }

  // ── Dropdowns — call API every time modal opens ───────────────
  loadDropdowns() {
    // Vehicle Types
    this.loadingVehicleTypes.set(true);
    this.vehicleService.getVehicleTypeList().subscribe({
      next: (res: any) => {
        const arr = Array.isArray(res) ? res : res.data || [];
        this.vehicleTypes.set(arr.map((vt: any) => ({
          vehicle_type_id:   String(vt.vehicle_type_id),
          vehicle_type_name: vt.vehicle_type_name || ''
        })));
        this.loadingVehicleTypes.set(false);
      },
      error: () => this.loadingVehicleTypes.set(false)
    });

    // Fuel Types
    this.loadingFuelTypes.set(true);
    this.vehicleService.getFuelList().subscribe({
      next: (res: any) => {
        const arr = Array.isArray(res) ? res : res.data || [];
        this.fuelTypes.set(arr.map((f: any) => ({
          fuel_id:   String(f.fuel_id),
          fuel_name: f.fuel_name || ''
        })));
        this.loadingFuelTypes.set(false);
      },
      error: () => this.loadingFuelTypes.set(false)
    });

    // Departments
    this.loadingDepartments.set(true);
    this.vehicleService.getDepartmentList().subscribe({
      next: (res: any) => {
        const arr = Array.isArray(res.data) ? res.data : res.data ? [res.data] : Array.isArray(res) ? res : [];
        this.departments.set(arr.map((d: any) => ({
          department_id:   String(d.department_id || d.id),
          department_name: d.departmentName || d.department_name || ''
        })));
        this.loadingDepartments.set(false);
      },
      error: () => this.loadingDepartments.set(false)
    });
  }

  getVehicleTypeName(id: string | null): string {
    if (!id) return '-';
    return this.vehicleTypes().find(v => v.vehicle_type_id === id)?.vehicle_type_name ?? '-';
  }

  getFuelName(id: string | null): string {
    if (!id) return '-';
    return this.fuelTypes().find(f => f.fuel_id === id)?.fuel_name ?? '-';
  }

  getDepartmentName(id: string | null): string {
    if (!id) return '-';
    return this.departments().find(d => d.department_id === id)?.department_name ?? '-';
  }

  // ── Load vehicles ─────────────────────────────────────────────
  loadVehicles() {
    const f      = this.vehicleFilter();
    const active = this.activeFilter();
    const isActiveFilter: boolean | null = active === undefined ? null : active;

    this.vehicleService.searchVehicles(
      this.searchText(),
      isActiveFilter,
      this.pageNumber(),
      this.pageSize(),
      this.sortColumn(),
      this.sortDirection(),
      f.vehicle_type_id.length ? f.vehicle_type_id.join(',') : undefined,
      f.fuel_id.length         ? f.fuel_id.join(',')         : undefined,
      f.department_id.length   ? f.department_id.join(',')   : undefined
    ).subscribe({
      next: (res: any) => {
        this.vehicles.set(res.data || []);
        this.totalRecords.set(res.totalRecords ?? res.data?.length ?? 0);
        this.totalPages.set(res.totalPages ?? Math.ceil((res.totalRecords ?? 0) / this.pageSize()));
        this.pageNumber.set(res.currentPage ?? this.pageNumber());
      },
      error: (err) => {
        console.error('Vehicle load error', err);
        this.vehicles.set([]); this.totalRecords.set(0); this.totalPages.set(1);
      }
    });
  }

  // ── Search ────────────────────────────────────────────────────
  search() { this.pageNumber.set(1); this.loadVehicles(); }

  onActiveFilterChange(event: any) {
    const checked = (event.target as HTMLInputElement).checked;
    this.activeFilter.set(checked);
    this.pageNumber.set(1);
    this.loadVehicles();                                     // ← direct call, no effect()
  }

  // ── Pagination ────────────────────────────────────────────────
  previousPage() {
    if (this.pageNumber() > 1) { this.pageNumber.update(n => n - 1); this.loadVehicles(); }
  }

  nextPage() {
    if (this.pageNumber() < this.totalPages()) { this.pageNumber.update(n => n + 1); this.loadVehicles(); }
  }

  onPageSizeChange(event: any) {
    this.pageSize.set(Number(event.target.value)); this.pageNumber.set(1); this.loadVehicles();
  }

  // ── Sort ──────────────────────────────────────────────────────
  sort(column: string) {
    const map: any = {
      vehicle_number: 'vehicle_number', vehicle_type_name: 'vehicle_type_name',
      fuel_name: 'fuel_name',           department_name: 'department_name',
      engine_capacity: 'engine_capacity', emission_standard: 'emission_standard',
      isActive: 'isActive'
    };
    const col = map[column] || column;
    if (this.sortColumn() === col)
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    else { this.sortColumn.set(col); this.sortDirection.set('asc'); }
    this.loadVehicles();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn() !== column) return '↕';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  // ── Save / Edit ───────────────────────────────────────────────
  saveVehicle() {
    if (!this.validateVehicleNumber()) { this.showToast('Error', 'Invalid Vehicle Number format', 'error'); return; }
    const raw = this.newVehicle();
    if (!raw.vehicle_number?.trim())    { this.showToast('Error', 'Vehicle number is required!', 'error'); return; }
    if (!raw.emission_standard?.trim()) { this.showToast('Error', 'Emission standard is required!', 'error'); return; }
    if (!raw.vehicle_type_id)           { this.showToast('Error', 'Select vehicle type!', 'error'); return; }
    if (!raw.fuel_id)                   { this.showToast('Error', 'Select fuel type!', 'error'); return; }
    if (!raw.department_id)             { this.showToast('Error', 'Select department!', 'error'); return; }
    if (!raw.engine_capacity && raw.engine_capacity !== 0) { this.showToast('Error', 'Engine capacity is required!', 'error'); return; }

    const payload = this.isEditMode()
      ? { vehicle_id: raw.vehicle_id!, vehicle_number: raw.vehicle_number.trim(),
          vehicle_type_id: raw.vehicle_type_id, fuel_id: raw.fuel_id, department_id: raw.department_id,
          engine_capacity: raw.engine_capacity, emission_standard: raw.emission_standard?.trim(), isActive: raw.isActive ?? true }
      : { vehicle_number: raw.vehicle_number.trim(), vehicle_type_id: raw.vehicle_type_id,
          fuel_id: raw.fuel_id, department_id: raw.department_id, engine_capacity: raw.engine_capacity,
          emission_standard: raw.emission_standard?.trim(), isActive: raw.isActive ?? true };

    const req$ = this.isEditMode()
      ? this.vehicleService.updateVehicle(payload)
      : this.vehicleService.createVehicle(payload);

    req$.subscribe({
      next: () => {
        this.showToast(this.isEditMode() ? 'Updated' : 'Created',
          `Vehicle ${this.isEditMode() ? 'updated' : 'created'} successfully!`, 'success');
        this.resetForm(); this.loadVehicles();
      },
      error: err => { console.error(err); this.showToast('Error', 'Failed to save vehicle', 'error'); }
    });
  }

  editVehicle(vehicle: VehicleDto) {
    this.isEditMode.set(true);
    this.newVehicle.set({
      ...vehicle,
      vehicle_type_id: vehicle.vehicle_type_id?.toString() || null,
      fuel_id:         vehicle.fuel_id?.toString()         || null,
      department_id:   vehicle.department_id?.toString()   || null
    });
  }

  resetForm() {
    this.isEditMode.set(false);
    this.newVehicle.set({ vehicle_id: null, vehicle_number: '', vehicle_type_id: null,
      fuel_id: null, department_id: null, engine_capacity: null, emission_standard: null, isActive: true });
  }

  // ── Delete ────────────────────────────────────────────────────
  deleteVehicle(vehicle: VehicleDto) {
    if (!vehicle.vehicle_id) return;
    Swal.fire({ title: 'Are you sure?', text: 'This will delete the record!', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Delete' }).then(result => {
      if (result.isConfirmed) {
        this.vehicleService.deleteVehicle(vehicle.vehicle_id!.toString()).subscribe({
          next: () => {
            this.showToast('Deleted', 'Vehicle deleted successfully!', 'success');
            if (this.vehicles().length === 1 && this.pageNumber() > 1) this.pageNumber.update(p => p - 1);
            this.loadVehicles();
          },
          error: (err) => {
            if (err.status === 200 || err.status === 204) {
              this.showToast('Deleted', 'Vehicle deleted successfully!', 'success');
              if (this.vehicles().length === 1 && this.pageNumber() > 1) this.pageNumber.update(p => p - 1);
              this.loadVehicles(); return;
            }
            this.showToast('Error', 'Delete failed', 'error');
          }
        });
      }
    });
  }

  // ── Status toggle ─────────────────────────────────────────────
  toggleStatus(vehicle: VehicleDto) {
    const newStatus = !vehicle.isActive;
    Swal.fire({ title: 'Are you sure?', text: `Set vehicle as ${newStatus ? 'Active' : 'Inactive'}?`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes' }).then(result => {
      if (!result.isConfirmed) return;
      this.vehicleService.updateVehicleStatus(vehicle.vehicle_id!, newStatus).subscribe({
        next: () => {
          this.vehicles.update(arr => arr.map(v =>
            v.vehicle_id === vehicle.vehicle_id ? { ...v, isActive: newStatus } : v));
          this.showToast('Status Updated', `Vehicle is now ${newStatus ? 'Active' : 'Inactive'}!`, 'success');
        },
        error: () => {
          this.vehicles.update(arr => arr.map(v =>
            v.vehicle_id === vehicle.vehicle_id ? { ...v, isActive: vehicle.isActive } : v));
          this.showToast('Error', 'Failed to update status', 'error');
        }
      });
    });
  }

  // ── Validation ────────────────────────────────────────────────
  validateVehicleNumber(): boolean {
    const v = this.newVehicle().vehicle_number?.trim();
    if (!v) { this.vehicleNumberError.set('Vehicle Number is required'); return false; }
    const regex = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
    if (!regex.test(v)) { this.vehicleNumberError.set('Invalid format. Example: DL12AB1234'); return false; }
    this.vehicleNumberError.set(''); return true;
  }

  onVehicleNumberChange(value: string) {
    const upper = (value || '').toUpperCase();
    this.newVehicle.update(v => ({ ...v, vehicle_number: upper }));
    this.validateVehicleNumber();
  }

  // ── Toast ─────────────────────────────────────────────────────
  showToast(title: string, text: string, icon: 'success' | 'error' = 'success') {
    Swal.fire({ icon, title, text, toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
  }

  // ── Modal open / close ────────────────────────────────────────
  openVehicleFilter() {
    // Sync UI selections with currently applied filter
    this.selectedFuelIds        = [...this.vehicleFilter().fuel_id];
    this.selectedVehicleTypeIds = [...this.vehicleFilter().vehicle_type_id];
    // ← Reload dropdowns fresh from API every time modal opens
    this.loadDropdowns();
    this.vehicleFilterModalOpen.set(true);
  }

  closeVehicleFilter() {
    this.fuelDropOpen  = false;
    this.vtypeDropOpen = false;
    this.vehicleFilterModalOpen.set(false);
  }

  // ── Toggle individual items ───────────────────────────────────
  toggleFuel(id: string) {
    this.selectedFuelIds = this.selectedFuelIds.includes(id)
      ? this.selectedFuelIds.filter(x => x !== id)
      : [...this.selectedFuelIds, id];
  }

  toggleVehicleType(id: string) {
    this.selectedVehicleTypeIds = this.selectedVehicleTypeIds.includes(id)
      ? this.selectedVehicleTypeIds.filter(x => x !== id)
      : [...this.selectedVehicleTypeIds, id];
  }

  // ── Toggle all ────────────────────────────────────────────────
  toggleAllFuels() {
    this.selectedFuelIds = this.selectedFuelIds.length === this.fuelTypesList.length
      ? []
      : this.fuelTypesList.map(f => f.fuel_id);
  }

  toggleAllVehicleTypes() {
    this.selectedVehicleTypeIds = this.selectedVehicleTypeIds.length === this.vehicleTypesList.length
      ? []
      : this.vehicleTypesList.map(vt => vt.vehicle_type_id);
  }

  // ── Apply / Reset ─────────────────────────────────────────────
  applyVehicleFilter() {
    // ← Commit selections into vehicleFilter signal THEN reload
    this.vehicleFilter.set({
      fuel_id:         [...this.selectedFuelIds],
      vehicle_type_id: [...this.selectedVehicleTypeIds],
      department_id:   this.vehicleFilter().department_id
    });
    this.pageNumber.set(1);
    this.closeVehicleFilter();                               // ← close modal first
    this.loadVehicles();                                     // ← then reload with new filter
  }

  resetVehicleFilter() {
    this.selectedFuelIds        = [];
    this.selectedVehicleTypeIds = [];
    this.vehicleFilter.set({ vehicle_type_id: [], fuel_id: [], department_id: [] });
    this.pageNumber.set(1);
    this.closeVehicleFilter();                               // ← close modal
    this.loadVehicles();                                     // ← reload with cleared filter
  }

  // ── Legacy helpers ────────────────────────────────────────────
  applyFilter()      { this.pageNumber.set(1); this.loadVehicles(); }
  resetFilter()      { this.vehicleFilter.set({ vehicle_type_id: [], fuel_id: [], department_id: [] }); this.applyFilter(); }
  resetFilterModal() { this.selectedVehicleTypeIds = []; this.selectedFuelIds = []; this.vehicleFilter.set({ vehicle_type_id: [], fuel_id: [], department_id: [] }); }
  isDepartmentSelected(id: string) { return this.vehicleFilter().department_id.includes(id); }
  isVehicleTypeSelected(id: string) { return this.vehicleFilter().vehicle_type_id.includes(id); }
  isFuelTypeSelected(id: string)   { return this.vehicleFilter().fuel_id.includes(id); }

  toggleSite(id: string) {
    this.selectedSiteIds.includes(id)
      ? this.selectedSiteIds = this.selectedSiteIds.filter(x => x !== id)
      : this.selectedSiteIds.push(id);
    this.vehicleFilter.update((f: any) => ({ ...f, department_id: this.selectedSiteIds }));
  }

  get vehicleTypesList() { return this.vehicleTypes(); }
  get fuelTypesList()    { return this.fuelTypes(); }
}