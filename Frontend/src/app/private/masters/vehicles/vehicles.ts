import { Component, OnInit } from '@angular/core';
import { VehicleService } from './vehicle-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-vehicles',
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicles.html',
  styleUrls: ['./vehicles.css'],
})
export class Vehicles implements OnInit {
  vehicles: any[] = [];
  searchText: string = '';
  isActive: boolean | null = null;

  pageNumber: number = 1;
  pageSize: number = 5;
  totalPages: number = 0;

  newVehicle = {
    vehicle_number: '',
    vehicle_type_id: 0,
    fuel_id: 0,
    department_id: 0,
    engine_capacity: null,
    emission_standard: '',
    isActive: true,
  };

  constructor(private vehicleService: VehicleService) {}

  ngOnInit() {
    this.loadVehicles();
  }

  loadVehicles() {
    this.vehicleService
      .searchVehicles(
        this.searchText,
        this.isActive,
        this.pageNumber,
        this.pageSize
      )
      .subscribe((res: any) => {
        this.vehicles = res.data;
        this.totalPages = res.totalPages;
      });
  }

  search() {
    this.pageNumber = 1;
    this.loadVehicles();
  }

  nextPage() {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.loadVehicles();
    }
  }

  previousPage() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadVehicles();
    }
  }

  createVehicle() {
    this.vehicleService.createVehicle(this.newVehicle).subscribe(() => {
      alert('Vehicle Created');
      this.loadVehicles();
    });
  }
}