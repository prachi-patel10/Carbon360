import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { GeneratorOp, GeneratorOperationService, GeneratorOpResponse } from './myaction-generator-service';



export interface GeneratorData {
  name: string;
  opDate: string;
  runHours: number;
  loadFactor: number;
  fuelConsumed: number;
  totalCO2: number;
  totalNO2: number;
  totalCH4: number;
  totalEmission: number;
  status: string;
}

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

  // Filters
  filterName = new FormControl('');
  filterFuelType = new FormControl('');
  filterStatus = new FormControl('');

  constructor(private generatorService: GeneratorOperationService) {}

  ngOnInit(): void {
    this.fetchData(this.currentPage(), this.pageSize);

    // Re-fetch on filter changes
    this.filterName.valueChanges.subscribe(() => this.resetAndFetch());
    this.filterFuelType.valueChanges.subscribe(() => this.resetAndFetch());
    this.filterStatus.valueChanges.subscribe(() => this.resetAndFetch());
  }

  resetAndFetch() {
    this.currentPage.set(1);
    this.fetchData(this.currentPage(), this.pageSize);
  }

  fetchData(page: number, pageSize: number) {
    this.isLoading.set(true);

    // **Use fetchOperations() instead of getGenerators()**
    this.generatorService.fetchOperations(
      page,
      pageSize,
      this.filterName.value || '',
      this.filterFuelType.value || '',
      this.filterStatus.value || ''
    ).subscribe({
      next: (res: GeneratorOpResponse) => {  // <-- Add explicit type
        this.data.set(res.data);
        this.totalRecords.set(res.total);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        Swal.fire('Error', 'Failed to load data', 'error');
      }
    });
  }

  approve(item: GeneratorOp) {
    const statusId = 2; // Approved
    this.generatorService.updateStatus(item.id, statusId).subscribe({
      next: (success) => {
        if (success) {
          Swal.fire('Approved', `${item.name} approved successfully!`, 'success');
          this.fetchData(this.currentPage(), this.pageSize); // Refresh table
        }
      },
      error: () => Swal.fire('Error', 'Failed to update status', 'error')
    });
  }

  reject(item: GeneratorOp) {
    const statusId = 3; // Rejected
    this.generatorService.updateStatus(item.id, statusId).subscribe({
      next: (success) => {
        if (success) {
          Swal.fire('Rejected', `${item.name} rejected successfully!`, 'error');
          this.fetchData(this.currentPage(), this.pageSize); // Refresh table
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
    this.fetchData(page, this.pageSize);
  }
}