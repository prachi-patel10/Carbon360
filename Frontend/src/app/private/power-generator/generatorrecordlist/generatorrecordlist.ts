import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GeneratorecService } from '../generator-ec/generatorec-service';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-generator-review',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generatorrecordlist.html',
  styleUrls: ['./generatorrecordlist.css']
})
export class GeneratorReviewComponent implements OnInit {

  operation: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: GeneratorecService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id'); // always string
    if (id) {
      this.loadOperation(id); // pass string directly
    }
  }

  loadOperation(id: string) {
    this.service.getById(id).subscribe({
      next: (res: any) => {
        if (!res || !res.data) {
          Swal.fire('Error', 'Operation not found', 'error');
          return;
        }

        const data = res.data;

        const gwP_CH4 = 28;
        const gwP_NO2 = 265;

        const co2 = data.totalCO2 ?? 0;
        const ch4 = data.totalCH4 ?? 0;
        const no2 = data.totalNO2 ?? 0;

        const totalEmission = co2 + (ch4 * gwP_CH4) + (no2 * gwP_NO2);

        this.operation = {
          ...data,
          cO2: co2,
          cH4: ch4,
          nO2: no2,
          gwP_CH4,
          gwP_NO2,
          totalEmission
        };

      },
      error: () => Swal.fire('Error', 'Failed to load operation', 'error')
    });
  }

  approve() {
    if (!this.operation) return;

    this.service.updateStatus(this.operation.operationId, 2).subscribe({
      next: () => {
        Swal.fire('Approved', 'Record Approved Successfully', 'success')
          .then(() => this.router.navigate(['/dashboard/MyActionGenerator']));
      },
      error: (err) => {
        Swal.fire('Error', 'Cannot approve record. ' + err.message, 'error');
      }
    });
  }

  reject() {
    if (!this.operation) return;

    this.service.updateStatus(this.operation.operationId, 3).subscribe({
      next: () => {
        Swal.fire('Rejected', 'Record Rejected Successfully', 'error')
          .then(() => this.router.navigate(['/dashboard/MyActionGenerator']));
      },
      error: (err) => {
        Swal.fire('Error', 'Cannot reject record. ' + err.message, 'error');
      }
    });
  }
}