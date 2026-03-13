import { Component, OnInit, signal } from '@angular/core';
import { GeneratorOperation, SearchGeneratorService } from './search-generator-service';
import { FueltypeService } from '../../masters/fueltype/fueltype-service';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface GeneratorOperationDisplay extends GeneratorOperation {
  status: string;
  totalEmission: number;
  fuelType: string;
}

interface EmissionModal {
  runHours?: number;
  loadFactor?: number;
  powerOutputKWH?: number;
  fuelConsumedLiters?: number;
  cO2?: number;
  nO2?: number;
  cH4?: number;
  gwP_CH4?: number;
  gwP_NO2?: number;
  totalEmission?: number;
}

@Component({
  selector: 'app-search-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-generator.html',
  styleUrls: ['./search-generator.css']
})
export class SearchGenerator implements OnInit {

  emissions = signal<GeneratorOperationDisplay[]>([]);
  filteredData = signal<GeneratorOperationDisplay[]>([]);

  fuelTypes: any[] = [];
  selectedFuelType: string = 'All';

  searchText = signal<string>('');
  filterOperationDate = signal<string | null>(null);
  filterStartTime = signal<string | null>(null);
  filterEndTime = signal<string | null>(null);

  calculatedResult: EmissionModal | null = null;

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private service: SearchGeneratorService,
    private fuelService: FueltypeService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.loadEmissions();
    this.loadFuelTypes();
  }

  /* ================= LOAD GENERATOR OPERATIONS ================= */

  loadEmissions() {
    this.service.getEmissions().subscribe({
      next: (data: any[]) => {

        const mapped: GeneratorOperationDisplay[] = data.map((e: any) => ({
          ...e,

          generatorName: e.generatorName ?? 'Unknown Generator',
          fuelType: e.fuelType ?? 'Unknown',

          status: e.statusName ?? (e.statusId === 1 ? 'Completed' : 'Pending'),

          /* emission values from API */
          co2_kg: e.totalCO2,
          no2_kg: e.totalNO2,
          ch4_kg: e.totalCH4,

          totalEmission: e.totalEmission ?? 0
        }));

        const sorted = mapped.sort((a, b) =>
          new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
        );
        this.emissions.set(sorted);
        this.filteredData.set(sorted);
      },
      error: (err) => console.error('Error loading emissions', err)
    });
  }

  /* ================= LOAD FUEL TYPES ================= */

  loadFuelTypes() {
    this.fuelService.getAll().subscribe({
      next: (res: any) => {
        this.fuelTypes = Array.isArray(res) ? res : res.data || [];
      },
      error: (err) => console.error('Error loading fuel types', err)
    });
  }

  /* ================= FILTER EVENTS ================= */

  onFuelTypeChange(event: any) {
    this.selectedFuelType = event.target.value;
    this.applyFilters();
  }

  // onStartTimeChange(event: any) {
  //   this.filterStartTime.set(event.target.value || null);
  //   this.applyFilters();
  // }

