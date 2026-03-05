import { Component,OnInit,signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MyActionVehicleService,VehicleTrip } from './my-action-vehicle-service';


interface VehicleTripDisplay extends VehicleTrip {

  vehicleName: string
  fromCity: string
  toCity: string
  status: string

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

  constructor(private service: MyActionVehicleService) {}

  ngOnInit(): void {
    this.loadTrips()
  }

  loadTrips() {

  this.service.getTrips().subscribe(data => {

    const mapped = data.map((t: VehicleTrip) => ({

      ...t,

      vehicleName: `${t.vehicleId}`,
      fromCity: `${t.fromCityId}`,
      toCity: `${t.toCityId}`,

      status: t.statusId === 1 ? 'Completed' : 'Pending'

    }))

    this.trips.set(mapped)

  })

}

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


