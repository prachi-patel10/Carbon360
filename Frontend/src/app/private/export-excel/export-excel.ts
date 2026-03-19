import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExcelService } from './excel-service';
import { FueltypeService } from '../masters/fueltype/fueltype-service';
import { DateRangePickerComponent } from '../../public/date-range-picker-component/date-range-picker-component'; 

interface VehicleEmissionDisplay {
  tripId: string;
  vehicleNumber: string;
  vehicleType: string;
  fuelType: string;
  entryDate: string;
  distanceKm: number;
  fuelConsumedLtr: number;
  tripStartDateTime: string;
  tripEndDateTime: string;
  totalEmission: number;
}

@Component({
  selector: 'app-export-excel',
  standalone: true,
  imports: [CommonModule, DateRangePickerComponent],
  templateUrl: './export-excel.html',
  styleUrl: './export-excel.css',
})
export class ExportExcel implements OnInit {

  trips = signal<VehicleEmissionDisplay[]>([]);
  filteredData = signal<VehicleEmissionDisplay[]>([]);

  searchText = signal<string>('');
  selectedFuelType: string = 'All';

  operationStartDate = signal<string | null>(null);
  operationEndDate = signal<string | null>(null);

  entryStartDate = signal<string | null>(null);
  entryEndDate = signal<string | null>(null);

  pageSize = 10;
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  totalRecordsCount = signal<number>(0);

  sortColumn = 'entryDate';
  sortDirection = 'DESC';

  fuelTypes: any[] = [];

  constructor(
    private excelService: ExcelService,
    private fuelService: FueltypeService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadFuelTypes();
  }

  loadFuelTypes() {
    this.fuelService.getAll().subscribe(res => {
      this.fuelTypes = Array.isArray(res) ? res : res.data || [];
    });
  }

  changePageSize(event: any) {
  this.pageSize = Number(event.target.value);
  this.currentPage.set(1);
}

  loadData() {
    this.excelService.getTrips(1, 1000, this.sortColumn, this.sortDirection)
      .subscribe(res => {

        const mapped = res.data.map((e: any) => ({
          tripId: e.tripId,
          vehicleNumber: e.vehicleNumber,
          vehicleType: e.vehicleType,
          fuelType: e.fuelType,
          entryDate: e.entryDate,
          distanceKm: e.distanceKm ?? 0,
          fuelConsumedLtr: e.fuelConsumedLtr ?? 0,
          tripStartDateTime: e.tripStartDateTime,
          tripEndDateTime: e.tripEndDateTime,
          totalEmission: e.totalEmission ?? 0
        }));

        this.trips.set(mapped);
        this.filteredData.set(mapped);
        this.totalRecordsCount.set(mapped.length);

        this.applyFilters();
      });
  }

  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'ASC';
    }
    this.loadData();
  }

  applyFilters() {
    const sText = this.searchText().toLowerCase();
    const fuel = this.selectedFuelType;

    const opStart = this.operationStartDate();
    const opEnd = this.operationEndDate();
    const enStart = this.entryStartDate();
    const enEnd = this.entryEndDate();

    const filtered = this.trips().filter(e => {

      const matchesSearch =
        e.vehicleNumber.toLowerCase().includes(sText) ||
        e.vehicleType.toLowerCase().includes(sText) ||
        e.fuelType.toLowerCase().includes(sText);

      const matchesFuel =
        fuel === 'All' || e.fuelType.toLowerCase() === fuel.toLowerCase();

      const tripStart = new Date(e.tripStartDateTime);
      const tripEnd = new Date(e.tripEndDateTime);

      let matchesOperation = true;
      if (opStart && tripEnd < new Date(opStart)) matchesOperation = false;
      if (opEnd && tripStart > new Date(opEnd)) matchesOperation = false;

      const entry = new Date(e.entryDate);
      let matchesEntry = true;
      if (enStart && entry < new Date(enStart)) matchesEntry = false;
      if (enEnd && entry > new Date(enEnd)) matchesEntry = false;

      return matchesSearch && matchesFuel && matchesOperation && matchesEntry;
    });

    this.filteredData.set(filtered);
    this.totalPages.set(Math.ceil(filtered.length / this.pageSize));
    this.currentPage.set(1);
  }

  // paginatedData() {
  //   const start = (this.currentPage() - 1) * this.pageSize;
  //   return this.filteredData().slice(start, start + this.pageSize);
  // }

  paginatedData() {
  const start = (this.currentPage() - 1) * this.pageSize;
  const end = start + this.pageSize;
  return this.filteredData().slice(start, end);
}

  totalRecords() {
    return this.filteredData().length;
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  onSearch(e: any) {
    this.searchText.set(e.target.value);
    this.applyFilters();
  }

  onFuelTypeChange(e: any) {
    this.selectedFuelType = e.target.value;
    this.applyFilters();
  }

  onOperationDateRangeSelected(e: any) {
    this.operationStartDate.set(e.startDate || null);
    this.operationEndDate.set(e.endDate || null);
    this.applyFilters();
  }

  onEntryDateRangeSelected(e: any) {
    this.entryStartDate.set(e.startDate || null);
    this.entryEndDate.set(e.endDate || null);
    this.applyFilters();
  }

  exportExcel() {

    const params: any = {};

if (this.searchText()) {
  params.search = this.searchText();
}

if (this.selectedFuelType !== 'All') {
  params.fuelType = this.selectedFuelType;
}

if (this.operationStartDate()) {
  params.startDate = this.operationStartDate();
}

if (this.operationEndDate()) {
  params.endDate = this.operationEndDate();
}

if (this.entryStartDate()) {
  params.entryStartDate = this.entryStartDate();
}

if (this.entryEndDate()) {
  params.entryEndDate = this.entryEndDate();
}

params.sortColumn = this.sortColumn;
params.sortDirection = this.sortDirection;

  // const params: any = {
  //   search: this.searchText(),
  //   fuelType: this.selectedFuelType !== 'All' ? this.selectedFuelType : null,
  //   startDate: this.operationStartDate(),
  //   endDate: this.operationEndDate(),
  //   entryStartDate: this.entryStartDate(),
  //   entryEndDate: this.entryEndDate(),
  //   sortColumn: this.sortColumn,
  //   sortDirection: this.sortDirection
  // };

  this.excelService.exportExcel(params).subscribe(blob => {

    const file = new Blob([blob], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(file);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'VehicleTripEmission.xlsx';
    a.click();

    window.URL.revokeObjectURL(url);
  });
}
}