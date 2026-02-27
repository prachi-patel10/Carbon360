// import { Component } from '@angular/core';
import { Component, OnInit, signal, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { VehicletypeService } from './vehicletype-service'; 
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

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
  styleUrl: './vehicletype.css',
})
export class Vehicletype implements OnInit{

      vehicleForm!: FormGroup;
  searchForm!: FormGroup;

  vehicleTypes = signal<VehicleType[]>([]);
  totalRecords = signal(0);
  totalPages = signal(1);
  currentPage = signal(1);
  requestedRecords = signal(5);
  onlyActive = signal(false);
  searchText = signal('');
  refreshTrigger = signal(0);

  constructor(
    private fb: FormBuilder,
    private service: VehicletypeService,
    private toastr: ToastrService
  ) {
    effect(() => {
      const page = this.currentPage();
      const size = this.requestedRecords();
      const search = this.searchText();
      const active = this.onlyActive();
      this.refreshTrigger();

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


   get startRecord(): number {
  if (this.totalRecords() === 0) return 0;
  return (this.currentPage() - 1) * this.requestedRecords() + 1;
}

get endRecord(): number {
  const end = this.currentPage() * this.requestedRecords();
  return end > this.totalRecords() ? this.totalRecords() : end;
}

  // loadVehicleTypes(page: number, size: number, search: string, active: boolean) {
  //   this.service.getPaged(page, size, search, active).subscribe({
  //     next: (res: any) => {

  //       const result = res.data;

  //       const mapped = result.data.map((v: any) => ({
  //         vehicle_type_id: v.vehicle_type_id,
  //         vehicle_type_name: v.vehicle_type_name,
  //         categoryName: v.categoryName,
  //         description: v.description,
  //         isActive: v.isActive
  //       }));

  //       this.vehicleTypes.set(mapped);
  //       this.totalRecords.set(result.totalRecords);
  //       this.totalPages.set(result.totalPages);
  //     },
  //     error: () => this.toastr.error('Failed to load vehicle types')
  //   });
  // }
  loadVehicleTypes(page: number, size: number, search: string, active: boolean) {
  this.service.getPaged(page, size, search, active).subscribe({
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
      

      this.vehicleTypes.set(mapped);

      this.totalRecords.set(res.totalRecords || 0);
      this.totalPages.set(res.totalPages || 1);
    },
    error: (err) => {
      console.error(err);
      this.toastr.error('Failed to load vehicle types');
    }
  });
}

// loadVehicleTypes(page: number, size: number, search: string, active: boolean) {
//   this.service.getPaged(page, size, search, active).subscribe({
//     next: (res: any) => {

//       console.log('API RESPONSE:', res);

//       const list = res.data || res;

//       const mapped = (list.data || list).map((v: any) => ({
//         vehicle_type_id: v.vehicle_type_id,
//         vehicle_type_name: v.vehicle_type_name,
//         categoryId: v.categoryId,
//         categoryName: v.categoryName,
//         description: v.description,
//         isActive: v.isActive
//       }));

//       // ✅ ADD FILTERING HERE
//       let filtered = mapped;

//       const f = this.filter();

//       // if (f.categoryIds.length > 0) {
//       //   filtered = filtered.filter(v:VehicleType =>
//       //     f.categoryIds.includes(v.categoryId)
//       //   );
//       // }

//       if (f.categoryIds.length > 0) {
//   filtered = filtered.filter((v: VehicleType) =>
//     f.categoryIds.includes(v.categoryId ?? '')
//   );
// }

//       // ✅ SET FILTERED DATA
//       this.vehicleTypes.set(filtered);

//       // ⚠️ optional: update totalRecords based on filter
//       this.totalRecords.set(filtered.length);
//       this.totalPages.set(Math.ceil(filtered.length / this.requestedRecords()) || 1);
//     },
//     error: (err) => {
//       console.error(err);
//       this.toastr.error('Failed to load vehicle types');
//     }
//   });
// }

  filterModalOpen = signal(false);

filter = signal({
  categoryIds: [] as string[]
});

// showFilterModal() {
//   this.filterModalOpen.set(true);
// }

// closeFilterModal() {
//   this.filterModalOpen.set(false);
// }

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

isCategorySelected(id: string): boolean {
  return this.filter().categoryIds.includes(id);
}

// applyFilter() {
//   this.currentPage.set(1);
//   this.refreshTrigger.update(x => x + 1);
//   this.closeFilterModal();
// }

// resetFilter() {
//   this.filter.set({ categoryIds: [] });
//   this.refreshTrigger.update(x => x + 1);
// }

  submit() {

  if (this.vehicleForm.invalid) return;

  const data = this.vehicleForm.value;
  const isCreate = !data.vehicle_type_id;

  const obs = isCreate
    ? this.service.create(data)
    : this.service.update(data);

  obs.subscribe({
    next: () => {

      // show correct message
      this.toastr.success(
        isCreate ? 'Vehicle Type created successfully'
                 : 'Vehicle Type updated successfully'
      );

      // delay refresh slightly so toastr can render
      setTimeout(() => {
        this.refreshTrigger.update(v => v + 1);
        this.resetForm();
      }, 100);

    },
    error: () => {
      this.toastr.error(
        isCreate ? 'Create failed' : 'Update failed'
      );
    }
  });
}
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
    categoryId: v.categoryId,   // ✅ now dropdown selects
    categoryName:v.categoryName,
    description: v.description,
    isActive: v.isActive
  });

}


  deleteUI(v: VehicleType) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the vehicle type!',
      icon: 'warning',
      showCancelButton: true
    }).then(result => {
      if (result.isConfirmed) {
        this.service.delete(v.vehicle_type_id).subscribe(() => {
          this.refreshTrigger.update(x => x + 1);
          Swal.fire('Deleted!', '', 'success');
        });
      }
    });
  }

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

  resetForm() {
    this.vehicleForm.reset({
      vehicle_type_id: '',
      vehicle_type_name: '',
      categoryId: '',
      description: '',
      isActive: true
    });
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
