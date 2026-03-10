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
  ) {}

  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');
    console.log("Operation ID:", id);

    if (id) {
      this.loadOperation(id);
    }
  }

loadOperation(id: string) {

  this.service.getById(id).subscribe({
    next: (res: any) => {

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
    error: () => {
      Swal.fire('Error', 'Failed to load operation', 'error');
    }
  });

}
approve() {
  this.service.updateStatus(this.operation.operationId, 2).subscribe(() => {

    Swal.fire({
      title: 'Approved',
      text: 'Record Approved Successfully',
      icon: 'success'
    }).then(() => {
      this.router.navigate(['/dashboard/MyActionGenerator']);
    });

  });
}

  reject() {

    this.service.updateStatus(this.operation.operationId, 3).subscribe(() => {

      Swal.fire({
        title: 'Rejected',
        text: 'Record Rejected',
        icon: 'error'
      }).then(() => {
        this.router.navigate(['/dashboard/MyActionGenerator']);
      });

    });

  }

}