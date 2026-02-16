import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject, Inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SectionService } from './section-service';
import { ToastService } from '../../../core/toast/toastservice';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-section',
  imports: [RouterLink, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './section.html',
  styleUrl: './section.css',
})
export class Section {

  dept: any[] = [];
  // section: any[] = [];
  http = Inject(HttpClient);
  filteredSections: any[] = [];
  isEditMode: boolean = false;
  editId: string = '';
  searchText: string = '';
  cdr = inject(ChangeDetectorRef);
  activeOnly: boolean = true;

  totalRecords: number = 0;
  totalPages: number = 0;
  pageNumber: number = 1;
  pageSize: number = 5;

  sortColumn: string = "SectionName";
  sortDirection: string = "asc";

  pageSizes: number[] = [5, 10, 15];

  allSections: any[] = [];
  filtredSection: any[] = [];




  sectionData: FormGroup = new FormGroup({
    departmentId: new FormControl('', Validators.required),
    sectionName: new FormControl('', Validators.required),
    shortCode: new FormControl('', [Validators.required, Validators.maxLength(3)]),
    isActive: new FormControl(true)
  })

  ngOnInit(): void {
    this.getDept();
    this.loadSections();
  }
  constructor(private _services: SectionService, private dct: ChangeDetectorRef, private toastr: ToastService) {
    this.getDept();
    this.loadSections();
  }


  applyFilter() {
    let data = [...this.allSections];


    if (this.searchText && this.searchText.trim() !== '') {
      const search = this.searchText.toLowerCase();

      data = data.filter(s =>
        s.sectionName.toLowerCase().includes(search) ||
        s.departmentName.toLowerCase().includes(search) ||
        s.shortCode.toLowerCase().includes(search)
      );
    }


    if (this.activeOnly) {
      data = data.filter(s => s.isActive === true);
    }

    this.filteredSections = data;
    this.cdr.detectChanges();
  }

  updateSection() {

    if (this.sectionData.invalid) {
      this.sectionData.markAllAsTouched();
      return;
    }

    const updateObj = {
      ...this.sectionData.value
    };

    this._services.updateSection(this.editId, updateObj).subscribe({
      next: () => {
        this.toastr.success("Section Updated Successfully");
        this.resetForm();
        this.loadSections();
      },
      error: (err) => {
        this.toastr.error(err.error.errors.join(","));
      }
    });
  }


  resetForm() {
    this.sectionData.reset({ isActive: true });
    this.isEditMode = false;
    this.editId = '';
    this.cdr.detectChanges();
  }

  createDept() {
    if (this.sectionData.invalid) {
      this.sectionData.markAllAsTouched();
      return;
    }
    const secObj = this.sectionData.value;
    this._services.createSection(secObj).subscribe({
      next: (res: any) => {
        this.toastr.success("Added SuccessFully");
        this.sectionData.reset({
          isActive: true
        });

        this.loadSections();
      }, error: (err) => {
        if (err.error?.errors && err.error.errors.length > 0) {
          this.toastr.error(err.error.errors[0]);
        }
        console.log("Network error:", err.error);

        if (typeof err.error === 'string') {
          this.toastr.error(err.error);
        } else {
          this.toastr.error("Unable to add section");
        }
      }
    });
  }

  onEdit(item: any) {

    this.isEditMode = true;
    this.editId = item.Id;

    this._services.getSectionById(item.Id).subscribe({
      next: (res: any) => {

        const data = res.data ?? res;

        this.sectionData.patchValue({
          departmentId: data.departmentId,
          sectionName: data.sectionName,
          shortCode: data.shortCode,
          isActive: data.isActive
        });

      },
      error: () => {
        this.toastr.error("Unable to fetch section details");
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }



  onDelete(hashSectId: string) {

    console.log("Delete HashId:", hashSectId);

    if (!hashSectId) {
      this.toastr.error("HashId missing!");
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "Do you want to delete this section?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, Delete!",
      cancelButtonText: "Cancel"
    }).then((result) => {
      // const isDel = confirm("Do you want to delete section? ");
      if (result.isConfirmed) {
        this._services.deleteSection(hashSectId).subscribe({
          next: () => {
            this.toastr.success("Section Deleted");
            // this.getSection();
            this.loadSections();
            this.dct.detectChanges();
          }, error: (err) => {
            console.log(err);

            this.toastr.success("unable to delete" + err.message);
          }
        });
      }
    });
  }

  getDept() {
    this._services.getAllDept().subscribe({
      next: (res: any) => {
        this.dept = res.data;
        console.log(this.dept);
        this.dct.detectChanges();
      }, error: (err) => {
        console.log(err);
      }
    });
  }

  onFilterChange() {
    this.pageNumber = 1;
    this.loadSections();
    this.cdr.detectChanges();
  }

  onSearch() {
    this.pageNumber = 1;
    this.loadSections();
    this.cdr.detectChanges();
  }

  nextPage() {
  if (this.pageNumber < this.totalPages) {
    this.pageNumber++;
    this.loadSections();
  }
}

  onPageSizeChange() {
    this.pageNumber = 1;
    this.loadSections();
    this.cdr.detectChanges();
  }

  toggleStatus(item: any) {

    const newStatus = !item.isActive;

    this._services.updateSectionStatus(item.id, newStatus).subscribe({
      next: () => {
        item.isActive = newStatus;
        this.loadSections();
        this.toastr.success("Status Updated Successfully");
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.log(err);
        this.toastr.error("Unable to update status");
      }
    });

  }


  sort(column: string) {

    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    }
    else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.cdr.detectChanges();
    this.loadSections();
  }

  prevPage() {
  if (this.pageNumber > 1) {
    this.pageNumber--;
    this.loadSections();
  }
}


  loadSections() {

    const apiDirection = this.sortDirection.toUpperCase();
    const activeFilter = this.activeOnly ? true : undefined;
    this._services.getAllSection(
      this.searchText,
      activeFilter,
      // this.activeOnly,
      this.pageNumber,
      this.pageSize,
      this.sortColumn,
      apiDirection
      // this.sortDirection
    ).subscribe({
      next: (res: any) => {
        this.filteredSections = res.Data;
        this.totalRecords =res.Pagination.TotalRecords;
        this.totalPages = res.Pagination.TotalPages;
         this.pageNumber = res.Pagination.CurrentPage;
        this.cdr.detectChanges();
      },
      error: err => console.log(err)
    });

  }
}
