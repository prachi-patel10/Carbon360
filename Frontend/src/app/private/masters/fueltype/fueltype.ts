import { Component, OnInit } from '@angular/core';
import { FueltypeService } from './fueltype-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { ChangeDetectorRef } from '@angular/core';

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
  searchText: string = '';
onlyActive: boolean = false;

currentPage: number = 1;
pageSize: number = 5;

totalRecords: number = 0;
totalPages: number = 0;
sortColumn: string = 'fuel_name';
sortDirection: string = 'ASC';

// get filteredFuels() {
//   let data = this.fuels;

//   // Search filter
//   if (this.searchText) {
//     data = data.filter(f =>
//       f.fuel_name.toLowerCase().includes(this.searchText.toLowerCase()) ||
//       f.fuel_Desc.toLowerCase().includes(this.searchText.toLowerCase())
//     );
//   }

//   // Active filter
//   if (this.onlyActive) {
//     data = data.filter(f => f.isActive);
//   }

//   return data;
// }

// get totalPages() {
//   return Math.ceil(this.filteredFuels.length / this.pageSize) || 1;
// }

// get paginatedFuels() {
//   const start = (this.currentPage - 1) * this.pageSize;
//   return this.filteredFuels.slice(start, start + this.pageSize);
// }

previousPage() {
  if (this.currentPage > 1) {
    this.currentPage--;
    this.loadFuels();
  }
}

nextPage() {
  if (this.currentPage < this.totalPages) {
    this.currentPage++;
    this.loadFuels();
  }
}

updatePagination() {
  this.currentPage = 1;
  this.loadFuels();
}

onSearchChange() {
  this.currentPage = 1;
  this.loadFuels();
}

onFilterChange() {
  this.currentPage = 1;
  this.loadFuels();
}

clearSearch() {
  this.searchText = '';
  this.onlyActive = false;
  this.currentPage = 1;
}

  newFuel = {
    fuel_name: '',
    fuel_Desc: '',
    isapplicable: true
  };

  constructor(
    private fuelService: FueltypeService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadFuels();
  }

  loadFuels() {

  let params: any = {
    pageNumber: this.currentPage,
    pageSize: this.pageSize,
    sortColumn: this.sortColumn,
    sortDirection: this.sortDirection
  };

  // Only add searchText if it exists
  if (this.searchText && this.searchText.trim() !== '') {
    params.searchText = this.searchText;
  }

  // Only add isActive if filter is ON
  if (this.onlyActive) {
    params.isActive = this.onlyActive;
  }

  this.fuelService.search(params).subscribe({

   next: (res: any) => {

  const result = res.data;

  this.fuels = result.data.map((f: any) => ({
    ...f,
    isapplicable: f.isapplicable === 1 || f.isapplicable === true,
    isActive: f.isActive === 1 || f.isActive === true
  }));

  this.totalRecords = result.totalRecords;
  this.totalPages = result.totalPages;
  this.currentPage = result.currentPage;

},
    error: (err) => {
      console.error(err);
    }
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

    confirmApplicableChange(newValue: boolean, fuel: any) {

  Swal.fire({
    title: 'Are you sure?',
    text: `You want to ${newValue ? 'Enable' : 'Disable'} generator applicability?`,
    icon: 'question',
    showCancelButton: true,
  }).then((result) => {

    if (result.isConfirmed) {

      const payload = {
        fuel_id: fuel.fuel_id,
        isapplicable: newValue
      };

      this.fuelService.updateGenerator(payload).subscribe({
        next: () => {
          Swal.fire('Updated!', 'Generator updated.', 'success');
        },
        error: () => {
          fuel.isapplicable = !newValue; // revert if failed
          Swal.fire('Error!', 'Update failed.', 'error');
        }
      });

    } else {
      fuel.isapplicable = !newValue; // revert if cancelled
    }

  });
}

 confirmStatusChange(event: any, fuel: any) {

  event.preventDefault();   // 🔥 STOP automatic toggle

  const newStatus = !fuel.IsActive;

  Swal.fire({
    title: 'Are you sure?',
    text: `You want to ${newStatus ? 'Activate' : 'Deactivate'} this fuel?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, change it!'
  }).then((result) => {

    if (result.isConfirmed) {

      const payload = {
        fuel_id: fuel.fuel_id,
        IsActive: newStatus
      };

      this.fuelService.updateStatus(payload).subscribe({
        next: (res: any) => {

          fuel.IsActive = newStatus;   // update manually

          Swal.fire('Updated!', 'Status changed successfully.', 'success');
        },
        error: (err) => {
          console.error(err);

          Swal.fire('Error!', 'Update failed.', 'error');
        }
      });

    }
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