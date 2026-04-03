import { Component,OnInit,signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MyActionVehicleService,VehicleTrip } from './my-action-vehicle-service';
import { Router } from '@angular/router';

interface VehicleTripDisplay extends VehicleTrip {

  vehicleNumber: string
   reportId: string
  fromCity: string
  toCity: string
  status: string
entryDate: string        
  fuelType: string         
  runHours: string 
}

@Component({
  selector: 'app-my-action-vehicle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-action-vehicle.html',
  styleUrl: './my-action-vehicle.css',
})


export class MyActionVehicle implements OnInit{

  trips = signal<VehicleTripDisplay[]>([])

  //trips = signal<VehicleTripDisplay[]>([])
  totalRecords = signal(0)
  currentPage = signal(1)
  pageSize = 10
  sortColumn = 'EntryDate'
sortDirection = 'DESC'

  constructor(private service: MyActionVehicleService,private router : Router) {}

  ngOnInit(): void {
    this.loadTrips()
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

  editTrip(tripId: string) {
 this.router.navigate(
  ['/dashboard/vehicle-ec', tripId],
  { queryParams: { source: 'action' } }
);
}

loadTrips() {
  this.service.getTrips(
    this.currentPage(),
    this.pageSize,
    this.sortColumn,
    this.sortDirection
  )
  .subscribe(res => {

    const mapped = res.data.map((t: VehicleTrip) => {
      let runHours = 0;
      if (t.tripStartDateTime && t.tripEndDateTime) {
        const start = new Date(t.tripStartDateTime).getTime();
        const end = new Date(t.tripEndDateTime).getTime();
        runHours = (end - start) / (1000 * 60 * 60);
      }

      return {
        ...t,

        entryDate: t.entryDate,
        fuelType: t.fuelType,

        runHours: runHours.toFixed(2), 

        status:
          t.statusId === 1 ? 'Reported' :
          t.statusId === 2 ? 'Approved' :
          'Rejected'
      };
    });

    this.trips.set(mapped);
    this.totalRecords.set(res.totalRecords);
  });
}
//   loadTrips() {
//   this.service.getTrips(this.currentPage(), this.pageSize)
//   .subscribe(res => {
//     const mapped = res.data.map((t: VehicleTrip) => ({
//       ...t,
//       vehicleName: `${t.vehicleName}`,
//       fromCity: `${t.fromCity}`,
//       toCity: `${t.toCity}`,
//       status:
//       t.statusId === 1 ? 'Reported' :
//       t.statusId === 2 ? 'Approved' :
//       'Rejected'
//     }))
//     this.trips.set(mapped)
//     this.totalRecords.set(res.totalRecords)
//   })
// }

totalPages(): number {
  return Math.ceil(this.totalRecords() / this.pageSize)
}

goToPage(page: number) {
  if (page < 1 || page > this.totalPages()) return
  this.currentPage.set(page)
  this.loadTrips()
}
changePageSize(event: any) {
  this.pageSize = Number(event.target.value)
  this.currentPage.set(1)
  this.loadTrips()
}
getSortIcon(column: string): string {
  if (this.sortColumn !== column) return '↕';
  return this.sortDirection === 'ASC' ? '↑' : '↓';
}

//   loadTrips() {
//   this.service.getTrips().subscribe(data => {
//     const mapped = data.map((t: VehicleTrip) => ({
//       ...t,
//       vehicleName: `${t.vehicleId}`,
//       fromCity: `${t.fromCityId}`,
//       toCity: `${t.toCityId}`,
//       //status: t.statusId === 1 ? 'Completed' : 'Pending'
//       status:
//       t.statusId === 1 ? 'Reported' :
//       t.statusId === 2 ? 'Approved' :
//       'Rejected'
//     }))
//     this.trips.set(mapped)
//   })
// }
  // loadTrips() {
  //   this.service.getTrips().subscribe(data => {
  //     const mapped = data.map((t: VehicleTrip) => ({
  //       ...t,
  //       vehicleName: `Vehicle ${t.vehicleid}`,   // temporary
  //       fromCity: `City ${t.fromcityid}`,
  //       toCity: `City ${t.tocityid}`,
  //       status: t.StatusId === 1 ? 'Completed' : 'Pending'
  //     }))
  //     this.trips.set(mapped)
  //   })
  // }
}


