import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { VehicleService } from './vehicle-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

interface Vehicle {
  vehicle_id: string;
  vehicle_number: string;
  vehicle_type_id: number | null;
  fuel_id: number | null;
  department_id: number | null;
  engine_capacity: number | null;
  emission_standard: string;
  isActive: boolean;
  isDeleted: boolean;
}

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicles.html',
  styleUrls: ['./vehicles.css'],
})

export class Vehicles implements OnInit {
  vehicles: WritableSignal<Vehicle[]> = signal<Vehicle[]>([]);
  vehicleTypes = signal<any[]>([]);
  fuelTypes = signal<any[]>([]);
  departments = signal<any[]>([]);

  totalRecords = signal<number>(0);
  totalPages = signal<number>(0);
  pageNumber = signal<number>(1);
  pageSize = signal<number>(5);

  searchText = signal<string>('');
  filterModalOpen = signal<boolean>(false);

  activeFilter = signal<boolean>(true);

  sortColumn = signal<string>(''); // current column to sort
  sortDirection = signal<'asc' | 'desc'>('asc'); // sort direction

  pageSizeOptions = [5, 10, 20, 50];

  filter = signal<any>({
    vehicle_number: '',
    vehicle_type_id: [] as number[],  // array for multi-select
    fuel_id: [] as number[],
    department_id: [] as number[],
    engine_capacity: null,
    emission_standard: [] as string[],
    isActive: null,
  });

  newVehicle = signal<any>({
    vehicle_id: null,
    vehicle_number: '',
    vehicle_type_id: null,
    fuel_id: null,
    department_id: null,
    engine_capacity: null,
    emission_standard: '',
    isActive: true,
  });

  isEditMode = signal<boolean>(false);

  constructor(private vehicleService: VehicleService) { }

  ngOnInit() {
    this.loadDropdowns();
    this.loadVehicles();
  }

  // ----------------- DROPDOWNS -----------------
  loadDropdowns() {
    this.vehicleService.getFuelList().subscribe(res => this.fuelTypes.set(res.data || res));
    this.vehicleService.getDepartmentList().subscribe(res => this.departments.set(res.data || res));
    this.vehicleService.getVehicleTypeList().subscribe(res => this.vehicleTypes.set(res.data || res));
  }

  // ----------------- VEHICLE TABLE -----------------
  loadVehicles() {
    const f = this.filter();
    const searchValue = this.searchText()?.trim().toLowerCase();

    this.vehicleService
      .searchVehicles(this.searchText(), this.activeFilter(), this.pageNumber(), this.pageSize())
      .subscribe(res => {
        let data: Vehicle[] = res.data || [];

        // Soft-delete filter
        data = data.filter(v => !v.isDeleted);

        // ------------------ CLIENT-SIDE FILTERING ------------------
        data = data.filter(v =>
          // Vehicle Number filter
          (!f.vehicle_number || v.vehicle_number?.toLowerCase().includes(f.vehicle_number.toLowerCase())) &&

          // Vehicle Type multi-select filter
          (Array.isArray(f.vehicle_type_id) && f.vehicle_type_id.length === 0 || f.vehicle_type_id.includes(v.vehicle_type_id!)) &&

          // Fuel multi-select filter
          (Array.isArray(f.fuel_id) && f.fuel_id.length === 0 || f.fuel_id.includes(v.fuel_id!)) &&

          // Department multi-select filter
          (Array.isArray(f.department_id) && f.department_id.length === 0 || f.department_id.includes(v.department_id!)) &&

          // Engine Capacity filter
          (!f.engine_capacity || v.engine_capacity === f.engine_capacity) &&

          // Emission Standard multi-select
          (Array.isArray(f.emission_standard) && f.emission_standard.length === 0 || f.emission_standard.includes(v.emission_standard)) &&

          // Active status filter
          (f.isActive === null || v.isActive === f.isActive)
        );

        // ------------------ SEARCH ACROSS ALL COLUMNS ------------------
        if (searchValue) {
          data = data.filter(v =>
            v.vehicle_number?.toLowerCase().includes(searchValue) ||
            this.getVehicleTypeName(v.vehicle_type_id).toLowerCase().includes(searchValue) ||
            this.getFuelName(v.fuel_id).toLowerCase().includes(searchValue) ||
            this.getDepartmentName(v.department_id).toLowerCase().includes(searchValue) ||
            (v.engine_capacity?.toString().includes(searchValue) ?? false) ||
            (v.emission_standard?.toLowerCase().includes(searchValue) ?? false) ||
            (v.isActive ? 'active'.includes(searchValue) : 'inactive'.includes(searchValue))
          );
        }

        // ------------------ SORTING ------------------
        if (this.sortColumn()) {
          const col = this.sortColumn();
          const dir = this.sortDirection();
          data.sort((a, b) => {
            let aVal: any, bVal: any;
            switch (col) {
              case 'vehicle_number': aVal = a.vehicle_number; bVal = b.vehicle_number; break;
              case 'vehicle_type': aVal = this.getVehicleTypeName(a.vehicle_type_id); bVal = this.getVehicleTypeName(b.vehicle_type_id); break;
              case 'fuel': aVal = this.getFuelName(a.fuel_id); bVal = this.getFuelName(b.fuel_id); break;
              case 'department': aVal = this.getDepartmentName(a.department_id); bVal = this.getDepartmentName(b.department_id); break;
              case 'engine': aVal = a.engine_capacity; bVal = b.engine_capacity; break;
              case 'emission': aVal = a.emission_standard; bVal = b.emission_standard; break;
              case 'status': aVal = a.isActive; bVal = b.isActive; break;
            }
            if (aVal == null) aVal = '';
            if (bVal == null) bVal = '';
            if (aVal < bVal) return dir === 'asc' ? -1 : 1;
            if (aVal > bVal) return dir === 'asc' ? 1 : -1;
            return 0;
          });
        }

        // ------------------ UPDATE SIGNALS ------------------
        this.vehicles.set(data);
        this.totalRecords.set(data.length);
        this.totalPages.set(res.totalPages || 1);
      });
  }

