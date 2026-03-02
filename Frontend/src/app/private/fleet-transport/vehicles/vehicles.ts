import { Component, effect, OnInit, signal, WritableSignal } from '@angular/core';
import { VehicleService } from './vehicle-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

export interface VehicleDto {
  vehicle_id?: string | null;
  vehicle_number: string;
  vehicle_type_id: string | null;
  vehicle_type_name?: string | null;   // <--- add
  fuel_id: string | null;
  fuel_name?: string | null;           // <--- add
  department_id: string | null;
  department_name?: string | null;     // <--- add
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
  // filterModalOpen = signal<boolean>(false);
  activeFilter = signal<boolean>(false);

  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  showFilter = signal(false);


  pageSizeOptions = [5, 10, 20, 50];

  vehicleNumberError = signal<string>('');

  filter = signal<any>({
    vehicle_type_id: [] as string[],
    fuel_id: [] as string[],
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

  // ngOnInit() {
  //   this.loadDropdowns();
  //   this.activeFilter.set(false);  
  //   this.loadVehicles();
  // }

  ngOnInit() {
    this.loadDropdowns();
  this.loadVehicles();

  effect(() => {
    this.activeFilter();   // track
    this.pageNumber.set(1);
    this.loadVehicles();
  });
  }

  // ----------------- DROPDOWNS -----------------
  loadDropdowns() {
    // Vehicle Types
    this.vehicleService.getVehicleTypeList().subscribe((res: any[]) => {
      const mapped = (res || []).map(vt => ({
        vehicle_type_id: vt.vehicle_type_id,
        vehicle_type_name: vt.vehicle_type_name
      }));
      this.vehicleTypes.set(mapped);
    });

    // Fuel Types
    this.vehicleService.getFuelList().subscribe((res: any[]) => {
      const mapped = (res || []).map(f => ({
        fuel_id: f.fuel_id,
        fuel_name: f.fuel_name
      }));
      this.fuelTypes.set(mapped);
    });

    // Departments
    // this.vehicleService.getDepartmentList().subscribe(res => {
    //   const mapped = (res.data || []).map((d: any) => ({
    //     department_id: d.department_id,       // convert to string
    //     department_name: d.departmentName,
    //   }));
    //   this.departments.set(mapped);
    // });

    // Departments
    this.vehicleService.getDepartmentList().subscribe((res: any) => {
      // Check if API returns array or single object
      let deptArray: any[] = [];
      if (Array.isArray(res.data)) {
        deptArray = res.data;
      } else if (res.data) {
        // If API returns single department, wrap in array
        deptArray = [res.data];
      }

      const mapped = deptArray.map((d: any) => ({
        department_id: String(d.id),          // use `id` from your department API
        department_name: d.departmentName
      }));

      this.departments.set(mapped);
    });
  }

  //   loadDropdowns() {
  //   // ---------------- Vehicle Types ----------------
  //   this.vehicleService.getVehicleTypeList().subscribe((res: any) => {
  //     const mapped = (res.data || []).map((vt: any) => ({
  //       vehicle_type_id: String(vt.vehicle_type_id),
  //       vehicle_type_name: vt.vehicle_type_name
  //     }));
  //     this.vehicleTypes.set(mapped);
  //   });

  //   // ---------------- Fuel Types ----------------
  //   this.vehicleService.getFuelList().subscribe((res: any) => {
  //     const mapped = (res.data || []).map((f: any) => ({
  //       fuel_id: String(f.fuel_id),
  //       fuel_name: f.fuel_name
  //     }));
  //     this.fuelTypes.set(mapped);
  //   });

  //   // ---------------- Departments ----------------
  //   // Fetch all departments to map id -> name
  //   this.vehicleService.getDepartmentList().subscribe((res: any) => {
  //     // Check if API returns array or single object
  //     let deptArray: any[] = [];
  //     if (Array.isArray(res.data)) {
  //       deptArray = res.data;
  //     } else if (res.data) {
  //       // If API returns single department, wrap in array
  //       deptArray = [res.data];
  //     }

  //     const mapped = deptArray.map((d: any) => ({
  //       department_id: String(d.id),          // use `id` from your department API
  //       department_name: d.departmentName
  //     }));

  //     this.departments.set(mapped);
  //   });
  // }

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
    const filterData = this.filter();

    //  Correct isActive filter
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
        //filterData.department_id.length ? filterData.department_id.join(',') : undefined
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


  //search
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
    this.pageNumber.set(1);  // reset to first page
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
  // saveVehicle() {
  //   if (!this.validateVehicleNumber()) {
  //     this.showToast('Error', this.vehicleNumberError(), 'error');
  //     return;
  //   }

  //   const raw = this.newVehicle();
  //   const vehicle: VehicleDto = {
  //     ...raw,
  //     // Keep hashed IDs as string (or null)
  //     vehicle_type_id: raw.vehicle_type_id || null,
  //     fuel_id: raw.fuel_id || null,
  //     department_id: raw.department_id || null,
  //     // Only convert numeric field
  //     engine_capacity: raw.engine_capacity ? Number(raw.engine_capacity) : null
  //   };

  //   // Required fields check
  //   if (
  //     vehicle.vehicle_type_id == null ||
  //     vehicle.fuel_id == null ||
  //     vehicle.department_id == null ||
  //     vehicle.engine_capacity == null ||
  //     !vehicle.emission_standard?.trim()
  //   ) {
  //     this.showToast('Error', 'Please fill all required fields!', 'error');
  //     return;
  //   }

  //   // Create payload
  //   const payload = { dto: vehicle };

  //   // Save or update
  //   if (this.isEditMode()) {
  //     this.vehicleService.updateVehicle(payload).subscribe(() => {
  //       this.showToast('Updated', 'Vehicle updated successfully!', 'success');
  //       this.resetForm();
  //       this.loadVehicles();
  //     });
  //   } else {
  //     this.vehicleService.createVehicle(payload).subscribe(() => {
  //       this.showToast('Created', 'Vehicle created successfully!', 'success');
  //       this.resetForm();
  //       this.loadVehicles();
  //     });
  //   }
  // }

  saveVehicle() {
    const raw = this.newVehicle();

    // ------------------ VALIDATION ------------------
    if (!raw.vehicle_number?.trim()) { this.showToast('Error', 'Vehicle number is required!', 'error'); return; }
    if (!raw.emission_standard?.trim()) { this.showToast('Error', 'Emission standard is required!', 'error'); return; }
    if (!raw.vehicle_type_id) { this.showToast('Error', 'Select vehicle type!', 'error'); return; }
    if (!raw.fuel_id) { this.showToast('Error', 'Select fuel type!', 'error'); return; }
    if (!raw.department_id) { this.showToast('Error', 'Select department!', 'error'); return; }
    if (!raw.engine_capacity && raw.engine_capacity !== 0) { this.showToast('Error', 'Engine capacity is required!', 'error'); return; }

    // ------------------ PREPARE PAYLOAD ------------------
    // For update, include vehicle_id; for create, omit it
    const payload = this.isEditMode()
      ? {
        vehicle_id: raw.vehicle_id!,            // must exist for update
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

    // ------------------ CALL SERVICE ------------------
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

  //edit
  editVehicle(vehicle: VehicleDto) {
    this.isEditMode.set(true);
    this.newVehicle.set({ ...vehicle });
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

      if (!result.isConfirmed) {
        return; // user canceled
      }

      this.vehicleService.updateVehicleStatus(vehicle.vehicle_id!, newStatus)
        .subscribe({
          next: () => {
            // update UI data immutably
            this.vehicles.update(arr =>
              arr.map(v =>
                v.vehicle_id === vehicle.vehicle_id ? { ...v, isActive: newStatus } : v
              )
            );

            // show correct toast
            this.showToast(
              'Status Updated',
              `Vehicle is now ${newStatus ? 'Active' : 'Inactive'}!`,
              'success'
            );
          },
          error: () => {
            // rollback UI state if API fails
            this.vehicles.update(arr =>
              arr.map(v =>
                v.vehicle_id === vehicle.vehicle_id ? { ...v, isActive: originalStatus } : v
              )
            );

            this.showToast('Error', 'Failed to update status', 'error');
          }
        });
    });
  }

  //toggle click
  // onToggleClick(event: Event, vehicle: VehicleDto) {
  //   const checkbox = event.target as HTMLInputElement;
  //   const newStatus = checkbox.checked;

  //   Swal.fire({
  //     title: 'Are you sure?',
  //     text: `Set vehicle as ${newStatus ? 'Active' : 'Inactive'}?`,
  //     icon: 'warning',
  //     showCancelButton: true,
  //     confirmButtonText: 'Yes'
  //   }).then(result => {
  //     if (result.isConfirmed) {
  //       this.vehicleService.updateVehicleStatus(vehicle.vehicle_id!, newStatus)
  //         .subscribe({
  //           next: () => {
  //             this.vehicles.update(arr =>
  //               arr.map(v =>
  //                 v.vehicle_id === vehicle.vehicle_id ? { ...v, isActive: newStatus } : v
  //               )
  //             );
  //             this.showToast('Updated', 'Status updated successfully!', 'success');
  //           },
  //           error: () => {
  //             checkbox.checked = !newStatus; // rollback
  //             this.showToast('Error', 'Failed to update status', 'error');
  //           }
  //         });
  //     } else {
  //       checkbox.checked = !newStatus;
  //     }
  //   });
  // }

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
  showFilterModal() {
    this.showFilter.set(true);
  }

  closeFilterModal() {
    this.showFilter.set(false);
  }

  isVehicleTypeSelected(id: string) { return this.filter().vehicle_type_id.includes(id); }
  isFuelTypeSelected(id: string) { return this.filter().fuel_id.includes(id); }
  isDepartmentSelected(id: string) { return this.filter().department_id.includes(id); }

  toggleVehicleType(id: string) {
    const current = this.filter().vehicle_type_id as string[];

    this.filter.update(f => ({
      ...f,
      vehicle_type_id: current.includes(id)
        ? current.filter(x => x !== id)
        : [...current, id]
    }));
  }

  toggleFuelType(id: string) {
    const current = this.filter().fuel_id as string[];

    this.filter.update(f => ({
      ...f,
      fuel_id: current.includes(id)
        ? current.filter(x => x !== id)
        : [...current, id]
    }));
  }
  applyFilter() {
    this.pageNumber.set(1);
    this.loadVehicles();
    this.closeFilterModal();
  }

  resetFilter() {
    this.filter.set({ vehicle_type_id: [], fuel_id: [], department_id: [] });
    this.applyFilter();
  }

  showToast(title: string, text: string, icon: 'success' | 'error' = 'success') {
    Swal.fire({ icon, title, text, toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
  }

  toggleVehicleTypeFromEvent(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.toggleVehicleType(value);
  }

  toggleFuelTypeFromEvent(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.toggleFuelType(value);
  }
}