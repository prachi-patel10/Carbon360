import { Component, OnInit, signal } from '@angular/core';
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
}

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicles.html',
  styleUrls: ['./vehicles.css'],
})
export class Vehicles implements OnInit {
  // ================= SIGNALS =================
  vehicles = signal<Vehicle[]>([]);
  fuelTypes = signal<any[]>([]);
  departments = signal<any[]>([]);
  vehicleTypes = signal<any[]>([]);

  totalRecords = signal<number>(0);
  totalPages = signal<number>(0);
  pageNumber = signal<number>(1);
  pageSize = signal<number>(5);

  searchText = signal<string>('');
  isActive = signal<boolean | null>(null);

  filterModalOpen = signal<boolean>(false);

  filter = signal<any>({
    vehicle_type_id: null,
    fuel_id: null,
    department_id: null,
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

  // ================= DROPDOWNS =================
  loadDropdowns() {
    this.vehicleService.getFuelList().subscribe((res) => {
      this.fuelTypes.set(res.data || res);
    });

    this.vehicleService.getDepartmentList().subscribe((res) => {
      this.departments.set(res.data || res);
    });

    this.vehicleService.getVehicleTypeList().subscribe((res) => {
      this.vehicleTypes.set(res.data || res);
    });
  }

  // ================= LOAD VEHICLES =================
  loadVehicles() {
    this.vehicleService
      .searchVehicles(
        this.searchText(),
        this.isActive(),
        this.pageNumber(),
        this.pageSize()
      )
      .subscribe((res) => {
        this.vehicles.set(res.data || []);
        this.totalPages.set(res.totalPages);
        this.totalRecords.set(res.totalRecords);
      });
  }

  search() {
    this.pageNumber.set(1);
    this.loadVehicles();
  }

  nextPage() {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((v) => v + 1);
      this.loadVehicles();
    }
  }

  previousPage() {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((v) => v - 1);
      this.loadVehicles();
    }
  }

  // ================= CREATE / UPDATE =================
  saveVehicle() {
    if (this.isEditMode()) {
      // update vehicle
      this.vehicleService.updateVehicle(this.newVehicle()).subscribe(() => {
        this.showToast('Updated', 'Vehicle updated successfully!');
        this.resetForm();
        this.loadVehicles();
      });
    } else {
      // create vehicle
      this.vehicleService.createVehicle(this.newVehicle()).subscribe(() => {
        this.showToast('Created', 'Vehicle created successfully!');
        this.resetForm();
        this.loadVehicles();
      });
    }
  }

  // ================= EDIT =================
  editVehicle(vehicle: Vehicle) {
    this.isEditMode.set(true);
    this.newVehicle.set({ ...vehicle });
  }

  // ================= TOGGLE STATUS =================
  toggleStatus(vehicle: Vehicle) {
    const newStatus = !vehicle.isActive;
    Swal.fire({
      title: 'Are you sure?',
      text: `Set vehicle as ${newStatus ? 'Active' : 'Inactive'}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes',
    }).then((result) => {
      if (result.isConfirmed) {
        this.vehicleService
          .updateVehicleStatus(vehicle.vehicle_id, newStatus)
          .subscribe(() => {
            vehicle.isActive = newStatus;
            this.showToast('Updated', 'Status updated successfully!');
          });
      }
    });
  }

  // ================= DELETE (SOFT DELETE) =================
  deleteVehicle(vehicle: Vehicle) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the record!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then((result) => {
      if (result.isConfirmed) {
        this.vehicleService.deleteVehicle(vehicle.vehicle_id).subscribe(() => {
          this.showToast('Deleted', 'Vehicle deleted successfully!');
          this.loadVehicles();
        });
      }
    });
  }

  // ================= FILTER =================
  openFilterModal() {
    this.filterModalOpen.set(true);
  }

  closeFilterModal() {
    this.filterModalOpen.set(false);
  }

  applyFilter() {
    this.pageNumber.set(1);
    this.loadVehicles();
    this.closeFilterModal();
  }

  resetFilter() {
    this.filter.set({
      vehicle_type_id: null,
      fuel_id: null,
      department_id: null,
      isActive: null,
    });
    this.search();
  }

  // ================= GET NAMES =================

  getVehicleTypeName(id: number | null) {
    if (id === null) return '-';
    return this.vehicleTypes().find((x) => x.vehicle_type_id === id)?.vehicle_type_name || '-';
  }

  getFuelName(id: number | null) {
    if (id === null) return '-';
    return this.fuelTypes().find((x) => x.fuel_id === id)?.fuel_name || '-';
  }

  getDepartmentName(id: number | null) {
    if (id === null) return '-';
    return this.departments().find((x) => x.department_id === id)?.department_name || '-';
  }

  // ================= UPDATE FORM =================
  updateVehicleField(field: string, value: any) {
    this.newVehicle.update((v) => ({
      ...v,
      [field]: value,
    }));
  }

  // ================= RESET FORM =================
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

  // ================= TOAST =================
  showToast(title: string, text: string) {
    Swal.fire({
      icon: 'success',
      title,
      text,
      toast: true,
      position: 'top-end',
      timer: 2000,
      showConfirmButton: false,
    });
  }
}