  // Toggle sorting
  sort(column: string) {
    if (this.sortColumn() === column) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.loadVehicles();
  }

  search() {
    const searchValue = this.searchText()?.trim().toLowerCase();
    this.pageNumber.set(1);

    this.loadVehicles();
  }

  nextPage() {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update(v => v + 1);
      this.loadVehicles();
    }
  }

  previousPage() {
    if (this.pageNumber() > 1) {
      this.pageNumber.update(v => v - 1);
      this.loadVehicles();
    }
  }

  // ----------------- CREATE / UPDATE -----------------
  saveVehicle() {
    if (!this.newVehicle().vehicle_number) {
      this.showToast('Error', 'Vehicle number is required!', 'error');
      return;
    }

    if (this.isEditMode()) {
      this.vehicleService.updateVehicle(this.newVehicle()).subscribe(() => {
        this.showToast('Updated', 'Vehicle updated successfully!', 'success');
        this.resetForm();
        this.loadVehicles();
      });
    } else {
      this.vehicleService.createVehicle(this.newVehicle()).subscribe(() => {
        this.showToast('Created', 'Vehicle created successfully!', 'success');
        this.resetForm();
        this.loadVehicles();
      });
    }
  }

  editVehicle(vehicle: Vehicle) {
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
      emission_standard: '',
      isActive: true,
    });
  }

  // ----------------- TOGGLE STATUS -----------------
  toggleStatus(vehicle: Vehicle) {
    const newStatus = !vehicle.isActive;
    Swal.fire({
      title: 'Are you sure?',
      text: `Set vehicle as ${newStatus ? 'Active' : 'Inactive'}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes',
    }).then(result => {
      if (result.isConfirmed) {
        this.vehicleService.updateVehicleStatus(vehicle.vehicle_id, newStatus)
          .subscribe(() => {
            vehicle.isActive = newStatus;
            this.showToast('Updated', 'Status updated successfully!', 'success');
          });
      }
    });
  }

  // ----------------- SOFT DELETE -----------------
  deleteVehicle(vehicle: Vehicle) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the record!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(result => {
      if (result.isConfirmed) {
        this.vehicleService.deleteVehicle(vehicle.vehicle_id).subscribe(() => {
          this.showToast('Deleted', 'Vehicle deleted successfully!', 'success');
          // Remove from signal array
          this.vehicles.update(arr => arr.filter(v => v.vehicle_id !== vehicle.vehicle_id));
        });
      }
    });
  }

  // ----------------- FILTER -----------------
  openFilterModal() { this.filterModalOpen.set(true); }
  closeFilterModal() { this.filterModalOpen.set(false); }

  applyFilter() {
    this.pageNumber.set(1);
    this.loadVehicles();
    this.closeFilterModal();
  }

  resetFilter() {
    this.filter.set({
      vehicle_number: '',
      vehicle_type_id: null,
      fuel_id: null,
      department_id: null,
      engine_capacity: null,
      emission_standard: '',
      isActive: null,
    });

    this.searchText.set('');
    this.activeFilter.set(true);
    this.loadVehicles();
  }

  // ----------------- GET NAMES -----------------
  getVehicleTypeName(id: number | null) {
    if (id === null) return '-';
    return this.vehicleTypes().find(vt => vt.vehicle_type_id === id)?.vehicle_type_name || '-';
  }

  getFuelName(id: number | null) {
    if (id === null) return '-';
    return this.fuelTypes().find(f => f.fuel_id === id)?.fuel_name || '-';
  }

  getDepartmentName(id: number | null) {
    if (id === null) return '-';
    return this.departments().find(d => d.department_id === id)?.department_name || '-';
  }

  // ----------------- TOAST -----------------
  showToast(title: string, text: string, icon: 'success' | 'error' = 'success') {
    Swal.fire({
      icon,
      title,
      text,
      toast: true,
      position: 'top-end',
      timer: 2000,
      showConfirmButton: false,
    });
  }

  clearFilters() {
    this.searchText.set('');
    this.activeFilter.set(true);
    this.loadVehicles();
  }

  onPageSizeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newSize = Number(target.value);
    this.pageSize.set(newSize);
    this.pageNumber.set(1);
    this.loadVehicles();
  }

  // ----------------- VEHICLE TYPE MULTI-SELECT -----------------
  isVehicleTypeSelected(id: number): boolean {
    const selected = this.filter().vehicle_type_id;
    return Array.isArray(selected) && selected.includes(id);
  }

  toggleVehicleType(id: number) {
    const selected = [...(this.filter().vehicle_type_id || [])];
    const index = selected.indexOf(id);

    if (index > -1) {
      selected.splice(index, 1); // remove if already selected
    } else {
      selected.push(id); // add if not selected
    }

    this.filter.update(f => ({ ...f, vehicle_type_id: selected }));
  }

  // Get count of selected vehicle types
  getSelectedVehicleTypesCount(): number {
    const selected = this.filter().vehicle_type_id;
    return Array.isArray(selected) ? selected.length : 0;
  }

  // ----------------- FUEL TYPE MULTI-SELECT -----------------
  isFuelTypeSelected(id: number): boolean {
    const selected = this.filter().fuel_id;
    return Array.isArray(selected) && selected.includes(id);
  }

  toggleFuelType(id: number) {
    const selected = [...(this.filter().fuel_id || [])];
    const index = selected.indexOf(id);

    if (index > -1) {
      selected.splice(index, 1); // remove if already selected
    } else {
      selected.push(id); // add if not selected
    }

    this.filter.update(f => ({ ...f, fuel_id: selected }));
  }

  // Get count of selected fuel types
  getSelectedFuelTypesCount(): number {
    const selected = this.filter().fuel_id;
    return Array.isArray(selected) ? selected.length : 0;
  }

  // ----------------- DEPARTMENT MULTI-SELECT -----------------
  isDepartmentSelected(id: number): boolean {
    const selected = this.filter().department_id;
    return Array.isArray(selected) && selected.includes(id);
  }

  toggleDepartment(id: number) {
    const selected = [...(this.filter().department_id || [])];
    const index = selected.indexOf(id);

    if (index > -1) {
      selected.splice(index, 1); // remove if already selected
    } else {
      selected.push(id); // add if not selected
    }

    this.filter.update(f => ({ ...f, department_id: selected }));
  }

  // ----------------- OPTIONAL: GET COUNT -----------------
  getSelectedDepartmentsCount(): number {
    const selected = this.filter().department_id;
    return Array.isArray(selected) ? selected.length : 0;
  }

  // ----------------- FILTER MODAL -----------------
  showFilterModal() {
    this.filterModalOpen.set(true);
  }
}