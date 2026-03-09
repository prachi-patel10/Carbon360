import { Component, OnInit, signal } from '@angular/core';
import { GeneratorOperation, SearchGeneratorService } from './search-generator-service';
import { FueltypeService } from '../../masters/fueltype/fueltype-service';
import { Router } from '@angular/router';
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
  filterStartTime = signal<string | null>(null);
  filterEndTime = signal<string | null>(null);

  calculatedResult: EmissionModal | null = null;

  constructor(
    private service: SearchGeneratorService,
    private fuelService: FueltypeService,
    private router: Router
  ) {}

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

        this.emissions.set(mapped);
        this.filteredData.set(mapped);
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

  onStartTimeChange(event: any) {
    this.filterStartTime.set(event.target.value || null);
    this.applyFilters();
  }

  onEndTimeChange(event: any) {
    this.filterEndTime.set(event.target.value || null);
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

    const filtered = this.emissions().filter(e => {

      const matchesSearch =
        (e.operationId || '').toLowerCase().includes(sText) ||
        (e.generatorName || '').toLowerCase().includes(sText) ||
        (e.fuelType || '').toLowerCase().includes(sText);

      const matchesFuel =
        fFuel === 'All' ||
        (e.fuelType || '').toLowerCase() === fFuel.toLowerCase();

      let matchesDate = true;
      const opDate = new Date(e.operationDate);

      if (startTime) matchesDate = matchesDate && opDate >= new Date(startTime);
      if (endTime) matchesDate = matchesDate && opDate <= new Date(endTime);

      return matchesSearch && matchesFuel && matchesDate;

    });

    this.filteredData.set(filtered);
  }

  /* ================= TABLE DATA ================= */

  filteredEmissions() {
    return this.filteredData();
  }

  /* ================= OPEN MODAL ================= */

  openOperation(operationId: string) {

    const selected = this.emissions().find(e => e.operationId === operationId);
    if (!selected) return;

    const gwP_CH4 = 28;
    const gwP_NO2 = 265;

    const co2 = selected.co2_kg ?? 0;
    const ch4 = selected.ch4_kg ?? 0;
    const no2 = selected.no2_kg ?? 0;

    const totalEmission = co2 + (ch4 * gwP_CH4) + (no2 * gwP_NO2);

    this.calculatedResult = {
      runHours: selected.runHours,
      loadFactor: selected.loadFactor,
      powerOutputKWH: selected.powerOutputKWH,
      fuelConsumedLiters: selected.fuelConsumedLiters,

      cO2: co2,
      nO2: no2,
      cH4: ch4,

      gwP_CH4,
      gwP_NO2,

      totalEmission
    };
  }

  /* ================= CLOSE MODAL ================= */

  closeModal() {
    this.calculatedResult = null;
  }

}