onOperationDateChange(event: any) {

  const value = event.target.value;

  if (value) {
    this.filterOperationDate.set(value);

    console.log("Operation date selected:", value);
  } 
  else {
    this.filterOperationDate.set(null);
  }

  this.applyFilters();
}

  onStartTimeChange(event: any) {

  const value = event.target.value;

  if (value) {
    const startDate = new Date(value);
    startDate.setHours(0, 0, 0, 0); // 00:00:00

    this.filterStartTime.set(startDate.toISOString());

    console.log("Start date sent to SQL:", startDate);
  } else {
    this.filterStartTime.set(null);
  }

  this.applyFilters();
}


  // onEndTimeChange(event: any) {
  //   this.filterEndTime.set(event.target.value || null);
  //   this.applyFilters();
  // }

  onEndTimeChange(event: any) {

  const value = event.target.value;

  if (value) {
    const endDate = new Date(value);
    endDate.setHours(23, 59, 59, 999); // 23:59:59

    this.filterEndTime.set(endDate.toISOString());

    console.log("End date sent to SQL:", endDate);
  } else {
    this.filterEndTime.set(null);
  }

  this.applyFilters();
}

  onSearch(event: any) {
    this.searchText.set(event.target.value);
    this.applyFilters();
  }

  /* ================= APPLY FILTERS ================= */

 applyFilters() {

  const sText = this.searchText().toLowerCase();
  const fFuel = this.selectedFuelType;
  const startTime = this.filterStartTime();
  const endTime = this.filterEndTime();
  const operationDate = this.filterOperationDate();

  const filtered = this.emissions().filter(e => {

    const matchesSearch =
      (e.operationId || '').toLowerCase().includes(sText) ||
      (e.generatorName || '').toLowerCase().includes(sText) ||
      (e.fuelType || '').toLowerCase().includes(sText);

    const matchesFuel =
      fFuel === 'All' ||
      (e.fuelType || '').toLowerCase() === fFuel.toLowerCase();

    let matchesDate = true;

    const opStart = new Date(e.startTime);
    const opEnd = new Date(e.endTime);

    /* ===== Operation Date Filter ===== */

    if (operationDate) {

      const selectedDate = new Date(operationDate).toISOString().split('T')[0];
      const opDate = new Date(e.operationDate).toISOString().split('T')[0];

      matchesDate = matchesDate && opDate === selectedDate;
    }

    /* ===== Start Date Filter ===== */

    if (startTime) {
      const start = new Date(startTime);
      matchesDate = matchesDate && opStart >= start;
    }

    /* ===== End Date Filter ===== */

    if (endTime) {
      const end = new Date(endTime);
      matchesDate = matchesDate && opEnd <= end;
    }

    return matchesSearch && matchesFuel && matchesDate;

  });

  this.filteredData.set(filtered);
}
  /* ================= TABLE DATA ================= */

  filteredEmissions() {
    return this.filteredData();
  }

  /* ================= OPEN MODAL ================= */

  // openOperation(operationId: string) {

  //   const selected = this.emissions().find(e => e.operationId === operationId);
  //   if (!selected) return;

  //   const gwP_CH4 = 28;
  //   const gwP_NO2 = 265;

  //   const co2 = selected.co2_kg ?? 0;
  //   const ch4 = selected.ch4_kg ?? 0;
  //   const no2 = selected.no2_kg ?? 0;

  //   const totalEmission = co2 + (ch4 * gwP_CH4) + (no2 * gwP_NO2);

  //   this.calculatedResult = {
  //     runHours: selected.runHours,
  //     loadFactor: selected.loadFactor,
  //     powerOutputKWH: selected.powerOutputKWH,
  //     fuelConsumedLiters: selected.fuelConsumedLiters,

  //     cO2: co2,
  //     nO2: no2,
  //     cH4: ch4,

  //     gwP_CH4,
  //     gwP_NO2,

  //     totalEmission
  //   };
  // }

  //   openOperation(operationId: string) {

  //   this.router.navigate([
  //     '/dashboard/generator-emission',
  //     operationId
  //   ]);

  // }


  /* ================= CLOSE MODAL ================= */

  closeModal() {
    this.calculatedResult = null;
  }

  goToDetail(operationId: string) {

    this.router.navigate(
      ['/dashboard/generator-ec', operationId],
      {
        queryParams: {
          mode: 'view'
        }
      }
    );

  }

  sortBy(column: string) {

    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    const sorted = [...this.filteredData()].sort((a: any, b: any) => {

      let valueA = a[column];
      let valueB = b[column];

      if (valueA == null) valueA = '';
      if (valueB == null) valueB = '';

      if (typeof valueA === 'string') valueA = valueA.toLowerCase();
      if (typeof valueB === 'string') valueB = valueB.toLowerCase();

      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;

      return 0;
    });

    this.filteredData.set(sorted);
  }
}