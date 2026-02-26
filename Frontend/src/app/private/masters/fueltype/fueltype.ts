import { Component, OnInit } from '@angular/core';
import { FueltypeService } from './fueltype-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-fueltype',
  imports: [CommonModule,FormsModule],
  templateUrl: './fueltype.html',
  styleUrls: ['./fueltype.css'],
})
export class Fueltype implements OnInit {

  fuels: any[] = [];

  searchText: string = '';
  isActive: boolean | null = null;

  pageNumber: number = 1;
  pageSize: number = 5;
  totalPages: number = 0;

  newFuel = {
    fuel_name: '',
    co2_factor: 0,
    nox_factor: 0,
    ch4_factor: 0,
    isapplicable: true
  };

  constructor(private fuelService: FueltypeService) {}

  ngOnInit() {
    this.loadFuels();
  }

  loadFuels() {
    this.fuelService.getAll().subscribe((res: any) => {
      this.fuels = res.data ?? res;
      this.totalPages = res.totalPages ?? 1;
    });
  }

  createFuel() {
    this.fuelService.createFuel(this.newFuel).subscribe(() => {
      alert('Fuel Created Successfully');
      this.loadFuels();
    });
  }

  toggleStatus(fuel: any) {
    const payload = {
      fuelId: fuel.fuel_id,
      isActive: !fuel.isActive
    };

    this.fuelService.updateStatus(payload).subscribe(() => {
      this.loadFuels();
    });
  }

  toggleGenerator(fuel: any) {
    const payload = {
      fuelId: fuel.fuel_id,
      isGenerator: !fuel.isGenerator
    };

    this.fuelService.updateGenerator(payload).subscribe(() => {
      this.loadFuels();
    });
  }

  nextPage() {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.loadFuels();
    }
  }

  previousPage() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadFuels();
    }
  }
}
