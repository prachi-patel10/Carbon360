// import { Component, Input, Output, EventEmitter } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import Swal from 'sweetalert2';
// import { GeneratorOperationService, GeneratorOp } from '../myaction-generator/myaction-generator-service';

// @Component({
//   selector: 'app-generator-approval',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './generatorrecordlist.html',
//   styleUrls: ['./generatorrecordlist.css']
// })
// export class GeneratorApprovalComponent {

//   @Input() item!: GeneratorOp;
//   @Output() close = new EventEmitter<void>();

//   constructor(private service: GeneratorOperationService) {}

//   approve() {
//     this.service.updateStatus(this.item.id, 2).subscribe({
//       next: () => {
//         Swal.fire('Approved', 'Operation approved successfully', 'success');
//         this.close.emit();
//       },
//       error: () => Swal.fire('Error', 'Approval failed', 'error')
//     });
//   }

//   reject() {
//     this.service.updateStatus(this.item.id, 3).subscribe({
//       next: () => {
//         Swal.fire('Rejected', 'Operation rejected', 'error');
//         this.close.emit();
//       },
//       error: () => Swal.fire('Error', 'Rejection failed', 'error')
//     });
//   }

// }