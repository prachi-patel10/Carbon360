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
activeFilter = signal<boolean | undefined>(true);

  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  sites = signal<{ siteId: string; siteName: string }[]>([]);
  selectedSiteIds: string[] = [];

  pageSizeOptions = [5, 10, 20, 50];

  vehicleNumberError = signal<string>('');
  vehicleFilterModalOpen: WritableSignal<boolean> = signal(false);

  // selectedFuelIds: WritableSignal<string[]> = signal([]);
  // selectedVehicleTypeIds: WritableSignal<string[]> = signal([]);

  selectedFuelIds: string[] = [];
  selectedVehicleTypeIds: string[] = [];

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
      const active = this.activeFilter();
      this.pageNumber.set(1);
      this.loadVehicles();
    });
  }

  onFormActiveChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  this.newVehicle.update(v => ({ ...v, isActive: checked }));
}

  // ----------------- DROPDOWNS -----------------
  loadDropdowns() {
    // Vehicle Types
    this.vehicleService.getVehicleTypeList().subscribe((res: any[]) => {
      const mapped = (res || []).map(vt => ({
        vehicle_type_id:vt.vehicle_type_id,  // <--- string
        vehicle_type_name: vt.vehicle_type_name || ''
      }));
      this.vehicleTypes.set(mapped);
    });

    // Fuel Types
    this.vehicleService.getFuelList().subscribe((res: any[]) => {
      const mapped = (res || []).map(f => ({
        //fuel_id: f.id?.toString() || '',          // <--- string
        fuel_id: f.fuel_id,
        fuel_name: f.fuel_name || ''
      }));
      this.fuelTypes.set(mapped);
    });

    // Departments
    this.vehicleService.getDepartmentList().subscribe((res: any) => {
      let deptArray: any[] = [];
      if (Array.isArray(res.data)) {
        deptArray = res.data;
      } else if (res.data) {
        deptArray = [res.data];
      }
      const mapped = deptArray.map(d => ({
        //department_id: d.id?.toString() || '',     // <--- string
        //department_id: d.department_id,
        //department_id: String(d.department_id),
        department_id: d.department_id || d.id,
        department_name: d.departmentName || ''
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
  // loadVehicles() {
  //   const filterData = this.vehicleFilter();

  //   const isActiveFilter: boolean | null = this.activeFilter() ? true : null;

  //   this.vehicleService
  //     .searchVehicles(
  //       this.searchText(),
  //       isActiveFilter,
  //       this.pageNumber(),
  //       this.pageSize(),
  //       this.sortColumn(),
  //       this.sortDirection(),
  //       filterData.vehicle_type_id.length ? filterData.vehicle_type_id.map(x => Number(x)).join(',') : undefined,
  //       filterData.fuel_id.length ? filterData.fuel_id.map(x => Number(x)).join(',') : undefined,
  //       filterData.department_id.length ? filterData.department_id.map(x => Number(x)).join(',') : undefined
  //     )
  //     .subscribe({
  //       next: (res: any) => {
  //         const data = res.data || [];
  //         this.vehicles.set(
  //           data.map((v: any) => ({
  //             vehicle_id: v.vehicle_id,
  //             vehicle_number: v.vehicle_number,
  //             vehicle_type_id: v.vehicle_type_id,
  //             vehicle_type_name: v.vehicle_type_name ?? this.getVehicleTypeName(v.vehicle_type_id),
  //             fuel_id: v.fuel_id,
  //             fuel_name: v.fuel_name ?? this.getFuelName(v.fuel_id),
  //             department_id: v.department_id,
  //             department_name: v.department_name ?? this.getDepartmentName(v.department_id),
  //             engine_capacity: v.engine_capacity,
  //             emission_standard: v.emission_standard,
  //             isActive: v.isActive === 1 || v.isActive === true
  //           }))
  //         );

  //         const totalRecords = res.totalRecords ?? data.length;
  //         const pageSize = this.pageSize();
  //         this.totalRecords.set(totalRecords);
  //         this.totalPages.set(Math.ceil(totalRecords / pageSize));
  //         this.pageNumber.set(res.currentPage ?? 1);
  //       },
  //       error: (err) => {
  //         console.error('Vehicle load error', err);
  //         this.vehicles.set([]);
  //         this.totalRecords.set(0);
  //         this.totalPages.set(1);
  //       }
  //     });
  // }

  // Load vehicles
  loadVehicles() {
      const filterData = this.vehicleFilter();
  const active = this.activeFilter();
     const isActiveFilter: boolean | null = active === undefined ? null : active;

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
          this.vehicles.set(res.data || []);
          this.totalRecords.set(res.totalRecords ?? res.data.length);
          this.totalPages.set(Math.ceil((res.totalRecords ?? res.data.length) / this.pageSize()));
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

onActiveFilterChange(event: any) {
  const checked = event.target.checked;
  this.activeFilter.set(checked ? true : false);  // true=active, false=inactive
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
    vehicle_number: 'vehicle_number',
    vehicle_type_name: 'vehicle_type_name',
    fuel_name: 'fuel_name',
    department_name: 'department_name'   ,// ✅ CORRECT
    engine_capacity: 'engine_capacity',
    emission_standard: 'emission_standard',
    isActive: 'isActive'
  };

  const backendColumn = columnMap[column] || column;

  if (this.sortColumn() === backendColumn) {
    this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
  } else {
    this.sortColumn.set(backendColumn);
    this.sortDirection.set('asc');
  }
console.log('SORT:', this.sortColumn(), this.sortDirection());
  this.loadVehicles();
}
  // ----------------- CREATE / UPDATE -----------------
  saveVehicle() {

    // ✅ Vehicle number format validation
  if (!this.validateVehicleNumber()) {
    this.showToast('Error', 'Invalid Vehicle Number format', 'error');
    return;
  }
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
    vehicle_type_id: raw.vehicle_type_id,
    fuel_id: raw.fuel_id,
    department_id: raw.department_id,
    engine_capacity: raw.engine_capacity,
    emission_standard: raw.emission_standard?.trim(),
    isActive: raw.isActive ?? true
  }
  : {
    vehicle_number: raw.vehicle_number.trim(),
    vehicle_type_id: raw.vehicle_type_id,
    fuel_id: raw.fuel_id,
    department_id: raw.department_id,
    engine_capacity: raw.engine_capacity,
    emission_standard: raw.emission_standard?.trim(),
    isActive: raw.isActive ?? true
  };

  

    // const payload = this.isEditMode()
    //   ? {
    //     vehicle_id: raw.vehicle_id!,
    //     vehicle_number: raw.vehicle_number.trim(),
    //     vehicle_type_id: Number(raw.vehicle_type_id), // convert to number here
    //     fuel_id: Number(raw.fuel_id),
    //     department_id: Number(raw.department_id),
    //     engine_capacity: raw.engine_capacity != null ? Number(raw.engine_capacity) : null,
    //     emission_standard: raw.emission_standard!.trim(),
    //     IsActive: raw.isActive ?? true
    //   }
    //   : {
    //     vehicle_number: raw.vehicle_number.trim(),
    //     vehicle_type_id: Number(raw.vehicle_type_id), // convert to number here
    //     fuel_id: Number(raw.fuel_id),
    //     department_id: Number(raw.department_id),
    //     engine_capacity: raw.engine_capacity != null ? Number(raw.engine_capacity) : null,
    //     emission_standard: raw.emission_standard!.trim(),
    //     IsActive: raw.isActive ?? true
    //   };

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
        console.error('API message:', err?.error);
        this.showToast('Error', 'Failed to save vehicle', 'error');
      }
    });
  }

  editVehicle(vehicle: VehicleDto) {
    this.isEditMode.set(true);
    this.newVehicle.set({
      ...vehicle,
      vehicle_type_id: vehicle.vehicle_type_id?.toString() || null,
      fuel_id: vehicle.fuel_id?.toString() || null,
      department_id: vehicle.department_id?.toString() || null
    });
  }
  getSortIcon(column: string): string {
  if (this.sortColumn() !== column) return '↕';
  return this.sortDirection() === 'asc' ? '↑' : '↓';
}

  resetForm() {
    this.isEditMode.set(false);
    this.newVehicle.set({
      vehicle_id: null,
      vehicle_number: '',
      vehicle_type_id: null,
      fuel_id: null,
      department_id: null,
      //department_id: null,
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
    confirmButtonText: 'Delete'
  }).then(result => {

    if (result.isConfirmed) {

      this.vehicleService.deleteVehicle(vehicle.vehicle_id!.toString())
        .subscribe({

          next: () => {

            // ✅ SUCCESS
            this.showToast('Deleted', 'Vehicle deleted successfully!', 'success');

            // pagination fix (same as your logic)
            if (this.vehicles().length === 1 && this.pageNumber() > 1) {
              this.pageNumber.update(p => p - 1);
            }

            this.loadVehicles();
          },

          error: (err) => {

            console.log("DELETE ERROR:", err);

            // ⚠️ some APIs return 204 → Angular treats as error
            if (err.status === 200 || err.status === 204) {

              this.showToast('Deleted', 'Vehicle deleted successfully!', 'success');

              if (this.vehicles().length === 1 && this.pageNumber() > 1) {
                this.pageNumber.update(p => p - 1);
              }

              this.loadVehicles();
              return;
            }

            // ❌ real error
            this.showToast('Error', 'Delete failed', 'error');
          }

        });

    }

  });

}

//   deleteVehicle(vehicle: VehicleDto) {
//   if (!vehicle.vehicle_id) return;

//   Swal.fire({
//     title: 'Are you sure?',
//     text: 'This will delete the record!',
//     icon: 'warning',
//     showCancelButton: true,
//     confirmButtonText: 'Delete',
//   }).then(result => {
//     if (result.isConfirmed) {

//       this.vehicleService.deleteVehicle(vehicle.vehicle_id!.toString()).subscribe(() => {

//         this.showToast('Deleted', 'Vehicle deleted successfully!', 'success');

//         // ⭐ FIX
//         if (this.vehicles().length === 1 && this.pageNumber() > 1) {
//           this.pageNumber.update(p => p - 1);
//         }

//         this.loadVehicles();

//       });

//     }
//   });
// }
  // deleteVehicle(vehicle: VehicleDto) {
  //   if (!vehicle.vehicle_id) return;

  //   Swal.fire({
  //     title: 'Are you sure?',
  //     text: 'This will delete the record!',
  //     icon: 'warning',
  //     showCancelButton: true,
  //     confirmButtonText: 'Delete',
  //   }).then(result => {
  //     if (result.isConfirmed) {
  //       this.vehicleService.deleteVehicle(vehicle.vehicle_id!.toString()).subscribe(() => {
  //         this.showToast('Deleted', 'Vehicle deleted successfully!', 'success');
  //         this.loadVehicles();
  //         //this.vehicles.update(arr => arr.filter(v => v.vehicle_id !== vehicle.vehicle_id));
  //       });
  //     }
  //   });
  // }

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

  const regex = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;

  if (!regex.test(vehicleNo)) {
    this.vehicleNumberError.set('Invalid format. Example: DL12AB1234');
    return false;
  }

  this.vehicleNumberError.set('');
  return true;
}

  // validateVehicleNumber(): boolean {
  //   const vehicleNo = this.newVehicle().vehicle_number?.trim();
  //   if (!vehicleNo) {
  //     this.vehicleNumberError.set('Vehicle Number is required');
  //     return false;
  //   }
  //   //const regex = /^[A-Z]{2}-?\d{2}-?[A-Z]{2}-?\d{4}$/;
  //   const regex = /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/;
  //   if (!regex.test(vehicleNo)) {
  //     this.vehicleNumberError.set('Invalid format. Example: DL12AB1234');
  //     return false;
  //   }
  //   this.vehicleNumberError.set('');
  //   return true;
  // }

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
  if (this.selectedFuelIds.includes(id)) {
    this.selectedFuelIds = this.selectedFuelIds.filter(x => x !== id);
  } else {
    this.selectedFuelIds.push(id);
  }
}

