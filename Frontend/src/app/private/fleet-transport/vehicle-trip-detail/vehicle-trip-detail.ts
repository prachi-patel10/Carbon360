import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TripService } from '../vehicle-ec/vehicle-service-ec';
import { SearchVehcileService } from '../search-vehicle/search-vehcile-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vehicle-trip-detail',
  imports: [CommonModule],
  templateUrl: './vehicle-trip-detail.html',
  styleUrls: ['./vehicle-trip-detail.css'],
})
export class VehicleTripDetail implements OnInit {

  trip: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: SearchVehcileService
  ) {}

  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadTrip(id);
    }

  }

  goBack() {
    this.router.navigate(['/dashboard/vehicle-trip']);
  }

  loadTrip(id: string) {

    this.service.searchTrips().subscribe((data: any[]) => {

      const selected = data.find(x => x.tripId === id);

      if (!selected) return;

      const gwP_CH4 = 28;
      const gwP_NO2 = 265;

      const co2 = selected.totalCO2 ?? 0;
      const ch4 = selected.totalCH4 ?? 0;
      const no2 = selected.totalNO2 ?? 0;

      const totalEmission =
        co2 +
        (ch4 * gwP_CH4) +
        (no2 * gwP_NO2);

      this.trip = {

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
