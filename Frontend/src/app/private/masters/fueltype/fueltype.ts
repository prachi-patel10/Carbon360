import { Component, OnInit } from '@angular/core';
import { FueltypeService } from './fueltype-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-fueltype',
  imports: [CommonModule,FormsModule],
   standalone: true,
  templateUrl: './fueltype.html',
  styleUrls: ['./fueltype.css'],
})
export class Fueltype implements OnInit {

  fuels: any[] = [];
  editingFuelId: number | null = null;

  newFuel = {
    fuel_name: '',
    fuel_Desc: '',
    isapplicable: true
  };

  constructor(
    private fuelService: FueltypeService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadFuels();
  }

  loadFuels() {
    this.fuelService.getAll().subscribe((res: any) => {
      this.fuels = res.data ?? res;
    });
  }

  createFuel() {

  if (this.editingFuelId) {

    const payload = {
      fuel_id: this.editingFuelId,
      fuel_name: this.newFuel.fuel_name,
      fuel_Desc: this.newFuel.fuel_Desc,
      isapplicable: this.newFuel.isapplicable
    };

    this.fuelService.updateFuel(payload)
      .subscribe(() => {
        this.toastr.success('Fuel Updated');
        this.resetForm();
        this.loadFuels();
      });

  } else {

    this.fuelService.createFuel(this.newFuel)
      .subscribe(() => {
        this.toastr.success('Fuel Created');
        this.resetForm();
        this.loadFuels();
      });

  }
}
  editFuel(fuel: any) {
    this.editingFuelId = fuel.fuel_id;

    this.newFuel = {
      fuel_name: fuel.fuel_name,
      fuel_Desc: fuel.fuel_Desc,
      isapplicable: fuel.isapplicable
    };

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteFuel(fuel: any) {
    Swal.fire({
      title: 'Delete this fuel?',
      icon: 'warning',
      showCancelButton: true
    }).then(result => {
      if (result.isConfirmed) {
        this.fuelService.deleteFuel(fuel.fuel_id)
          .subscribe(() => {
            this.toastr.success('Fuel Deleted');
            this.loadFuels();
          });
      }
    });
  }

  confirmToggleGenerator(fuel: any) {
    this.fuelService.updateGenerator({
      fuel_id: fuel.fuel_id,
      isApplicable: !fuel.isapplicable
    }).subscribe(() => {
      fuel.isapplicable = !fuel.isapplicable;
      this.toastr.success('Generator Updated');
    });
  }

  confirmToggleStatus(fuel: any) {
    this.fuelService.updateStatus({
      fuel_id: fuel.fuel_id,
      isActive: !fuel.isActive
    }).subscribe(() => {
      fuel.isActive = !fuel.isActive;
      this.toastr.success('Status Updated');
    });
  }

  resetForm() {
    this.editingFuelId = null;
    this.newFuel = {
      fuel_name: '',
      fuel_Desc: '',
      isapplicable: true
    };
  }
}