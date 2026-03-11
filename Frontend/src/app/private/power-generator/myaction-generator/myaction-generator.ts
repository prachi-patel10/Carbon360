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
  sortColumn = signal<string>('');   // current column
  sortDirection = signal<'asc' | 'desc'>('asc');  // asc or desc


  constructor(private service: GeneratorOperationService, private router: Router) { }

  ngOnInit(): void {
    this.fetchData();
    const user = localStorage.getItem('user');

    if (user) {
      const parsedUser = JSON.parse(user);
      this.userRole = parsedUser.currentRole;
    }
  }

  //   fetchData() {

  //     this.service.fetchOperations(
  //       this.currentPage(),
  //       this.pageSize
  //     ).subscribe({
  //       next: (res) => {
  //         this.data.set(res.records);
  //         this.totalRecords.set(res.totalRecords);
  //       },
  //       error: () => {
  //         Swal.fire('Error', 'Failed to load records', 'error');
  //       }
  //     });

  //   }




  //   totalPages(): number {
  //     return Math.ceil(this.totalRecords() / this.pageSize);
  //   }

  //   goToPage(page: number) {
  //     if (page < 1 || page > this.totalPages()) return;

  //     this.currentPage.set(page);
  //     this.fetchData();
  //   }
  // getActionText(item: GeneratorOp): string {
  //   const status = Number(item.status);   // <-- changed here
  // if (this.userRole === 'Corporate') {
  //   if (status === 2) return 'Approved';
  //   if (status === 3) return 'Rejected';
  //   if (status === 1 || status === 0) return 'Review';  // <-- include 0
  // }
  // if (this.userRole === 'Reporter') {
  //   if (status === 3) return 'Edit';
  //   if (status === 1 || status === 0) return 'Reported';  // <-- include 0
  //   if (status === 2) return 'Approved';
  // }
  //   return 'unKnown';
  // }

  // handleAction(item: GeneratorOp) {
  //   const status = Number(item.status);   // <-- changed here

  //   if (this.userRole === 'Corporate') {
  //     if (status === 1) {
  //       this.router.navigate(['/dashboard/generator-review', item.operationId]);
  //     }
  //     return;
  //   }

  //   if (this.userRole === 'Reporter') {
  //     if (status === 3) {
  //       this.router.navigate(['/dashboard/generator-ec', item.operationId]);
  //     }
  //   }
  // }
  //   changePageSize(event: any) {
  //     this.pageSize = Number(event.target.value);
  //     this.currentPage.set(1);
  //     this.fetchData();
  //   }

  // getStatusText(status: number | string) {

  //   const s = Number(status);

  //   if (s === 1) return 'Reported';
  //   if (s === 2) return 'Approved';
  //   if (s === 3) return 'Rejected';

  //   return 'Unknown';
  // }
  // edit(operationId: string) {

  //   if (this.userRole === 'Corporate') {

  //     // Corporate opens review page
  //     this.router.navigate(['/dashboard/generator-review', operationId]);

  //   } else if (this.userRole === 'Reporter') {

  //     // Reporter opens editable form
  //     this.router.navigate(['/dashboard/generator-ec', operationId]);

  //   }

  // }

  sortBy(column: keyof GeneratorOp) {
    if (this.sortColumn() === column) {
      // toggle direction
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }

    const sortedData = [...this.data()].sort((a, b) => {
      const valA = a[column];
      const valB = b[column];

      // numeric comparison
      if (typeof valA === 'number' && typeof valB === 'number') {
        return this.sortDirection() === 'asc' ? valA - valB : valB - valA;
      }

      // date comparison
      if (column === 'opDate') {
        const dateA = new Date(valA as string).getTime();
        const dateB = new Date(valB as string).getTime();
        return this.sortDirection() === 'asc' ? dateA - dateB : dateB - dateA;
      }

      // string comparison
      const strA = valA ? valA.toString().toLowerCase() : '';
      const strB = valB ? valB.toString().toLowerCase() : '';
      return this.sortDirection() === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    this.data.set(sortedData);
  }

  fetchData() {
    this.service.fetchOperations(this.currentPage(), this.pageSize).subscribe({
      next: (res) => {
        this.data.set(res.records);
        this.totalRecords.set(res.totalRecords);
      },
      error: () => Swal.fire('Error', 'Failed to load records', 'error')
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

  // Status / Actions
  getStatusText(status: number) {
    switch (status) {
      case 1: return 'Reported';
      case 2: return 'Approved';
      case 3: return 'Rejected';
      default: return 'Unknown';
    }
  }

  getActionText(item: GeneratorOp): string {
    const status = item.status;
    if (this.userRole === 'Corporate') {
      if (status === 2) return 'Approved';
      if (status === 3) return 'Rejected';
      if (status === 1) return 'Review';
    }
    if (this.userRole === 'Reporter') {
      if (status === 3) return 'Edit';
      if (status === 1) return 'Reported';
      if (status === 2) return 'Approved';
    }
    return 'Unknown';
  }

  // handleAction(item: GeneratorOp) {
  //   const status = item.status;
  //   if (this.userRole === 'Corporate' && status === 1) {
  //     this.router.navigate(['/dashboard/generator-review', item.operationId]);
  //   }
  //   if (this.userRole === 'Reporter' && status === 3) {
  //     this.router.navigate(['/dashboard/generator-ec', item.operationId]);
  //   }
  // }

  handleAction(item: GeneratorOp) {

    // CORPORATE
    if (this.userRole === 'Corporate' && item.status === 1) {

      this.router.navigate(
        ['/dashboard/generator-ec', item.operationId],
        {
          queryParams: { mode: 'review' }
        }
      );

    }

    // REPORTER (Edit rejected)
    if (this.userRole === 'Reporter' && item.status === 3) {

      this.router.navigate(
        ['/dashboard/generator-ec', item.operationId],
        {
          queryParams: { mode: 'edit' }
        }
      );

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

  // edit(operationId: string) {
  //   if (this.userRole === 'Corporate') this.router.navigate(['/dashboard/generator-review', operationId]);
  //   else if (this.userRole === 'Reporter') this.router.navigate(['/dashboard/generator-ec', operationId]);
  // }

  edit(operationId: string) {
    if (this.userRole === 'Corporate') {
      this.router.navigate(['/dashboard/generator-review', operationId], {
        queryParams: { review: true }
      });
    } else if (this.userRole === 'Reporter') {
      this.router.navigate(['/dashboard/generator-ec', operationId], {
        queryParams: { review: false }
      });
    }
  }
}