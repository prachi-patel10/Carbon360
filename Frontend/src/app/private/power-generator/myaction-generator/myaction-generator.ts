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


  constructor(private service: GeneratorOperationService,private router : Router) {}

  ngOnInit(): void {
    this.fetchData();
      const user = localStorage.getItem('user');

  if (user) {
    const parsedUser = JSON.parse(user);
    this.userRole = parsedUser.currentRole;
  }
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




  totalPages(): number {
    return Math.ceil(this.totalRecords() / this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;

    this.currentPage.set(page);
    this.fetchData();
  }
getActionText(item: GeneratorOp): string {
  const status = Number(item.status);   // <-- changed here
if (this.userRole === 'Corporate') {
  if (status === 2) return 'Approved';
  if (status === 3) return 'Rejected';
  if (status === 1 || status === 0) return 'Review';  // <-- include 0
}
if (this.userRole === 'Reporter') {
  if (status === 3) return 'Edit';
  if (status === 1 || status === 0) return 'Reported';  // <-- include 0
  if (status === 2) return 'Approved';
}
  return 'Unknown';
}

handleAction(item: GeneratorOp) {
  const status = Number(item.status);   // <-- changed here

  if (this.userRole === 'Corporate') {
    if (status === 1) {
      this.router.navigate(['/dashboard/generator-review', item.operationId]);
    }
    return;
  }

  if (this.userRole === 'Reporter') {
    if (status === 3) {
      this.router.navigate(['/dashboard/generator-ec', item.operationId]);
    }
  }
}
  changePageSize(event: any) {
    this.pageSize = Number(event.target.value);
    this.currentPage.set(1);
    this.fetchData();
  }

getStatusText(status: number | string) {

  const s = Number(status);

  if (s === 1) return 'Reported';
  if (s === 2) return 'Approved';
  if (s === 3) return 'Rejected';

  return 'Unknown';
}
edit(operationId: string) {

  if (this.userRole === 'Corporate') {

    // Corporate opens review page
    this.router.navigate(['/dashboard/generator-review', operationId]);

  } else if (this.userRole === 'Reporter') {

    // Reporter opens editable form
    this.router.navigate(['/dashboard/generator-ec', operationId]);

  }

}


}