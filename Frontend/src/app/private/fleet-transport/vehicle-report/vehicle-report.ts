import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
@Component({
  selector: 'app-vehicle-report',
  imports: [CommonModule],
  templateUrl: './vehicle-report.html',
  styleUrl: './vehicle-report.css',
})
export class VehicleReport implements OnInit{


  data: any;

  constructor(private router: Router) {}

  ngOnInit(): void {

    // ✅ Get navigation state data
    const navigation = this.router.getCurrentNavigation();
    this.data = navigation?.extras?.state?.['data'];

    if (!this.data) {
      console.warn("No summary data found. Redirecting back.");
      this.router.navigate(['/trip']);
      return;
    }

    // ✅ Safety recalculation (always recalc for accuracy)
    this.calculateEmission();
  }

  // =========================
  // CALCULATION LOGIC
  // =========================
  calculateEmission() {

    const fuel = Number(this.data.fuelConsumedLtr || 0);
    const distance = Number(this.data.distanceKm || 0);

    const co2Factor = Number(this.data.co2Factor || 0);
    const no2Factor = Number(this.data.no2Factor || 0);
    const ch4Factor = Number(this.data.ch4Factor || 0);

    const totalCo2 = fuel * co2Factor;
    const totalNo2 = distance * no2Factor;
    const totalCh4 = distance * ch4Factor;

    const finalTotal = totalCo2 + totalNo2 + totalCh4;

    // Store formatted values
    this.data.totalCo2 = totalCo2.toFixed(3);
    this.data.totalNo2 = totalNo2.toFixed(3);
    this.data.totalCh4 = totalCh4.toFixed(3);
    this.data.totalEmission = finalTotal.toFixed(3);

    // Calculate duration again (extra safety)
    this.data.tripDuration = this.calculateDuration(
      this.data.tripStartDateTime,
      this.data.tripEndDateTime
    );
  }

  // =========================
  // DURATION CALCULATION
  // =========================
  calculateDuration(start: string, end: string): string {

    if (!start || !end) return '';

    const startDate = new Date(start);
    const endDate = new Date(end);

    const diffMs = endDate.getTime() - startDate.getTime();

    if (diffMs <= 0) return '';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours} hrs ${minutes} mins`;
  }

  // =========================
  // NAVIGATION
  // =========================
  goBack() {
    this.router.navigate(['/trip']);
  }

  // =========================
  // FUTURE DOWNLOAD FEATURE
  // =========================
  downloadReport() {
    alert("PDF download feature coming soon 🚀");
  }


}
