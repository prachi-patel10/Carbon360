// import { Component } from '@angular/core';
import { Component, OnInit, signal, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { VehicletypeService } from './vehicletype-service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { ChangeDetectorRef } from '@angular/core';

interface VehicleType {
  vehicle_type_id: string;
  vehicle_type_name: string;
  categoryId: string;
  categoryName: string;
  description?: string;
  isActive: boolean;
}


@Component({
  selector: 'app-vehicletype',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './vehicletype.html',
  styleUrls: ['./vehicletype.css'],
})
export class Vehicletype implements OnInit {

  vehicleForm!: FormGroup;
  searchForm!: FormGroup;

  vehicleTypes = signal<VehicleType[]>([]);
  totalRecords = signal(0);
  totalPages = signal(1);
  currentPage = signal(1);
  //requestedRecords = signal(5);
  onlyActive = signal<boolean | undefined>(true);
  searchText = signal('');
  refreshTrigger = signal(0);
  pageSizeOptions = [5, 10, 20];
  pageSize = signal(5);

  sortColumn = signal<string>('vehicle_type_name');
  sortDirection = signal<'asc' | 'desc'>('asc');

  constructor(
    private fb: FormBuilder,
    private service: VehicletypeService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
    effect(() => {
      //const refresh = this.refreshTrigger();
      const page = this.currentPage();
      const size = this.pageSize();
      //const size = this.requestedRecords();
      const search = this.searchText();
      const active = this.onlyActive();  
      //this.refreshTrigger();
     // this.refreshTrigger.update(v => v + 1);
      const refresh = this.refreshTrigger();
      //this.refreshTrigger();

      this.loadVehicleTypes(page, size, search, active);
    });
  }

  ngOnInit(): void {
    this.initForms();
  }

  initForms() {
    this.vehicleForm = this.fb.group({
      vehicle_type_id: [''],
      vehicle_type_name: ['', Validators.required],
      categoryId: ['', Validators.required],
      description: [''],
      isActive: [true]
    });

    this.searchForm = this.fb.group({
      searchText: ['']
    });

    this.searchForm.get('searchText')?.valueChanges.subscribe(val => {
      this.searchText.set(val || '');
      this.currentPage.set(1);
    });
  }

  onPageSizeChange(event: any) {
    this.pageSize.set(+event.target.value);
    this.currentPage.set(1);
  }

  openFilterModal() {
    this.filterModalOpen.set(true);
  }

  closeFilterModal() {
    this.filterModalOpen.set(false);
  }

  applyFilter() {
    this.currentPage.set(1);
    this.refreshTrigger.update(x => x + 1);
    this.closeFilterModal();
  }
onActiveFilterChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  this.onlyActive.set(checked ? true : false);  // true=active, false=inactive
  this.currentPage.set(1);
  this.refreshTrigger.update(v => v + 1);
}

  resetFilter() {
    this.filter.set({
      categoryIds: [],
      vehicleNames: []
    });

    this.currentPage.set(1);
    this.refreshTrigger.update(x => x + 1);
  }

  get startRecord(): number {
    if (this.totalRecords() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  get endRecord(): number {
    const end = this.currentPage() * this.pageSize();
    return end > this.totalRecords() ? this.totalRecords() : end;
  }

loadVehicleTypes(page: number, size: number, search: string, active?: boolean) {

   this.service.getPaged(
      page,
      size,
      search,
      active,
      this.sortColumn(),
      this.sortDirection()
    ).subscribe({
      next: (res: any) => {

        console.log('API RESPONSE:', res);

        // If API returns: { data: [], totalRecords, totalPages }

        const list = res.data || res;

        const mapped = (list.data || list).map((v: any) => ({
          vehicle_type_id: v.vehicle_type_id,
          vehicle_type_name: v.vehicle_type_name,
          categoryId: v.categoryId,
          categoryName: v.categoryName,
          description: v.description,
          isActive: v.isActive
        }));


        //let filtered = mapped;
        let filtered: VehicleType[] = mapped;

        const f = this.filter();

        // Category filter
        if (f.categoryIds.length > 0) {
          filtered = filtered.filter(v =>
            f.categoryIds.includes(String(v.categoryId))
          );
        }

        // Vehicle Name filter
        if (f.vehicleNames.length > 0) {
          filtered = filtered.filter(v =>
            f.vehicleNames.includes(v.vehicle_type_name)
          );
        }

        const selectedCategories = this.filter().categoryIds;

        if (selectedCategories.length > 0) {
          filtered = filtered.filter((v: VehicleType) =>
            selectedCategories.includes(String(v.categoryId))
          );
        }

        //this.vehicleTypes.set(filtered);
        this.vehicleTypes.set([...filtered]);

        this.totalRecords.set(res.totalRecords);
        this.totalPages.set(res.totalPages);
        // this.totalRecords.set(filtered.length);
        // this.totalPages.set(Math.ceil(filtered.length / size) || 1);
      },
      error: (err) => {
        console.error(err);
        //this.toastr.error('Failed to load vehicle types');
        this.showToast('Failed to load vehicle types', 'error');
      }
    });
  }

  filterModalOpen = signal(false);

  filter = signal({
    categoryIds: [] as string[],
    vehicleNames: [] as string[]
  });

  toggleCategory(id: string) {
    const selected = [...this.filter().categoryIds];
    const index = selected.indexOf(id);

    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(id);
    }

    this.filter.update(f => ({ ...f, categoryIds: selected }));
  }

  toggleVehicle(name: string) {
    const selected = [...this.filter().vehicleNames];
    const index = selected.indexOf(name);

    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(name);
    }

    this.filter.update(f => ({ ...f, vehicleNames: selected }));
  }

  isVehicleSelected(name: string): boolean {
    return this.filter().vehicleNames.includes(name);
  }

  isCategorySelected(id: string): boolean {
    return this.filter().categoryIds.includes(id);
  }


  sort(column: string) {

  if (this.sortColumn() === column) {
    this.sortDirection.set(
      this.sortDirection() === 'asc' ? 'desc' : 'asc'
    );
  } else {
    this.sortColumn.set(column);
    this.sortDirection.set('asc');
  }

  this.currentPage.set(1);
  this.refreshTrigger.update(v => v + 1);
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

      submit() {

  if (this.vehicleForm.invalid) return;

  const data = this.vehicleForm.value;
  const isCreate = !data.vehicle_type_id || data.vehicle_type_id === '';

  const request$ = isCreate
    ? this.service.create(data)
    : this.service.update(data);

  request$.subscribe({

    next: (res: any) => {

      console.log("SUCCESS RESPONSE:", res);

      this.showToast(
        isCreate
          ? 'Vehicle Type created successfully'
          : 'Vehicle Type updated successfully',
        'success'
      );

      this.refreshTrigger.update(v => v + 1);
      this.resetForm();
    },

    error: (err) => {

      console.log("ERROR RESPONSE:", err);

      // 🔥 sometimes backend returns success inside error
      if (err.status === 200 || err.status === 204) {

        this.showToast(
          isCreate
            ? 'Vehicle Type created successfully'
            : 'Vehicle Type updated successfully',
          'success'
        );

        this.refreshTrigger.update(v => v + 1);
        this.resetForm();
        return;
      }

      this.showToast(
        isCreate
          ? 'Create failed'
          : 'Update failed',
        'error'
      );
    }

  });

}

//     submit() {

//   if (this.vehicleForm.invalid) return;

//   const data = this.vehicleForm.value;
//   const isCreate = !data.vehicle_type_id || data.vehicle_type_id === '';

//   const request$ = isCreate
//     ? this.service.create(data)
//     : this.service.update(data);

//   request$.subscribe({

//     next: (res: any) => {

//       console.log("API RESPONSE:", res);

//       // always treat success
//       this.showToast(
//         isCreate
//           ? 'Vehicle Type created successfully'
//           : 'Vehicle Type updated successfully',
//         'success'
//       );

//       //  refresh table
//       this.refreshTrigger.update(v => v + 1);

//       // reset form
//       this.resetForm();
//     },

//     error: (err) => {

//       console.error("API ERROR:", err);

//       this.showToast(
//         isCreate
//           ? 'Create failed'
//           : 'Update failed',
//         'error'
//       );
//     }

//   });
// }
//     submit() {

//   if (this.vehicleForm.invalid) return;

//   const data = this.vehicleForm.value;

//   const isCreate = !data.vehicle_type_id || data.vehicle_type_id === '';

//   const request$ = isCreate
//     ? this.service.create(data)
//     : this.service.update(data);

//   request$.subscribe({
//     next: (res) => {

//       console.log("API SUCCESS:", res);

//       if (isCreate) {
//         this.showToast('Vehicle Type created successfully', 'success');
//       } else {
//         this.showToast('Vehicle Type updated successfully', 'success');
//       }

//       this.refreshTrigger.update(v => v + 1);

//       this.resetForm();
//     },

//     error: (err) => {

//       console.error("API ERROR:", err);

//       if (isCreate) {
//         this.showToast('Create failed', 'error');
//       } else {
//         this.showToast('Update failed', 'error');
//       }
//     }
//   });
// }

//     submit() {

//   if (this.vehicleForm.invalid) return;

//   const data = this.vehicleForm.value;
//   //const isCreate = !data.vehicle_type_id;
//    const isCreate = !data.vehicle_type_id || data.vehicle_type_id === '';

//   const request$ = isCreate
//     ? this.service.create(data)
//     : this.service.update(data);

//   request$.subscribe({
//     next: () => {

//       // ✅ SweetAlert toast
//       this.showToast(
//         isCreate
//           ? 'Vehicle Type created successfully'
//           : 'Vehicle Type updated successfully',
//         'success'
//       );

//       this.refreshTrigger.update(v => v + 1);
//       this.resetForm();
//     },

//     error: () => {
//       this.showToast(
//         isCreate
//           ? 'Create failed'
//           : 'Update failed',
//         'error'
//       );
//     }
//   });
// }

//     submit() {

//   if (this.vehicleForm.invalid) return;

//   const data = this.vehicleForm.value;
//   const isCreate = !data.vehicle_type_id;

//   const request$ = isCreate
//     ? this.service.create(data)
//     : this.service.update(data);

//   request$.subscribe({
//     next: () => {

//       // ✅ toast message
//       this.toastr.success(
//         isCreate
//           ? 'Vehicle Type created successfully'
//           : 'Vehicle Type updated successfully'
//       );

//       // ✅ trigger reload (IMPORTANT)
//       this.refreshTrigger.update(v => v + 1);

//       // ✅ reset form
//       this.resetForm();
//     },

//     error: () => {
//       this.toastr.error(
//         isCreate
//           ? 'Create failed'
//           : 'Update failed'
//       );
//     }
//   });
// }

//   submit() {

//     if (this.vehicleForm.invalid) return;

//     const data = this.vehicleForm.value;
//     const isCreate = !data.vehicle_type_id;

//     const obs = isCreate
//       ? this.service.create(data)
//       : this.service.update(data);

//     obs.subscribe({
//       next: () => {

//   this.toastr.success(
//     isCreate
//       ? 'Vehicle Type created successfully'
//       : 'Vehicle Type updated successfully'
//   );

//   // refresh list immediately
//   this.refreshTrigger.update(v => v + 1);

//   // reset form
//   this.resetForm();

// },
//       // next: () => {

//       //   // show correct message
//       //   this.toastr.success(
//       //     isCreate ? 'Vehicle Type created successfully'
//       //       : 'Vehicle Type updated successfully'
//       //   );

//       //   // delay refresh slightly so toastr can render
//       //   setTimeout(() => {
//       //     this.refreshTrigger.update(v => v + 1);
//       //     this.resetForm();
//       //   }, 100);

//       // },
//       error: () => {
//         this.toastr.error(
//           isCreate ? 'Create failed' : 'Update failed'
//         );
//       }
//     });
//   }
  // submit() {

  //   if (this.vehicleForm.invalid) return;

  //   const data = this.vehicleForm.value;
  //   const isCreate = !data.vehicle_type_id;

  //   const obs = isCreate
  //     ? this.service.create(data)
  //     : this.service.update(data);

  //   obs.subscribe({
  //     next: () => {
  //       this.toastr.success('Saved successfully');
  //       this.refreshTrigger.update(v => v + 1);
  //       this.resetForm();
  //     },
  //     error: () => this.toastr.error('Save failed')
  //   });
  // }

  // edit(v: VehicleType) {
  //   this.vehicleForm.patchValue(v);
  // }

  edit(v: VehicleType) {

    console.log(v);

    this.vehicleForm.patchValue({
      vehicle_type_id: v.vehicle_type_id,
      vehicle_type_name: v.vehicle_type_name,
      categoryId: v.categoryId,   //  now dropdown selects
      categoryName: v.categoryName,
      description: v.description,
      isActive: v.isActive
    });

  }

    deleteUI(v: VehicleType) {

  Swal.fire({
    title: 'Are you sure?',
    text: 'This will delete the vehicle type!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, Delete'
  }).then(result => {

    if (result.isConfirmed) {

      this.service.delete(v.vehicle_type_id).subscribe({

        next: () => {

          // ✅ SUCCESS
          this.showToast('Vehicle Type deleted successfully', 'success');

          this.refreshTrigger.update(x => x + 1);
        },

        error: (err) => {

          console.log("DELETE ERROR:", err);

          // ⚠️ Some APIs return 204 → Angular enters error block
          if (err.status === 200 || err.status === 204) {

            this.showToast('Vehicle Type deleted successfully', 'success');

            this.refreshTrigger.update(x => x + 1);
            return;
          }

          // ❌ real error
          this.showToast('Delete failed', 'error');
        }

      });

    }

  });

}

  // deleteUI(v: VehicleType) {
  //   Swal.fire({
  //     title: 'Are you sure?',
  //     text: 'This will delete the vehicle type!',
  //     icon: 'warning',
  //     showCancelButton: true
  //   }).then(result => {
  //     if (result.isConfirmed) {
  //       this.service.delete(v.vehicle_type_id).subscribe(() => {
  //         this.refreshTrigger.update(x => x + 1);
  //         Swal.fire('Deleted!', '', 'success');
  //       });
  //     }
  //   });
  // }

  toggleActive(v: VehicleType) {

    const newStatus = !v.isActive;

    Swal.fire({
      title: 'Change status?',
      icon: 'warning',
      showCancelButton: true
    }).then(result => {

      if (result.isConfirmed) {

        this.service.toggleActive(v.vehicle_type_id).subscribe(() => {

          this.vehicleTypes.update(list =>
            list.map(x =>
              x.vehicle_type_id === v.vehicle_type_id
                ? { ...x, isActive: newStatus }
                : x
            )
          );

          Swal.fire('Updated!', '', 'success');
        });
      }
    });
  }

  // resetForm() {
  //   this.vehicleForm.reset({
  //     vehicle_type_id: '',
  //     vehicle_type_name: '',
  //     categoryId: '',
  //     description: '',
  //     isActive: true
  //   });
  // }
  resetForm() {
  this.vehicleForm.reset();

  this.vehicleForm.patchValue({
    vehicle_type_id: '',
    vehicle_type_name: '',
    categoryId: '',
    description: '',
    isActive: true
  });
}

getSortIcon(column: string): string {
  if (this.sortColumn() !== column) return '↕';
  return this.sortDirection() === 'asc' ? '↑' : '↓';
}
  previousPage() {
    if (this.currentPage() > 1)
      this.currentPage.set(this.currentPage() - 1);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages())
      this.currentPage.set(this.currentPage() + 1);
  }
}
