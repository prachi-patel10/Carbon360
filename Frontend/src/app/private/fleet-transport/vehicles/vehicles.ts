import { Component, effect, OnInit, signal, WritableSignal } from '@angular/core';
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

  // ---------------- SIGNALS ----------------
  vehicles: WritableSignal<VehicleDto[]> = signal<VehicleDto[]>([]);
  vehicleTypes = signal<{ vehicle_type_id: string; vehicle_type_name: string }[]>([]);
  fuelTypes = signal<{ fuel_id: string; fuel_name: string }[]>([]);
  departments = signal<{ department_id: string; department_name: string }[]>([]);

  totalRecords = signal<number>(0);
  totalPages = signal<number>(1);
  pageNumber = signal<number>(1);
  pageSize = signal<number>(5);

  searchText = signal<string>('');
  activeFilter = signal<boolean>(false);

  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  sites = signal<{ siteId: string; siteName: string }[]>([]);
  selectedSiteIds: string[] = [];

  pageSizeOptions = [5, 10, 20, 50];

  vehicleNumberError = signal<string>('');
  vehicleFilterModalOpen: WritableSignal<boolean> = signal(false);

  selectedVehicleTypeIds: string[] = [];
  selectedFuelIds: string[] = [];
  appliedFuelIds: string[] = [];
  appliedVehicleTypeIds: string[] = [];

  // ----------------- FIXED VEHICLE FILTER SIGNAL -----------------
  vehicleFilter: WritableSignal<{
    vehicle_type_id: string[];
    fuel_id: string[];
    department_id: string[];
  }> = signal({
    vehicle_type_id: [],
    fuel_id: [],
    department_id: [],
  });

  newVehicle: WritableSignal<VehicleDto> = signal<VehicleDto>({
    vehicle_id: null,
    vehicle_number: '',
    vehicle_type_id: null as string | null,
    fuel_id: null as string | null,
    department_id: null as string | null,
    engine_capacity: null,
    emission_standard: null,
    isActive: true
  });

  isEditMode = signal<boolean>(false);

  constructor(private vehicleService: VehicleService) { }

  ngOnInit() {
    this.loadDropdowns();
    this.loadVehicles();

    effect(() => {
      this.activeFilter();
      this.pageNumber.set(1);
      this.loadVehicles();
    });
  }

  // ----------------- DROPDOWNS -----------------
  loadDropdowns() {
    this.vehicleService.getVehicleTypeList().subscribe((res: any[]) => {
      const mapped = (res || []).map(vt => ({
        vehicle_type_id: String(vt.vehicle_type_id),
        vehicle_type_name: vt.vehicle_type_name
      }));
      this.vehicleTypes.set(mapped);
    });

    this.vehicleService.getFuelList().subscribe((res: any[]) => {
      const mapped = (res || []).map(f => ({
        fuel_id: String(f.fuel_id),
        fuel_name: f.fuel_name
      }));
      this.fuelTypes.set(mapped);
    });

    this.vehicleService.getDepartmentList().subscribe((res: any) => {
      let deptArray: any[] = [];
      if (Array.isArray(res.data)) {
        deptArray = res.data;
      } else if (res.data) {
        deptArray = [res.data];
      }
      const mapped = deptArray.map((d: any) => ({
        department_id: String(d.id),
        department_name: d.departmentName
      }));
      this.departments.set(mapped);
    });
  }

  getVehicleTypeName(id: string | null) {
    if (!id) return '-';
    const vt = this.vehicleTypes().find(v => v.vehicle_type_id === id);
    return vt ? vt.vehicle_type_name : '-';
  }

  getFuelName(id: string | null) {
    if (!id) return '-';
    const f = this.fuelTypes().find(fuel => fuel.fuel_id === id);
    return f ? f.fuel_name : '-';
  }

  getDepartmentName(id: string | null) {
    if (!id) return '-';
    const d = this.departments().find(dep => dep.department_id === id);
    return d ? d.department_name : '-';
  }

  // ----------------- VEHICLE TABLE -----------------
  loadVehicles() {
    const filterData = this.vehicleFilter();

    const isActiveFilter: boolean | null = this.activeFilter() ? true : null;

    this.vehicleService
      .searchVehicles(
        this.searchText(),
        isActiveFilter,
        this.pageNumber(),
        this.pageSize(),
        this.sortColumn(),
        this.sortDirection(),
        filterData.vehicle_type_id.length ? filterData.vehicle_type_id.join(',') : undefined,
        filterData.fuel_id.length ? filterData.fuel_id.join(',') : undefined,
        filterData.department_id.length ? filterData.department_id.join(',') : undefined
      )
      .subscribe({
        next: (res: any) => {
          const data = res.data || [];
          this.vehicles.set(
            data.map((v: any) => ({
              vehicle_id: v.vehicle_id,
              vehicle_number: v.vehicle_number,
              vehicle_type_id: v.vehicle_type_id,
              vehicle_type_name: v.vehicle_type_name ?? this.getVehicleTypeName(v.vehicle_type_id),
              fuel_id: v.fuel_id,
              fuel_name: v.fuel_name ?? this.getFuelName(v.fuel_id),
              department_id: v.department_id,
              department_name: v.department_name ?? this.getDepartmentName(v.department_id),
              engine_capacity: v.engine_capacity,
              emission_standard: v.emission_standard,
              isActive: v.isActive === 1 || v.isActive === true
            }))
          );

          const totalRecords = res.totalRecords ?? data.length;
          const pageSize = this.pageSize();
          this.totalRecords.set(totalRecords);
          this.totalPages.set(Math.ceil(totalRecords / pageSize));
          this.pageNumber.set(res.currentPage ?? 1);
        },
        error: (err) => {
          console.error('Vehicle load error', err);
          this.vehicles.set([]);
          this.totalRecords.set(0);
          this.totalPages.set(1);
        }
      });
  }

  // ----------------- SEARCH -----------------
  search() {
    this.pageNumber.set(1);
    this.loadVehicles();
  }

  // ----------------- PAGINATION -----------------
  previousPage() {
    if (this.pageNumber() > 1) {
      this.pageNumber.update(n => n - 1);
      this.loadVehicles();
    }
  }

  nextPage() {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update(n => n + 1);
      this.loadVehicles();
    }
  }

  onPageSizeChange(event: any) {
    this.pageSize.set(Number(event.target.value));
    this.pageNumber.set(1);
    this.loadVehicles();
  }

  // ----------------- SORT -----------------
  sort(column: string) {
    const columnMap: any = {
      'engine': 'engine_capacity',
      'emission': 'emission_standard',
      'vehicle_type': 'vehicle_type_name',
      'fuel': 'fuel_name',
      'department': 'department_name',
      'status': 'isActive'
    };
    const backendColumn = columnMap[column] || column;

    if (this.sortColumn() === backendColumn) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(backendColumn);
      this.sortDirection.set('asc');
    }
    this.loadVehicles();
  }

  // ----------------- CREATE / UPDATE -----------------
  saveVehicle() {
    const raw = this.newVehicle();

    if (!raw.vehicle_number?.trim()) { this.showToast('Error', 'Vehicle number is required!', 'error'); return; }
    if (!raw.emission_standard?.trim()) { this.showToast('Error', 'Emission standard is required!', 'error'); return; }
    if (!raw.vehicle_type_id) { this.showToast('Error', 'Select vehicle type!', 'error'); return; }
    if (!raw.fuel_id) { this.showToast('Error', 'Select fuel type!', 'error'); return; }
    if (!raw.department_id) { this.showToast('Error', 'Select department!', 'error'); return; }
    if (!raw.engine_capacity && raw.engine_capacity !== 0) { this.showToast('Error', 'Engine capacity is required!', 'error'); return; }

    const payload = this.isEditMode()
      ? {
        vehicle_id: raw.vehicle_id!,
        vehicle_number: raw.vehicle_number.trim(),
        vehicle_type_id: raw.vehicle_type_id!,
        fuel_id: raw.fuel_id!,
        department_id: raw.department_id!,
        engine_capacity: raw.engine_capacity != null ? Number(raw.engine_capacity) : null,
        emission_standard: raw.emission_standard!.trim(),
        IsActive: raw.isActive ?? true
      }
      : {
        vehicle_number: raw.vehicle_number.trim(),
        vehicle_type_id: raw.vehicle_type_id!,
        fuel_id: raw.fuel_id!,
        department_id: raw.department_id!,
        engine_capacity: raw.engine_capacity != null ? Number(raw.engine_capacity) : null,
        emission_standard: raw.emission_standard!.trim(),
        IsActive: raw.isActive ?? true
      };

    const request$ = this.isEditMode()
      ? this.vehicleService.updateVehicle(payload)
      : this.vehicleService.createVehicle(payload);

    request$.subscribe({
      next: () => {
        this.showToast(this.isEditMode() ? 'Updated' : 'Created',
          `Vehicle ${this.isEditMode() ? 'updated' : 'created'} successfully!`,
          'success');
        this.resetForm();
        this.loadVehicles();
      },
      error: err => {
        console.error('Vehicle save error', err);
        this.showToast('Error', 'Failed to save vehicle', 'error');
      }
    });
  }

  editVehicle(vehicle: VehicleDto) {
    this.isEditMode.set(true);
    this.newVehicle.set({
      ...vehicle,
      vehicle_type_id: String(vehicle.vehicle_type_id),
      fuel_id: String(vehicle.fuel_id),
      department_id: String(vehicle.department_id)
    });
  }

  resetForm() {
    this.isEditMode.set(false);
    this.newVehicle.set({
      vehicle_id: null,
      vehicle_number: '',
      vehicle_type_id: null,
      fuel_id: null,
      department_id: null,
      engine_capacity: null,
      emission_standard: null,
      isActive: true,
    });
  }

  deleteVehicle(vehicle: VehicleDto) {
    if (!vehicle.vehicle_id) return;

    Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the record!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(result => {
      if (result.isConfirmed) {
        this.vehicleService.deleteVehicle(vehicle.vehicle_id!.toString()).subscribe(() => {
          this.showToast('Deleted', 'Vehicle deleted successfully!', 'success');
          this.vehicles.update(arr => arr.filter(v => v.vehicle_id !== vehicle.vehicle_id));
        });
      }
    });
  }

  toggleStatus(vehicle: VehicleDto) {
    const originalStatus = vehicle.isActive;
    const newStatus = !originalStatus;

    Swal.fire({
      title: 'Are you sure?',
      text: `Set vehicle as ${newStatus ? 'Active' : 'Inactive'}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes',
    }).then(result => {
      if (!result.isConfirmed) return;

      this.vehicleService.updateVehicleStatus(vehicle.vehicle_id!, newStatus)
        .subscribe({
          next: () => {
            this.vehicles.update(arr =>
              arr.map(v => v.vehicle_id === vehicle.vehicle_id ? { ...v, isActive: newStatus } : v)
            );
            this.showToast('Status Updated', `Vehicle is now ${newStatus ? 'Active' : 'Inactive'}!`, 'success');
          },
          error: () => {
            this.vehicles.update(arr =>
              arr.map(v => v.vehicle_id === vehicle.vehicle_id ? { ...v, isActive: originalStatus } : v)
            );
            this.showToast('Error', 'Failed to update status', 'error');
          }
        });
    });
  }

  validateVehicleNumber(): boolean {
    const vehicleNo = this.newVehicle().vehicle_number?.trim();
    if (!vehicleNo) {
      this.vehicleNumberError.set('Vehicle Number is required');
      return false;
    }
    const regex = /^[A-Z]{2}-?\d{2}-?[A-Z]{2}-?\d{4}$/;
    if (!regex.test(vehicleNo)) {
      this.vehicleNumberError.set('Invalid format. Example: DL12AB1234');
      return false;
    }
    this.vehicleNumberError.set('');
    return true;
  }

  onVehicleNumberChange(value: string) {
    const upper = (value || '').toUpperCase();
    this.newVehicle.update(v => ({ ...v, vehicle_number: upper }));
    this.validateVehicleNumber();
  }

  // ----------------- FILTER -----------------
  isDepartmentSelected(id: string) {
    return this.vehicleFilter().department_id.includes(id);
  }

  resetFilter() {
    this.vehicleFilter.set({ vehicle_type_id: [], fuel_id: [], department_id: [] });
    this.applyFilter();
  }

  toggleFuel(id: string) {
    this.selectedFuelIds.includes(id)
      ? this.selectedFuelIds = this.selectedFuelIds.filter(x => x !== id)
      : this.selectedFuelIds.push(id);

    this.vehicleFilter.update((f: any) => ({ ...f, fuel_id: this.selectedFuelIds }));
  }

  toggleVehicleType(id: string) {
    this.selectedVehicleTypeIds.includes(id)
      ? this.selectedVehicleTypeIds = this.selectedVehicleTypeIds.filter(x => x !== id)
      : this.selectedVehicleTypeIds.push(id);

    this.vehicleFilter.update((f: any) => ({ ...f, vehicle_type_id: this.selectedVehicleTypeIds }));
  }

  toggleSite(id: string) {
    this.selectedSiteIds.includes(id)
      ? this.selectedSiteIds = this.selectedSiteIds.filter(x => x !== id)
      : this.selectedSiteIds.push(id);

    this.vehicleFilter.update((f: any) => ({ ...f, department_id: this.selectedSiteIds }));
  }

  applyFilter() {
    this.pageNumber.set(1);
    this.loadVehicles();
   // this.closeFilterModal();
  }

  resetFilterModal() {
    this.selectedVehicleTypeIds = [];
    this.selectedFuelIds = [];
    this.vehicleFilter.set({ vehicle_type_id: [], fuel_id: [], department_id: [] });
  }

  showToast(title: string, text: string, icon: 'success' | 'error' = 'success') {
    Swal.fire({ icon, title, text, toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
  }

  // ----------------- MODAL -----------------

  // ----------------- MODAL -----------------
openVehicleFilter() {
  this.vehicleFilterModalOpen.set(true);
}

closeVehicleFilter() {
  this.vehicleFilterModalOpen.set(false);
}

  isVehicleTypeSelected(id: string) {
    return this.vehicleFilter().vehicle_type_id.includes(id);
  }

  isFuelTypeSelected(id: string) {
    return this.vehicleFilter().fuel_id.includes(id);
  }

  applyVehicleFilter() {
  this.vehicleFilterModalOpen.set(false);  // ✅ correct
  this.appliedFuelIds = [...this.selectedFuelIds];
  this.appliedVehicleTypeIds = [...this.selectedVehicleTypeIds];
  this.pageNumber.set(1);
  this.loadVehicles();
}

  resetVehicleFilter() {
    this.selectedFuelIds = [];
    this.selectedVehicleTypeIds = [];
  }

  get vehicleTypesList() { return this.vehicleTypes(); }
  get fuelTypesList() { return this.fuelTypes(); }

  toggleVehicleFuel(fuelId: string) {
  if (this.selectedFuelIds.includes(fuelId)) {
    this.selectedFuelIds = this.selectedFuelIds.filter(id => id !== fuelId);
  } else {
    this.selectedFuelIds.push(fuelId);
  }

  this.vehicleFilter.update(f => ({
    ...f,
    fuel_id: this.selectedFuelIds
  }));
}

}