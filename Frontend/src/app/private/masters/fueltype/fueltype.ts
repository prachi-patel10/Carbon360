import { Component, OnInit } from '@angular/core';
import { FueltypeService } from './fueltype-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { ChangeDetectorRef } from '@angular/core';
import { signal, effect } from '@angular/core';
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
currentPage = signal(1);
pageSize = signal(5);
totalRecords = signal(0);
totalPages = signal(1);
pageSizeOptions = [5, 10, 15,20];

searchText = signal('');
onlyActive = signal<boolean | undefined>(true);

refreshTrigger = signal(0);
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


  newFuel = {
    fuel_name: '',
    fuel_Desc: '',
    isapplicable: true,
    isActive: true  
  };

  constructor(
    private fuelService: FueltypeService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef

  ) {effect(() => {

  const page = this.currentPage();
  const size = this.pageSize();
  const search = this.searchText();
 const active = this.onlyActive();

  this.refreshTrigger();

  this.loadFuels(page, size, search, active);

});}

  ngOnInit() {
    this.refreshTrigger.update(v => v + 1);
  }

loadFuels(page: number, size: number, search: string, active: boolean | undefined) {
  let params: any = {
    pageNumber: page,
    pageSize: size,
    sortColumn: this.sortColumn,
    sortDirection: this.sortDirection
  };

  if (search && search.trim() !== '') {
    params.searchText = search;
  }

   if (active !== undefined) {
    params.isActive = active;
  }

  this.fuelService.search(params).subscribe({
    next: (res: any) => {

      const result = res.data;

      this.fuels = result.data.map((f: any) => ({
        ...f,
        isapplicable: f.isapplicable === 1 || f.isapplicable === true,
        isActive: f.isActive === 1 || f.isActive === true
      }));

      this.totalRecords.set(result.totalRecords);
      this.totalPages.set(result.totalPages);
      this.currentPage.set(result.currentPage);

    },
    error: (err) => console.error(err)
  });
}


      createFuel() {

  const isCreate = !this.editingFuelId;

  if (!this.newFuel.fuel_name) return;

  const payload = {
    fuel_id: this.editingFuelId,
    fuel_name: this.newFuel.fuel_name,
    fuel_Desc: this.newFuel.fuel_Desc,
    isapplicable: this.newFuel.isapplicable,
     isActive: this.newFuel.isActive 
  };

  const request$ = isCreate
       ? this.fuelService.createFuel(payload) 
    : this.fuelService.updateFuel(payload);

  request$.subscribe({

    next: (res: any) => {

      console.log("SUCCESS RESPONSE:", res);

      this.showToast(
        isCreate
          ? 'Fuel created successfully'
          : 'Fuel updated successfully',
        'success'
      );

      this.resetForm();
      this.refreshTrigger.update(v => v + 1);
    },

    error: (err) => {

      console.log("ERROR RESPONSE:", err);

      // 🔥 some APIs return success inside error block
      if (err.status === 200 || err.status === 204) {

        this.showToast(
          isCreate
            ? 'Fuel created successfully'
            : 'Fuel updated successfully',
          'success'
        );

        this.resetForm();
       this.refreshTrigger.update(v => v + 1);
        return;
      }

      this.showToast(
        isCreate
          ? 'Fuel creation failed'
          : 'Fuel update failed',
        'error'
      );
    }

  });

}
//     createFuel() {

//   if (this.editingFuelId) {

//     const payload = {
//       fuel_id: this.editingFuelId,
//       fuel_name: this.newFuel.fuel_name,
//       fuel_Desc: this.newFuel.fuel_Desc,
//       isapplicable: this.newFuel.isapplicable
//     };

//     this.fuelService.updateFuel(payload).subscribe({

//       next: (res: any) => {

//       this.toastr.success('Fuel updated successfully ✅');

//       this.fuels = this.fuels.map(f =>
//         f.fuel_id === this.editingFuelId
//           ? {
//               ...f,
//               fuel_name: this.newFuel.fuel_name,
//               fuel_Desc: this.newFuel.fuel_Desc,
//               isapplicable: this.newFuel.isapplicable
//             }
//           : f
//       );

//       this.resetForm();

//     },

//       error: (err) => {

//         console.error(err);

//         this.toastr.error('Fuel update failed ❌');

//       }

//     });

//   } else {

//     this.fuelService.createFuel(this.newFuel).subscribe({

//       next: (res: any) => {

//         this.toastr.success('Fuel created successfully ✅');

//         this.resetForm();
//         this.loadFuels();

//       },

//       error: (err) => {

//         console.error(err);

//         this.toastr.error('Fuel creation failed ❌');

//       }

//     });

//   }

// }
//   createFuel() {

//   if (this.editingFuelId) {

//     const payload = {
//       fuel_id: this.editingFuelId,
//       fuel_name: this.newFuel.fuel_name,
//       fuel_Desc: this.newFuel.fuel_Desc,
//       isapplicable: this.newFuel.isapplicable
//     };

