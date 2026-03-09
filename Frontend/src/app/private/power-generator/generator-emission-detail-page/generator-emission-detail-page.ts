import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SearchGeneratorService } from '../search-generator/search-generator-service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';


@Component({
  selector: 'app-generator-emission-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generator-emission-detail-page.html',
  styleUrls: ['./generator-emission-detail-page.css']
})
export class GeneratorEmissionDetailComponent implements OnInit {

  operation: any;

  constructor(
    private route: ActivatedRoute,
     private router: Router,
    private service: SearchGeneratorService
  ) {}

  ngOnInit(): void {

     const id = this.route.snapshot.paramMap.get('id');
  console.log('Operation ID:', id);
    if (id) {
    this.loadOperation(id);
  }

  }

  closeModal() {
  this.operation = null;
}
  goBack() {
  this.router.navigate(['search-generator']);
}

  loadOperation(id: string) {

    this.service.getEmissions().subscribe((data: any[]) => {

      const selected = data.find(x => x.operationId === id);

      if (!selected) return;

      const gwP_CH4 = 28;
      const gwP_NO2 = 265;

      const co2 = selected.totalCO2 ?? 0;
      const ch4 = selected.totalCH4 ?? 0;
      const no2 = selected.totalNO2 ?? 0;

      const totalEmission = co2 + (ch4 * gwP_CH4) + (no2 * gwP_NO2);

      this.operation = {
        ...selected,
        cO2: co2,
        cH4: ch4,
        nO2: no2,
        gwP_CH4,
        gwP_NO2,
        totalEmission
      };

    });

  }

}