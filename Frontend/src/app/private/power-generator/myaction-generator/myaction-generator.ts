import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { GeneratorOp, GeneratorOperationService, GeneratorOpResponse } from './myaction-generator-service';

@Component({
  selector: 'app-myaction-generator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './myaction-generator.html',
  styleUrls: ['./myaction-generator.css']
})
export class MyactionGenerator implements OnInit {

  data = signal<GeneratorOp[]>([]);
  totalRecords = signal(0);
  currentPage = signal(1);
  pageSize = 10;
  isLoading: WritableSignal<boolean> = signal(false);

  filterName = new FormControl('');
  filterFuelType = new FormControl('');
  filterStatus = new FormControl('');

  constructor(private generatorService: GeneratorOperationService) {}

  ngOnInit(): void {
    this.fetchData(); // fetch all records on load

    // Refetch on filter change
    this.filterName.valueChanges.subscribe(() => this.resetAndFetch());
    this.filterFuelType.valueChanges.subscribe(() => this.resetAndFetch());
    this.filterStatus.valueChanges.subscribe(() => this.resetAndFetch());
  }

  resetAndFetch() {
    this.currentPage.set(1);
    this.fetchData();
  }

  fetchData() {
    this.isLoading.set(true);

    this.generatorService.fetchOperations(
      this.currentPage(),
      this.pageSize,
      this.filterName.value || undefined,
      this.filterFuelType.value || undefined,
      this.filterStatus.value || undefined
    ).subscribe({
      next: (res: GeneratorOpResponse) => {
        this.data.set(res.records);
        this.totalRecords.set(res.totalRecords);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        Swal.fire('Error', 'Failed to load data', 'error');
      }
    });
  }

  getStatusText(statusId: number): string {
    return statusId === 1 ? 'Reported' : statusId === 2 ? 'Approved' : statusId === 3 ? 'Rejected' : 'Unknown';
  }

  getStatusClass(statusId: number): string {
    return statusId === 1 ? 'reported' : statusId === 2 ? 'approved' : statusId === 3 ? 'rejected' : '';
  }

  approve(item: GeneratorOp) {
    this.generatorService.updateStatus(item.id, 2).subscribe({
      next: success => {
        if (success) {
          Swal.fire('Approved', `${item.name} approved successfully!`, 'success');
          this.fetchData();
        }
      },
      error: () => Swal.fire('Error', 'Failed to update status', 'error')
    });
  }

  reject(item: GeneratorOp) {
    this.generatorService.updateStatus(item.id, 3).subscribe({
      next: success => {
        if (success) {
          Swal.fire('Rejected', `${item.name} rejected successfully!`, 'error');
          this.fetchData();
        }
      },
      error: () => Swal.fire('Error', 'Failed to update status', 'error')
    });
  }

  totalPages(): number {
    return Math.ceil(this.totalRecords() / this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.fetchData();
  }

  changePageSize(event: any) {
    this.pageSize = Number(event.target.value);
    this.currentPage.set(1);
    this.fetchData();
  }

  edit(item: GeneratorOp) {
  Swal.fire({
    title: 'Edit Generator',
    html: `
      <input id="swal-name" class="swal2-input" placeholder="Name" value="${item.name}">
      <input id="swal-runHours" type="number" class="swal2-input" placeholder="Run Hours" value="${item.runHours}">
      <input id="swal-loadFactor" type="number" class="swal2-input" placeholder="Load Factor" value="${item.loadFactor}">
    `,
    confirmButtonText: 'Save',
    showCancelButton: true,
    preConfirm: () => {
      const name = (document.getElementById('swal-name') as HTMLInputElement).value;
      const runHours = +(document.getElementById('swal-runHours') as HTMLInputElement).value;
      const loadFactor = +(document.getElementById('swal-loadFactor') as HTMLInputElement).value;
      return { name, runHours, loadFactor };
    }
  }).then((result) => {
    if (result.isConfirmed) {
      // Call your API to update the generator record
      Swal.fire('Saved!', 'Generator updated successfully', 'success');
      // Optionally refresh the table
      this.fetchData();
    }
  });
}
}