toggleVehicleType(id: string) {
  if (this.selectedVehicleTypeIds.includes(id)) {
    this.selectedVehicleTypeIds = this.selectedVehicleTypeIds.filter(x => x !== id);
  } else {
    this.selectedVehicleTypeIds.push(id);
  }
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

  // Apply filter
  applyVehicleFilter() {
  this.vehicleFilter.set({
    fuel_id: this.selectedFuelIds,
    vehicle_type_id: this.selectedVehicleTypeIds,
    department_id: this.vehicleFilter().department_id
  });

  this.pageNumber.set(1);
  this.loadVehicles();
}

 resetVehicleFilter() {
  this.selectedFuelIds = [];
  this.selectedVehicleTypeIds = [];
  this.vehicleFilter.set({ vehicle_type_id: [], fuel_id: [], department_id: [] });
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

  ttoggleVehicleType(typeId: string) {

  if (this.selectedVehicleTypeIds.includes(typeId)) {
    this.selectedVehicleTypeIds = this.selectedVehicleTypeIds.filter(id => id !== typeId);
  } else {
    this.selectedVehicleTypeIds.push(typeId);
  }

  this.vehicleFilter.update(f => ({
    ...f,
    vehicle_type_id: this.selectedVehicleTypeIds
  }));
}
}