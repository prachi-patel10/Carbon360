import { Component, OnInit, signal } from '@angular/core';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { GeneratorOp, GeneratorOperationService } from './myaction-generator-service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-myaction-generator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './myaction-generator.html',
  styleUrls: ['./myaction-generator.css']
})
export class MyactionGenerator implements OnInit {

  data = signal<GeneratorOp[]>([]);
  totalRecords = signal(0);
  currentPage = signal(1);
  pageSize = 10;

  constructor(private service: GeneratorOperationService,private router : Router) {}

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {

    this.service.fetchOperations(
      this.currentPage(),
      this.pageSize
    ).subscribe({
      next: (res) => {
        this.data.set(res.records);
        this.totalRecords.set(res.totalRecords);
      },
      error: () => {
        Swal.fire('Error', 'Failed to load records', 'error');
      }
    });

  }

  approve(item: GeneratorOp) {

    this.service.updateStatus(item.operationId, 2).subscribe({
      next: () => {
        Swal.fire('Approved', 'Record Approved', 'success');
        this.fetchData();
      }
    });

  }

  reject(item: GeneratorOp) {

    this.service.updateStatus(item.operationId, 3).subscribe({
      next: () => {
        Swal.fire('Rejected', 'Record Rejected', 'error');
        this.fetchData();
      }
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

  getStatusText(status: number) {
    if (status === 1) return 'Reported';
    if (status === 2) return 'Approved';
    if (status === 3) return 'Rejected';
    return 'Unknown';
  }

  edit(operationId: string) {
    this.router.navigate(['/dashboard/generator-ec',operationId])
  }

}