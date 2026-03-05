import { Component,signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-my-action-vehicle',
  imports: [CommonModule, FormsModule],
  templateUrl: './my-action-vehicle.html',
  styleUrl: './my-action-vehicle.css',
})
export class MyActionVehicle {

   searchText = signal<string>('');
  filterEmission = signal<number | null>(null);
  filterStartDate = signal<string | null>(null);
  filterEndDate = signal<string | null>(null);

  onSearch(event: any) {
    this.searchText.set(event.target.value);
  }

  onEmissionChange(event: any) {
    this.filterEmission.set(event.target.value);
  }

  onStartDateChange(event: any) {
    this.filterStartDate.set(event.target.value);
  }

  onEndDateChange(event: any) {
    this.filterEndDate.set(event.target.value);
  }

  applyFilters() {

    console.log("Search", this.searchText());
    console.log("Emission", this.filterEmission());
    console.log("Start", this.filterStartDate());
    console.log("End", this.filterEndDate());

  }

}