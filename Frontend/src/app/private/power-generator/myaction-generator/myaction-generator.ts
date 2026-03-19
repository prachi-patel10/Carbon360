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
  userRole: string = '';

  // Plain strings now — matches vehicle myaction pattern
  sortColumn = 'EntryDate';
  sortDirection = 'DESC';

  constructor(private service: GeneratorOperationService, private router: Router) { }

  ngOnInit(): void {
    this.fetchData();
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      this.userRole = parsed.currentRole?.toLowerCase();
    }
  }

  // ─── Fetch ────────────────────────────────────────────────────

  fetchData() {
    this.service.getMyActions(
      this.currentPage(),
      this.pageSize,
      this.sortColumn,
      this.sortDirection
    ).subscribe({
      next: (res) => {
        this.data.set(res.records);
        this.totalRecords.set(res.totalRecords);
      },
      error: () => Swal.fire('Error', 'Failed to load records', 'error')
    });
  }

  // ─── Sort ─────────────────────────────────────────────────────

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'ASC';
    }
    this.currentPage.set(1);
    this.fetchData();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '↕';
    return this.sortDirection === 'ASC' ? '↑' : '↓';
  }

  // ─── Pagination ───────────────────────────────────────────────

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

  // ─── Actions ──────────────────────────────────────────────────

  handleAction(item: GeneratorOp) {
    if (!item.operationId) return;

    if (this.userRole === 'corporate') {
      this.router.navigate(['/dashboard/generator-ec', item.operationId], {
        queryParams: { mode: 'review', page: 'myaction' }
      });
    } else if (this.userRole === 'reporter') {
      this.router.navigate(['/dashboard/generator-ec', item.operationId], {
        queryParams: { mode: 'edit', page: 'myaction' }
      });
    } else if (this.userRole === 'admin') {
      this.router.navigate(['/dashboard/generator-ec', item.operationId], {
        queryParams: { mode: 'view', page: 'myaction' }
      });
    }
  }

  approve(item: GeneratorOp) {
    this.service.updateStatus(item.operationId, 2).subscribe({
      next: () => {
        Swal.fire('Approved', 'Record Approved Successfully', 'success');
        this.fetchData();
      },
      error: (err) => Swal.fire('Error', 'Cannot approve record: ' + err.message, 'error')
    });
  }

  reject(item: GeneratorOp) {
    this.service.updateStatus(item.operationId, 3).subscribe({
      next: () => {
        Swal.fire('Rejected', 'Record Rejected Successfully', 'error');
        this.fetchData();
      },
      error: (err) => Swal.fire('Error', 'Cannot reject record: ' + err.message, 'error')
    });
  }

  getStatusText(status: number) {
    switch (status) {
      case 1: return 'Reported';
      case 2: return 'Approved';
      case 3: return 'Rejected';
      default: return 'Unknown';
    }
  }
}