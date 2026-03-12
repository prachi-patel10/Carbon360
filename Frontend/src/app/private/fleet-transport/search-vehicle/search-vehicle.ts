import { Component, OnInit, signal } from '@angular/core';
import { VehicleService } from '../vehicles/vehicle-service';
import { TripService } from '../vehicle-ec/vehicle-service-ec';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SearchVehcileService } from './search-vehcile-service';
import { Route, Router } from '@angular/router';

interface VehicleEmissionDisplay {
  tripId: string;
  vehicleNumber: string;
  vehicleType: string;
  fuelType: string;
  distanceKm: number;
  fuelConsumedLtr: number;
  tripStartDateTime: string;
  tripEndDateTime: string;
  statusId: number; 

  totalCO2: number;
  totalNO2: number;
  totalCH4: number;
  totalEmission: number;
}

@Component({
  selector: 'app-search-vehicle',
  imports: [FormsModule,CommonModule],
  templateUrl: './search-vehicle.html',
  styleUrls: ['./search-vehicle.css'],
})
export class SearchVehicle implements OnInit {

  emissions = signal<VehicleEmissionDisplay[]>([]);
  filteredData = signal<VehicleEmissionDisplay[]>([]);

  searchText = signal<string>('');
  selectedFuelType: string = 'All';

  filterStartDate = signal<string | null>(null);
  filterEndDate = signal<string | null>(null);
  pageSizeOptions = [5, 10, 15, 20]; 
pageSize = 5;             
sortColumn = 'tripstartdatetime'
sortDirection = 'DESC'         
currentPage = signal<number>(1);
totalPages = signal<number>(1);


  selectedRecord: VehicleEmissionDisplay | null = null;
  onPageChange(event: any) {

  const page = Number(event.target.value);

  this.currentPage.set(page);

  this.applyFilters();

}

  constructor(private service: SearchVehcileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTrips();
  }

  sort(column: string) {

  if (this.sortColumn === column) {

    this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC'

  } else {

    this.sortColumn = column
    this.sortDirection = 'ASC'

  }

  this.loadTrips()

}

  /*LOAD DATA*/
  loadTrips() {

  this.service.searchTrips(
    this.currentPage(),
    this.pageSize,
    this.sortColumn,
    this.sortDirection
  ).subscribe({

    next: (res: any) => {

      const mapped: VehicleEmissionDisplay[] = res.data.map((e: any) => ({
        tripId: e.tripId,
        vehicleNumber: e.vehicleNumber,
        vehicleType: e.vehicleType,
        fuelType: e.fuelType,

        distanceKm: e.distanceKm ?? 0,
        fuelConsumedLtr: e.fuelConsumedLtr ?? 0,

        statusId: e.statusId,

        tripStartDateTime: e.tripStartDateTime,
        tripEndDateTime: e.tripEndDateTime,

        totalCO2: e.totalCO2 ?? 0,
        totalNO2: e.totalNO2 ?? 0,
        totalCH4: e.totalCH4 ?? 0,
        totalEmission: e.totalEmission ?? 0
      }));

      this.emissions.set(mapped);

      this.filteredData.set(mapped);
      this.totalPages.set(Math.ceil(res.totalRecords / this.pageSize));
      this.applyFilters();
    },

    error: err => console.error('Error loading vehicle trips', err)

  });

}

//   loadTrips() {
//   this.service.searchTrips().subscribe({
//     next: (res: any) => {

//       const mapped: VehicleEmissionDisplay[] = res.data.map((e: any) => ({
//         tripId: e.tripId,
//         vehicleNumber: e.vehicleNumber,
//         vehicleType: e.vehicleType,
//         fuelType: e.fuelType,

//         distanceKm: e.distanceKm ?? 0,
//         fuelConsumedLtr: e.fuelConsumedLtr ?? 0,

//         statusId: e.statusId,

//         tripStartDateTime: e.tripStartDateTime,
//         tripEndDateTime: e.tripEndDateTime,

//         totalCO2: e.totalCO2 ?? 0,
//         totalNO2: e.totalNO2 ?? 0,
//         totalCH4: e.totalCH4 ?? 0,
//         totalEmission: e.totalEmission ?? 0
//       }));

//       this.emissions.set(mapped);

//       this.totalPages.set(Math.ceil(mapped.length / this.pageSize));

//       this.applyFilters();
//     },
//     error: err => console.error('Error loading vehicle trips', err)
//   });
// }

  /*FILTER EVENTS */
onSearchClick() {
  this.currentPage.set(1);
  this.applyFilters();
}
  onSearch(event: any) {
    this.searchText.set(event.target.value);
    this.applyFilters();
  }

  onFuelTypeChange(event: any) {
    this.selectedFuelType = event.target.value;
    this.applyFilters();
  }

  onStartDateChange(event: any) {
    this.filterStartDate.set(event.target.value || null);
    this.applyFilters();
  }

  onEndDateChange(event: any) {
    this.filterEndDate.set(event.target.value || null);
    this.applyFilters();
  }

  /*APPLY FILTER */

 applyFilters() {

  const sText = this.searchText().toLowerCase();
  const fuel = this.selectedFuelType;

  const start = this.filterStartDate();
  const end = this.filterEndDate();

  let filtered = this.emissions().filter(e => {

    const matchesSearch =
      e.vehicleNumber.toLowerCase().includes(sText) ||
      e.vehicleType.toLowerCase().includes(sText) ||
      e.fuelType.toLowerCase().includes(sText);

    const matchesFuel =
      fuel === 'All' ||
      e.fuelType.toLowerCase() === fuel.toLowerCase();

    let matchesDate = true;

    const tripDate = new Date(e.tripStartDateTime);

    if (start) matchesDate = matchesDate && tripDate >= new Date(start);
    if (end) matchesDate = matchesDate && tripDate <= new Date(end);

    return matchesSearch && matchesFuel && matchesDate;

  });

  this.totalPages.set(Math.ceil(filtered.length / this.pageSize));

const startIndex = (this.currentPage() - 1) * this.pageSize;
const endIndex = startIndex + this.pageSize;

//this.filteredData.set(filtered.slice(startIndex, endIndex));

this.filteredData.set(filtered);
}
  filteredTrips() {
    return this.filteredData();
  }

  openTrip(tripId: string) {
    if (!tripId) return;
  this.router.navigate(['/dashboard/vehicle-ec', tripId]);
  }
  
  getPages(): number[] {
  const pages = [];
  for (let i = 1; i <= this.totalPages(); i++) {
    pages.push(i);
  }
  return pages;
}

onPageSizeChange(event: any) {

  this.pageSize = Number(event.target.value);

  this.currentPage.set(1);

  this.applyFilters();

}
  nextPage() {

  if (this.currentPage() < this.totalPages()) {
    this.currentPage.update(v => v + 1);
    this.applyFilters();
  }

}

previousPage() {

  if (this.currentPage() > 1) {
    this.currentPage.update(v => v - 1);
    this.applyFilters();
  }

}

}