//     this.fuelService.updateFuel(payload)
//       .subscribe(() => {
//         this.toastr.success('Fuel Updated');
//         this.resetForm();
//         this.loadFuels();
//       });

//   } else {

//     this.fuelService.createFuel(this.newFuel)
//       .subscribe(() => {
//         this.toastr.success('Fuel Created');
//         this.resetForm();
//         this.loadFuels();
//       });

//   }
// }
previousPage() {
  if (this.currentPage() > 1) {
    this.currentPage.set(this.currentPage() - 1);
  }
}

nextPage() {
  if (this.currentPage() < this.totalPages()) {
    this.currentPage.set(this.currentPage() + 1);
  }
}

onPageSizeChange(event: any) {
  const val = +event.target.value;
  if (val > 0) {
    this.pageSize.set(val);
    this.currentPage.set(1);
  }
}

onSearchChange(event: any) {
  this.searchText.set(event.target.value || '');
  this.currentPage.set(1);
}

onFilterChange(event: any) {
  const checked = event.target.checked;
  this.onlyActive.set(checked ? true : false);  // true=active, false=inactive
  this.currentPage.set(1);
}


clearSearch() {
  this.searchText.set('');
  this.onlyActive.set(undefined);  // undefined = show all
  this.currentPage.set(1);
}
  showToast(title: string, icon: 'success' | 'error' = 'success') {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: icon,
    title: title,
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true
  });
}

  editFuel(fuel: any) {
    this.editingFuelId = fuel.fuel_id;

    this.newFuel = {
      fuel_name: fuel.fuel_name,
      fuel_Desc: fuel.fuel_Desc,
      isapplicable: fuel.isapplicable,
 isActive: true  
    };

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  deleteFuel(fuel: any) {

  Swal.fire({
    title: 'Are you sure?',
    text: 'This will delete the fuel!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, Delete'
  }).then(result => {

    if (result.isConfirmed) {

      this.fuelService.deleteFuel(fuel.fuel_id).subscribe({

        next: () => {

          this.showToast('Fuel deleted successfully', 'success');

          this.fuels = this.fuels.filter(f => f.fuel_id !== fuel.fuel_id);
        },

        error: (err) => {

          console.log("DELETE ERROR:", err);

          if (err.status === 200 || err.status === 204) {

            this.showToast('Fuel deleted successfully', 'success');

            this.fuels = this.fuels.filter(f => f.fuel_id !== fuel.fuel_id);
            return;
          }

          this.showToast('Delete failed', 'error');
        }

      });

    }

  });

}

  // deleteFuel(fuel: any) {
  //   Swal.fire({
  //     title: 'Delete this fuel?',
  //     icon: 'warning',
  //     showCancelButton: true
  //   }).then(result => {
  //     if (result.isConfirmed) {

  //       this.fuelService.deleteFuel(fuel.fuel_id)
  // .subscribe(() => {

  //   this.fuels = this.fuels.filter(f => f.fuel_id !== fuel.fuel_id);

  //   this.toastr.success('Fuel Deleted');
  // })}

  // });
  //   //     this.fuelService.deleteFuel(fuel.fuel_id)
  //   //       .subscribe(() => {
  //   //         this.fuels = this.fuels.filter(f => f.fuel_id !== fuel.fuel_id);
  //   //         this.toastr.success('Fuel Deleted');
  //   //         // this.toastr.success('Fuel Deleted');
  //   //         // this.loadFuels();
  //   //       });
  //   //   }
  //   // });
  // }

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

  event.preventDefault();

  const newStatus = !fuel.isActive;   // ✅ correct

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
        isActive: newStatus   // ✅ correct
      };

      this.fuelService.updateStatus(payload).subscribe({
        next: () => {

          fuel.isActive = newStatus;  // ✅ correct
          this.cdr.detectChanges();

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

//  confirmStatusChange(event: any, fuel: any) {

//   event.preventDefault();   // 🔥 STOP automatic toggle

//   const newStatus = !fuel.IsActive;

//   Swal.fire({
//     title: 'Are you sure?',
//     text: `You want to ${newStatus ? 'Activate' : 'Deactivate'} this fuel?`,
//     icon: 'warning',
//     showCancelButton: true,
//     confirmButtonText: 'Yes, change it!'
//   }).then((result) => {

//     if (result.isConfirmed) {

//       const payload = {
//         fuel_id: fuel.fuel_id,
//         IsActive: newStatus
//       };

//       this.fuelService.updateStatus(payload).subscribe({
//         next: (res: any) => {

//           fuel.IsActive = newStatus;   // update manually

//           Swal.fire('Updated!', 'Status changed successfully.', 'success');
//         },
//         error: (err) => {
//           console.error(err);

//           Swal.fire('Error!', 'Update failed.', 'error');
//         }
//       });

//     }
//   });
// }

  resetForm() {
    this.editingFuelId = null;
    this.newFuel = {
      fuel_name: '',
      fuel_Desc: '',
      isapplicable: true,
       isActive: true  
    };
  }

  trackByFuel(index: number, fuel: any) {
  return fuel.fuel_id;
}
}